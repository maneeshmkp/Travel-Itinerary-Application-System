"use client"

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Users, Map, Ticket, FolderLock, AlertTriangle } from "lucide-react"
import { adminAPI } from "../../services/api"
import { usePortalBase } from "./AdminLayout"

function Stat({ label, value, icon: Icon, to }) {
  const body = (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{value ?? "—"}</p>
        </div>
        <span className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

export default function AdminDashboard() {
  const base = usePortalBase()
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    adminAPI
      .dashboard()
      .then((res) => {
        if (!cancelled) setData(res.data?.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const stats = data?.stats || {}
  const roles = data?.usersByRole || {}
  const audit = data?.recentAudit || []

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-serif text-3xl text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Platform overview and recent admin activity</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Users" value={stats.users} icon={Users} to={`${base}/users`} />
        <Stat label="Trips" value={stats.trips} icon={Map} to={`${base}/trips`} />
        <Stat label="Bookings" value={stats.bookings} icon={Ticket} to={`${base}/bookings`} />
        <Stat label="Documents" value={stats.documents} icon={FolderLock} to={`${base}/documents`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Users by role</h3>
          <ul className="mt-4 space-y-2">
            {Object.entries(roles).length === 0 ? (
              <li className="text-sm text-slate-500">No data</li>
            ) : (
              Object.entries(roles).map(([role, count]) => (
                <li key={role} className="flex justify-between text-sm">
                  <span className="text-slate-600 capitalize">{role.replace("_", " ")}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </li>
              ))
            )}
          </ul>
          {stats.suspended > 0 ? (
            <p className="mt-4 flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {stats.suspended} suspended account(s)
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Recent audit</h3>
          <ul className="mt-4 space-y-3 max-h-72 overflow-auto">
            {audit.length === 0 ? (
              <li className="text-sm text-slate-500">No audit events yet</li>
            ) : (
              audit.map((row) => (
                <li key={row._id} className="border-b border-slate-100 pb-2 last:border-0">
                  <p className="text-sm font-medium text-slate-800">{row.action}</p>
                  <p className="text-xs text-slate-500">
                    {row.actorEmail || "system"} · {new Date(row.createdAt).toLocaleString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
