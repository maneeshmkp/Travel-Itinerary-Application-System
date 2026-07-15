import { getDb } from "./db.js"
import { STORES, DEFAULT_OFFLINE_SETTINGS, CACHE_TTL_MS } from "./constants.js"
import { encryptPayload, decryptPayload } from "./crypto.js"

function now() {
  return Date.now()
}

export async function getOfflineSettings() {
  const db = await getDb()
  const row = await db.get(STORES.SETTINGS, "preferences")
  return { ...DEFAULT_OFFLINE_SETTINGS, ...(row?.value || {}) }
}

export async function setOfflineSettings(patch) {
  const db = await getDb()
  const current = await getOfflineSettings()
  const value = { ...current, ...patch }
  await db.put(STORES.SETTINGS, { key: "preferences", value, updatedAt: now() })
  return value
}

export async function cacheTrip(tripId, payload, extras = {}) {
  const db = await getDb()
  await db.put(STORES.TRIPS, {
    id: String(tripId),
    data: payload,
    downloadedAt: now(),
    ...extras,
  })
}

export async function getCachedTrip(tripId) {
  const db = await getDb()
  return db.get(STORES.TRIPS, String(tripId))
}

export async function listDownloadedTrips() {
  const db = await getDb()
  return db.getAll(STORES.TRIPS)
}

export async function cacheExpenseReport(tripId, report) {
  const db = await getDb()
  await db.put(STORES.EXPENSES, {
    id: `report-${tripId}`,
    tripId: String(tripId),
    report,
    cachedAt: now(),
  })
  if (report?.expenses) {
    for (const e of report.expenses) {
      await db.put(STORES.EXPENSES, {
        id: String(e.id),
        tripId: String(tripId),
        expense: e,
        cachedAt: now(),
      })
    }
  }
}

export async function getCachedExpenseReport(tripId) {
  const db = await getDb()
  const row = await db.get(STORES.EXPENSES, `report-${tripId}`)
  return row?.report ?? null
}

export async function cacheNotifications(items) {
  const db = await getDb()
  const tx = db.transaction(STORES.NOTIFICATIONS, "readwrite")
  for (const n of items) {
    await tx.store.put({ ...n, cachedAt: now() })
  }
  await tx.done
}

export async function getCachedNotifications() {
  const db = await getDb()
  return db.getAll(STORES.NOTIFICATIONS)
}

export async function cacheWeather(tripId, data) {
  const db = await getDb()
  await db.put(STORES.WEATHER, {
    tripId: String(tripId),
    data,
    cachedAt: now(),
  })
}

export async function getCachedWeather(tripId) {
  const db = await getDb()
  const row = await db.get(STORES.WEATHER, String(tripId))
  if (!row) return null
  const age = now() - row.cachedAt
  return { ...row, stale: age > CACHE_TTL_MS.weather, ageHours: Math.round(age / 3600000) }
}

export async function cacheBlog(slug, article) {
  const db = await getDb()
  await db.put(STORES.BLOGS, { slug, article, cachedAt: now() })
}

export async function getCachedBlog(slug) {
  const db = await getDb()
  return db.get(STORES.BLOGS, slug)
}

export async function cacheMap(tripId, mapData) {
  const db = await getDb()
  await db.put(STORES.MAPS, { tripId: String(tripId), ...mapData, cachedAt: now() })
}

export async function getCachedMap(tripId) {
  const db = await getDb()
  return db.get(STORES.MAPS, String(tripId))
}

export async function cacheNearby(key, data) {
  const db = await getDb()
  await db.put(STORES.NEARBY, { key, data, cachedAt: now() })
}

export async function getCachedNearby(key) {
  const db = await getDb()
  return db.get(STORES.NEARBY, key)
}

export async function cacheSavedTrips(trips) {
  const db = await getDb()
  const tx = db.transaction(STORES.SAVED_TRIPS, "readwrite")
  for (const t of trips) {
    await tx.store.put({ id: String(t._id || t.id), data: t, cachedAt: now() })
  }
  await tx.done
}

export async function getCachedSavedTrips() {
  const db = await getDb()
  const rows = await db.getAll(STORES.SAVED_TRIPS)
  return rows.map((r) => r.data)
}

export async function cacheApiResponse(cacheKey, data, ttl = CACHE_TTL_MS.api) {
  const db = await getDb()
  await db.put(STORES.META, {
    key: `api:${cacheKey}`,
    data,
    expiresAt: now() + ttl,
    cachedAt: now(),
  })
}

export async function getCachedApiResponse(cacheKey) {
  const db = await getDb()
  const row = await db.get(STORES.META, `api:${cacheKey}`)
  if (!row) return null
  if (row.expiresAt && row.expiresAt < now()) return null
  return row.data
}

export async function getStorageStats() {
  const db = await getDb()
  const trips = await db.count(STORES.TRIPS)
  const queue = await db.count(STORES.QUEUE)
  const blogs = await db.count(STORES.BLOGS)
  const images = await db.count(STORES.META)
  let estimate = 0
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate()
    estimate = est.usage || 0
  }
  return {
    downloadedTrips: trips,
    pendingRequests: queue,
    cachedBlogs: blogs,
    metaEntries: images,
    bytesUsed: estimate,
  }
}

export async function putLocalExpense(tripId, expense) {
  const db = await getDb()
  await db.put(STORES.EXPENSES, {
    id: String(expense.id),
    tripId: String(tripId),
    expense,
    clientId: expense.clientId,
    pending: Boolean(expense.pending),
    cachedAt: now(),
  })
}

export async function removeLocalExpense(expenseId) {
  const db = await getDb()
  await db.delete(STORES.EXPENSES, String(expenseId))
}

export { encryptPayload, decryptPayload }
