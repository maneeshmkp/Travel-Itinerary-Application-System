import AppError, { ErrorCodes } from "../utils/AppError.js"
import logger from "../logger/index.js"
import { recordErrorSample } from "../services/monitoring/metricsStore.js"

function classify(err) {
  if (err instanceof AppError) {
    return { statusCode: err.statusCode, code: err.code, message: err.message, details: err.details }
  }

  // express-validator / manual validation
  if (err.name === "ValidationError" || err.code === "VALIDATION_ERROR") {
    let message = err.message
    if (err.errors) {
      message = Object.values(err.errors)
        .map((v) => v.message)
        .join(", ")
    }
    return { statusCode: 400, code: ErrorCodes.VALIDATION_ERROR, message }
  }

  if (err.name === "CastError") {
    return { statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "Resource not found" }
  }

  if (err.code === 11000) {
    return { statusCode: 400, code: ErrorCodes.VALIDATION_ERROR, message: "Duplicate field value entered" }
  }

  if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError" ||
    err.statusCode === 401 ||
    err.code === "AUTHENTICATION_ERROR"
  ) {
    return {
      statusCode: 401,
      code: ErrorCodes.AUTHENTICATION_ERROR,
      message: err.message || "Authentication failed",
    }
  }

  if (err.statusCode === 403 || err.code === "AUTHORIZATION_ERROR") {
    return {
      statusCode: 403,
      code: ErrorCodes.AUTHORIZATION_ERROR,
      message: err.message || "Forbidden",
    }
  }

  if (
    err.name === "MongoServerError" ||
    err.name === "MongooseError" ||
    err.code === "DATABASE_ERROR"
  ) {
    return {
      statusCode: 503,
      code: ErrorCodes.DATABASE_ERROR,
      message: "Database error",
    }
  }

  if (
    err.code === "THIRD_PARTY_API_ERROR" ||
    err.clientStatus ||
    /openai|gemini|amadeus|serpapi|openweather|aws|s3/i.test(err.message || "")
  ) {
    return {
      statusCode: err.clientStatus || err.statusCode || 502,
      code: ErrorCodes.THIRD_PARTY_API_ERROR,
      message: err.message || "Upstream service error",
    }
  }

  return {
    statusCode: err.statusCode || 500,
    code: ErrorCodes.SERVER_ERROR,
    message: err.message || "Server Error",
  }
}

const errorHandler = (err, req, res, _next) => {
  const classified = classify(err)

  logger.error("Request error", {
    code: classified.code,
    statusCode: classified.statusCode,
    message: classified.message,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?._id ? String(req.user._id) : undefined,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  })

  recordErrorSample({
    path: req.originalUrl,
    status: classified.statusCode,
    code: classified.code,
    message: classified.message,
  })

  const body = {
    success: false,
    code: classified.code,
    error: classified.message,
    message: classified.message,
  }

  if (classified.details) body.details = classified.details
  if (process.env.NODE_ENV !== "production" && err.stack) {
    body.stack = err.stack
  }

  res.status(classified.statusCode).json(body)
}

export default errorHandler
