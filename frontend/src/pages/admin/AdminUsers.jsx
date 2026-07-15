"use client"

import { useCallback, useEffect, useState } from "react"
import { adminAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { hasPermission, roleLabel } from "../../utils/rbac"

const ROLES = ["user", "premium", "support", "moderator", "admin", "super_admin"]

export default function AdminUsers() {
  const { user: me } = useAuth()
  const canManage = hasPermission(me, "admin:users") || me?.role === "super_admin"

  const [q, setQ] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ users: [], pagination: { pages: 1 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await adminAPI.listUsers({
        q: q || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        limit: 15,
      })
      setData(res.data?.data || { users: [], pagination: { pages: 1 } })
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [q, role, status, page])

  useEffect(() => {
    load()
  }, [load])

  async function run(id, fn) {
    setBusyId(id)
    try {
      await fn()
      await load()
    } catch (err) {
      alert(err.response?.data?.message || err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-3xl text-slate-900">Users</h2>
        <p className="mt-1 text-sm text-slate-500">Search, filter, suspend, and change roles</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
          placeholder="Search name or email"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => {
            setPage(1)
            setRole(e.target.value)
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : data.users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-slate-500">
                  No users found
                </td>
              </tr>
            ) : (
              data.users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) =>
                          run(u.id, () => adminAPI.changeRole(u.id, { role: e.target.value }))
                        }
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      roleLabel(u.role)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.status === "suspended"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <div className="flex flex-wrap gap-1">
                        {u.status === "suspended" ? (
                          <button
                            type="button"
                            className="rounded px-2 py-1 text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            disabled={busyId === u.id}
                            onClick={() => run(u.id, () => adminAPI.activateUser(u.id))}
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded px-2 py-1 text-xs bg-amber-50 text-amber-800 hover:bg-amber-100"
                            disabled={busyId === u.id}
                            onClick={() => run(u.id, () => adminAPI.suspendUser(u.id))}
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200"
                          disabled={busyId === u.id}
                          onClick={() =>
                            run(u.id, async () => {
                              const res = await adminAPI.resetPassword(u.id)
                              const temp = res.data?.data?.temporaryPassword
                              if (temp) alert(`Temporary password: ${temp}`)
                            })
                          }
                        >
                          Reset PW
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100"
                          disabled={busyId === u.id}
                          onClick={() => {
                            if (window.confirm(`Delete ${u.email}?`)) {
                              run(u.id, () => adminAPI.deleteUser(u.id))
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">View only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-slate-500">
          Page {page} / {data.pagination?.pages || 1}
        </span>
        <button
          type="button"
          disabled={page >= (data.pagination?.pages || 1)}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
