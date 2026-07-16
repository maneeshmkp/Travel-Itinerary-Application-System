/**
 * Shared CORS / Socket.IO origin allowlist.
 * Always includes the production Vercel SPA so Render works even if FRONTEND_URL is missing.
 */

export const DEFAULT_PRODUCTION_FRONTEND_URL =
  "https://travel-itinerary-application-system.vercel.app"

function normalizeOrigin(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
}

/**
 * @returns {string[]}
 */
export function getAllowedOrigins() {
  const fromEnv = [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || "").split(","),
  ]
    .map(normalizeOrigin)
    .filter(Boolean)

  const defaults = [normalizeOrigin(DEFAULT_PRODUCTION_FRONTEND_URL)]

  const isProd = process.env.NODE_ENV === "production"
  const localDev = isProd
    ? []
    : ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]

  return [...new Set([...fromEnv, ...defaults, ...localDev])]
}

/**
 * cors / socket.io compatible origin checker.
 * @param {string | undefined} origin
 * @param {(err: Error | null, allow?: boolean | string) => void} callback
 */
export function corsOriginDelegate(origin, callback) {
  const allowed = getAllowedOrigins()

  // Same-origin / non-browser (curl, health checks) — no Origin header
  if (!origin) {
    return callback(null, true)
  }

  const normalized = normalizeOrigin(origin)
  if (allowed.includes(normalized)) {
    return callback(null, true)
  }

  // Vercel preview deployments: https://*.vercel.app when explicitly enabled
  if (
    process.env.ALLOW_VERCEL_PREVIEWS === "true" &&
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)
  ) {
    return callback(null, true)
  }

  return callback(null, false)
}
