/** Supported trip & expense currencies — keep in sync with backend/constants/currencies.js */
export const CURRENCY_OPTIONS = [
  { code: "INR", label: "Indian Rupee (INR)", symbol: "₹" },
  { code: "USD", label: "US Dollar (USD)", symbol: "$" },
  { code: "EUR", label: "Euro (EUR)", symbol: "€" },
  { code: "GBP", label: "British Pound (GBP)", symbol: "£" },
  { code: "AED", label: "UAE Dirham (AED)", symbol: "د.إ" },
  { code: "SGD", label: "Singapore Dollar (SGD)", symbol: "S$" },
  { code: "AUD", label: "Australian Dollar (AUD)", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar (CAD)", symbol: "C$" },
  { code: "JPY", label: "Japanese Yen (JPY)", symbol: "¥" },
  { code: "THB", label: "Thai Baht (THB)", symbol: "฿" },
]

export const DEFAULT_CURRENCY = "INR"

export const CURRENCY_CODES = CURRENCY_OPTIONS.map((c) => c.code)

export function isValidCurrency(code) {
  return CURRENCY_CODES.includes(String(code || "").toUpperCase())
}

export function normalizeCurrency(code, fallback = DEFAULT_CURRENCY) {
  const upper = String(code || "").toUpperCase()
  return isValidCurrency(upper) ? upper : fallback
}

export function currencySymbol(code) {
  return CURRENCY_OPTIONS.find((c) => c.code === normalizeCurrency(code))?.symbol || code
}
