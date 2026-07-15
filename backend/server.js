import http from "http"
import app from "./app.js"
import { initSocket } from "./socket/index.js"
import { startNotificationScheduler } from "./utils/notificationScheduler.js"
import { startFlightTrackingPoller } from "./services/flightTracking/flightPollingService.js"
import { isGoogleGeocodingConfigured } from "./services/geocodingService.js"
import { isAmadeusConfigured } from "./services/amadeusClient.js"
import { isSerpApiConfigured } from "./services/serpApiClient.js"
import { getAvailabilityProviders } from "./services/availabilityService.js"
import { getStorageProvider } from "./services/storage/index.js"
import { isS3Configured } from "./services/storage/s3StorageProvider.js"
import { initRedis, closeRedis, isRedisConfigured } from "./config/redis.js"
import { startQueueWorkers, closeQueues, startScheduler } from "./queues/index.js"
import { bootstrapDomainEvents } from "./events/index.js"
import logger from "./logger/index.js"
import { logStartup } from "./middlewares/requestMetrics.js"

const PORT = process.env.PORT || 5000

initRedis()
bootstrapDomainEvents()

const httpServer = http.createServer(app)
initSocket(httpServer)

const server = httpServer.listen(PORT, () => {
  logStartup("Server listening", {
    port: PORT,
    env: process.env.NODE_ENV || "development",
    node: process.version,
  })
  logger.info(`Backend API available at http://localhost:${PORT}/api`)

  if (isRedisConfigured()) {
    logger.info("Redis: configured — cache, rate limits, queues, Socket.IO adapter")
    startQueueWorkers()
      .then((result) => {
        if (result?.started) {
          logger.info("BullMQ workers ready")
          return startScheduler()
            .then((r) => logger.info("Background job scheduler ready", r))
            .catch((err) => logger.warn("Scheduler start failed", { message: err.message }))
        }
        // Redis URL set but unreachable — keep API up with in-process schedulers
        logger.warn("BullMQ unavailable — using in-process notification/flight pollers", {
          reason: result?.reason,
        })
        startNotificationScheduler()
        startFlightTrackingPoller()
        return null
      })
      .catch((err) => {
        logger.warn("Worker start failed — using in-process pollers", { message: err.message })
        startNotificationScheduler()
        startFlightTrackingPoller()
      })
    // Legacy node-cron / setInterval only when explicitly requested alongside BullMQ
    if (process.env.LEGACY_POLLERS === "true") {
      startNotificationScheduler()
      startFlightTrackingPoller()
      logger.warn("Legacy pollers enabled (LEGACY_POLLERS=true) — may duplicate BullMQ schedules")
    }
  } else {
    logger.warn("Redis: not configured — set REDIS_URL for caching / BullMQ / Socket scale-out")
    // Without Redis, fall back to in-process schedulers so reminders still run
    startNotificationScheduler()
    startFlightTrackingPoller()
  }

  if (isGoogleGeocodingConfigured()) {
    logger.info("Google Geocoding API: configured")
  } else {
    logger.warn(
      "Google Geocoding API: not configured — set GOOGLE_GEOCODING_API_KEY in backend/.env",
    )
  }
  if (isSerpApiConfigured()) {
    logger.info("SerpAPI (Google Flights/Hotels): configured")
  } else {
    logger.warn("SerpAPI: not configured — set SERPAPI_KEY in backend/.env for live prices")
  }
  const providers = getAvailabilityProviders()
  if (providers.length > 0) {
    logger.info(`Live availability providers: ${providers.join(", ")}`)
  } else if (!isAmadeusConfigured()) {
    logger.warn("No live availability provider — use SERPAPI_KEY for live rates.")
  }
  if (isAmadeusConfigured()) {
    logger.info("Amadeus availability API: configured (legacy fallback)")
  }
  const storage = getStorageProvider()
  if (storage === "s3") {
    if (isS3Configured()) {
      logger.info("Document storage: AWS S3 (bucket configured)")
    } else {
      logger.warn("STORAGE_PROVIDER=s3 but AWS credentials/bucket missing")
    }
  } else {
    logger.info(`Document storage: ${storage}`)
  }
})

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`Port ${PORT} is already in use. Stop the other backend process.`)
    process.exit(1)
  }
  throw err
})

async function gracefulShutdown(signal) {
  logger.info(`${signal} received — shutting down`)
  server.close(async () => {
    try {
      await closeQueues()
      await closeRedis()
    } catch (err) {
      logger.warn("Shutdown cleanup error", { message: err?.message })
    }
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled rejection", { message: err.message, stack: err.stack })
  server.close(() => {
    process.exit(1)
  })
})
