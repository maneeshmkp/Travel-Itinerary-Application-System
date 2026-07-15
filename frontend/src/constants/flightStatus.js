export const FLIGHT_STATUSES = ["Scheduled", "Delayed", "Boarding", "In Air", "Landed", "Cancelled"]

export function statusBadgeClass(status) {
  switch (status) {
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

export function formatCountdown(minutes) {
  if (minutes == null) return "—"
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}
