/** Keep in sync with backend/constants/paymentMethods.js */
export const PAYMENT_METHOD_OPTIONS = [
  { id: "cash", label: "Cash" },
  { id: "credit_card", label: "Credit Card" },
  { id: "upi", label: "UPI" },
  { id: "debit_card", label: "Debit Card" },
  { id: "other", label: "Other" },
]

export function paymentMethodLabel(id) {
  return PAYMENT_METHOD_OPTIONS.find((p) => p.id === id)?.label || id
}
