/**
 * Redis sliding / fixed-window rate limiter.
 * Fail-open when Redis is unavailable (request proceeds).
 */
import { getRedis, isRedisReady, logRedis } from "../config/redis.js"
import { RedisKeys } from "../services/redisKeys.js"
import { recordRateLimited } from "../services/monitoring/metricsStore.js"
import { recordSecurityEvent } from "../services/security/securityMetrics.js"

/**
 * @param {{ windowSeconds: number, max: number, prefix: string, keyFn?: (req) => string }} options
 */
export function createRateLimiter(options) {
  const { windowSeconds, max, prefix, keyFn } = options

  return async function rateLimiter(req, res, next) {
    try {
      const redis = await getRedis()
      if (!redis || !isRedisReady()) return next()

      const id =
        (typeof keyFn === "function" && keyFn(req)) ||
        req.user?.id ||
        req.ip ||
        req.headers["x-forwarded-for"] ||
        "anon"

      const key = RedisKeys.rateLimit(prefix, String(id).split(",")[0].trim())
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.expire(key, windowSeconds)
      }
      const ttl = await redis.ttl(key)
      res.setHeader("X-RateLimit-Limit", String(max))
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - count)))
      res.setHeader("X-RateLimit-Reset", String(ttl > 0 ? ttl : windowSeconds))

      if (count > max) {
        recordRateLimited(prefix)
        recordSecurityEvent("rate_limited", {
          bucket: prefix,
          ip: req.ip,
          path: req.originalUrl,
        })
        logRedis.warn("Rate limited", { prefix, id: String(id), count, max })
        return res.status(429).json({
          success: false,
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
        })
      }
      return next()
    } catch (err) {
      logRedis.warn("Rate limiter error — fail open", { message: err?.message })
      return next()
    }
  }
}

/** Login: 10 / minute */
export const loginRateLimiter = createRateLimiter({
  prefix: "login",
  max: 10,
  windowSeconds: 60,
  keyFn: (req) => req.body?.email || req.ip,
})

/** Signup: 10 / minute */
export const signupRateLimiter = createRateLimiter({
  prefix: "signup",
  max: 10,
  windowSeconds: 60,
  keyFn: (req) => req.body?.email || req.ip,
})

/** Forgot password: 5 / minute */
export const forgotPasswordRateLimiter = createRateLimiter({
  prefix: "forgot",
  max: 5,
  windowSeconds: 60,
  keyFn: (req) => req.body?.email || req.ip,
})

/** Reset password: 10 / minute */
export const resetPasswordRateLimiter = createRateLimiter({
  prefix: "reset",
  max: 10,
  windowSeconds: 60,
  keyFn: (req) => req.ip,
})

/** Refresh token: 30 / minute */
export const refreshRateLimiter = createRateLimiter({
  prefix: "refresh",
  max: 30,
  windowSeconds: 60,
  keyFn: (req) => req.ip,
})

/** OTP: 5 / minute */
export const otpRateLimiter = createRateLimiter({
  prefix: "otp",
  max: 5,
  windowSeconds: 60,
  keyFn: (req) => req.body?.email || req.ip,
})

/** AI endpoints: 20 / hour */
export const aiRateLimiter = createRateLimiter({
  prefix: "ai",
  max: 20,
  windowSeconds: 60 * 60,
  keyFn: (req) => req.user?.id || req.ip,
})

/** Public APIs: 60 / minute */
export const publicApiRateLimiter = createRateLimiter({
  prefix: "public",
  max: 60,
  windowSeconds: 60,
})

/** Global API soft limit: 300 / minute per IP (skips platform health probes) */
const globalLimiterInner = createRateLimiter({
  prefix: "global",
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 300),
  windowSeconds: 60,
})

const HEALTH_PATHS = new Set([
  "/health",
  "/health/live",
  "/api/health",
  "/api/health/live",
  "/api/v1/health",
  "/api/v1/health/live",
])

export async function globalApiRateLimiter(req, res, next) {
  const path = String(req.path || "")
  if (HEALTH_PATHS.has(path)) return next()
  return globalLimiterInner(req, res, next)
}

export default {
  createRateLimiter,
  loginRateLimiter,
  signupRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  refreshRateLimiter,
  otpRateLimiter,
  aiRateLimiter,
  publicApiRateLimiter,
  globalApiRateLimiter,
}
