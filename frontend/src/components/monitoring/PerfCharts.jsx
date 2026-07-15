"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

function chartData(series = [], mapFn) {
  return series.map((p) => ({
    label: new Date(p.minute).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ...mapFn(p),
  }))
}

function Empty({ label = "No samples yet" }) {
  return <p className="text-xs text-muted-foreground py-8 text-center">{label}</p>
}

export function LatencyChart({ series = [] }) {
  const data = chartData(series, (p) => ({
    avg: p.avgMs ?? 0,
    p95: p.p95Ms ?? 0,
    p99: p.p99Ms ?? 0,
  }))
  if (!data.length) return <Empty />
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
          <YAxis tick={{ fontSize: 10 }} width={36} unit="ms" />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="avg" name="Avg" stroke="var(--primary)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="p95" name="P95" stroke="#d97706" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="p99" name="P99" stroke="#dc2626" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MemoryCpuChart({ series = [] }) {
  const data = chartData(series, (p) => ({
    heap: p.heapUsedMb ?? 0,
    rss: p.rssMb ?? 0,
    cpu: p.cpuApprox ?? 0,
  }))
  if (!data.length) return <Empty />
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="heapFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
          <YAxis yAxisId="mem" tick={{ fontSize: 10 }} width={36} />
          <YAxis yAxisId="cpu" orientation="right" tick={{ fontSize: 10 }} width={36} domain={[0, 100]} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            yAxisId="mem"
            type="monotone"
            dataKey="heap"
            name="Heap MB"
            stroke="var(--primary)"
            fill="url(#heapFill)"
            strokeWidth={2}
          />
          <Line yAxisId="mem" type="monotone" dataKey="rss" name="RSS MB" stroke="#64748b" strokeWidth={1.5} dot={false} />
          <Line yAxisId="cpu" type="monotone" dataKey="cpu" name="CPU %" stroke="#d97706" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RedisHitChart({ series = [] }) {
  const data = chartData(series, (p) => ({ hitRatio: p.hitRatio ?? 0 }))
  if (!data.length) return <Empty />
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={36} unit="%" />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
          <Area type="monotone" dataKey="hitRatio" name="Hit %" stroke="#059669" fill="#05966933" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MongoQueryChart({ series = [] }) {
  const data = chartData(series, (p) => ({ avgMs: p.avgMs ?? 0, count: p.count ?? 0 }))
  if (!data.length) return <Empty />
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
          <YAxis tick={{ fontSize: 10 }} width={36} unit="ms" />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="avgMs" name="Avg query ms" stroke="#7c3aed" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
