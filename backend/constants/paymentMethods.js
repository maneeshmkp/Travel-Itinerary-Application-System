export const PAYMENT_METHOD_OPTIONS = [
  { id: "cash", label: "Cash" },
  { id: "credit_card", label: "Credit Card" },
  { id: "upi", label: "UPI" },
  { id: "debit_card", label: "Debit Card" },
  { id: "other", label: "Other" },
]

export const PAYMENT_METHOD_IDS = PAYMENT_METHOD_OPTIONS.map((p) => p.id)

export function normalizePaymentMethod(id, fallback = "cash") {
  const lower = String(id || "").toLowerCase()
  return PAYMENT_METHOD_IDS.includes(lower) ? lower : fallback
}
