/** Copilot tool-result cache — Redis when available, in-memory fallback. */

import { hashPayload } from "../redisKeys.js"
import { cacheGet, cacheSet } from "../cacheService.js"

const store = new Map()
const DEFAULT_TTL_MS = 5 * 60 * 1000
const DEFAULT_TTL_SEC = Math.floor(DEFAULT_TTL_MS / 1000)

export function cacheKey(parts) {
  return parts.filter((p) => p != null && p !== "").join("|")
}

function redisKey(key) {
  return `travelplan:ai:copilot:${hashPayload(key)}`
}

export async function getCachedAsync(key) {
  const hit = store.get(key)
  if (hit && Date.now() <= hit.expires) return hit.data
  if (hit) store.delete(key)

  try {
    const remote = await cacheGet(redisKey(key))
    if (remote != null) {
      store.set(key, { expires: Date.now() + DEFAULT_TTL_MS, data: remote })
      return remote
    }
  } catch {
    /* fallback */
  }
  return null
}

export function getCached(key) {
  const hit = store.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    store.delete(key)
    return null
  }
  return hit.data
}

export function setCached(key, data, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { expires: Date.now() + ttlMs, data })
  cacheSet(redisKey(key), data, Math.floor(ttlMs / 1000) || DEFAULT_TTL_SEC, {
    compress: true,
  }).catch(() => {})
}

export function clearCopilotCache() {
  store.clear()
  import("../../utils/cacheHelpers.js")
    .then(({ invalidateAiCaches }) => invalidateAiCaches())
    .catch(() => {})
}
