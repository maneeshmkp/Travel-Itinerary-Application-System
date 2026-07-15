export const TRAVEL_SCORE_LABELS = {
  excellent: "Excellent",
  veryGood: "Very Good",
  good: "Good",
  needsImprovement: "Needs Improvement",
}

export function travelScoreColor(score = 0) {
  if (score >= 90) return "text-emerald-600"
  if (score >= 75) return "text-blue-600"
  if (score >= 60) return "text-amber-600"
  return "text-red-600"
}
