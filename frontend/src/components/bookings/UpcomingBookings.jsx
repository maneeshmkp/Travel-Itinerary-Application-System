"use client"

import { Link } from "react-router-dom"
import BookingCard from "./BookingCard"
import { formatBookingDate } from "../../constants/bookingTypes"

export default function UpcomingBookings({ items = [], limit = 5 }) {
  const list = items.slice(0, limit)
  if (!list.length) {
    return <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
  }
  return (
    <div className="space-y-3">
      {list.map((b) => (
        <BookingCard key={b.id} booking={b} compact />
      ))}
      <Link to="/bookings" className="text-xs font-medium text-primary hover:underline">
        View all bookings →
      </Link>
    </div>
  )
}

export function BookingCalendar({ timeline }) {
  const entries = Object.entries(timeline?.byDate || {}).sort(([a], [b]) => a.localeCompare(b))
  if (!entries.length) return <p className="text-sm text-muted-foreground">No calendar events.</p>

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {entries.map(([date, items]) => (
        <div key={date} className="rounded-lg border border-border p-3 bg-muted/20">
          <p className="text-xs font-semibold text-primary mb-2">{formatBookingDate(date).split(",")[0]}</p>
          <ul className="space-y-1 text-sm">
            {items.map((b) => (
              <li key={b.id} className="text-foreground">
                {b.provider} <span className="text-muted-foreground">({b.bookingType})</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
