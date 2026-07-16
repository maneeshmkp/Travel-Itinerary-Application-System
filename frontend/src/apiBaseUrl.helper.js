/**
 * Shared API base URL resolution for Axios and tests.
 * Production must NEVER fall back to localhost.
 */

export const DEFAULT_PRODUCTION_API_URL =
  "https://travel-itinerary-application-system.onrender.com/api"

export const DEFAULT_PRODUCTION_SOCKET_URL =
  "https://travel-itinerary-application-system.onrender.com"

/** Normalize a raw env value to `…/api` (or null if empty). */
export function normalizeApiBaseUrl(raw) {
  if (raw == null) return null
  const noTrail = String(raw).trim().replace(/\/+$/, "")
  if (!noTrail) return null
  if (noTrail.endsWith("/api")) return noTrail
  return `${noTrail}/api`
}

/**
 * Resolve Axios baseURL.
 * @param {string | undefined | null} raw - typically import.meta.env.VITE_API_URL
 * @param {{ isDev?: boolean }} [opts]
 */
export function resolveApiBaseUrl(raw, { isDev = false } = {}) {
  const normalized = normalizeApiBaseUrl(raw)
  if (normalized) return normalized
  if (isDev) return "/api"
  return DEFAULT_PRODUCTION_API_URL
}

/** @deprecated use resolveApiBaseUrl — kept for existing tests */
export function resolveApiBaseUrlForTest(raw) {
  return resolveApiBaseUrl(raw, { isDev: true })
}

/**
 * Socket.IO origin (no /api suffix).
 * @param {{ socketUrl?: string, apiUrl?: string, isDev?: boolean }} [opts]
 */
export function resolveSocketOrigin({
  socketUrl,
  apiUrl,
  isDev = false,
} = {}) {
  const explicit = String(socketUrl || "").trim()
  if (explicit) return explicit.replace(/\/+$/, "")

  const api = normalizeApiBaseUrl(apiUrl) || (!isDev ? DEFAULT_PRODUCTION_API_URL : null)
  if (api) return api.replace(/\/api$/i, "")

  if (isDev) return "http://127.0.0.1:5000"
  return DEFAULT_PRODUCTION_SOCKET_URL
}
