"use client"

import { Clock } from "lucide-react"

export default function OfflineQueueList({ items = [] }) {
  if (!items.length) return null

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm space-y-2">
      <p className="text-sm font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Pending sync ({items.length})
      </p>
      <ul className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
        {items.map((item) => (
          <li key={item.id} className="rounded-md bg-muted/30 px-2 py-1.5 flex justify-between gap-2">
            <span className="font-medium">{item.action}</span>
            <span className="text-muted-foreground truncate">{item.url}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
