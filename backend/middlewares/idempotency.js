/** In-memory idempotency cache with TTL (production: use Redis/Mongo). */
const store = new Map()
const TTL_MS = 24 * 60 * 60 * 1000

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(key)
  }
}

export function idempotencyMiddleware(req, res, next) {
  const key = req.headers["x-idempotency-key"] || req.headers["x-client-request-id"]
  if (!key || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next()
  }

  cleanup()
  const cacheKey = `${req.user?._id || "anon"}:${req.method}:${req.originalUrl}:${key}`
  const existing = store.get(cacheKey)
  if (existing) {
    return res.status(existing.status).json(existing.body)
  }

  const originalJson = res.json.bind(res)
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      store.set(cacheKey, { status: res.statusCode, body, expiresAt: Date.now() + TTL_MS })
    }
    return originalJson(body)
  }

  req.idempotencyKey = key
  next()
}
