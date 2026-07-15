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

export function riskTypeLabel(type) {
  return RISK_TYPE_LABELS[type] || "Risk"
}

export function severityColor(severity) {
  switch (String(severity).toUpperCase()) {
    case "CRITICAL":
      return "bg-red-600 text-white"
    case "HIGH":
      return "bg-orange-500 text-white"
    case "MEDIUM":
      return "bg-amber-400 text-amber-950"
    default:
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
  }
}

export function healthColor(score) {
  if (score >= 85) return "text-emerald-600"
  if (score >= 70) return "text-blue-600"
  if (score >= 50) return "text-amber-600"
  return "text-red-600"
}
