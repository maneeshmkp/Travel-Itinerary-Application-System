/**
 * Singleton Redis client (ioredis).
 * Auto-reconnect, retry strategy, connection health, graceful shutdown.
 * App continues without Redis when REDIS_URL is unset or Redis is down.
 */
import Redis from "ioredis"
import logger from "../logger/index.js"

export const logRedis = logger.child({ domain: "redis" })

/** @type {import("ioredis").default | null} */
let client = null
/** @type {import("ioredis").default | null} */
let subscriber = null
let connecting = false
let lastErrorAt = 0
let lastReconnectLogAt = 0
let ready = false

function redisUrl() {
  return (process.env.REDIS_URL || process.env.REDIS_URI || "").trim() || null
}

function retryStrategy(times) {
  // Back off harder when Redis is down to avoid log/CPU storms
  const delay = Math.min(times * 500, 15_000)
  if (times <= 2 || times % 20 === 0) {
    logRedis.warn("Redis reconnect attempt", { times, delayMs: delay })
  }
  return delay
}

function rateLimitedRedisError(role, err) {
  const now = Date.now()
  if (now - lastErrorAt > 15_000) {
    lastErrorAt = now
    logRedis.error("Redis error", { role, message: err?.message || String(err) })
  }
}

function attachSafeErrorHandler(instance, role = "main") {
  if (!instance || instance.__travelplanErrorHandler) return instance
  instance.__travelplanErrorHandler = true
  instance.on("error", (err) => {
    rateLimitedRedisError(role, err)
    if (role === "main") ready = false
  })
  return instance
}

function createClient(role = "main") {
  const url = redisUrl()
  if (!url) return null

  const instance = new Redis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 8_000,
    retryStrategy,
    reconnectOnError(err) {
      const msg = String(err?.message || "")
      if (msg.includes("READONLY")) return true
      return false
    },
  })

  instance.on("connect", () => {
    logRedis.info("Redis connecting", { role })
  })
  instance.on("ready", () => {
    ready = role === "main" ? true : ready
    logRedis.info("Redis connected", { role })
  })
  attachSafeErrorHandler(instance, role)
  instance.on("close", () => {
    if (role === "main") ready = false
    const now = Date.now()
    if (now - lastReconnectLogAt > 15_000) {
      lastReconnectLogAt = now
      logRedis.warn("Redis disconnected", { role })
    }
  })
  instance.on("reconnecting", () => {
    const now = Date.now()
    if (now - lastReconnectLogAt > 15_000) {
      lastReconnectLogAt = now
      logRedis.info("Redis reconnecting", { role })
    }
  })

  return instance
}

/**
 * Ensure the shared Redis client is connected (or return null if unavailable).
 * Never throws for missing Redis — callers must fall back gracefully.
 */
export async function getRedis() {
  if (!redisUrl()) return null
  if (client && ready) return client

  if (!client) {
    client = createClient("main")
  }
  if (!client) return null

  if (client.status === "ready") {
    ready = true
    return client
  }

  if (connecting) {
    for (let i = 0; i < 20; i += 1) {
      if (client.status === "ready") {
        ready = true
        return client
      }
      await new Promise((r) => setTimeout(r, 50))
    }
    return client.status === "ready" ? client : null
  }

  connecting = true
  try {
    if (client.status === "wait" || client.status === "end") {
      if (client.status === "end") {
        client = createClient("main")
      }
      await client.connect()
    }
    ready = client.status === "ready"
    return ready ? client : null
  } catch (err) {
    logRedis.warn("Redis connect failed — failover to DB/APIs", {
      message: err?.message || String(err),
    })
    ready = false
    return null
  } finally {
    connecting = false
  }
}

/** Subscriber duplicate for Socket.IO adapter / pub-sub. */
export async function getRedisSubscriber() {
  const main = await getRedis()
  if (!main) return null
  if (subscriber && (subscriber.status === "ready" || subscriber.status === "connecting")) {
    return subscriber
  }
  subscriber = main.duplicate()
  attachSafeErrorHandler(subscriber, "subscriber")
  try {
    if (subscriber.status === "wait") await subscriber.connect()
  } catch (err) {
    logRedis.warn("Redis subscriber connect failed", { message: err?.message })
    try {
      subscriber.disconnect()
    } catch {
      /* ignore */
    }
    subscriber = null
    return null
  }
  return subscriber
}

export function isRedisReady() {
  return Boolean(client && client.status === "ready" && ready)
}

export function isRedisConfigured() {
  return Boolean(redisUrl())
}

/** Connection status for monitoring / health. */
export function getRedisConnectionInfo() {
  return {
    configured: isRedisConfigured(),
    ready: isRedisReady(),
    status: client?.status || "unconfigured",
  }
}

/**
 * Soft-init on boot (non-blocking). Safe to call even when Redis is optional.
 */
export function initRedis() {
  if (!redisUrl()) {
    logRedis.info("Redis not configured (REDIS_URL unset) — cache/queues disabled")
    return
  }
  getRedis().catch(() => {})
}

/** Graceful shutdown — quit clients without crashing callers. */
export async function closeRedis() {
  const closing = []
  if (subscriber) {
    closing.push(
      subscriber.quit().catch(() => {
        try {
          subscriber.disconnect()
        } catch {
          /* ignore */
        }
      }),
    )
    subscriber = null
  }
  if (client) {
    closing.push(
      client.quit().catch(() => {
        try {
          client.disconnect()
        } catch {
          /* ignore */
        }
      }),
    )
    client = null
  }
  ready = false
  await Promise.allSettled(closing)
  logRedis.info("Redis graceful shutdown complete")
}

/**
 * BullMQ / ioredis connection options (new connection per worker recommended by BullMQ docs).
 */
export function getBullConnectionOptions() {
  const url = redisUrl()
  if (!url) return null
  try {
    const u = new URL(url)
    return {
      host: u.hostname || "127.0.0.1",
      port: Number(u.port || 6379) || 6379,
      username: u.username || undefined,
      password: u.password || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy,
    }
  } catch {
    return {
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy,
    }
  }
}

/**
 * Create an ioredis client for BullMQ Queue/Worker with a safe error handler
 * (prevents "[ioredis] Unhandled error event" spam when Redis is down).
 */
export function createBullRedisConnection(role = "bullmq") {
  const opts = getBullConnectionOptions()
  if (!opts) return null
  const instance = new Redis(opts)
  attachSafeErrorHandler(instance, role)
  return instance
}

/**
 * Quick ping to decide whether to start BullMQ workers.
 * @returns {Promise<boolean>}
 */
export async function probeRedis(timeoutMs = 2500) {
  if (!redisUrl()) return false
  const opts = getBullConnectionOptions()
  if (!opts) return false
  const probe = new Redis({
    ...opts,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: timeoutMs,
    retryStrategy: () => null,
  })
  attachSafeErrorHandler(probe, "probe")
  try {
    await Promise.race([
      (async () => {
        await probe.connect()
        const pong = await probe.ping()
        return pong === "PONG"
      })(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Redis probe timeout")), timeoutMs)
      }),
    ])
    return true
  } catch (err) {
    logRedis.warn("Redis probe failed — queues deferred", { message: err?.message })
    return false
  } finally {
    try {
      probe.disconnect()
    } catch {
      /* ignore */
    }
  }
}

export default { getRedis, initRedis, closeRedis, isRedisReady, isRedisConfigured, probeRedis }
