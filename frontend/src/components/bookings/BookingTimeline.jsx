"use client"

import BookingCard from "./BookingCard"
import { bookingTypeMeta, formatBookingDate } from "../../constants/bookingTypes"

export default function BookingTimeline({ timeline, loading }) {
  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading timeline…</p>
  }

  const entries = Object.entries(timeline?.byDate || {}).sort(([a], [b]) => a.localeCompare(b))
  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
        No bookings on the timeline yet. Add flights, hotels, and reservations to see them here.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {entries.map(([date, items]) => (
        <section key={date}>
          <h3 className="text-sm font-semibold text-foreground mb-4 sticky top-0 bg-card/95 py-1 backdrop-blur">
            {formatBookingDate(date).split(",")[0] || date}
          </h3>
          <div className="relative pl-6 border-l-2 border-primary/30 space-y-4">
            {items.map((b) => {
              const meta = bookingTypeMeta(b.bookingType)
              return (
                <div key={b.id} className="relative">
                  <span className="absolute -left-[1.6rem] top-3 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="rounded-lg border border-border bg-muted/20 p-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{meta.icon}</span>
                      <span className="font-medium text-foreground">{meta.label}</span>
                    </div>
                    <p className="font-semibold text-sm break-words">{b.provider}</p>
                    <p className="text-xs text-muted-foreground">{formatBookingDate(b.primaryDate)}</p>
                    {b.bookingReference ? (
                      <p className="text-xs text-muted-foreground mt-1">Ref: {b.bookingReference}</p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
