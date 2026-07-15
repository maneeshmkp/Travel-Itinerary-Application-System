"use client"

import { CalendarDays } from "lucide-react"

function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d - new Date()) / (24 * 60 * 60 * 1000))
}

export default function PackingTimeline({ startDate, progress }) {
  const days = daysUntil(startDate)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Packing timeline</h3>
      </div>
      {days === null ? (
        <p className="text-sm text-muted-foreground">Set a trip start date to see your packing schedule.</p>
      ) : days < 0 ? (
        <p className="text-sm text-muted-foreground">Trip has started — hope you packed everything!</p>
      ) : days === 0 ? (
        <p className="text-sm font-medium text-primary">Departure is today. Final check recommended.</p>
      ) : days <= 3 ? (
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {days} day{days === 1 ? "" : "s"} until departure — {(progress?.percent ?? 0) < 80 ? "finish packing soon" : "almost ready"}.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {days} days until departure. Aim to be {(progress?.percent ?? 0) >= 50 ? "fully" : "50%"} packed by 3 days before travel.
        </p>
      )}
    </div>
  )
}
