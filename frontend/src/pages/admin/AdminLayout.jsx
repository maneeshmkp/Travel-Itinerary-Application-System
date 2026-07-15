"use client"

import { NavLink, Outlet, Link, useOutletContext } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  Map,
  Ticket,
  FolderLock,
  BarChart3,
  Activity,
  Bell,
  Settings,
  Shield,
  ArrowLeft,
  Radio,
  Server,
  Building2,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { hasPermission, roleLabel } from "../../utils/rbac"

/** Shared admin console pages (Admin portal). */
const ADMIN_NAV = [
  { path: "", end: true, label: "Dashboard", icon: LayoutDashboard, perm: null },
  { path: "users", label: "Users", icon: Users, perm: "admin:users" },
  { path: "trips", label: "Trips", icon: Map, perm: "admin:trips" },
  { path: "bookings", label: "Bookings", icon: Ticket, perm: "admin:bookings" },
  { path: "documents", label: "Documents", icon: FolderLock, perm: "admin:documents" },
  { path: "analytics", label: "Analytics", icon: BarChart3, perm: "admin:analytics" },
  { path: "monitoring", label: "Monitoring", icon: Activity, perm: "admin:monitoring" },
  { path: "events", label: "Events", icon: Radio, perm: "admin:monitoring" },
  { path: "queues", label: "Queues", icon: Server, perm: "admin:monitoring" },
  { path: "security", label: "Security", icon: Shield, perm: "admin:monitoring" },
  { path: "notifications", label: "Notifications", icon: Bell, perm: "admin:notifications" },
]

/** Super Admin–only extras. */
const SUPER_EXTRA_NAV = [
  { path: "tenants", label: "Tenants", icon: Building2, perm: "super:tenants" },
  { path: "roles", label: "Roles", icon: Shield, perm: "super:roles" },
  { path: "settings", label: "System Settings", icon: Settings, perm: "super:settings" },
]

export function usePortalBase() {
  return useOutletContext()?.basePath || "/admin"
}

export default function AdminLayout({ variant = "admin" }) {
  const { user } = useAuth()
  const isSuper = variant === "super"
  const basePath = isSuper ? "/super-admin" : "/admin"

  const navDefs = isSuper
    ? [
        ADMIN_NAV[0],
        ...SUPER_EXTRA_NAV,
        ...ADMIN_NAV.slice(1),
      ]
    : ADMIN_NAV

  const items = navDefs
    .filter((item) => {
      if (!item.perm) return true
      if (isSuper) return true
      if (item.perm === "admin:users" && hasPermission(user, "support:assist")) return true
      return hasPermission(user, item.perm)
    })
    .map((item) => ({
      ...item,
      to: item.path ? `${basePath}/${item.path}` : basePath,
    }))

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(ellipse_at_top,_#e8f0f4_0%,_#f5f7fa_45%,_#eef2f6_100%)]">
      <div className="mx-auto flex max-w-7xl gap-0 md:gap-6 px-0 md:px-4 py-0 md:py-6">
        <aside className="hidden md:flex w-60 shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur p-4 shadow-sm">
          <div className="mb-6 px-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">TravelPlan</p>
            <h1 className="font-serif text-xl text-slate-900">{isSuper ? "Super Admin" : "Admin"}</h1>
            <p className="mt-1 text-xs text-slate-500 truncate">{roleLabel(user?.role)}</p>
          </div>
          <nav className="flex flex-col gap-0.5 flex-1">
            {items.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/"
            className="mt-4 flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="md:hidden sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur px-3 py-2 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {items.map(({ to, end, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-1.5 text-xs whitespace-nowrap ${
                      isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="p-4 md:p-0 md:pr-2">
            <Outlet context={{ basePath, variant }} />
          </div>
        </div>
      </div>
    </div>
  )
}
