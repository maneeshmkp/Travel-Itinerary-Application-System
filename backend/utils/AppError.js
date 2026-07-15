/**
 * Application error with HTTP status + machine-readable code.
 */
export default class AppError extends Error {
  constructor(message, statusCode = 500, code = "SERVER_ERROR", details = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DATABASE_ERROR: "DATABASE_ERROR",
  THIRD_PARTY_API_ERROR: "THIRD_PARTY_API_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
}
