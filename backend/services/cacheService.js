/**
 * Cache-aside service over Redis.
 * Fail-open: if Redis is unavailable, fetchFn always runs (Mongo / APIs).
 */
import { gzipSync, gunzipSync } from "zlib"
import { getRedis, isRedisReady, logRedis } from "../config/redis.js"
import { recordCacheHit, recordCacheMiss, recordCacheInvalidate } from "./monitoring/metricsStore.js"

const COMPRESS_THRESHOLD = 8_192 // bytes
const MAX_VALUE_BYTES = 2_000_000

function encode(value, { compress = false } = {}) {
  const json = JSON.stringify({ v: value, t: Date.now() })
  if (!compress && Buffer.byteLength(json, "utf8") < COMPRESS_THRESHOLD) {
    return json
  }
  if (Buffer.byteLength(json, "utf8") > MAX_VALUE_BYTES) {
    throw new Error("Cache value too large")
  }
  const gz = gzipSync(Buffer.from(json, "utf8"))
  return `gz:${gz.toString("base64")}`
}

function decode(raw) {
  if (raw == null) return null
  let json = raw
  if (typeof raw === "string" && raw.startsWith("gz:")) {
    json = gunzipSync(Buffer.from(raw.slice(3), "base64")).toString("utf8")
  }
  const parsed = JSON.parse(json)
  return parsed?.v
}

/**
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function cacheGet(key) {
  try {
    const redis = await getRedis()
    if (!redis || !isRedisReady()) return null
    const raw = await redis.get(key)
    if (raw == null) {
      recordCacheMiss()
      logRedis.debug("Cache miss", { key })
      return null
    }
    recordCacheHit()
    logRedis.debug("Cache hit", { key })
    return decode(raw)
  } catch (err) {
    logRedis.warn("cacheGet failed — failover", { key, message: err?.message })
    return null
  }
}

/**
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 * @param {{ compress?: boolean }} [opts]
 */
export async function cacheSet(key, value, ttlSeconds, opts = {}) {
  try {
    const redis = await getRedis()
    if (!redis || !isRedisReady()) return false
    if (value === undefined) return false
    const ttl = Number(ttlSeconds)
    // Require a positive TTL — never write unbounded keys from app cache path
    if (!(ttl > 0)) {
      logRedis.warn("cacheSet rejected — missing/invalid TTL", { key, ttlSeconds })
      return false
    }
    const payload = encode(value, { compress: opts.compress === true })
    await redis.set(key, payload, "EX", Math.floor(ttl))
    return true
  } catch (err) {
    logRedis.warn("cacheSet failed — failover", { key, message: err?.message })
    return false
  }
}

export async function cacheDel(...keys) {
  const list = keys.flat().filter(Boolean)
  if (!list.length) return 0
  try {
    const redis = await getRedis()
    if (!redis || !isRedisReady()) return 0
    const n = await redis.del(...list)
    if (n > 0) {
      recordCacheInvalidate(n)
      logRedis.info("Cache invalidated", { keys: list, count: n })
    }
    return n
  } catch (err) {
    logRedis.warn("cacheDel failed", { message: err?.message })
    return 0
  }
}

/** Delete keys matching a glob pattern via SCAN (non-blocking). */
export async function cacheDelByPattern(pattern, { count = 100 } = {}) {
  try {
    const redis = await getRedis()
    if (!redis || !isRedisReady()) return 0
    let cursor = "0"
    let total = 0
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", count)
      cursor = next
      if (keys.length) {
        const n = await redis.del(...keys)
        total += n
      }
    } while (cursor !== "0")
    if (total > 0) {
      recordCacheInvalidate(total)
      logRedis.info("Cache invalidated by pattern", { pattern, count: total })
    }
    return total
  } catch (err) {
    logRedis.warn("cacheDelByPattern failed", { pattern, message: err?.message })
    return 0
  }
}

/**
 * Cache-aside: Redis → hit return | miss → fetchFn → store → return
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fetchFn
 * @param {number} ttlSeconds
 * @param {{ compress?: boolean, skipCache?: boolean }} [opts]
 * @returns {Promise<T>}
 */
export async function getOrSet(key, fetchFn, ttlSeconds, opts = {}) {
  if (!opts.skipCache) {
    const hit = await cacheGet(key)
    if (hit !== null && hit !== undefined) return hit
  }
  const value = await fetchFn()
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds, { compress: opts.compress })
  }
  return value
}

/** Pipeline GET many keys. */
export async function cacheGetMany(keys) {
  const list = keys.filter(Boolean)
  if (!list.length) return []
  try {
    const redis = await getRedis()
    if (!redis || !isRedisReady()) return list.map(() => null)
    const pipeline = redis.pipeline()
    list.forEach((k) => pipeline.get(k))
    const results = await pipeline.exec()
    return (results || []).map(([err, raw]) => {
      if (err || raw == null) {
        if (!err) recordCacheMiss()
        return null
      }
      recordCacheHit()
      try {
        return decode(raw)
      } catch {
        return null
      }
    })
  } catch {
    return list.map(() => null)
  }
}

export async function cacheTtl(key) {
  try {
    const redis = await getRedis()
    if (!redis || !isRedisReady()) return -2
    return await redis.ttl(key)
  } catch {
    return -2
  }
}

export default {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelByPattern,
  getOrSet,
  cacheGetMany,
  cacheTtl,
}
