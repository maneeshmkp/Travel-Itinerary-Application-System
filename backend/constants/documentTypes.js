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

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

export const TRIP_ESSENTIAL_TYPES = [
  "passport",
  "visa",
  "travel_insurance",
  "flight_ticket",
  "hotel_voucher",
]

export const INTERNATIONAL_REQUIRED_TYPES = [
  "passport",
  "visa",
  "travel_insurance",
]

export function normalizeDocumentType(value) {
  const v = String(value || "other").toLowerCase().trim().replace(/\s+/g, "_")
  return DOCUMENT_TYPE_IDS.includes(v) ? v : "other"
}

export function documentTypeLabel(type) {
  return DOCUMENT_TYPE_LABELS[normalizeDocumentType(type)] || "Document"
}
