export const BOOKING_TYPE_OPTIONS = [
  { id: "flight", label: "Flight", icon: "✈️" },
  { id: "hotel", label: "Hotel", icon: "🏨" },
  { id: "train", label: "Train", icon: "🚆" },
  { id: "bus", label: "Bus", icon: "🚌" },
  { id: "taxi", label: "Taxi", icon: "🚕" },
  { id: "rental_car", label: "Rental Car", icon: "🚗" },
  { id: "cruise", label: "Cruise", icon: "🚢" },
  { id: "activity", label: "Activity", icon: "🎯" },
  { id: "restaurant", label: "Restaurant", icon: "🍽️" },
  { id: "insurance", label: "Travel Insurance", icon: "🛡️" },
  { id: "visa", label: "Visa Appointment", icon: "🛂" },
  { id: "other", label: "Other", icon: "📋" },
]

export const BOOKING_STATUS_OPTIONS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "cancelled", label: "Cancelled" },
  { id: "completed", label: "Completed" },
]

export const PAYMENT_STATUS_OPTIONS = [
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "refunded", label: "Refunded" },
]

export const ATTACHMENT_CATEGORIES = [
  { id: "flight_ticket", label: "Flight Ticket" },
  { id: "hotel_voucher", label: "Hotel Voucher" },
  { id: "boarding_pass", label: "Boarding Pass" },
  { id: "insurance_pdf", label: "Insurance PDF" },
  { id: "passport_scan", label: "Passport Scan" },
  { id: "visa", label: "Visa" },
  { id: "invoice", label: "Invoice" },
  { id: "other", label: "Other" },
]

export function bookingTypeMeta(id) {
  return BOOKING_TYPE_OPTIONS.find((t) => t.id === id) || BOOKING_TYPE_OPTIONS.at(-1)
}

export function formatBookingDate(value) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}
