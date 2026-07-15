"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Building2,
  HardDrive,
  RefreshCw,
  Users,
  Map,
  FileText,
  Bot,
  Activity,
  Receipt,
} from "lucide-react"
import { adminAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"

function formatBytes(n) {
  const v = Number(n) || 0
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`
  if (v < 1024 * 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(1)} MB`
  return `${(v / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function UsageBar({ used = 0, limit = 0, label }) {
  const unlimited = limit < 0
  const pct = unlimited ? 0 : Math.min(100, Math.round((Number(used) / Math.max(limit, 1)) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="font-mono">
          {used}
          {unlimited ? " / ∞" : ` / ${limit}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-teal-600"}`}
          style={{ width: unlimited ? "8%" : `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function AdminTenants() {
  const { user } = useAuth()
  const [list, setList] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [selected, setSelected] = useState(null)
  const [usage, setUsage] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [q, setQ] = useState("")
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: "", slug: "", plan: "free", ownerEmail: "" })

  const load = useCallback(async ({ soft = false } = {}) => {
    if (soft) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const [tenantsRes, metricsRes] = await Promise.all([
        adminAPI.listTenants({ q: q || undefined, limit: 50 }),
        adminAPI.tenantsMetrics(),
      ])
      setList(tenantsRes.data?.data ?? null)
      setMetrics(metricsRes.data?.data ?? null)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [q])

  useEffect(() => {
    load()
  }, [load])

  async function openUsage(id) {
    setSelected(id)
    setUsage(null)
    try {
      const res = await adminAPI.tenantUsage(id)
      setUsage(res.data?.data ?? null)
    } catch (err) {
      alert(err.response?.data?.message || err.message)
    }
  }

  async function patchTenant(id, body) {
    try {
      await adminAPI.updateTenant(id, body)
      await load({ soft: true })
      if (selected === id) await openUsage(id)
    } catch (err) {
      alert(err.response?.data?.message || err.message)
    }
  }

  async function create() {
    setCreating(true)
    try {
      await adminAPI.createTenant(form)
      setForm({ name: "", slug: "", plan: "free", ownerEmail: "" })
      await load({ soft: true })
    } catch (err) {
      alert(err.response?.data?.message || err.message)
    } finally {
      setCreating(false)
    }
  }

  if (user?.role !== "super_admin") {
    return <p className="text-sm text-red-600">Super Admin only.</p>
  }

  if (loading && !list) return <p className="text-sm text-slate-500">Loading tenants…</p>
  if (error && !list) return <p className="text-sm text-red-600">{error}</p>

  const tenants = list?.tenants || []
  const totals = metrics?.totals || {}
  const plans = list?.plans || metrics?.plans || {}

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-slate-900">Tenants</h2>
          <p className="mt-1 text-sm text-slate-500">
            Organizations, plans, usage, and storage
          </p>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => load({ soft: true })}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Building2} label="Tenants" value={totals.tenants ?? tenants.length} />
        <MetricCard icon={Users} label="Active users" value={totals.users} />
        <MetricCard icon={Bot} label="AI requests" value={totals.aiRequests} />
        <MetricCard icon={HardDrive} label="Storage" value={formatBytes(totals.storageBytes)} />
        <MetricCard icon={Map} label="Trips" value={totals.trips} />
        <MetricCard icon={FileText} label="Documents" value={totals.documents} />
        <MetricCard icon={Receipt} label="Expenses" value={totals.expenses} />
        <MetricCard icon={Activity} label="API requests" value={totals.apiRequests} />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-slate-900">Create tenant</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="slug (optional)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.plan}
            onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
          >
            {Object.keys(plans).map((p) => (
              <option key={p} value={p}>
                {plans[p]?.label || p}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Owner email (optional)"
            value={form.ownerEmail}
            onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
          />
        </div>
        <button
          type="button"
          disabled={creating || !form.name.trim()}
          onClick={create}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </section>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search name or slug"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
        >
          Search
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{t.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                    value={t.plan}
                    onChange={(e) => patchTenant(t.id, { plan: e.target.value })}
                  >
                    {Object.keys(plans).map((p) => (
                      <option key={p} value={p}>
                        {plans[p]?.label || p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                    value={t.status}
                    onChange={(e) => patchTenant(t.id, { status: e.target.value })}
                  >
                    <option value="active">active</option>
                    <option value="trial">trial</option>
                    <option value="suspended">suspended</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 space-y-0.5">
                  <div>AI {t.usage?.aiRequests ?? 0}</div>
                  <div>Trips {t.usage?.trips ?? 0}</div>
                  <div>{formatBytes(t.usage?.storageBytes)}</div>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openUsage(t.id)}
                    className="text-xs text-teal-700 hover:underline"
                  >
                    Usage
                  </button>
                </td>
              </tr>
            ))}
            {!tenants.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No tenants yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {usage ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{usage.tenant?.name}</h3>
              <p className="text-xs text-slate-500 font-mono">{usage.tenant?.slug} · {usage.tenant?.plan}</p>
            </div>
            <button type="button" className="text-xs text-slate-500" onClick={() => setUsage(null)}>
              Close
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <UsageBar label="AI requests" used={usage.usage?.aiRequests} limit={usage.limits?.aiRequests} />
            <UsageBar label="Storage (bytes)" used={usage.usage?.storageBytes} limit={usage.limits?.storageBytes} />
            <UsageBar label="Trips" used={usage.usage?.trips} limit={usage.limits?.trips} />
            <UsageBar label="Users" used={usage.usage?.users} limit={usage.limits?.users} />
            <UsageBar label="Documents" used={usage.usage?.documents} limit={usage.limits?.documents} />
            <UsageBar label="API requests" used={usage.usage?.apiRequests} limit={-1} />
            <UsageBar label="Expenses" used={usage.usage?.expenses} limit={-1} />
          </div>
        </section>
      ) : null}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-serif text-2xl text-slate-900">{value ?? "—"}</p>
    </div>
  )
}
