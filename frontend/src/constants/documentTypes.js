export const DOCUMENT_TYPE_IDS = [
  "passport",
  "visa",
  "aadhaar",
  "driving_license",
  "travel_insurance",
  "flight_ticket",
  "boarding_pass",
  "hotel_voucher",
  "train_ticket",
  "bus_ticket",
  "rental_car",
  "vaccination_certificate",
  "travel_permit",
  "expense_receipt",
  "other",
]

export const DOCUMENT_TYPE_LABELS = {
  passport: "Passport",
  visa: "Visa",
  aadhaar: "Aadhaar",
  driving_license: "Driving License",
  travel_insurance: "Travel Insurance",
  flight_ticket: "Flight Ticket",
  boarding_pass: "Boarding Pass",
  hotel_voucher: "Hotel Voucher",
  train_ticket: "Train Ticket",
  bus_ticket: "Bus Ticket",
  rental_car: "Rental Car Agreement",
  vaccination_certificate: "Vaccination Certificate",
  travel_permit: "Travel Permit",
  expense_receipt: "Expense Receipt",
  other: "Other",
}

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export const ACCEPT_UPLOAD = ".pdf,.png,.jpg,.jpeg,.webp,.docx,application/pdf,image/*"

export const MAX_DOCUMENT_MB = 20

export const TRIP_ESSENTIAL_TYPES = ["passport", "visa", "travel_insurance", "flight_ticket", "hotel_voucher"]

export function documentTypeLabel(type) {
  return DOCUMENT_TYPE_LABELS[type] || "Document"
}

export function expiryBadgeClass(status) {
  if (status === "expired") return "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900"
  if (status === "expiring_soon") return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900"
  return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900"
}

export function formatDocDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
