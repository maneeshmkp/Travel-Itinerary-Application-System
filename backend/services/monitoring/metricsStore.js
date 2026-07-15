/**
 * In-memory metrics for production observability.
 * Ring buffers keep a sliding window (default 60 minutes) without Redis.
 */
import os from "os"
import { monitorEventLoopDelay } from "perf_hooks"

const WINDOW_MS = 60 * 60 * 1000
const MAX_EVENTS = 20_000
const MAX_ERROR_SAMPLES = 200
const MAX_SLOW = 100
const MAX_MONGO = 5_000
const MAX_PROCESS_SAMPLES = 120

const state = {
  startedAt: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  totalLatencyMs: 0,
  requests: [], // { t, method, path, status, ms, userId? }
  errors: [], // { t, path, status, code, message }
  slow: [], // { t, path, ms, status }
  routeHits: new Map(), // path -> { count, totalMs, errors, samples: number[] }
  activeUsers: new Set(),
  apiUsage: new Map(), // prefix -> count
  sockets: {
    connects: 0,
    disconnects: 0,
    current: 0,
  },
  domain: {
    ai: { ok: 0, fail: 0, lastError: null, lastOkAt: null },
    weather: { ok: 0, fail: 0, lastError: null, lastOkAt: null },
    maps: { ok: 0, fail: 0, lastError: null, lastOkAt: null },
    s3: { ok: 0, fail: 0, lastError: null, lastOkAt: null },
    booking: { ok: 0, fail: 0 },
    expense: { ok: 0, fail: 0 },
  },
  redis: {
    hits: 0,
    misses: 0,
    invalidations: 0,
    rateLimited: 0,
    rateLimitedByBucket: {},
  },
  mongo: {
    ops: 0,
    totalMs: 0,
    samples: [], // { t, op, collection, ms }
    byCollection: new Map(), // collection -> { count, totalMs }
  },
  processSamples: [], // { t, heapUsedMb, rssMb, cpuApprox, eventLoopP99Ms }
}

const elHistogram =
  typeof monitorEventLoopDelay === "function"
    ? monitorEventLoopDelay({ resolution: 20 })
    : null
if (elHistogram) elHistogram.enable()

let lastCpu = process.cpuUsage()
let lastCpuWall = Date.now()

function prune() {
  const cutoff = Date.now() - WINDOW_MS
  while (state.requests.length && state.requests[0].t < cutoff) state.requests.shift()
  while (state.errors.length && state.errors[0].t < cutoff) state.errors.shift()
  while (state.slow.length && state.slow[0].t < cutoff) state.slow.shift()
  while (state.mongo.samples.length && state.mongo.samples[0].t < cutoff) state.mongo.samples.shift()
  while (state.processSamples.length && state.processSamples[0].t < cutoff) {
    state.processSamples.shift()
  }
  if (state.requests.length > MAX_EVENTS) state.requests.splice(0, state.requests.length - MAX_EVENTS)
  if (state.mongo.samples.length > MAX_MONGO) {
    state.mongo.samples.splice(0, state.mongo.samples.length - MAX_MONGO)
  }
  if (state.processSamples.length > MAX_PROCESS_SAMPLES) {
    state.processSamples.splice(0, state.processSamples.length - MAX_PROCESS_SAMPLES)
  }
}

function normalizePath(url = "") {
  const pathOnly = String(url).split("?")[0]
  return pathOnly
    .replace(/\/[0-9a-fA-F]{24}/g, "/:id")
    .replace(/\/\d+/g, "/:id")
}

function apiPrefix(path) {
  const parts = path.split("/").filter(Boolean)
  if (parts[0] === "api" && parts[1]) return `/api/${parts[1]}`
  return parts[0] ? `/${parts[0]}` : path
}

/** Inclusive percentile from a numeric array (sorted copy). */
export function percentile(values, p) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return Math.round(sorted[idx])
}

export function recordRequest({ method, url, status, ms, userId }) {
  prune()
  const path = normalizePath(url)
  const t = Date.now()
  state.totalRequests += 1
  state.totalLatencyMs += ms
  state.requests.push({ t, method, path, status, ms, userId: userId || null })

  if (userId) state.activeUsers.add(String(userId))

  const route = state.routeHits.get(path) || { count: 0, totalMs: 0, errors: 0, samples: [] }
  route.count += 1
  route.totalMs += ms
  if (status >= 500) route.errors += 1
  route.samples.push(ms)
  if (route.samples.length > 200) route.samples.shift()
  state.routeHits.set(path, route)

  const prefix = apiPrefix(path)
  state.apiUsage.set(prefix, (state.apiUsage.get(prefix) || 0) + 1)

  if (status >= 400) {
    state.totalErrors += 1
  }

  if (ms >= 1000) {
    state.slow.push({ t, path, ms, status })
    if (state.slow.length > MAX_SLOW) state.slow.shift()
  }
}

export function recordErrorSample({ path, status, code, message }) {
  prune()
  state.errors.push({
    t: Date.now(),
    path: normalizePath(path || ""),
    status: status || 500,
    code: code || "SERVER_ERROR",
    message: String(message || "").slice(0, 200),
  })
  if (state.errors.length > MAX_ERROR_SAMPLES) state.errors.shift()
}

