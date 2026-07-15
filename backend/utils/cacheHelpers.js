/**
 * Shared cache helpers — hashing, wrappers, invalidation shortcuts.
 */
import { hashPayload, RedisKeys, TTL } from "../services/redisKeys.js"
import { getOrSet, cacheDel, cacheDelByPattern } from "../services/cacheService.js"
import { logRedis } from "../config/redis.js"

export { hashPayload, RedisKeys, TTL }

/** Stable hash for cache keys from arbitrary objects. */
export function stableHash(obj) {
  return hashPayload(obj)
}

/**
 * Wrap an async producer with cache-aside.
 * @template T
 */
export function withCache(key, ttlSeconds, producer, opts = {}) {
  return getOrSet(key, producer, ttlSeconds, opts)
}

/** AI responses — always hash prompt content; compress large JSON. */
export function cacheAiResponse(kind, promptParts, producer) {
  const h = hashPayload(promptParts)
  const keyMap = {
    itinerary: RedisKeys.aiItinerary,
    packing: RedisKeys.aiPacking,
    trip_summary: RedisKeys.aiTripSummary,
    risk: RedisKeys.aiRisk,
    budget: RedisKeys.aiBudget,
    copilot: RedisKeys.aiCopilot,
    llm: RedisKeys.aiGeneric,
  }
  const keyFn = keyMap[kind] || RedisKeys.aiGeneric
  return withCache(keyFn(h), TTL.AI, producer, { compress: true })
}

export async function invalidateTripCaches(userId, tripId) {
  const ops = []
  if (userId && tripId) {
    ops.push(
      cacheDel(
        RedisKeys.tripSummary(userId, tripId),
        RedisKeys.tripHealth(userId, tripId),
        RedisKeys.tripUpcomingBookings(userId, tripId),
        RedisKeys.tripDashboard(userId, tripId),
        RedisKeys.expenseSummary(userId, tripId),
        RedisKeys.expenseBudget(userId, tripId),
        RedisKeys.expenseCategories(userId, tripId),
      ),
      cacheDelByPattern(`travelplan:trip:schedule:${userId}:${tripId}:*`),
    )
  }
  if (userId) {
    ops.push(cacheDel(RedisKeys.tripDashboard(userId, "all")))
    ops.push(cacheDelByPattern(RedisKeys.patternAnalyticsUser(userId)))
  }
  if (tripId) {
    ops.push(cacheDelByPattern(`travelplan:trip:*:*:${tripId}*`))
  }
  await Promise.allSettled(ops)
  logRedis.info("Trip caches invalidated", { userId, tripId })
}

export async function invalidateExpenseCaches(userId, tripId) {
  if (!userId || !tripId) return
  await cacheDel(
    RedisKeys.expenseSummary(userId, tripId),
    RedisKeys.expenseBudget(userId, tripId),
    RedisKeys.expenseCategories(userId, tripId),
    RedisKeys.tripDashboard(userId, tripId),
  )
  await cacheDelByPattern(RedisKeys.patternAnalyticsUser(userId))
  logRedis.info("Expense caches invalidated", { userId, tripId })
}

export async function invalidateBookingCaches(userId, tripId) {
  if (userId) {
    await cacheDel(RedisKeys.tripDashboard(userId, tripId || "all"), RedisKeys.tripUpcomingBookings(userId, tripId || "all"))
    if (tripId) {
      await cacheDel(RedisKeys.tripUpcomingBookings(userId, tripId), RedisKeys.tripDashboard(userId, tripId))
    }
    await cacheDelByPattern(RedisKeys.patternAnalyticsUser(userId))
  }
  logRedis.info("Booking caches invalidated", { userId, tripId })
}

export async function invalidateFlightCaches(flightNumber, userId, tripId) {
  if (flightNumber) {
    await cacheDelByPattern(`travelplan:flight:status:*`)
  }
  if (userId && tripId) {
    await invalidateTripCaches(userId, tripId)
  }
  logRedis.info("Flight caches invalidated", { flightNumber, userId, tripId })
}

export async function invalidateDocumentCaches(userId, tripId) {
  if (userId && tripId) await invalidateTripCaches(userId, tripId)
  logRedis.info("Document caches invalidated", { userId, tripId })
}

export async function invalidateAiCaches() {
  await cacheDelByPattern(RedisKeys.patternAiAll())
  logRedis.info("AI caches invalidated")
}

export async function invalidateWeatherCaches() {
  await cacheDelByPattern(RedisKeys.patternWeather())
  logRedis.info("Weather caches invalidated")
}

export async function invalidateUserProfileCaches(userId) {
  if (!userId) return
  await Promise.allSettled([
    cacheDelByPattern(RedisKeys.patternAnalyticsUser(userId)),
    cacheDelByPattern(RedisKeys.patternNotifUser(userId)),
    cacheDel(RedisKeys.searchRecent(userId)),
  ])
  logRedis.info("User profile caches invalidated", { userId })
}

export async function invalidateNotificationCaches(userId) {
  if (!userId) return
  await cacheDel(RedisKeys.notifUnread(userId), RedisKeys.notifRecent(userId))
}
