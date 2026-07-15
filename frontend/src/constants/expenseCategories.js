/** Expense log categories — keep in sync with backend/constants/expenseCategories.js */
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

export function expenseCategoryLabel(id) {
  return EXPENSE_CATEGORY_OPTIONS.find((c) => c.id === id)?.label || id
}

export function expenseCategoryIcon(id) {
  return EXPENSE_CATEGORY_OPTIONS.find((c) => c.id === id)?.icon || "•"
}
