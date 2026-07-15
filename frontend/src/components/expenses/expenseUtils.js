import { formatMoney } from "../../utils/budgetCalculations"
import { expenseCategoryLabel } from "../../constants/expenseCategories"

/** Subtle accent per category for cards and badges */
export const CATEGORY_ACCENT = {
  food: { badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300", bar: "bg-orange-500" },
  transport: { badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300", bar: "bg-blue-500" },
  hotel: { badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300", bar: "bg-violet-500" },
  activity: { badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" },
  shopping: { badge: "bg-pink-500/10 text-pink-700 dark:text-pink-300", bar: "bg-pink-500" },
  entertainment: { badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300", bar: "bg-purple-500" },
  health: { badge: "bg-red-500/10 text-red-700 dark:text-red-300", bar: "bg-red-500" },
  fuel: { badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300", bar: "bg-amber-500" },
  tickets: { badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", bar: "bg-cyan-500" },
  tips: { badge: "bg-lime-500/10 text-lime-700 dark:text-lime-300", bar: "bg-lime-500" },
  insurance: { badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300", bar: "bg-slate-500" },
  misc: { badge: "bg-gray-500/10 text-gray-700 dark:text-gray-300", bar: "bg-gray-500" },
}

export function getCategoryAccent(categoryId) {
  return CATEGORY_ACCENT[categoryId] || CATEGORY_ACCENT.misc
}

const GENERIC_DESCRIPTIONS = new Set(
  [
    "food & dining", "food & dining", "transport & travel", "hotel & accommodation",
    "activities & tours", "activities", "activity", "shopping & souvenirs",
    "entertainment & nightlife", "health & pharmacy", "fuel & parking",
    "tickets & entry fees", "tips & service", "insurance & visas", "miscellaneous", "expense",
  ].map((s) => s.toLowerCase()),
)

/** Prefer user description; fall back to category label when description is generic. */
export function expenseDisplayTitle(expense) {
  const desc = String(expense.description || "").trim()
  const catLabel = expenseCategoryLabel(expense.category)
  if (!desc) return catLabel
  const descLower = desc.toLowerCase()
  if (descLower === catLabel.toLowerCase()) return catLabel
  if (GENERIC_DESCRIPTIONS.has(descLower)) return catLabel
  return desc
}

export function getBudgetBarColor(percentUsed) {
  if (percentUsed == null) return "bg-primary"
  if (percentUsed > 100) return "bg-red-900"
  if (percentUsed >= 90) return "bg-red-500"
  if (percentUsed >= 70) return "bg-amber-500"
  return "bg-emerald-500"
}

export function getBudgetTextColor(percentUsed) {
  if (percentUsed == null) return "text-foreground"
  if (percentUsed > 100) return "text-red-900 dark:text-red-300"
  if (percentUsed >= 90) return "text-red-600 dark:text-red-400"
  if (percentUsed >= 70) return "text-amber-600 dark:text-amber-400"
  return "text-emerald-700 dark:text-emerald-400"
}

export function getBudgetSummaryMessage(budget, currency) {
  if (!budget) return ""
  const { planned, percentUsed, exceededBy, remaining } = budget
  if (planned <= 0) return "Set a trip budget or activity costs to enable planned vs actual tracking."
  if (exceededBy > 0) return `You exceeded your budget by ${formatMoney(exceededBy, currency)}.`
  if (percentUsed != null && remaining >= 0) {
    return `You have spent ${Math.round(percentUsed)}% of your trip budget.`
  }
  return ""
}

export function getWarningMessage(warningLevel, budget, currency) {
  if (!warningLevel || !budget) return null
  const { exceededBy } = budget
  switch (warningLevel) {
    case "approaching":
      return "Approaching budget — you've used 80% or more of your planned budget."
    case "almost":
      return "Almost out of budget — you've used 90% or more."
    case "exhausted":
      return "Budget exhausted — you've used 100% of your planned budget."
    case "over":
      return `Over budget — exceeded by ${formatMoney(exceededBy, currency)}.`
    default:
      return null
  }
}

export function getWarningStyles(warningLevel) {
  switch (warningLevel) {
    case "approaching":
      return "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200"
    case "almost":
      return "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/40 dark:border-orange-900 dark:text-orange-200"
    case "exhausted":
      return "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200"
    case "over":
      return "bg-red-100 border-red-300 text-red-900 dark:bg-red-950/60 dark:border-red-800 dark:text-red-200"
    default:
      return ""
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function categoryStatusLabel(row, currency) {
  if (row.status === "over") return `Over by ${formatMoney(Math.abs(row.difference), currency)}`
  if (row.status === "under" && row.planned > 0) return `Remaining ${formatMoney(row.difference, currency)}`
  return "—"
}
