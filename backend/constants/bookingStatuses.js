export const BOOKING_STATUS_OPTIONS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "cancelled", label: "Cancelled" },
  { id: "completed", label: "Completed" },
]

export const BOOKING_STATUS_IDS = BOOKING_STATUS_OPTIONS.map((s) => s.id)

export const PAYMENT_STATUS_OPTIONS = [
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "refunded", label: "Refunded" },
]

export const PAYMENT_STATUS_IDS = PAYMENT_STATUS_OPTIONS.map((p) => p.id)

export function normalizeBookingStatus(value, fallback = "confirmed") {
  const id = String(value || "").toLowerCase()
  return BOOKING_STATUS_IDS.includes(id) ? id : fallback
}

export function normalizePaymentStatus(value, fallback = "pending") {
  const id = String(value || "").toLowerCase()
  return PAYMENT_STATUS_IDS.includes(id) ? id : fallback
}
