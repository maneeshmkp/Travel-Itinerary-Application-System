"use client"

import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  Cloud,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Map,
  Radio,
  RefreshCw,
  Server,
  Sparkles,
  Wifi,
} from "lucide-react"
import { monitoringAPI } from "../services/api"

const RpmChart = lazy(() => import("../components/monitoring/RpmChart"))
const LatencyChart = lazy(() =>
  import("../components/monitoring/PerfCharts").then((m) => ({ default: m.LatencyChart })),
)
const MemoryCpuChart = lazy(() =>
  import("../components/monitoring/PerfCharts").then((m) => ({ default: m.MemoryCpuChart })),
)
const RedisHitChart = lazy(() =>
  import("../components/monitoring/PerfCharts").then((m) => ({ default: m.RedisHitChart })),
)
const MongoQueryChart = lazy(() =>
  import("../components/monitoring/PerfCharts").then((m) => ({ default: m.MongoQueryChart })),
)

const REFRESH_MS = 10_000

const SERVICE_ICONS = {
  mongodb: Database,
  redis: HardDrive,
  s3: Cloud,
  ai: Sparkles,
  weather: Cloud,
  maps: Map,
  socket: Radio,
}

function statusColor(color) {
  if (color === "green") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (color === "yellow") return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
  return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
}

function Dot({ color }) {
  const bg = color === "green" ? "bg-emerald-500" : color === "yellow" ? "bg-amber-500" : "bg-red-500"
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${bg}`} aria-hidden />
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function ServiceCard({ service }) {
  const Icon = SERVICE_ICONS[service.key] || Server
  const isRedis = service.key === "redis"
  return (
    <div className={`rounded-xl border p-4 ${statusColor(service.color)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <p className="text-sm font-semibold">{service.name}</p>
        </div>
        <Dot color={service.color} />
      </div>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide opacity-80">{service.status}</p>
      <p className="mt-1 text-xs opacity-90 line-clamp-2">{service.detail}</p>
      {isRedis && service.configured && service.status !== "not_configured" ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] tabular-nums opacity-90">
          <div>
            <dt className="opacity-70">Memory</dt>
            <dd>{service.memoryUsage || "—"}</dd>
          </div>
          <div>
            <dt className="opacity-70">Clients</dt>
            <dd>{service.connectedClients ?? "—"}</dd>
          </div>
          <div>
            <dt className="opacity-70">Keys</dt>
            <dd>{service.keys ?? "—"}</dd>
          </div>
          <div>
            <dt className="opacity-70">Evictions</dt>
            <dd>{service.evictions ?? "—"}</dd>
          </div>
          <div>
            <dt className="opacity-70">Hit ratio</dt>
            <dd>{service.hitRatio != null ? `${service.hitRatio}%` : "—"}</dd>
          </div>
          <div>
            <dt className="opacity-70">App hits/miss</dt>
            <dd>
              {service.cacheHits ?? 0}/{service.cacheMisses ?? 0}
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  )
}

