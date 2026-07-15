import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import winston from "winston"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.join(__dirname, "..", "logs")

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const { combine, timestamp, errors, printf, colorize, json } = winston.format

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ""
  return `${ts} [${level}] ${stack || message}${rest}`
})

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  defaultMeta: { service: "travelplan-api" },
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5_000_000,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 10_000_000,
      maxFiles: 7,
    }),
  ],
})

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), consoleFormat),
    }),
  )
} else {
  logger.add(
    new winston.transports.Console({
      format: combine(timestamp(), json()),
    }),
  )
}

/** Domain-scoped child loggers */
export const logAuth = logger.child({ domain: "auth" })
export const logDb = logger.child({ domain: "database" })
export const logS3 = logger.child({ domain: "aws-s3" })
export const logAi = logger.child({ domain: "ai" })
export const logWeather = logger.child({ domain: "weather" })
export const logMaps = logger.child({ domain: "maps" })
export const logSocket = logger.child({ domain: "socket" })
export const logBooking = logger.child({ domain: "booking" })
export const logExpense = logger.child({ domain: "expense" })
export const logHttp = logger.child({ domain: "http" })
export const logExternal = logger.child({ domain: "external-api" })
export const logRedis = logger.child({ domain: "redis" })
export const logQueue = logger.child({ domain: "queue" })

export default logger
