"use client"

import { WifiOff, RefreshCw } from "lucide-react"
import { useOffline } from "../../context/OfflineContext"

export default function OfflineBanner() {
  const { offline, isSyncing, retrySync, lastMessage } = useOffline()
  if (!offline && !lastMessage) return null

  return (
    <div
      className={`shrink-0 px-4 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b ${
        offline
          ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-100"
          : "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-100"
      }`}
      role="status"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          {offline
            ? "No internet connection — you are working offline."
            : lastMessage || "Changes synced."}
        </span>
      </div>
      <button
        type="button"
        onClick={retrySync}
        disabled={isSyncing}
        className="inline-flex items-center gap-1.5 rounded-md border border-current/30 px-2.5 py-1 text-xs font-medium hover:bg-black/5 disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing…" : "Retry sync"}
      </button>
    </div>
  )
}
