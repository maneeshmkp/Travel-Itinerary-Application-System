import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import errorHandler from "./middlewares/errorHandler.js"
import { requestLogger, metricsMiddleware, logStartup } from "./middlewares/requestMetrics.js"
import {
  securityHeaders,
  noSqlSanitize,
  hardenParams,
  sanitizeInputs,
  csrfProtection,
} from "./middlewares/security.js"
import { globalApiRateLimiter } from "./middlewares/rateLimiter.js"
import { getPublicHealth, getLiveness } from "./controllers/monitoringController.js"
import apiRouter from "./routes/apiRouter.js"
import { mountSwagger } from "./config/swagger.js"
import { corsOriginDelegate } from "./config/corsOrigins.js"

dotenv.config()

connectDB()

const app = express()

/** Trust proxy for correct IP / secure cookies behind ALB/nginx */
if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1)
}

/** CORS must run early so preflight gets Access-Control-Allow-Origin */
app.use(
  cors({
    origin: corsOriginDelegate,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
      "X-XSRF-Token",
      "X-Device-Id",
    ],
    exposedHeaders: ["X-API-Version", "X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
  }),
)

app.use(securityHeaders())
app.use(cookieParser())

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))
app.use(noSqlSanitize())
app.use(hardenParams())
app.use(sanitizeInputs)
app.use(csrfProtection)

app.use(globalApiRateLimiter)
app.use(metricsMiddleware)
app.use(requestLogger)

app.get("/", (_req, res) => {
  res.json({
    success: true,
    name: "TravelPlan API",
    message: "backend app is running...",
    documentation: "/docs",
    openapi: "/docs/openapi.json",
    versions: {
      current: "/api/v1",
      legacy: "/api",
    },
  })
})

/** Spec + backward compatible comprehensive health */
app.get("/health", getPublicHealth)
app.get("/health/live", getLiveness)

/**
 * API versioning
 * - /api/v1/*  preferred (versioned)
 * - /api/*     legacy alias (identical router; X-API-Version: 1)
 */
app.use("/api/v1", apiRouter)
app.use("/api", apiRouter)

/** OpenAPI 3.1 + Swagger UI */
mountSwagger(app)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    error: "Route not found",
    message: "Route not found",
    hint: "See /docs for the public API catalogue. Prefer /api/v1/...",
  })
})

app.use(errorHandler)

logStartup("Express app configured", {
  routes: "api/v1 + legacy /api, swagger /docs",
  security: "helmet+sanitize+rateLimit+sessions",
})

export default app
