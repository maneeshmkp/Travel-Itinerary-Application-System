"use client"

import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { CheckCheck, ExternalLink } from "lucide-react"
import { useNotifications } from "../../hooks/useNotifications"
import { NOTIFICATION_FILTER_OPTIONS, formatNotificationTime } from "../../constants/notificationTypes"
import NotificationCard from "./NotificationCard"
import NotificationSkeleton from "./NotificationSkeleton"
import NotificationEmpty from "./NotificationEmpty"

export default function NotificationDropdown({ onClose }) {
  const ref = useRef(null)
  const listRef = useRef(null)
  const [filter, setFilter] = useState("all")
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    pagination,
    loadNotifications,
    loadMore,
    markRead,
    markAllRead,
    archive,
    remove,
  } = useNotifications()

  useEffect(() => {
    const params = { page: 1, limit: 12 }
    if (filter === "unread") params.unread = "true"
    else if (filter === "warnings") params.category = "warnings"
    else if (filter === "finance") params.category = "finance"
    else if (filter !== "all") params.category = filter
    loadNotifications(params)
  }, [filter, loadNotifications])

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.()
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [onClose])

  const onScroll = () => {
    const el = listRef.current
    if (!el || loadingMore || !pagination.hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      loadMore()
    }
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,24rem)] rounded-xl border border-border/60 bg-card shadow-xl z-[60] overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3 bg-muted/30">
        <p className="text-sm font-semibold text-foreground">Notifications</p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border/40 px-2 py-2">
        {NOTIFICATION_FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="max-h-[min(24rem,55vh)] overflow-y-auto"
      >
        {loading ? <NotificationSkeleton rows={3} /> : null}
        {!loading && notifications.length === 0 ? <NotificationEmpty /> : null}
        {!loading
          ? notifications.map((n) => (
              <div
                key={n.id}
                className="border-b border-border/30 px-2 py-2 last:border-0"
                onClick={() => {
                  if (n.status === "UNREAD") markRead(n.id)
                }}
              >
                <div className="flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    <NotificationCard
                      notification={n}
                      compact
                      onMarkRead={markRead}
                      onDelete={remove}
                      onArchive={archive}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 pl-12">
                      {formatNotificationTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          : null}
        {loadingMore ? (
          <p className="py-2 text-center text-[11px] text-muted-foreground">Loading more…</p>
        ) : null}
      </div>

      <div className="border-t border-border/50 p-2 bg-muted/20">
        <Link
          to="/notifications"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          Open notification center
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
