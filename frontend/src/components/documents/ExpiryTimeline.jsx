"use client"

import { CalendarClock } from "lucide-react"
import { expiryBadgeClass, formatDocDate, documentTypeLabel } from "../../constants/documentTypes"

export default function ExpiryTimeline({ items = [], loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
        No documents with expiry dates yet.
      </p>
    )
  }

  return (
    <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {items.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{doc.title}</p>
            <p className="text-xs text-muted-foreground">{documentTypeLabel(doc.documentType)}</p>
          </div>
          <span className={`shrink-0 text-xs rounded-full border px-2 py-0.5 ${expiryBadgeClass(doc.expiryStatus)}`}>
            {formatDocDate(doc.expiryDate)}
          </span>
        </li>
      ))}
    </ul>
  )
}
