"use client"

import { Cloud, CloudOff, Loader2, AlertCircle, Clock } from "lucide-react"
import { Link } from "react-router-dom"
import { useOffline } from "../../context/OfflineContext"
import { SYNC_STATUS } from "../../offline/constants"

export default function SyncBadge({ compact = false, className = "" }) {
  const { syncStatus, queuedCount, online } = useOffline()

  let Icon = Cloud
  let label = "Online"
  let tone = "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900"

  if (!online || syncStatus === SYNC_STATUS.OFFLINE) {
    Icon = CloudOff
    label = "Offline"
    tone = "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900"
  } else if (syncStatus === SYNC_STATUS.SYNCING) {
    Icon = Loader2
    label = "Syncing"
    tone = "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900"
  } else if (syncStatus === SYNC_STATUS.QUEUED || queuedCount > 0) {
    Icon = Clock
    label = compact ? String(queuedCount) : `Queued ${queuedCount}`
    tone = "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-900"
  } else if (syncStatus === SYNC_STATUS.ERROR) {
    Icon = AlertCircle
    label = compact ? "!" : "Sync error"
    tone = "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900"
  }

  const spinning = syncStatus === SYNC_STATUS.SYNCING

  if (compact) {
    return (
      <Link
        to="/offline-settings"
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border ${tone} transition-colors hover:opacity-90 ${className}`}
        title={label}
        aria-label={`Sync status: ${label}`}
      >
        <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
        {queuedCount > 0 && online ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {queuedCount > 9 ? "9+" : queuedCount}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <Link
      to="/offline-settings"
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:opacity-90 ${tone} ${className}`}
      title={label}
    >
      <Icon className={`h-3 w-3 ${spinning ? "animate-spin" : ""}`} />
      {label}
    </Link>
  )
}
