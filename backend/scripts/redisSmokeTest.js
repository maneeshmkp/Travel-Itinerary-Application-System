/**
 * Redis integration smoke tests (cache, TTL, rate limit helpers, failover).
 * Usage: node scripts/redisSmokeTest.js
 * Requires REDIS_URL (optional — failover paths are still asserted).
 */
import dotenv from "dotenv"
dotenv.config()

import { initRedis, getRedis, closeRedis, isRedisReady, isRedisConfigured } from "../config/redis.js"
import { cacheGet, cacheSet, cacheDel, getOrSet, cacheTtl } from "../services/cacheService.js"
import { RedisKeys, TTL, hashPayload } from "../services/redisKeys.js"
import { createRateLimiter } from "../middlewares/rateLimiter.js"
import { getQueue, QUEUE_NAMES, closeQueues } from "../queues/index.js"

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
  console.log("  ✓", msg)
}

async function main() {
  console.log("\n=== Redis smoke test ===\n")
  console.log("REDIS configured:", isRedisConfigured())

  initRedis()
  const redis = await getRedis()

  if (!redis || !isRedisReady()) {
    console.log("Redis unavailable — verifying fail-open cache path…")
    const v = await getOrSet("travelplan:test:failover", async () => ({ ok: true }), 10)
    assert(v.ok === true, "getOrSet works without Redis (fetchFn)")
    console.log("\nAll failover checks passed.\n")
    await closeRedis()
    return
  }

  const key = RedisKeys.weatherCurrent(hashPayload("smoke-test"))
  await cacheDel(key)

  let misses = 0
  const producer = async () => {
    misses += 1
    return { temp: 21, at: Date.now() }
  }

  const a = await getOrSet(key, producer, 30)
  assert(misses === 1, "Cache miss invokes producer")
  const b = await getOrSet(key, producer, 30)
  assert(misses === 1, "Cache hit skips producer")
  assert(a.temp === b.temp, "Cached value stable")

  const ttl = await cacheTtl(key)
  assert(ttl > 0 && ttl <= 30, `TTL positive (${ttl}s)`)

  await cacheSet("travelplan:test:ai", { big: "x".repeat(100) }, TTL.AI, { compress: true })
  const ai = await cacheGet("travelplan:test:ai")
  assert(ai?.big?.length === 100, "Compressed cache round-trip")

  await cacheDel(key, "travelplan:test:ai")
  assert((await cacheGet(key)) == null, "Cache invalidated")

  // Rate limiter unit (fake req/res)
  const limiter = createRateLimiter({ prefix: "smoke", max: 2, windowSeconds: 60 })
  let status = 200
  const req = { ip: "127.0.0.1", body: {} }
  const res = {
    setHeader() {},
    status(code) {
      status = code
      return this
    },
    json() {
      return this
    },
  }
  let nextCount = 0
  const next = () => {
    nextCount += 1
  }
  await limiter(req, res, next)
  await limiter(req, res, next)
  await limiter(req, res, next)
  assert(nextCount === 2, "Rate limiter allows 2")
  assert(status === 429, "Rate limiter blocks 3rd")

  const q = getQueue(QUEUE_NAMES.EMAIL)
  assert(q != null, "BullMQ email queue created")

  console.log("\nAll Redis checks passed.\n")
  await closeQueues()
  await closeRedis()
}

main().catch(async (err) => {
  console.error("\nFAILED:", err.message)
  try {
    await closeQueues()
    await closeRedis()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
