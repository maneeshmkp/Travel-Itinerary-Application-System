"use client"

import { useState } from "react"
import {
  BOOKING_TYPE_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "../../constants/bookingTypes"
import { DEFAULT_CURRENCY } from "../../utils/budgetCalculations"
import CurrencySelect from "../common/CurrencySelect"
import BookingUpload from "./BookingUpload"

const emptyForm = (tripId, currency) => ({
  tripId,
  bookingType: "flight",
  provider: "",
  bookingReference: "",
  confirmationNumber: "",
  status: "confirmed",
  paymentStatus: "pending",
  price: "",
  currency: currency || DEFAULT_CURRENCY,
  departureDate: "",
  arrivalDate: "",
  checkIn: "",
  checkOut: "",
  eventDate: "",
  travelerNames: "",
  seatNumber: "",
  gate: "",
  terminal: "",
  flightNumber: "",
  originCode: "",
  destinationCode: "",
  hotelAddress: "",
  phone: "",
  website: "",
  email: "",
  notes: "",
  locationName: "",
  attachments: [],
})

function toPayload(form) {
  return {
    ...form,
    price: Number(form.price) || 0,
    travelerNames: String(form.travelerNames || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    departureDate: form.departureDate || undefined,
    arrivalDate: form.arrivalDate || undefined,
    checkIn: form.checkIn || undefined,
    checkOut: form.checkOut || undefined,
    eventDate: form.eventDate || undefined,
  }
}

export default function BookingForm({ tripId, initial, defaultCurrency, saving, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm(tripId, defaultCurrency))

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const type = form.bookingType

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.(toPayload(form))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-muted-foreground">Type</span>
          <select
            value={form.bookingType}
            onChange={(e) => set("bookingType", e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {BOOKING_TYPE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Provider</span>
          <input
            required
            value={form.provider}
            onChange={(e) => set("provider", e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Airline, hotel, etc."
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Booking reference</span>
          <input
            value={form.bookingReference}
            onChange={(e) => set("bookingReference", e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Confirmation #</span>
          <input
            value={form.confirmationNumber}
            onChange={(e) => set("confirmationNumber", e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Status</span>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {BOOKING_STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Payment</span>
          <select value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Price</span>
          <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Currency</span>
          <div className="mt-1">
            <CurrencySelect value={form.currency} onChange={(c) => set("currency", c)} />
          </div>
        </label>
      </div>

      {(type === "flight" || type === "train" || type === "bus" || type === "taxi" || type === "cruise") && (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">Departure</span>
            <input type="datetime-local" value={form.departureDate} onChange={(e) => set("departureDate", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Arrival</span>
            <input type="datetime-local" value={form.arrivalDate} onChange={(e) => set("arrivalDate", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          {type === "flight" && (
            <>
              <label className="block text-sm sm:col-span-2">
                <span className="text-muted-foreground">Flight number</span>
                <input
                  value={form.flightNumber}
                  onChange={(e) => set("flightNumber", e.target.value.toUpperCase())}
                  placeholder="e.g. AI298"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Origin (IATA)</span>
                <input
                  value={form.originCode}
                  onChange={(e) => set("originCode", e.target.value.toUpperCase())}
                  placeholder="DEL"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Destination (IATA)</span>
                <input
                  value={form.destinationCode}
                  onChange={(e) => set("destinationCode", e.target.value.toUpperCase())}
                  placeholder="BOM"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Seat</span>
                <input value={form.seatNumber} onChange={(e) => set("seatNumber", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Gate / Terminal</span>
                <div className="mt-1 flex gap-2">
                  <input value={form.gate} onChange={(e) => set("gate", e.target.value)} placeholder="Gate" className="w-1/2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <input value={form.terminal} onChange={(e) => set("terminal", e.target.value)} placeholder="Terminal" className="w-1/2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
              </label>
            </>
          )}
        </div>
      )}

      {type === "hotel" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">Check-in</span>
            <input type="datetime-local" value={form.checkIn} onChange={(e) => set("checkIn", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Check-out</span>
            <input type="datetime-local" value={form.checkOut} onChange={(e) => set("checkOut", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted-foreground">Address</span>
            <input value={form.hotelAddress} onChange={(e) => set("hotelAddress", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
        </div>
      )}

      {(type === "restaurant" || type === "activity" || type === "visa" || type === "insurance") && (
        <label className="block text-sm">
          <span className="text-muted-foreground">Event date</span>
          <input type="datetime-local" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
      )}

      <label className="block text-sm">
        <span className="text-muted-foreground">Travelers (comma-separated)</span>
        <input value={form.travelerNames} onChange={(e) => set("travelerNames", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </label>

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block text-sm">
          <span className="text-muted-foreground">Phone</span>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Email</span>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Website</span>
          <input value={form.website} onChange={(e) => set("website", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-muted-foreground">Notes</span>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </label>

      {!tripId ? (
        <label className="block text-sm">
          <span className="text-muted-foreground">Trip ID (from itinerary URL)</span>
          <input
            required
            value={form.tripId || ""}
            onChange={(e) => set("tripId", e.target.value)}
            placeholder="Paste itinerary ID"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </label>
      ) : null}

      <BookingUpload attachments={form.attachments} onChange={(attachments) => set("attachments", attachments)} />

      <div className="flex gap-2 justify-end pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm">
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
          {saving ? "Saving…" : initial ? "Update booking" : "Save booking"}
        </button>
      </div>
    </form>
  )
}
