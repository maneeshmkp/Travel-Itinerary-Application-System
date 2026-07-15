import {
  LayoutDashboard,
  CalendarDays,
  Plane,
  Ticket,
  Wallet,
  FolderLock,
  Sparkles,
  Map,
  BarChart3,
} from "lucide-react"

/**
 * Workspace tab definitions for the itinerary detail page.
 * Order controls both the desktop sticky nav and the tab switcher.
 */
export const WORKSPACE_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "transport", label: "Transport", icon: Plane },
  { id: "bookings", label: "Bookings", icon: Ticket },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "documents", label: "Documents", icon: FolderLock },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "map", label: "Maps", icon: Map },
  { id: "insights", label: "Insights", icon: BarChart3 },
]

/** Primary tabs surfaced in the mobile bottom navigation. */
export const MOBILE_TABS = ["overview", "schedule", "ai", "bookings"]

/**
 * Legacy deep-link hashes (used by notifications, e.g. `/itineraries/:id#budget`)
 * mapped to the workspace tab that now owns that feature.
 */
export const HASH_TO_TAB = {
  overview: "overview",
  schedule: "schedule",
  itinerary: "schedule",
  transport: "transport",
  flights: "transport",
  availability: "transport",
  trains: "transport",
  buses: "transport",
  bookings: "bookings",
  calendar: "bookings",
  finance: "finance",
  budget: "finance",
  expenses: "finance",
  documents: "documents",
  ai: "ai",
  packing: "ai",
  risks: "ai",
  copilot: "ai",
  map: "map",
  "trip-map": "map",
  nearby: "map",
  insights: "insights",
  reviews: "insights",
  highlights: "insights",
  similar: "insights",
}

export function tabFromHash(hash = "") {
  const key = String(hash || "").replace(/^#/, "").trim().toLowerCase()
  return HASH_TO_TAB[key] || null
}

export function formatTripDate(dateString) {
  if (!dateString) return ""
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function categoryIcon(category) {
  const icons = {
    sightseeing: "🏛️",
    adventure: "🏔️",
    cultural: "🎭",
    relaxation: "🧘",
    dining: "🍽️",
    shopping: "🛍️",
  }
  return icons[category] || "📍"
}

/** Derive a human trip status from start date + duration (no backend field). */
export function deriveTripStatus(itinerary) {
  if (!itinerary?.startDate) return { key: "planned", label: "Planned" }
  const start = new Date(itinerary.startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + Math.max(1, Number(itinerary.totalDays) || 1) - 1)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (end < now) return { key: "completed", label: "Completed" }
  if (start > now) return { key: "upcoming", label: "Upcoming" }
  return { key: "active", label: "In progress" }
}
