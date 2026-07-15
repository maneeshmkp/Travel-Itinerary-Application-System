"use client"

import { useEffect, useState } from "react"
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, Server } from "lucide-react"
import { adminAPI } from "../../services/api"

export default function AdminQueues() {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(null)

  const load = async ({ soft = false } = {}) => {
    if (soft) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const res = await adminAPI.queues()
      setData(res.data?.data ?? null)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => load({ soft: true }), 8000)
    return () => clearInterval(id)
  }, [])

  async function retry(queueName, jobId) {
    setBusy(`${queueName}:${jobId}`)
    try {
      await adminAPI.retryQueueJob(queueName, jobId)
      await load({ soft: true })
    } catch (err) {
      alert(err.response?.data?.message || err.message)
    } finally {
      setBusy(null)
    }
  }

  async function requeueDlq(jobId) {
    setBusy(`dlq:${jobId}`)
    try {
      await adminAPI.requeueDeadLetter(jobId)
      await load({ soft: true })
    } catch (err) {
      alert(err.response?.data?.message || err.message)
    } finally {
      setBusy(null)
    }
  }

  if (loading && !data) return <p className="text-sm text-slate-500">Loading queues…</p>
  if (error && !data) return <p className="text-sm text-red-600">{error}</p>

  const totals = data?.totals || {}
  const metrics = data?.metrics?.throughput || {}
  const queues = data?.queues || []
  const workers = data?.workers || {}

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-slate-900">Queue Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">
            BullMQ workers, throughput, retries, and dead-letter queue
            {!data?.redis ? " · Redis offline" : ""}
          </p>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => load({ soft: true })}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Waiting" value={totals.waiting} />
        <Stat label="Active / running" value={totals.active} icon={Activity} />
        <Stat label="Completed" value={totals.completed} icon={CheckCircle2} />
        <Stat label="Failed" value={totals.failed} icon={AlertTriangle} accent="amber" />
        <Stat label="Avg exec (ms)" value={metrics.avgExecutionMs ?? 0} icon={Clock} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Throughput (completed)" value={metrics.completed ?? data?.metrics?.totals?.completed} />
        <Stat label="Retries" value={data?.metrics?.totals?.retries} />
        <Stat label="Dead letter" value={data?.metrics?.totals?.deadLetter} accent="amber" />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm overflow-x-auto">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Queues & workers</h3>
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-2 pr-3">Queue</th>
              <th className="py-2 pr-3">Size</th>
              <th className="py-2 pr-3">Waiting</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-3">Completed</th>
              <th className="py-2 pr-3">Failed</th>
              <th className="py-2 pr-3">Worker</th>
              <th className="py-2">Last exec</th>
            </tr>
          </thead>
          <tbody>
            {queues.map((q) => {
              const w = workers[q.name] || {}
              return (
                <tr key={q.name} className="border-b border-slate-50">
                  <td className="py-2 pr-3 font-medium font-mono text-xs">{q.name}</td>
                  <td className="py-2 pr-3 tabular-nums">{q.size ?? q.waiting + q.active}</td>
                  <td className="py-2 pr-3 tabular-nums">{q.waiting}</td>
                  <td className="py-2 pr-3 tabular-nums">{q.active}</td>
                  <td className="py-2 pr-3 tabular-nums">{q.completed}</td>
                  <td className="py-2 pr-3 tabular-nums text-amber-700">{q.failed}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                        w.running ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Server className="h-3 w-3" />
                      {w.running ? "up" : "idle"}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-slate-500 tabular-nums">
                    {w.lastMs != null ? `${w.lastMs}ms` : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <JobList
          title="Running jobs"
          rows={data?.runningJobs || []}
          empty="No active jobs"
        />
        <JobList
          title="Failed jobs"
          rows={data?.failedJobs || []}
          empty="No failures"
          actionLabel="Retry"
          busy={busy}
          onAction={(row) => retry(row.queue, row.id)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <JobList title="Completed jobs" rows={data?.completedJobs || []} empty="No completed jobs yet" />
        <JobList
          title="Dead letter queue"
          rows={data?.deadLetterJobs || []}
          empty="DLQ empty"
          actionLabel="Requeue"
          busy={busy}
          onAction={(row) => requeueDlq(row.id)}
        />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Repeatable schedules</h3>
        <ul className="mt-3 space-y-2">
          {(data?.schedules || []).map((s) => (
            <li key={s.jobId} className="flex justify-between gap-3 text-sm border-b border-slate-50 pb-2">
              <div>
                <p className="font-medium text-slate-800">{s.description || s.jobId}</p>
                <p className="text-xs font-mono text-slate-500">{s.queue}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>every {(s.every / 60000).toFixed(0)}m</p>
                <p className={s.active ? "text-emerald-700" : ""}>{s.active ? "active" : "pending"}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent === "amber" ? "text-amber-700" : "text-slate-900"}`}>
            {value ?? 0}
          </p>
        </div>
        {Icon ? (
          <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  )
}

function JobList({ title, rows, empty, actionLabel, onAction, busy }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2 max-h-72 overflow-auto">
        {rows.length === 0 ? (
          <li className="text-sm text-slate-500">{empty}</li>
        ) : (
          rows.map((row) => (
            <li key={`${row.queue}-${row.id}`} className="border-b border-slate-50 pb-2 text-sm">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {row.queue} · {row.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    attempts {row.attemptsMade ?? 0}
                    {row.executionMs != null ? ` · ${row.executionMs}ms` : ""}
                    {row.failedReason ? ` · ${row.failedReason}` : ""}
                  </p>
                </div>
                {actionLabel && onAction ? (
                  <button
                    type="button"
                    disabled={busy === `${row.queue}:${row.id}` || busy === `dlq:${row.id}`}
                    onClick={() => onAction(row)}
                    className="shrink-0 rounded px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                  >
                    {actionLabel}
                  </button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
