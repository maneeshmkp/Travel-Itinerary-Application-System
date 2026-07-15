import {
  List,
  Sparkles,
  Ticket,
  BarChart3,
  Compass,
  Bookmark,
  FolderLock,
  BookOpen,
  Settings,
  LogOut,
  Calendar,
  Home,
  User,
  Activity,
} from "lucide-react"

/** Max five primary destinations in the top nav (authenticated). */
export const PRIMARY_NAV = [
  { name: "Trips", href: "/itineraries", icon: List },
  { name: "Plan with AI", href: "/ai-itinerary", icon: Sparkles },
  { name: "Bookings", href: "/bookings", icon: Ticket },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Discover", href: "/recommendations", icon: Compass },
]

/** Shown in tablet "More" menu and mobile overflow. */
export const SECONDARY_NAV = [{ name: "Travel Blog", href: "/blogs", icon: BookOpen }]

/** Mobile bottom bar — Create is a global FAB, not a tab. */
export const MOBILE_BOTTOM_NAV = [
  { name: "Trips", href: "/itineraries", icon: List },
  { name: "AI", href: "/ai-itinerary", icon: Sparkles },
  { name: "Bookings", href: "/bookings", icon: Ticket },
  { name: "Stats", href: "/analytics", icon: BarChart3 },
  { name: "Profile", href: "__profile__", icon: User },
]

export const MOBILE_BOTTOM_NAV_GUEST = [
  { name: "Home", href: "/", icon: Home },
  { name: "Blog", href: "/blogs", icon: BookOpen },
  { name: "Login", href: "/login", icon: User },
  { name: "Sign up", href: "/signup", icon: Sparkles },
]

/** Profile dropdown — secondary account actions. */
export const PROFILE_MENU = [
  { name: "Saved Trips", href: "/saved", icon: Bookmark },
  { name: "Documents", href: "/documents", icon: FolderLock },
  { type: "divider" },
  { name: "Admin Portal", href: "/admin", icon: Activity, staffAdminOnly: true },
  { name: "Super Admin", href: "/super-admin", icon: Activity, superAdminOnly: true },
  { name: "Settings", href: "/offline-settings", icon: Settings },
  { name: "Calendar sync", href: "/calendar-settings", icon: Calendar },
  { type: "divider" },
  { name: "Travel Blog", href: "/blogs", icon: BookOpen },
]

export function isNavActive(pathname, href) {
  if (!href || href === "__profile__") return false
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function userInitials(user) {
  const name = user?.name?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  const email = user?.email?.trim()
  if (email) return email.slice(0, 2).toUpperCase()
  return "U"
}
