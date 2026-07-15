/**
 * Rolling metrics for domain event monitoring (admin dashboard).
 */
const MAX_RECENT = 100
const WINDOW_MS = 60_000

const state = {
  published: 0,
  processed: 0,
  failures: 0,
  duplicates: 0,
  byType: Object.create(null),
  recent: [],
  failed: [],
  /** timestamps of publishes in last window */
  publishTimes: [],
}

function bumpType(name, field) {
  if (!state.byType[name]) {
    state.byType[name] = { published: 0, processed: 0, failures: 0, duplicates: 0 }
  }
  state.byType[name][field] += 1
}

function pushCapped(arr, item, max) {
  arr.unshift(item)
  if (arr.length > max) arr.length = max
}

function pruneWindow(now = Date.now()) {
  state.publishTimes = state.publishTimes.filter((t) => now - t < WINDOW_MS)
}

export const eventMetrics = {
  recordPublished(eventName, { eventId, payload, ctx } = {}) {
    state.published += 1
    bumpType(eventName, "published")
    const now = Date.now()
    state.publishTimes.push(now)
    pruneWindow(now)
    pushCapped(
      state.recent,
      {
        eventId,
        eventName,
        source: ctx?.source,
        userId: ctx?.userId,
        publishedAt: ctx?.publishedAt || new Date().toISOString(),
        summary: summarizePayload(payload),
      },
      MAX_RECENT,
    )
  },

  recordProcessed(eventName, { eventId, ms, handlers, failures } = {}) {
    state.processed += 1
    bumpType(eventName, "processed")
    const entry = state.recent.find((r) => r.eventId === eventId)
    if (entry) {
      entry.ms = ms
      entry.handlers = handlers
      entry.failures = failures
    }
  },

  recordFailure(eventName, { eventId, subscriber, message } = {}) {
    state.failures += 1
    bumpType(eventName, "failures")
    pushCapped(
      state.failed,
      {
        at: new Date().toISOString(),
        eventId,
        eventName,
        subscriber,
        message,
      },
      MAX_RECENT,
    )
  },

  recordDuplicate(eventName) {
    state.duplicates += 1
    bumpType(eventName, "duplicates")
  },

  getSnapshot() {
    pruneWindow()
    const byType = Object.entries(state.byType)
      .map(([eventName, stats]) => ({ eventName, ...stats }))
      .sort((a, b) => b.published - a.published)

    return {
      totals: {
        published: state.published,
        processed: state.processed,
        failures: state.failures,
        duplicates: state.duplicates,
      },
      eventsPerMinute: state.publishTimes.length,
      topEventTypes: byType.slice(0, 15),
      recentEvents: state.recent.slice(0, 50),
      failedEvents: state.failed.slice(0, 50),
    }
  },

  resetForTests() {
    state.published = 0
    state.processed = 0
    state.failures = 0
    state.duplicates = 0
    state.byType = Object.create(null)
    state.recent = []
    state.failed = []
    state.publishTimes = []
  },
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== "object") return {}
  const keys = ["id", "_id", "userId", "tripId", "itineraryId", "bookingId", "email", "role", "status", "type"]
  const out = {}
  for (const k of keys) {
    if (payload[k] != null) out[k] = String(payload[k]).slice(0, 80)
  }
  return out
}

export default eventMetrics
