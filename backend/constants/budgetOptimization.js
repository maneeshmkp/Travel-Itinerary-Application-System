export const OPTIMIZATION_CATEGORIES = [
  "hotel",
  "transport",
  "food",
  "activity",
  "flight",
  "shopping",
  "misc",
]

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"]
export const IMPACT_LEVELS = ["low", "medium", "high"]
export const RECOMMENDATION_STATUSES = ["pending", "accepted", "rejected"]

export const BUDGET_HEALTH_LABELS = {
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  poor: "Poor",
}

export function normalizeCategory(cat) {
  const id = String(cat || "misc").toLowerCase().trim()
  return OPTIMIZATION_CATEGORIES.includes(id) ? id : "misc"
}

export function normalizeDifficulty(d) {
  const id = String(d || "medium").toLowerCase()
  return DIFFICULTY_LEVELS.includes(id) ? id : "medium"
}

export function normalizeImpact(i) {
  const id = String(i || "medium").toLowerCase()
  return IMPACT_LEVELS.includes(id) ? id : "medium"
}

export function normalizeRecommendationStatus(s) {
  const id = String(s || "pending").toLowerCase()
  return RECOMMENDATION_STATUSES.includes(id) ? id : "pending"
}
