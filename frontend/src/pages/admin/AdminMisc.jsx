"use client"

import { useEffect, useState } from "react"
import { adminAPI } from "../../services/api"
import { roleLabel } from "../../utils/rbac"

export function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    adminAPI
      .analytics()
      .then((res) => setData(res.data?.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
  }, [])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-slate-500">Loading analytics…</p>

  const d = data.last30Days || {}
  const max = Math.max(1, d.newUsers || 0, d.newTrips || 0, d.newBookings || 0)

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-serif text-3xl text-slate-900">Analytics</h2>
        <p className="mt-1 text-sm text-slate-500">Growth signals for the last 30 days</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "New users", value: d.newUsers },
          { label: "New trips", value: d.newTrips },
          { label: "New bookings", value: d.newBookings },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{s.value ?? 0}</p>
            <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-800 transition-all duration-700"
                style={{ width: `${((s.value || 0) / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Role distribution</h3>
        <ul className="mt-4 space-y-2">
          {Object.entries(data.usersByRole || {}).map(([role, count]) => (
            <li key={role} className="flex justify-between text-sm">
              <span>{roleLabel(role)}</span>
              <span className="tabular-nums font-medium">{count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function AdminNotifications() {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    adminAPI
      .notificationsOverview()
      .then((res) => setData(res.data?.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
  }, [])

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-3xl text-slate-900">Notifications</h2>
        <p className="mt-1 text-sm text-slate-500">Platform notification volume</p>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{data?.total ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Unread</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{data?.unread ?? "—"}</p>
        </div>
      </div>
    </div>
  )
}

export function AdminRoles() {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    adminAPI
      .roles()
      .then((res) => setData(res.data?.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
  }, [])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-slate-500">Loading roles…</p>

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-3xl text-slate-900">Roles</h2>
        <p className="mt-1 text-sm text-slate-500">Permission matrix by role</p>
      </header>
      <div className="grid gap-4">
        {(data.roles || []).map((r) => (
          <div key={r.role} className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{roleLabel(r.role)}</h3>
              <span className="text-xs text-slate-500">rank {r.rank}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(r.permissions || []).map((p) => (
                <span key={p} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowSignups: true,
    aiEnabled: true,
  })
  const [keys, setKeys] = useState([])
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([adminAPI.getSettings(), adminAPI.apiKeys()])
      .then(([s, k]) => {
        setSettings(s.data?.data?.settings || settings)
        setKeys(k.data?.data?.keys || [])
      })
      .catch((e) => setError(e.response?.data?.message || e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    setMsg("")
    setError("")
    try {
      await adminAPI.updateSettings({ settings })
      setMsg("Settings saved")
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      <header>
        <h2 className="font-serif text-3xl text-slate-900">System Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Super Admin controls</p>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        {[
          ["maintenanceMode", "Maintenance mode"],
          ["allowSignups", "Allow signups"],
          ["aiEnabled", "AI features enabled"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center justify-between text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(settings[key])}
              onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
            />
          </label>
        ))}
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Save
        </button>
      </div>
      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <h3 className="text-sm font-semibold">API keys (configured?)</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {keys.map((k) => (
            <li key={k.name} className="flex justify-between">
              <span className="font-mono text-xs">{k.name}</span>
              <span className={k.configured ? "text-emerald-700" : "text-slate-400"}>
                {k.configured ? "yes" : "no"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
