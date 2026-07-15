/** Mirror backend notification categories for UI filters */
export const NOTIFICATION_FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "warnings", label: "Warnings" },
  { id: "travel", label: "Travel" },
  { id: "finance", label: "Finance" },
  { id: "ai", label: "AI" },
]

export function notificationIconType(type) {
  if (!type) return "bell"
  if (type.startsWith("FLIGHT_")) return "plane"
  if (type.startsWith("HOTEL_")) return "hotel"
  if (type === "ACTIVITY_REMINDER") return "calendar"
  if (type === "WEATHER_ALERT") return "cloud-rain"
  if (type === "BUDGET_WARNING") return "wallet"
  if (type === "BUDGET_SAVINGS_AVAILABLE" || type === "BUDGET_OPTIMIZATION") return "wallet"
  if (type === "TRAVEL_MILESTONE") return "bar-chart"
  if (type.startsWith("COLLAB_")) return "users"
  if (type.startsWith("BOOKING_")) return "ticket"
  if (type.startsWith("DOCUMENT_")) return "file-text"
  if (type === "AI_REMINDER") return "sparkles"
  return "bell"
}

export function formatNotificationTime(dateStr) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
