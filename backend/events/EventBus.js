/**
 * In-process Domain Event Bus.
 * Publishers fire domain events; subscribers run in parallel with failure isolation.
 */
import crypto from "crypto"
import logger from "../logger/index.js"
import { eventMetrics } from "./metrics.js"
import { getTenantContext } from "../utils/tenantScope.js"

const logEvents = logger.child({ domain: "events" })

/** @type {Map<string, Array<{ name: string, handler: Function }>>} */
const subscribers = new Map()

/** Recent dedupe keys → expiry (ms) */
const dedupeSeen = new Map()
const DEDUPE_TTL_MS = 60_000
const DEDUPE_MAX = 5_000

function pruneDedupe(now = Date.now()) {
  for (const [k, exp] of dedupeSeen) {
    if (exp <= now) dedupeSeen.delete(k)
  }
  if (dedupeSeen.size > DEDUPE_MAX) {
    const overflow = dedupeSeen.size - DEDUPE_MAX
    let i = 0
    for (const k of dedupeSeen.keys()) {
      dedupeSeen.delete(k)
      if (++i >= overflow) break
    }
  }
}

function isDuplicate(dedupeKey) {
  if (!dedupeKey) return false
  pruneDedupe()
  if (dedupeSeen.has(dedupeKey)) return true
  dedupeSeen.set(dedupeKey, Date.now() + DEDUPE_TTL_MS)
  return false
}

/**
 * Subscribe to a domain event.
 * @param {string} eventName
 * @param {Function} handler async (payload, ctx) => void
 * @param {{ name?: string }} [opts]
 */
export function on(eventName, handler, opts = {}) {
  if (!eventName || typeof handler !== "function") {
    throw new Error("EventBus.on requires eventName and handler")
  }
  const name = opts.name || handler.name || "anonymous"
  if (!subscribers.has(eventName)) subscribers.set(eventName, [])
  subscribers.get(eventName).push({ name, handler })
  return () => off(eventName, handler)
}

export function off(eventName, handler) {
  const list = subscribers.get(eventName)
  if (!list) return
  const next = list.filter((s) => s.handler !== handler)
  if (next.length) subscribers.set(eventName, next)
  else subscribers.delete(eventName)
}

export function clearAllSubscribers() {
  subscribers.clear()
}

export function listSubscribers(eventName) {
  if (eventName) return (subscribers.get(eventName) || []).map((s) => s.name)
  const out = {}
  for (const [k, v] of subscribers) out[k] = v.map((s) => s.name)
  return out
}

function resolveTenantId(payload = {}, meta = {}) {
  if (payload.tenantId) return String(payload.tenantId)
  if (meta.metadata?.tenantId) return String(meta.metadata.tenantId)
  const store = getTenantContext()
  if (store?.tenantId) return String(store.tenantId)
  return null
}

/**
 * Publish a domain event. Always resolves; never throws to callers.
 * @param {string} eventName
 * @param {object} [payload]
 * @param {{ source?: string, userId?: string, correlationId?: string, dedupeKey?: string, metadata?: object }} [meta]
 */
export async function publish(eventName, payload = {}, meta = {}) {
  const started = Date.now()
  const eventId = crypto.randomUUID()
  const correlationId = meta.correlationId || eventId
  const tenantId = resolveTenantId(payload, meta)
  const enrichedPayload = tenantId && !payload.tenantId ? { ...payload, tenantId } : payload
  const ctx = {
    eventId,
    eventName,
    correlationId,
    source: meta.source || "unknown",
    userId: meta.userId ? String(meta.userId) : null,
    publishedAt: new Date().toISOString(),
    metadata: { ...(meta.metadata || {}), ...(tenantId ? { tenantId } : {}) },
  }

  const dedupeKey = meta.dedupeKey || null
  if (isDuplicate(dedupeKey)) {
    logEvents.info("Event skipped (duplicate)", { eventName, eventId, dedupeKey })
    eventMetrics.recordDuplicate(eventName)
    return { eventId, skipped: true, reason: "duplicate" }
  }

  logEvents.info("Event Published", {
    eventName,
    eventId,
    correlationId,
    source: ctx.source,
    userId: ctx.userId,
  })
  eventMetrics.recordPublished(eventName, { eventId, payload: enrichedPayload, ctx })

  const list = subscribers.get(eventName) || []
  if (!list.length) {
    const ms = Date.now() - started
    eventMetrics.recordProcessed(eventName, { eventId, ms, handlers: 0, failures: 0 })
    return { eventId, handlers: 0, failures: 0, ms }
  }

  const results = await Promise.all(
    list.map(async ({ name, handler }) => {
      const t0 = Date.now()
      try {
        await handler(enrichedPayload, ctx)
        const ms = Date.now() - t0
        logEvents.info("Event Processed", {
          eventName,
          eventId,
          subscriber: name,
          ms,
        })
        return { name, ok: true, ms }
      } catch (err) {
        const ms = Date.now() - t0
        logEvents.error("Subscriber Error", {
          eventName,
          eventId,
          subscriber: name,
          ms,
          message: err?.message || String(err),
          stack: err?.stack,
        })
        eventMetrics.recordFailure(eventName, {
          eventId,
          subscriber: name,
          message: err?.message || String(err),
        })
        return { name, ok: false, ms, error: err?.message || String(err) }
      }
    }),
  )

  const failures = results.filter((r) => !r.ok).length
  const ms = Date.now() - started
  eventMetrics.recordProcessed(eventName, {
    eventId,
    ms,
    handlers: list.length,
    failures,
  })

  return {
    eventId,
    handlers: list.length,
    failures,
    ms,
    results,
  }
}

/** Fire-and-forget publish (does not block request). Captures tenantId before async hop. */
export function publishAsync(eventName, payload = {}, meta = {}) {
  const tenantId = resolveTenantId(payload, meta)
  const enriched =
    tenantId && !payload.tenantId ? { ...payload, tenantId } : payload
  const enrichedMeta = tenantId
    ? { ...meta, metadata: { ...(meta.metadata || {}), tenantId } }
    : meta
  setImmediate(() => {
    publish(eventName, enriched, enrichedMeta).catch((err) => {
      logEvents.error("publishAsync fatal", { eventName, message: err.message })
    })
  })
}

export function resetDedupeForTests() {
  dedupeSeen.clear()
}

const EventBus = {
  on,
  off,
  publish,
  publishAsync,
  clearAllSubscribers,
  listSubscribers,
  resetDedupeForTests,
}

export default EventBus
