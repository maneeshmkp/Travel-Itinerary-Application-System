/**
 * Soft cleanup of stale Redis pattern keys (safety net beyond TTLs).
 */
export async function processCleanupRedisJob() {
  const { isRedisConfigured, getRedis } = await import("../config/redis.js")
  if (!isRedisConfigured()) return { skipped: true, reason: "redis not configured" }

  try {
    await getRedis()
  } catch {
    return { skipped: true, reason: "redis unavailable" }
  }

  const { cacheDelByPattern } = await import("../services/cacheService.js")
  const { RedisKeys } = await import("../services/redisKeys.js")

  const patterns = [
    RedisKeys.patternAiAll?.(),
    RedisKeys.patternWeather?.(),
    `${process.env.REDIS_KEY_PREFIX || "tp"}:tmp:*`,
    `${process.env.REDIS_KEY_PREFIX || "tp"}:lock:*`,
  ].filter(Boolean)

  let deleted = 0
  for (const pattern of patterns) {
    try {
      const n = await cacheDelByPattern(pattern)
      deleted += Number(n) || 0
    } catch {
      /* continue */
    }
  }
  return { deleted, patterns: patterns.length }
}
