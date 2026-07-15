"use client"

import { Link, useLocation } from "react-router-dom"
import { Plus } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

/**
 * Global floating primary action — replaces the old "Create" nav link.
 * Positioned to avoid overlapping itinerary AI copilot and mobile bottom nav.
 */
export default function FloatingCreateButton() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return null

  const onItineraryDetail = /^\/itineraries\/[^/]+$/.test(location.pathname)

  return (
    <Link
      to="/create"
      className={`fixed z-40 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        onItineraryDetail
          ? "bottom-24 left-4 h-12 w-12 md:bottom-6 md:left-6"
          : "bottom-20 right-4 h-14 w-14 md:bottom-6 md:right-6"
      }`}
      aria-label="Create new itinerary"
      title="Create itinerary"
    >
      <Plus className={onItineraryDetail ? "h-5 w-5" : "h-6 w-6"} strokeWidth={2.5} />
      <span className="sr-only">Create itinerary</span>
    </Link>
  )
}