export function recordSocketConnect() {
  state.sockets.connects += 1
  state.sockets.current += 1
}

export function recordSocketDisconnect() {
  state.sockets.disconnects += 1
  state.sockets.current = Math.max(0, state.sockets.current - 1)
}

export function recordDomainEvent(domain, ok, errorMessage = null) {
  const bucket = state.domain[domain]
  if (!bucket) return
  if (ok) {
    bucket.ok += 1
    bucket.lastOkAt = new Date().toISOString()
  } else {
    bucket.fail += 1
    bucket.lastError = String(errorMessage || "unknown").slice(0, 200)
  }
}

export function recordCacheHit() {
  state.redis.hits += 1
}

export function recordCacheMiss() {
  state.redis.misses += 1
}

export function recordCacheInvalidate(count = 1) {
  state.redis.invalidations += Number(count) || 1
}

export function recordRateLimited(bucket = "default") {
  state.redis.rateLimited += 1
  const b = String(bucket)
  state.redis.rateLimitedByBucket[b] = (state.redis.rateLimitedByBucket[b] || 0) + 1
}

/**
 * Record a MongoDB operation duration (find / aggregate / etc.).
 * @param {{ op?: string, collection?: string, ms: number }} opts
 */
export function recordMongoMs({ op = "query", collection = "unknown", ms }) {
  prune()
  const duration = Math.max(0, Number(ms) || 0)
  state.mongo.ops += 1
  state.mongo.totalMs += duration
  state.mongo.samples.push({
    t: Date.now(),
    op: String(op),
    collection: String(collection),
    ms: duration,
  })
  const key = String(collection)
  const row = state.mongo.byCollection.get(key) || { count: 0, totalMs: 0 }
  row.count += 1
  row.totalMs += duration
  state.mongo.byCollection.set(key, row)
}

/** Sample heap / CPU / event-loop into the ring buffer (call periodically). */
export function sampleProcessMetrics() {
  prune()
  const mem = process.memoryUsage()
  const now = Date.now()
  const cpu = process.cpuUsage(lastCpu)
  const wallMs = Math.max(1, now - lastCpuWall)
  lastCpu = process.cpuUsage()
  lastCpuWall = now
  const cpuApprox = Math.min(
    100,
    Math.round(((cpu.user + cpu.system) / 1000 / wallMs) * 1000) / 10,
  )

  let eventLoopP99Ms = 0
  if (elHistogram) {
    eventLoopP99Ms = Math.round(elHistogram.percentile(99) / 1e6)
    elHistogram.reset()
  }

  state.processSamples.push({
    t: now,
    heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
    heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
    rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
    cpuApprox,
    eventLoopP99Ms,
    load1: os.loadavg()[0],
  })
}

export function getRedisCacheMetrics() {
  const { hits, misses, invalidations, rateLimited, rateLimitedByBucket } = state.redis
  const total = hits + misses
  return {
    hits,
    misses,
    invalidations,
    rateLimited,
    rateLimitedByBucket: { ...rateLimitedByBucket },
    hitRatio: total > 0 ? Math.round((hits / total) * 1000) / 10 : 0,
  }
}

export function getSocketMetrics() {
  return { ...state.sockets }
}

function buildLatencySeries(now) {
  const series = []
  for (let i = 29; i >= 0; i -= 1) {
    const start = now - (i + 1) * 60_000
    const end = now - i * 60_000
    const bucket = state.requests.filter((r) => r.t >= start && r.t < end)
    const msList = bucket.map((r) => r.ms)
    series.push({
      minute: new Date(end).toISOString(),
      count: bucket.length,
      avgMs: msList.length ? Math.round(msList.reduce((s, v) => s + v, 0) / msList.length) : 0,
      p95Ms: percentile(msList, 95),
      p99Ms: percentile(msList, 99),
    })
  }
  return series
}

