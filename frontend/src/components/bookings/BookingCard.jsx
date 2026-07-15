"use client"

import { Link } from "react-router-dom"
import { bookingTypeMeta, formatBookingDate } from "../../constants/bookingTypes"
import { formatMoney } from "../../utils/budgetCalculations"

const statusTone = {
  upcoming: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900",
  pending: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  completed: "bg-muted text-muted-foreground border-border",
}

export default function BookingCard({ booking, compact = false, onEdit, onDelete }) {
  const meta = bookingTypeMeta(booking.bookingType)
  const tone = statusTone[booking.status] || statusTone.confirmed

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-sm shrink-0" aria-hidden>
            {meta.icon}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${tone}`}
          >
            {booking.status}
          </span>
        </div>
        {booking.price > 0 ? (
          <p className="text-sm font-semibold text-foreground tabular-nums shrink-0 ml-auto">
            {formatMoney(booking.price, booking.currency)}
          </p>
        ) : null}
      </div>

      <h3 className="mt-2 font-semibold text-foreground text-base break-words leading-snug">
        {booking.provider || "Booking"}
      </h3>

      {!compact && (booking.bookingReference || booking.confirmationNumber) ? (
        <p className="text-xs text-muted-foreground mt-1 break-all">
          {booking.bookingReference || booking.confirmationNumber}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground mt-1.5">{formatBookingDate(booking.primaryDate)}</p>

      <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link to={`/bookings/${booking.id}`} className="text-xs font-medium text-primary hover:underline">
          View details
        </Link>
        {onEdit ? (
          <button type="button" onClick={() => onEdit(booking)} className="text-xs text-muted-foreground hover:text-foreground">
            Edit
          </button>
        ) : null}
        {onDelete ? (
          <button type="button" onClick={() => onDelete(booking)} className="text-xs text-red-600 hover:underline">
            Delete
          </button>
        ) : null}
      </div>
    </article>
  )
}
