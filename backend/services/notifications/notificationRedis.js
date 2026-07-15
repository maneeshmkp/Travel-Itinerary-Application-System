/**
 * Redis-backed notification helpers (unread count, recent list, socket buffer).
 * Always falls back to MongoDB on miss / Redis down.
 */
import { RedisKeys, TTL } from "../services/redisKeys.js"
import { cacheGet, cacheSet, cacheDel } from "../services/cacheService.js"
import { getRedis, isRedisReady, logRedis } from "../config/redis.js"

export async function cacheUnreadCount(userId, count) {
  if (userId == null) return
  await cacheSet(RedisKeys.notifUnread(userId), { count: Number(count) || 0 }, TTL.NOTIFICATION_UNREAD)
}

export async function getCachedUnreadCount(userId) {
  const hit = await cacheGet(RedisKeys.notifUnread(userId))
  return hit?.count ?? null
}

export async function cacheRecentNotifications(userId, items) {
  if (userId == null) return
  await cacheSet(RedisKeys.notifRecent(userId), { items }, TTL.NOTIFICATION_RECENT)
}

export async function getCachedRecentNotifications(userId) {
  const hit = await cacheGet(RedisKeys.notifRecent(userId))
  return hit?.items ?? null
}

export async function invalidateNotificationRedis(userId) {
  if (!userId) return
  await cacheDel(RedisKeys.notifUnread(userId), RedisKeys.notifRecent(userId))
}

/** Push a lightweight payload into a short-lived socket buffer (list). */
export async function pushSocketBuffer(userId, payload, { max = 50 } = {}) {
  try {
    const redis = await getRedis()
    if (!redis || !isRedisReady()) return
    const key = RedisKeys.notifSocketBuffer(userId)
    await redis.lpush(key, JSON.stringify(payload))
    await redis.ltrim(key, 0, max - 1)
    await redis.expire(key, TTL.SOCKET_BUFFER)
  } catch (err) {
    logRedis.debug("socket buffer push skipped", { message: err?.message })
  }
}

export async function drainSocketBuffer(userId) {
  try {
    const redis = await getRedis()
    if (!redis || !isRedisReady()) return []
    const key = RedisKeys.notifSocketBuffer(userId)
    const items = await redis.lrange(key, 0, -1)
    await redis.del(key)
    return items.map((s) => {
      try {
        return JSON.parse(s)
      } catch {
        return null
      }
    }).filter(Boolean)
  } catch {
    return []
  }
}

/** RPUSH onto a durable notification delivery queue key (observability / deferred). */
export async function enqueueNotificationPayload(payload) {
  try {
    const redis = await getRedis()
    if (!redis || !isRedisReady()) return false
    await redis.rpush(RedisKeys.notifQueue(), JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}
