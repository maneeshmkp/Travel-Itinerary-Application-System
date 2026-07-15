"use client"

import { Trash2 } from "lucide-react"

function formatBytes(n) {
  if (!n) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(1)} ${units[i]}`
}

export default function StorageUsageCard({ stats, onClear }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold">Offline storage</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Used</p>
          <p className="font-semibold">{formatBytes(stats.bytesUsed)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Downloaded trips</p>
          <p className="font-semibold">{stats.downloadedTrips}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Pending requests</p>
          <p className="font-semibold">{stats.pendingRequests}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Cached blogs</p>
          <p className="font-semibold">{stats.cachedBlogs}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Clear cache
      </button>
    </div>
  )
}
