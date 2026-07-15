export const RISK_TYPE_IDS = [
  "heavy_rain",
  "storm",
  "extreme_heat",
  "snow",
  "cyclone",
  "flood",
  "museum_closed",
  "public_holiday",
  "flight_delay",
  "flight_cancellation",
  "hotel_checkin_conflict",
  "overlapping_activities",
  "long_travel_time",
  "traffic_congestion",
  "budget_exceeded",
  "passport_expiring",
  "visa_expiring",
  "missing_documents",
  "late_night_travel",
  "unsafe_area",
  "schedule_conflict",
  "restaurant_overlap",
  "missing_transport",
  "general",
]

export const RISK_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
export const RISK_STATUSES = ["OPEN", "RESOLVED", "IGNORED"]

export const RISK_TYPE_LABELS = {
  heavy_rain: "Heavy Rain",
  storm: "Storm",
  extreme_heat: "Extreme Heat",
  snow: "Snow",
  cyclone: "Cyclone",
  flood: "Flood",
  museum_closed: "Museum Closed",
  public_holiday: "Public Holiday",
  flight_delay: "Flight Delay",
  flight_cancellation: "Flight Cancellation",
  hotel_checkin_conflict: "Hotel Check-in Conflict",
  overlapping_activities: "Overlapping Activities",
  long_travel_time: "Long Travel Time",
  traffic_congestion: "Traffic Congestion",
  budget_exceeded: "Budget Exceeded",
  passport_expiring: "Passport Expiring",
  visa_expiring: "Visa Expiring",
  missing_documents: "Missing Documents",
  late_night_travel: "Late Night Travel",
  unsafe_area: "Unsafe Area",
  schedule_conflict: "Schedule Conflict",
  restaurant_overlap: "Restaurant Overlap",
  missing_transport: "Missing Transport",
  general: "General Risk",
}

export const HEALTH_LABELS = {
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  poor: "Poor",
}

export function riskTypeLabel(type) {
  return RISK_TYPE_LABELS[type] || "Risk"
}

export function normalizeRiskType(value) {
  const v = String(value || "general")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
  return RISK_TYPE_IDS.includes(v) ? v : "general"
}

export function normalizeSeverity(value) {
  const v = String(value || "LOW").toUpperCase()
  return RISK_SEVERITIES.includes(v) ? v : "LOW"
}

export function severityRank(severity) {
  const map = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
  return map[normalizeSeverity(severity)] || 1
}
