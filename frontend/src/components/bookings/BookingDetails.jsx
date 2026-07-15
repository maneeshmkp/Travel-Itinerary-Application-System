"use client"

import { Loader2, Wallet, Trash2 } from "lucide-react"
import { bookingTypeMeta, formatBookingDate } from "../../constants/bookingTypes"
import { formatMoney } from "../../utils/budgetCalculations"
import BookingUpload from "./BookingUpload"

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-border/60 last:border-0">
      <dt className="text-xs font-medium text-muted-foreground sm:w-36 shrink-0">{label}</dt>
      <dd className="text-sm text-foreground break-words">{value}</dd>
    </div>
  )
}

export default function BookingDetails({ booking, loading, onConvertExpense, onDelete, converting }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!booking) return <p className="text-muted-foreground">Booking not found.</p>

  const meta = bookingTypeMeta(booking.bookingType)

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{meta.icon} {meta.label}</p>
        <h1 className="text-2xl font-bold text-foreground">{booking.provider}</h1>
        <p className="text-sm text-muted-foreground capitalize mt-1">Status: {booking.status}</p>
      </header>

      <dl className="rounded-xl border border-border bg-card p-4">
        <Row label="Provider" value={booking.provider} />
        <Row label="Reference" value={booking.bookingReference} />
        <Row label="Confirmation" value={booking.confirmationNumber} />
        <Row label="Travelers" value={booking.travelerNames?.join(", ")} />
        <Row label="Seat" value={booking.seatNumber} />
        <Row label="Gate" value={booking.gate} />
        <Row label="Terminal" value={booking.terminal} />
        <Row label="Departure" value={formatBookingDate(booking.departureDate)} />
        <Row label="Arrival" value={formatBookingDate(booking.arrivalDate)} />
        <Row label="Check-in" value={formatBookingDate(booking.checkIn)} />
        <Row label="Check-out" value={formatBookingDate(booking.checkOut)} />
        <Row label="Address" value={booking.hotelAddress || booking.locationName} />
        <Row label="Phone" value={booking.phone} />
        <Row label="Email" value={booking.email} />
        <Row label="Website" value={booking.website} />
        <Row label="Price" value={booking.price > 0 ? formatMoney(booking.price, booking.currency) : null} />
        <Row label="Payment" value={booking.paymentStatus} />
        <Row label="Notes" value={booking.notes} />
      </dl>

      {booking.attachments?.length ? (
        <div>
          <h2 className="text-sm font-semibold mb-2">Attachments</h2>
          <BookingUpload attachments={booking.attachments} onChange={() => {}} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!booking.expenseId && booking.price > 0 ? (
          <button
            type="button"
            disabled={converting}
            onClick={onConvertExpense}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            <Wallet className="h-4 w-4" />
            Convert to expense
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        ) : null}
      </div>
    </div>
  )
}
