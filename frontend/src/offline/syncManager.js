import api from "../services/api.js"
import {
  listQueue,
  removeQueueItem,
  updateQueueItem,
  decryptQueueBody,
  listAiQueue,
} from "./offlineQueue.js"
import {
  cacheExpenseReport,
  cacheTrip,
  getCachedExpenseReport,
  getOfflineSettings,
} from "./cacheService.js"
import { SYNC_STATUS } from "./constants.js"

let status = SYNC_STATUS.ONLINE
let queuedCount = 0
let lastSyncResult = null
const listeners = new Set()

export function getSyncStatus() {
  return { status, queuedCount, lastSyncResult }
}

export function subscribeSync(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  for (const fn of listeners) fn(getSyncStatus())
}

export function setSyncStatus(next, count = queuedCount) {
  status = next
  queuedCount = count
  notify()
}

export async function refreshQueueCount() {
  const items = await listQueue("pending")
  queuedCount = items.length
  if (!navigator.onLine && queuedCount > 0) {
    status = SYNC_STATUS.QUEUED
  } else if (!navigator.onLine) {
    status = SYNC_STATUS.OFFLINE
  } else if (queuedCount > 0) {
    status = SYNC_STATUS.QUEUED
  } else {
    status = SYNC_STATUS.ONLINE
  }
  notify()
  return queuedCount
}

function isMutationMethod(method) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(String(method).toUpperCase())
}

/**
 * Process pending queue — Last Write Wins on conflicts.
 * Returns { synced, failed, message }
 */
export async function syncPendingChanges() {
  const settings = await getOfflineSettings()
  if (!settings.autoSync) return { synced: 0, failed: 0, skipped: true }

  if (!navigator.onLine) {
    setSyncStatus(SYNC_STATUS.OFFLINE)
    return { synced: 0, failed: 0, offline: true }
  }

  const pending = await listQueue("pending")
  if (!pending.length) {
    setSyncStatus(SYNC_STATUS.ONLINE, 0)
    return { synced: 0, failed: 0 }
  }

  setSyncStatus(SYNC_STATUS.SYNCING, pending.length)
  let synced = 0
  let failed = 0

  for (const item of pending) {
    try {
      const body = await decryptQueueBody(item)
      if (body && item.clientId && item.action?.includes("expense")) {
        body.clientRequestId = item.clientId
      }
      const config = {
        method: item.method.toLowerCase(),
        url: item.url,
        headers: {
          ...item.headers,
          "X-Idempotency-Key": item.idempotencyKey,
          "X-Client-Request-Id": item.clientId,
        },
      }
      if (body && item.method !== "DELETE") config.data = body

      const res = await api.request(config)

      if (item.action?.startsWith("expense.")) {
        const tripId = body?.itineraryId || item.url.match(/itineraries\/([^/]+)/)?.[1]
        if (tripId && res.data?.data?.report) {
          await cacheExpenseReport(tripId, res.data.data.report)
        } else if (tripId) {
          const cached = await getCachedExpenseReport(tripId)
          if (cached) await cacheExpenseReport(tripId, cached)
        }
      }

      if (item.action === "itinerary.update" && res.data?.data) {
        const id = res.data.data._id || res.data.data.id
        if (id) await cacheTrip(id, res.data.data)
      }

      await removeQueueItem(item.id)
      synced += 1
    } catch (err) {
      const statusCode = err.response?.status
      if (statusCode === 409) {
        await removeQueueItem(item.id)
        synced += 1
        continue
      }
      failed += 1
      await updateQueueItem(item.id, {
        retries: (item.retries || 0) + 1,
        lastError: err.message,
        status: item.retries >= 3 ? "error" : "pending",
      })
    }
  }

  lastSyncResult = {
    synced,
    failed,
    at: Date.now(),
    message:
      synced > 0
        ? `${synced} offline change${synced === 1 ? "" : "s"} synced successfully.`
        : failed > 0
          ? "Some changes could not sync."
          : null,
  }

  await refreshQueueCount()
  setSyncStatus(failed > 0 ? SYNC_STATUS.ERROR : SYNC_STATUS.ONLINE, await listQueue("pending").then((q) => q.length))

  if (synced > 0 && "serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.sync?.register("travelplan-sync")
    } catch {
      // background sync optional
    }
  }

  return lastSyncResult
}

export function initSyncManager() {
  const onOnline = () => {
    refreshQueueCount().then(() => syncPendingChanges())
  }
  const onOffline = () => {
    refreshQueueCount()
  }

  window.addEventListener("online", onOnline)
  window.addEventListener("offline", onOffline)
  refreshQueueCount()

  return () => {
    window.removeEventListener("online", onOnline)
    window.removeEventListener("offline", onOffline)
  }
}

export function isOffline() {
  return !navigator.onLine
}

export { isMutationMethod }
