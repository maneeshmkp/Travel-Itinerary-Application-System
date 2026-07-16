/**
 * Singleton Redis client (ioredis).
 * Lifecycle: waitForRedisReady() → BullMQ / Socket adapter.
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
/** @type {Promise<import("ioredis").default | null> | null} */
let readyPromise = null

/**
 * Resolved Redis URL, or null when unset / not usable in this environment.
 * Loopback URLs from a local .env must not be used on Render (no local Redis).
 */
export function resolveRedisUrl() {
  const raw = (process.env.REDIS_URL || process.env.REDIS_URI || "").trim()
  if (!raw) return null

  const onRender = process.env.RENDER === "true" || Boolean(process.env.RENDER_SERVICE_ID)
  const isProd = process.env.NODE_ENV === "production"
  if ((onRender || isProd) && /:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/i.test(raw)) {
    logRedis.warn(
      "Ignoring REDIS_URL pointing at localhost in cloud — remove it or use Upstash/Render Redis",
    )
    return null
  }
  return raw
}

function redisUrl() {
  return resolveRedisUrl()
}

/** Exponential backoff for reconnects (capped). Returning null stops reconnect. */
function retryStrategy(times) {
  if (times > 40) return null
  const delay = Math.min(100 * 2 ** Math.min(times, 8), 15_000)
  if (times <= 2 || times % 10 === 0) {
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
    connectTimeout: 10_000,
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
    if (role === "main") {
      logRedis.info("Redis connected")
    } else {
      logRedis.info("Redis connected", { role })
    }
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
  if (client && ready && client.status === "ready") return client

  if (!client) {
    client = createClient("main")
  }
  if (!client) return null

  if (client.status === "ready") {
    ready = true
    return client
  }

  if (connecting) {
    for (let i = 0; i < 40; i += 1) {
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

/**
 * Await a live Redis connection (PING) before BullMQ / Socket adapter.
 * Exactly one in-flight init; concurrent callers share the same promise.
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<import("ioredis").default | null>}
 */
export async function waitForRedisReady({ timeoutMs = 20_000 } = {}) {
  if (!redisUrl()) return null

  if (client && ready && client.status === "ready") {
    try {
      if ((await client.ping()) === "PONG") return client
    } catch {
      ready = false
    }
  }

  if (readyPromise) return readyPromise

  readyPromise = (async () => {
    const deadline = Date.now() + timeoutMs
    let attempt = 0

    while (Date.now() < deadline) {
      attempt += 1
      const c = await getRedis()
      if (c) {
        try {
          if ((await c.ping()) === "PONG") {
            ready = true
            return c
          }
        } catch {
          ready = false
        }
      }

      const delay = Math.min(100 * 2 ** Math.min(attempt - 1, 6), 8_000)
      await new Promise((r) => setTimeout(r, delay))
    }

    logRedis.warn("Redis not ready within timeout — queues deferred", { timeoutMs })
    return null
  })()

  try {
    return await readyPromise
  } finally {
    if (!ready) readyPromise = null
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
 * Soft-init on boot (non-blocking). Prefer waitForRedisReady() for sequenced startup.
 */
export function initRedis() {
  if (!redisUrl()) {
    logRedis.info("Redis not configured (REDIS_URL unset) — cache/queues disabled")
    return Promise.resolve(null)
  }
  return waitForRedisReady().catch(() => null)
}

/** Graceful shutdown — quit clients without crashing callers. */
export async function closeRedis() {
  readyPromise = null
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
 * Preserves TLS for rediss:// (required for Upstash).
 */
export function getBullConnectionOptions() {
  const url = redisUrl()
  if (!url) return null
  try {
    const u = new URL(url)
    const useTls = u.protocol === "rediss:"
    return {
      host: u.hostname,
      port: Number(u.port || 6379) || 6379,
      username: u.username ? decodeURIComponent(u.username) : undefined,
      password: u.password ? decodeURIComponent(u.password) : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectTimeout: 10_000,
      retryStrategy,
      ...(useTls ? { tls: {} } : {}),
    }
  } catch (err) {
    logRedis.warn("Invalid REDIS_URL for BullMQ", { message: err?.message })
    return null
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
 * Confirm Redis is reachable via the shared client (after waitForRedisReady).
 * @returns {Promise<boolean>}
 */
export async function probeRedis(timeoutMs = 5_000) {
  if (!redisUrl()) return false
  try {
    const c = await waitForRedisReady({ timeoutMs })
    if (!c) return false
    return (await c.ping()) === "PONG"
  } catch (err) {
    logRedis.warn("Redis probe failed — queues deferred", { message: err?.message })
    return false
  }
}

export default {
  getRedis,
  initRedis,
  waitForRedisReady,
  closeRedis,
  isRedisReady,
  isRedisConfigured,
  probeRedis,
}
