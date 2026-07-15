export const EXPENSE_CATEGORY_OPTIONS = [
  { id: "food", label: "Food & Dining", icon: "🍽️" },
  { id: "transport", label: "Transport & Travel", icon: "🚌" },
  { id: "hotel", label: "Hotel & Accommodation", icon: "🏨" },
  { id: "activity", label: "Activities & Tours", icon: "🎯" },
  { id: "shopping", label: "Shopping & Souvenirs", icon: "🛍️" },
  { id: "entertainment", label: "Entertainment & Nightlife", icon: "🎭" },
  { id: "health", label: "Health & Pharmacy", icon: "💊" },
  { id: "fuel", label: "Fuel & Parking", icon: "⛽" },
  { id: "tickets", label: "Tickets & Entry Fees", icon: "🎫" },
  { id: "tips", label: "Tips & Service", icon: "💵" },
  { id: "insurance", label: "Insurance & Visas", icon: "🛡️" },
  { id: "misc", label: "Miscellaneous", icon: "📦" },
]

export const EXPENSE_CATEGORY_IDS = EXPENSE_CATEGORY_OPTIONS.map((c) => c.id)

export function isValidExpenseCategory(id) {
  return EXPENSE_CATEGORY_IDS.includes(String(id || "").toLowerCase())
}

export function normalizeExpenseCategory(id, fallback = "misc") {
  const lower = String(id || "").toLowerCase()
  return isValidExpenseCategory(lower) ? lower : fallback
}