export default function SystemMonitoring() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [tab, setTab] = useState("overview")

  const load = useCallback(async () => {
    try {
      const res = await monitoringAPI.overview()
      setData(res.data?.data || null)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load monitoring data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const health = data?.health
  const metrics = data?.metrics
  const alerts = data?.alerts || []

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            System Monitoring
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live health, metrics, and alerts · auto-refresh every 10s
            {lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted/50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview
        </TabButton>
        <TabButton active={tab === "performance"} onClick={() => setTab("performance")}>
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" />
            Performance
          </span>
        </TabButton>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading monitoring overview…</p>
      ) : null}

      {tab === "performance" && metrics ? (
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Avg latency"
              value={metrics.averageLatencyMs != null ? `${metrics.averageLatencyMs} ms` : "—"}
            />
            <StatCard
              label="P95 latency"
              value={metrics.p95LatencyMs != null ? `${metrics.p95LatencyMs} ms` : "—"}
              hint="last 5 min"
            />
            <StatCard
              label="P99 latency"
              value={metrics.p99LatencyMs != null ? `${metrics.p99LatencyMs} ms` : "—"}
              hint="last 5 min"
            />
            <StatCard
              label="Throughput"
              value={metrics.throughputRps != null ? `${metrics.throughputRps} rps` : "—"}
            />
            <StatCard
              label="Redis hit %"
              value={metrics.redisCache?.hitRatio != null ? `${metrics.redisCache.hitRatio}%` : "—"}
              hint={`${metrics.redisCache?.hits ?? 0} hits / ${metrics.redisCache?.misses ?? 0} miss`}
            />
            <StatCard
              label="Mongo avg"
              value={metrics.mongo?.avgMs != null ? `${metrics.mongo.avgMs} ms` : "—"}
              hint={`P95 ${metrics.mongo?.p95Ms ?? 0} ms · ${metrics.mongo?.windowOps ?? 0} ops`}
            />
          </section>

          <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Heap"
              value={
                metrics.process?.latest?.heapUsedMb != null
                  ? `${metrics.process.latest.heapUsedMb} MB`
                  : "—"
              }
              hint={
                metrics.process?.latest?.heapTotalMb != null
                  ? `of ${metrics.process.latest.heapTotalMb} MB`
                  : undefined
              }
            />
            <StatCard
              label="RSS"
              value={metrics.process?.latest?.rssMb != null ? `${metrics.process.latest.rssMb} MB` : "—"}
            />
            <StatCard
              label="CPU approx"
              value={
                metrics.process?.latest?.cpuApprox != null
                  ? `${metrics.process.latest.cpuApprox}%`
                  : "—"
              }
            />
            <StatCard
              label="Event loop P99"
              value={
                metrics.process?.latest?.eventLoopP99Ms != null
                  ? `${metrics.process.latest.eventLoopP99Ms} ms`
                  : "—"
              }
            />
          </section>

          <Suspense fallback={<p className="text-xs text-muted-foreground">Loading charts…</p>}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold">API latency (avg / P95 / P99)</h2>
                <LatencyChart series={metrics.latencySeries || []} />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold">Memory & CPU</h2>
                <MemoryCpuChart series={metrics.process?.series || []} />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold">Redis hit ratio</h2>
                <RedisHitChart series={metrics.redisHitSeries || []} />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold">Mongo query time</h2>
                <MongoQueryChart series={metrics.mongo?.queryTimeSeries || []} />
              </div>
            </div>
          </Suspense>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Slowest endpoints (P95)</h3>
              <ul className="space-y-1.5 text-sm">
                {(metrics.slowEndpoints || []).length === 0 ? (
                  <li className="text-muted-foreground">None detected</li>
                ) : (
                  metrics.slowEndpoints.map((r) => (
                    <li key={r.path} className="flex justify-between gap-2">
                      <span className="truncate font-mono text-xs">{r.path}</span>
                      <span className="tabular-nums text-muted-foreground">
                        avg {r.avgMs} · p95 {r.p95Ms ?? "—"} ms
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Mongo by collection</h3>
              <ul className="space-y-1.5 text-sm">
                {(metrics.mongo?.byCollection || []).length === 0 ? (
                  <li className="text-muted-foreground">No queries sampled yet</li>
                ) : (
                  metrics.mongo.byCollection.map((r) => (
                    <li key={r.collection} className="flex justify-between gap-2">
                      <span className="truncate font-mono text-xs">{r.collection}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {r.avgMs} ms · ×{r.count}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "overview" && health ? (
        <>
          <div className={`rounded-xl border p-4 ${statusColor(health.color)}`}>
            <div className="flex flex-wrap items-center gap-3">
              <Wifi className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Overall: {health.status}</p>
                <p className="text-xs opacity-90">
                  Uptime {Math.floor((health.server?.uptimeSeconds || 0) / 60)} min · Node{" "}
                  {health.server?.nodeVersion} · PID {health.server?.pid}
                </p>
              </div>
            </div>
          </div>

          {alerts.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Active alerts
              </h2>
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li
                    key={a.code}
                    className="rounded-lg border border-red-200/80 bg-red-50/80 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                  >
                    <span className="font-medium">{a.code}</span> — {a.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">No active alerts.</p>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Service health</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`rounded-xl border p-4 ${statusColor("green")}`}>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <p className="text-sm font-semibold">Server</p>
                </div>
                <p className="mt-2 text-xs uppercase opacity-80">healthy</p>
                <p className="mt-1 text-xs">{health.server?.env} · {health.server?.platform}</p>
              </div>
              {Object.values(health.services || {}).map((s) => (
                <ServiceCard key={s.key} service={s} />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Requests / min" value={metrics?.requestsPerMinute ?? "—"} />
            <StatCard
              label="Avg latency"
              value={metrics?.averageLatencyMs != null ? `${metrics.averageLatencyMs} ms` : "—"}
            />
            <StatCard
              label="P95 / P99"
              value={
                metrics?.p95LatencyMs != null
                  ? `${metrics.p95LatencyMs} / ${metrics.p99LatencyMs ?? "—"} ms`
                  : "—"
              }
            />
            <StatCard
              label="Error rate"
              value={metrics?.errorRate != null ? `${metrics.errorRate}%` : "—"}
            />
            <StatCard label="Active users" value={metrics?.activeUsersApproximate ?? "—"} hint="seen in window" />
            <StatCard
              label="Cache hit ratio"
              value={
                metrics?.redisCache?.hitRatio != null ? `${metrics.redisCache.hitRatio}%` : "—"
              }
              hint={`hits ${metrics?.redisCache?.hits ?? 0} · misses ${metrics?.redisCache?.misses ?? 0}`}
            />
          </section>

          {health.services?.redis?.configured ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Redis</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
                <StatCard label="Status" value={health.services.redis.status} />
                <StatCard label="Memory" value={health.services.redis.memoryUsage || "—"} />
                <StatCard label="Clients" value={health.services.redis.connectedClients ?? "—"} />
                <StatCard label="Keys" value={health.services.redis.keys ?? "—"} />
                <StatCard label="Evictions" value={health.services.redis.evictions ?? "—"} />
                <StatCard
                  label="Server hit %"
                  value={health.services.redis.hitRatio != null ? `${health.services.redis.hitRatio}%` : "—"}
                />
                <StatCard label="App hits" value={health.services.redis.cacheHits ?? "—"} />
                <StatCard label="Rate limited" value={health.services.redis.rateLimited ?? "—"} />
              </div>
            </section>
          ) : null}

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Cpu className="h-4 w-4" />
                CPU / Memory
              </div>
              <p className="text-sm text-muted-foreground">
                CPU approx {health.cpu?.approxPercent}% · load {health.cpu?.load1} / {health.cpu?.cores} cores
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                RSS {health.memory?.rssPercent}% ({health.memory?.rssMb} MB) · Heap{" "}
                {health.memory?.heapUsedMb}/{health.memory?.heapTotalMb} MB · free system{" "}
                {health.memory?.systemFreeMb} MB
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-semibold">Last 5 minutes</p>
              <p className="text-sm text-muted-foreground">
                {metrics?.last5Minutes?.requests ?? 0} requests · {metrics?.last5Minutes?.errors ?? 0} errors ·{" "}
                {metrics?.last5Minutes?.errorRate ?? 0}% error rate · P95{" "}
                {metrics?.last5Minutes?.p95LatencyMs ?? "—"} ms
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Requests per minute</h2>
            <Suspense fallback={<p className="text-xs text-muted-foreground">Loading chart…</p>}>
              <RpmChart series={metrics?.requestsPerMinuteSeries || []} />
            </Suspense>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Most used APIs</h3>
              <ul className="space-y-1.5 text-sm">
                {(metrics?.mostUsedApis || []).length === 0 ? (
                  <li className="text-muted-foreground">No traffic yet</li>
                ) : (
                  metrics.mostUsedApis.map((r) => (
                    <li key={r.path} className="flex justify-between gap-2">
                      <span className="truncate font-mono text-xs">{r.path}</span>
                      <span className="tabular-nums text-muted-foreground">{r.count}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Slow endpoints</h3>
              <ul className="space-y-1.5 text-sm">
                {(metrics?.slowEndpoints || []).length === 0 ? (
                  <li className="text-muted-foreground">None detected</li>
                ) : (
                  metrics.slowEndpoints.map((r) => (
                    <li key={r.path} className="flex justify-between gap-2">
                      <span className="truncate font-mono text-xs">{r.path}</span>
                      <span className="tabular-nums text-muted-foreground">{r.avgMs} ms</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Top errors</h3>
              <ul className="space-y-1.5 text-sm">
                {(metrics?.topErrors || []).length === 0 ? (
                  <li className="text-muted-foreground">No recent errors</li>
                ) : (
                  metrics.topErrors.map((r) => (
                    <li key={`${r.code}-${r.path}`} className="space-y-0.5">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{r.code}</span>
                        <span className="tabular-nums text-muted-foreground">×{r.count}</span>
                      </div>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{r.path}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
