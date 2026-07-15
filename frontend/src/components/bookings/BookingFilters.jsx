"use client"

import { BOOKING_TYPE_OPTIONS, BOOKING_STATUS_OPTIONS } from "../../constants/bookingTypes"

export default function BookingFilters({ filters, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={filters.bookingType || ""}
        onChange={(e) => onChange({ bookingType: e.target.value || undefined })}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">All types</option>
        {BOOKING_TYPE_OPTIONS.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
      <select
        value={filters.status || ""}
        onChange={(e) => onChange({ status: e.target.value || undefined })}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">All statuses</option>
        {BOOKING_STATUS_OPTIONS.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
      <select
        value={filters.sort || "newest"}
        onChange={(e) => onChange({ sort: e.target.value })}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="price">Price</option>
        <option value="departure">Departure</option>
        <option value="arrival">Arrival</option>
      </select>
    </div>
  )
}
