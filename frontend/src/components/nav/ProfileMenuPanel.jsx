"use client"

import { Link } from "react-router-dom"
import { LogOut } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { PROFILE_MENU } from "./navConfig"
import { canAccessStaffAdminPortal, isSuperAdmin } from "../../utils/rbac"

export default function ProfileMenuPanel({ onClose, className = "" }) {
  const { user, logout } = useAuth()

  return (
    <div className={className}>
      <div className="px-1 py-2 border-b border-border mb-1">
        <p className="text-sm font-semibold text-foreground truncate">{user?.name || "Traveler"}</p>
        {user?.email ? <p className="text-xs text-muted-foreground truncate">{user.email}</p> : null}
      </div>

      {PROFILE_MENU.map((item, idx) => {
        if (item.type === "divider") {
          return <div key={`div-${idx}`} className="my-1 border-t border-border" role="separator" />
        }
        if (item.staffAdminOnly && !canAccessStaffAdminPortal(user)) return null
        if (item.superAdminOnly && !isSuperAdmin(user)) return null
        if (item.adminOnly && !canAccessStaffAdminPortal(user) && !isSuperAdmin(user)) return null
        const Icon = item.icon
        return (
          <Link
            key={item.href + item.name}
            to={item.href}
            role="menuitem"
            onClick={onClose}
            className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:bg-muted"
          >
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            {item.name}
          </Link>
        )
      })}

      <div className="my-1 border-t border-border" role="separator" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose()
          logout()
        }}
        className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus:outline-none focus-visible:bg-red-50"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Logout
      </button>
    </div>
  )
}
