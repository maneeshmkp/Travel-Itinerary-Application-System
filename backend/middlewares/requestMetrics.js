import morgan from "morgan"
import logger, { logHttp } from "../logger/index.js"
import { recordRequest } from "../services/monitoring/metricsStore.js"

/** Morgan → Winston stream */
export const morganStream = {
  write: (message) => {
    logHttp.http(message.trim())
  },
}

morgan.token("user-id", (req) => (req.user?._id ? String(req.user._id) : "-"))

export const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms user=:user-id',
  {
    stream: morganStream,
    skip: (req) =>
      req.path === "/api/health" ||
      req.path === "/api/health/live" ||
      req.path === "/health/live" ||
      req.path.startsWith("/socket.io"),
  },
)

/**
 * Collect latency / counts for the monitoring dashboard.
 */
export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint()
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    recordRequest({
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      ms: Math.round(ms),
      userId: req.user?._id,
    })
  })
  next()
}

export function logStartup(message, meta = {}) {
  logger.info(message, { event: "startup", ...meta })
}
