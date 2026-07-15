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

export const BOOKING_TYPE_IDS = BOOKING_TYPE_OPTIONS.map((t) => t.id)

export function normalizeBookingType(value, fallback = "other") {
  const id = String(value || "").toLowerCase()
  return BOOKING_TYPE_IDS.includes(id) ? id : fallback
}

export const ATTACHMENT_CATEGORIES = [
  "flight_ticket",
  "hotel_voucher",
  "boarding_pass",
  "insurance_pdf",
  "passport_scan",
  "visa",
  "invoice",
  "other",
]
