export const BUDGET_HEALTH_LABELS = {
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  poor: "Poor",
}

export const CATEGORY_LABELS = {
  hotel: "Hotel",
  transport: "Transport",
  food: "Food",
  activity: "Activities",
  flight: "Flights",
  shopping: "Shopping",
  misc: "Misc",
}

export const DIFFICULTY_LABELS = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
}

export function healthColor(score = 0) {
  if (score >= 85) return "text-emerald-600"
  if (score >= 70) return "text-blue-600"
  if (score >= 50) return "text-amber-600"
  return "text-red-600"
}

export function impactBadgeClass(impact) {
  if (impact === "high") return "bg-red-100 text-red-800 border-red-200"
  if (impact === "medium") return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-slate-100 text-slate-700 border-slate-200"
}