export function getMetricsSnapshot() {
  prune()
  // Keep process series fresh without requiring an external cron
  const lastSample = state.processSamples[state.processSamples.length - 1]
  if (!lastSample || Date.now() - lastSample.t > 55_000) {
    sampleProcessMetrics()
  }

  const now = Date.now()
  const lastMinute = state.requests.filter((r) => r.t >= now - 60_000)
  const last5 = state.requests.filter((r) => r.t >= now - 5 * 60_000)
  const errorLast5 = last5.filter((r) => r.status >= 400)
  const last5Ms = last5.map((r) => r.ms)

  const rpm =
    lastMinute.length > 0
      ? lastMinute.length
      : last5.length > 0
        ? Math.round((last5.length / 5) * 10) / 10
        : 0

  const avgLatency =
    state.totalRequests > 0 ? Math.round(state.totalLatencyMs / state.totalRequests) : 0
  const windowAvg =
    last5.length > 0
      ? Math.round(last5.reduce((s, r) => s + r.ms, 0) / last5.length)
      : avgLatency

  const p50LatencyMs = percentile(last5Ms, 50)
  const p95LatencyMs = percentile(last5Ms, 95)
  const p99LatencyMs = percentile(last5Ms, 99)

  const mostUsed = [...state.apiUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))

  const slowEndpoints = [...state.routeHits.entries()]
    .map(([path, v]) => ({
      path,
      count: v.count,
      avgMs: v.count ? Math.round(v.totalMs / v.count) : 0,
      p95Ms: percentile(v.samples || [], 95),
      errors: v.errors,
    }))
    .filter((r) => r.avgMs >= 400 || r.count >= 5)
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 10)

  const topErrors = Object.values(
    state.errors.reduce((acc, e) => {
      const key = `${e.code}|${e.path}`
      if (!acc[key]) acc[key] = { code: e.code, path: e.path, count: 0, sample: e.message }
      acc[key].count += 1
      return acc
    }, {}),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const latencySeries = buildLatencySeries(now)
  const rpmSeries = latencySeries.map((p) => ({ minute: p.minute, count: p.count }))

  const mongoLast5 = state.mongo.samples.filter((s) => s.t >= now - 5 * 60_000)
  const mongoMs = mongoLast5.map((s) => s.ms)
  const mongoByCollection = [...state.mongo.byCollection.entries()]
    .map(([collection, v]) => ({
      collection,
      count: v.count,
      avgMs: v.count ? Math.round(v.totalMs / v.count) : 0,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 10)

  const mongoQuerySeries = []
  for (let i = 29; i >= 0; i -= 1) {
    const start = now - (i + 1) * 60_000
    const end = now - i * 60_000
    const bucket = state.mongo.samples.filter((s) => s.t >= start && s.t < end)
    const msList = bucket.map((s) => s.ms)
    mongoQuerySeries.push({
      minute: new Date(end).toISOString(),
      avgMs: msList.length ? Math.round(msList.reduce((s, v) => s + v, 0) / msList.length) : 0,
      count: bucket.length,
    })
  }

  const processLatest = state.processSamples[state.processSamples.length - 1] || null
  const redisCache = getRedisCacheMetrics()
  const redisHitSeries = latencySeries.map((p) => ({
    minute: p.minute,
    // Point-in-time ratio (lifetime within process) — charted for trend continuity
    hitRatio: redisCache.hitRatio,
  }))

  return {
    windowMinutes: 60,
    totalRequests: state.totalRequests,
    totalErrors: state.totalErrors,
    errorRate:
      state.totalRequests > 0
        ? Math.round((state.totalErrors / state.totalRequests) * 1000) / 10
        : 0,
    requestsPerMinute: rpm,
    averageLatencyMs: windowAvg,
    lifetimeAverageLatencyMs: avgLatency,
    p50LatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    throughputRps:
      last5.length > 0 ? Math.round((last5.length / (5 * 60)) * 100) / 100 : 0,
    activeUsersApproximate: state.activeUsers.size,
    socketConnections: state.sockets.current,
    socketLifetimeConnects: state.sockets.connects,
    mostUsedApis: mostUsed,
    slowEndpoints,
    topErrors,
    requestsPerMinuteSeries: rpmSeries,
    latencySeries,
    domain: state.domain,
    redisCache,
    redisHitSeries,
    mongo: {
      ops: state.mongo.ops,
      lifetimeAvgMs:
        state.mongo.ops > 0 ? Math.round(state.mongo.totalMs / state.mongo.ops) : 0,
      windowOps: mongoLast5.length,
      avgMs: mongoMs.length
        ? Math.round(mongoMs.reduce((s, v) => s + v, 0) / mongoMs.length)
        : 0,
      p95Ms: percentile(mongoMs, 95),
      p99Ms: percentile(mongoMs, 99),
      byCollection: mongoByCollection,
      queryTimeSeries: mongoQuerySeries,
    },
    process: {
      latest: processLatest,
      series: state.processSamples.map((s) => ({
        minute: new Date(s.t).toISOString(),
        heapUsedMb: s.heapUsedMb,
        rssMb: s.rssMb,
        cpuApprox: s.cpuApprox,
        eventLoopP99Ms: s.eventLoopP99Ms,
      })),
    },
    last5Minutes: {
      requests: last5.length,
      errors: errorLast5.length,
      errorRate: last5.length ? Math.round((errorLast5.length / last5.length) * 1000) / 10 : 0,
      p50LatencyMs,
      p95LatencyMs,
      p99LatencyMs,
    },
  }
}

export function resetMetricsForTests() {
  state.totalRequests = 0
  state.totalErrors = 0
  state.totalLatencyMs = 0
  state.requests = []
  state.errors = []
  state.slow = []
  state.routeHits.clear()
  state.activeUsers.clear()
  state.apiUsage.clear()
  state.mongo.ops = 0
  state.mongo.totalMs = 0
  state.mongo.samples = []
  state.mongo.byCollection.clear()
  state.processSamples = []
  state.redis.hits = 0
  state.redis.misses = 0
  state.redis.invalidations = 0
  state.redis.rateLimited = 0
  state.redis.rateLimitedByBucket = {}
}
