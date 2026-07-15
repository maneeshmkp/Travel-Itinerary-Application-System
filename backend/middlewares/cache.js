/**
 * HTTP response cache middleware (cache-aside for GET handlers).
 * Fail-open when Redis is down. Never caches auth bodies or sensitive routes.
 */
import { cacheGet, cacheSet } from "../services/cacheService.js"
import { hashPayload } from "../services/redisKeys.js"
import { logRedis } from "../config/redis.js"

/**
 * @param {{ ttlSeconds: number, keyPrefix: string, keyFn?: (req) => string, skip?: (req) => boolean }} options
 */
export function cacheMiddleware(options) {
  const { ttlSeconds, keyPrefix, keyFn, skip } = options

  return async function cacheMw(req, res, next) {
    if (req.method !== "GET") return next()
    if (typeof skip === "function" && skip(req)) return next()

    const identity =
      (typeof keyFn === "function" && keyFn(req)) ||
      `${req.originalUrl}|${req.user?.id || "anon"}`
    const key = `travelplan:http:${keyPrefix}:${hashPayload(identity)}`

    try {
      const hit = await cacheGet(key)
      if (hit && hit.body !== undefined) {
        res.setHeader("X-Cache", "HIT")
        return res.status(hit.status || 200).json(hit.body)
      }
    } catch {
      /* fail open */
    }

    const originalJson = res.json.bind(res)
    res.json = (body) => {
      res.setHeader("X-Cache", "MISS")
      // Never cache error responses or auth payloads
      const status = res.statusCode || 200
      const looksSensitive =
        body?.token ||
        body?.password ||
        body?.resetToken ||
        keyPrefix.includes("auth")
      if (status >= 200 && status < 300 && !looksSensitive) {
        cacheSet(key, { status, body }, ttlSeconds).catch(() => {})
        logRedis.debug("HTTP response cached", { keyPrefix, key })
      }
      return originalJson(body)
    }

    return next()
  }
}

export default cacheMiddleware
