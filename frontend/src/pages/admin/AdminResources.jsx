"use client"

import { useEffect, useState } from "react"
import { adminAPI } from "../../services/api"

function ResourceTable({ title, subtitle, columns, rows, loading, error, page, pages, onPage }) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-3xl text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-3">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-slate-500">
                  No records
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-slate-500">
          Page {page} / {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function AdminTrips() {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState("")
  const [state, setState] = useState({ trips: [], pagination: { pages: 1 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let c = false
    setLoading(true)
    adminAPI
      .listTrips({ page, limit: 15, q: q || undefined })
      .then((res) => {
        if (!c) setState(res.data?.data || { trips: [], pagination: { pages: 1 } })
      })
      .catch((e) => !c && setError(e.response?.data?.message || e.message))
      .finally(() => !c && setLoading(false))
    return () => {
      c = true
    }
  }, [page, q])

  const rows = (state.trips || []).map((t) => (
    <tr key={t._id} className="border-b border-slate-50">
      <td className="px-4 py-3 font-medium">{t.title || "—"}</td>
      <td className="px-4 py-3">{t.destination || "—"}</td>
      <td className="px-4 py-3 text-slate-500">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
    </tr>
  ))

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => {
          setPage(1)
          setQ(e.target.value)
        }}
        placeholder="Search trips…"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      />
      <ResourceTable
        title="Trips"
        subtitle="All itineraries across the platform"
        columns={["Title", "Destination", "Created"]}
        rows={rows}
        loading={loading}
        error={error}
        page={page}
        pages={state.pagination?.pages || 1}
        onPage={setPage}
      />
    </div>
  )
}

export function AdminBookings() {
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ bookings: [], pagination: { pages: 1 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let c = false
    setLoading(true)
    adminAPI
      .listBookings({ page, limit: 15 })
      .then((res) => {
        if (!c) setState(res.data?.data || { bookings: [], pagination: { pages: 1 } })
      })
      .catch((e) => !c && setError(e.response?.data?.message || e.message))
      .finally(() => !c && setLoading(false))
    return () => {
      c = true
    }
  }, [page])

  const rows = (state.bookings || []).map((b) => (
    <tr key={b._id} className="border-b border-slate-50">
      <td className="px-4 py-3 font-medium">{b.bookingType || b.type || "—"}</td>
      <td className="px-4 py-3">{b.status || "—"}</td>
      <td className="px-4 py-3">{b.price?.amount ?? b.totalPrice ?? "—"}</td>
      <td className="px-4 py-3 text-slate-500">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"}</td>
    </tr>
  ))

  return (
    <ResourceTable
      title="Bookings"
      subtitle="Platform-wide booking records"
      columns={["Type", "Status", "Price", "Created"]}
      rows={rows}
      loading={loading}
      error={error}
      page={page}
      pages={state.pagination?.pages || 1}
      onPage={setPage}
    />
  )
}

export function AdminDocuments() {
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ documents: [], pagination: { pages: 1 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let c = false
    setLoading(true)
    adminAPI
      .listDocuments({ page, limit: 15 })
      .then((res) => {
        if (!c) setState(res.data?.data || { documents: [], pagination: { pages: 1 } })
      })
      .catch((e) => !c && setError(e.response?.data?.message || e.message))
      .finally(() => !c && setLoading(false))
    return () => {
      c = true
    }
  }, [page])

  const rows = (state.documents || []).map((d) => (
    <tr key={d._id} className="border-b border-slate-50">
      <td className="px-4 py-3 font-medium">{d.title || d.fileName || "—"}</td>
      <td className="px-4 py-3">{d.documentType || d.type || "—"}</td>
      <td className="px-4 py-3 text-slate-500">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}</td>
    </tr>
  ))

  return (
    <ResourceTable
      title="Documents"
      subtitle="Uploaded travel documents"
      columns={["Title", "Type", "Created"]}
      rows={rows}
      loading={loading}
      error={error}
      page={page}
      pages={state.pagination?.pages || 1}
      onPage={setPage}
    />
  )
}
