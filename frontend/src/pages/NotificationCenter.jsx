"use client"

import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Bell, CheckCheck, Search, Settings, RefreshCw, FlaskConical } from "lucide-react"
import { useNotifications } from "../hooks/useNotifications"
import { NOTIFICATION_FILTER_OPTIONS } from "../constants/notificationTypes"
import { notificationAPI } from "../services/api"
import NotificationCard from "../components/notifications/NotificationCard"
import NotificationSkeleton from "../components/notifications/NotificationSkeleton"
import NotificationEmpty from "../components/notifications/NotificationEmpty"

function Section({ title, items, ...actions }) {
  if (!items?.length) return null
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((n) => (
          <NotificationCard key={n.id} notification={n} {...actions} />
        ))}
      </div>
    </section>
  )
}

export default function NotificationCenter() {
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [statusView, setStatusView] = useState("active")
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const sentinelRef = useRef(null)

  const {
    notifications,
    grouped,
    pagination,
    loading,
    loadingMore,
    error,
    unreadCount,
    socketConnected,
    settings,
    setSettings,
    loadNotifications,
    loadMore,
    markRead,
    markAllRead,
    remove,
    archive,
    refreshUnreadCount,
    refreshSettings,
  } = useNotifications()

  useEffect(() => {
    const params = {
      page: 1,
      limit: 20,
      search: search.trim() || undefined,
    }
    if (filter === "unread") params.unread = "true"
    else if (filter === "warnings") params.category = "warnings"
    else if (filter === "finance") params.category = "finance"
    else if (filter !== "all") params.category = filter
    if (statusView === "archived") params.status = "ARCHIVED"
    loadNotifications(params)
  }, [filter, search, statusView, loadNotifications])

  useEffect(() => {
    refreshSettings()
  }, [refreshSettings])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return undefined
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: "120px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore, notifications.length])

  const handleSettingChange = async (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }))
    setSettingsSaving(true)
    try {
      const res = await notificationAPI.updateSettings({ [key]: value })
      setSettings(res.data?.data)
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleSeed = async () => {
    await notificationAPI.seedSamples()
    await loadNotifications({ page: 1, limit: 20 })
    await refreshUnreadCount()
  }

  const displayItems = statusView === "archived" ? grouped.archived : notifications

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notifications
            {socketConnected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Syncing
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
          {import.meta.env.DEV ? (
            <button
              type="button"
              onClick={handleSeed}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Load samples
            </button>
          ) : null}
        </div>
      </div>

      {showSettings && settings ? (
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Notification preferences</p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              ["inAppEnabled", "In-app notifications"],
              ["emailEnabled", "Email notifications"],
              ["pushEnabled", "Push notifications"],
              ["soundEnabled", "Sound"],
              ["budgetAlerts", "Budget alerts"],
              ["weatherAlerts", "Weather alerts"],
              ["bookingAlerts", "Booking alerts"],
              ["collaborationAlerts", "Collaboration alerts"],
              ["activityReminders", "Activity reminders"],
              ["flightReminders", "Flight reminders"],
              ["hotelReminders", "Hotel reminders"],
              ["aiReminders", "AI reminders"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  disabled={settingsSaving}
                  onChange={(e) => handleSettingChange(key, e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications…"
            className="w-full h-10 rounded-xl border border-border/60 bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusView}
          onChange={(e) => setStatusView(e.target.value)}
          className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {NOTIFICATION_FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => loadNotifications()} className="inline-flex items-center gap-1 text-xs font-medium">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : null}

      {loading ? <NotificationSkeleton /> : null}

      {!loading && displayItems.length === 0 ? <NotificationEmpty /> : null}

      {!loading && statusView === "active" && filter === "all" && !search ? (
        <div className="space-y-6">
          <Section title="Unread" items={grouped.unread} onMarkRead={markRead} onDelete={remove} onArchive={archive} />
          <Section title="Today" items={grouped.today.filter((n) => n.status !== "UNREAD")} onMarkRead={markRead} onDelete={remove} onArchive={archive} />
          <Section title="Earlier" items={grouped.earlier} onMarkRead={markRead} onDelete={remove} onArchive={archive} />
        </div>
      ) : null}

      {!loading && (filter !== "all" || search || statusView === "archived") ? (
        <div className="space-y-2">
          {displayItems.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onMarkRead={markRead}
              onDelete={remove}
              onArchive={archive}
            />
          ))}
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-4" aria-hidden />
      {loadingMore ? (
        <p className="text-center text-xs text-muted-foreground">Loading more…</p>
      ) : null}
      {pagination.hasMore === false && pagination.total > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {pagination.total} notifications
        </p>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/itineraries" className="text-primary hover:underline">
          Back to trips
        </Link>
      </p>
    </div>
  )
}
