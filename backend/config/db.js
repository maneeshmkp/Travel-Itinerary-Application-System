import mongoose from "mongoose"
import dotenv from "dotenv"
import { logDb } from "../logger/index.js"
import { recordMongoMs } from "../services/monitoring/metricsStore.js"

dotenv.config()

const SLOW_QUERY_MS = Number(process.env.MONGO_SLOW_MS || 300)
let instrumentationInstalled = false

/**
 * Instrument all Query / Aggregate executions for monitoring.
 * Safe regardless of model load order — wraps prototypes once.
 */
function installMongoQueryInstrumentation() {
  if (instrumentationInstalled) return
  instrumentationInstalled = true

  const originalExec = mongoose.Query.prototype.exec
  mongoose.Query.prototype.exec = async function timedExec(...args) {
    const started = Date.now()
    try {
      return await originalExec.apply(this, args)
    } finally {
      const ms = Date.now() - started
      const collection = this.model?.collection?.collectionName || "unknown"
      const op = this.op || "find"
      recordMongoMs({ op, collection, ms })
      if (ms >= SLOW_QUERY_MS) {
        logDb.warn("Slow Mongo query", { collection, op, ms })
      }
    }
  }

  const originalAggregateExec = mongoose.Aggregate.prototype.exec
  mongoose.Aggregate.prototype.exec = async function timedAggregateExec(...args) {
    const started = Date.now()
    try {
      return await originalAggregateExec.apply(this, args)
    } finally {
      const ms = Date.now() - started
      const collection = this._model?.collection?.collectionName || "unknown"
      recordMongoMs({ op: "aggregate", collection, ms })
      if (ms >= SLOW_QUERY_MS) {
        logDb.warn("Slow Mongo aggregate", { collection, ms })
      }
    }
  }
}

installMongoQueryInstrumentation()

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI
    if (!uri) {
      throw new Error("MONGO_URI is not configured")
    }
    const conn = await mongoose.connect(uri)
    logDb.info("MongoDB connected", { host: conn.connection.host })
  } catch (error) {
    logDb.error("Database connection failed", { message: error.message })
    process.exit(1)
  }
}

export default connectDB
