export const FLIGHT_STATUS_IDS = [
  "Scheduled",
  "Delayed",
  "Boarding",
  "In Air",
  "Landed",
  "Cancelled",
]

export const ACTIVE_FLIGHT_STATUSES = new Set(["Scheduled", "Delayed", "Boarding", "In Air"])

export const TERMINAL_FLIGHT_STATUSES = new Set(["Landed", "Cancelled"])

export function normalizeFlightStatus(value) {
  const v = String(value || "Scheduled").trim()
  const map = {
    scheduled: "Scheduled",
    delayed: "Delayed",
    boarding: "Boarding",
    "in air": "In Air",
    in_air: "In Air",
    airborne: "In Air",
    landed: "Landed",
    arrived: "Landed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
  }
  const key = v.toLowerCase()
  return map[key] || (FLIGHT_STATUS_IDS.includes(v) ? v : "Scheduled")
}

export function statusBadgeClass(status) {
  switch (normalizeFlightStatus(status)) {
    case "Delayed":
      return "bg-amber-500 text-white"
    case "Boarding":
      return "bg-blue-600 text-white"
    case "In Air":
      return "bg-indigo-600 text-white"
    case "Landed":
      return "bg-emerald-600 text-white"
    case "Cancelled":
      return "bg-red-600 text-white"
    default:
      return "bg-slate-500 text-white"
  }
}
