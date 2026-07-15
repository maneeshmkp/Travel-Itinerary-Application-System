"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useNotifications } from "../../hooks/useNotifications"
import NotificationDropdown from "./NotificationDropdown"

export default function NotificationBell() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const { unreadCount, socketConnected } = useNotifications()

  if (!isAuthenticated) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        title={socketConnected ? "Live updates on" : "Connecting…"}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
        {socketConnected ? (
          <span
            className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-background"
            aria-hidden
          />
        ) : null}
      </button>
      {open ? <NotificationDropdown onClose={() => setOpen(false)} /> : null}
    </div>
  )
}
