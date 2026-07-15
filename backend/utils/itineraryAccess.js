import crypto from "crypto"

export function userIdString(userOrId) {
  if (!userOrId) return null
  if (typeof userOrId === "string") return userOrId
  return userOrId._id?.toString() || userOrId.toString()
}

export function isItineraryOwner(itinerary, userId) {
  const uid = userIdString(userId)
  const ownerId = userIdString(itinerary?.ownerId)
  return Boolean(uid && ownerId && uid === ownerId)
}

export function isItineraryCollaborator(itinerary, userId) {
  const uid = userIdString(userId)
  if (!uid) return false
  return (itinerary?.collaborators || []).some((c) => userIdString(c.userId) === uid)
}

export function canEditItinerary(itinerary, userId) {
  if (!userId || !itinerary) return false
  return isItineraryOwner(itinerary, userId) || isItineraryCollaborator(itinerary, userId)
}

/**
 * Access rule for per-trip user data (bookings, documents, packing, calendar).
 * Seeded/public itineraries have no ownerId — any authenticated user may manage
 * their OWN data against them, since that data is independently scoped by userId.
 */
export function canAccessTripData(itinerary, userId) {
  if (!itinerary) return false
  if (!itinerary.ownerId) return true
  return isItineraryOwner(itinerary, userId) || isItineraryCollaborator(itinerary, userId)
}

export function generateCollaborateToken() {
  return crypto.randomBytes(16).toString("hex")
}

export function formatCollaborator(c) {
  const user = c.userId
  const id = userIdString(user)
  return {
    userId: id,
    name: typeof user === "object" && user?.name ? user.name : undefined,
    email: typeof user === "object" && user?.email ? user.email : undefined,
    addedAt: c.addedAt,
  }
}

export function buildCollaborationMeta(itinerary, user, frontendBase) {
  const uid = userIdString(user)
  const ownerId = userIdString(itinerary?.ownerId)
  const isOwner = Boolean(uid && ownerId && uid === ownerId)
  const isCollaborator = isItineraryCollaborator(itinerary, uid)
  const canEdit = canEditItinerary(itinerary, uid)
  const collaborateEnabled = Boolean(itinerary?.collaborateEnabled)

  const base = (frontendBase || "http://localhost:3000").replace(/\/+$/, "")
  const collaborateUrl =
    isOwner && collaborateEnabled && itinerary?.collaborateToken
      ? `${base}/itineraries/${itinerary._id}?collab=${itinerary.collaborateToken}`
      : undefined

  return {
    collaborateEnabled,
    isOwner,
    isCollaborator,
    canEdit,
    owner: ownerId
      ? {
          userId: ownerId,
          name: typeof itinerary.ownerId === "object" ? itinerary.ownerId.name : undefined,
        }
      : null,
    collaborators: (itinerary?.collaborators || []).map(formatCollaborator),
    collaborateUrl,
    collaborateToken: isOwner ? itinerary?.collaborateToken || null : null,
  }
}
