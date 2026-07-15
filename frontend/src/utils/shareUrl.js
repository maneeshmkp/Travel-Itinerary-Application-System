/**
 * Public share URL for an itinerary detail page (no auth required).
 */
export function getPublicItineraryUrl(id) {
  if (!id) return ""
  const base = typeof window !== "undefined" ? window.location.origin : ""
  return `${base}/itineraries/${id}`
}

/**
 * Invite link for collaborative editing (requires login + token join).
 */
export function getCollaborateUrl(id, token) {
  if (!id || !token) return ""
  const base = typeof window !== "undefined" ? window.location.origin : ""
  return `${base}/itineraries/${id}?collab=${encodeURIComponent(token)}`
}

export function itineraryPdfFilename(title) {
  const base = String(title || "itinerary")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
  return `${base || "itinerary"}.pdf`
}
