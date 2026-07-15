import {
  createNotification,
  buildActionUrl,
} from "./notificationService.js"
import { shouldEmailForType } from "./notificationEmailService.js"
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js"
import { buildExpenseReport } from "../expenseService.js"

function tripRecipients(itinerary, excludeUserId = null) {
  const ids = new Set()
  if (itinerary.ownerId) ids.add(String(itinerary.ownerId))
  for (const c of itinerary.collaborators || []) {
    if (c.userId) ids.add(String(c.userId))
  }
  if (excludeUserId) ids.delete(String(excludeUserId))
  return [...ids]
}

async function notifyMany(userIds, payload) {
  const results = []
  for (const userId of userIds) {
    const n = await createNotification({ ...payload, userId })
    if (n) results.push(n)
  }
  return results
}

export async function notifyTripCreated(ownerId, itinerary) {
  if (!ownerId || !itinerary) return null
  return createNotification({
    userId: ownerId,
    tripId: itinerary._id,
    type: NOTIFICATION_TYPES.TRIP_CREATED,
    title: "Trip created",
    message: `Your trip "${itinerary.title}" to ${itinerary.destination} is ready. Start adding expenses and reminders.`,
    priority: "LOW",
    actionUrl: buildActionUrl(`/itineraries/${itinerary._id}`),
    metadata: {
      dedupKey: `trip-created-${itinerary._id}`,
      tripTitle: itinerary.title,
    },
  })
}

export async function notifyTripUpdated(editorId, itinerary) {
  if (!itinerary) return []
  const recipients = tripRecipients(itinerary, editorId)
  return notifyMany(recipients, {
    tripId: itinerary._id,
    type: NOTIFICATION_TYPES.TRIP_UPDATED,
    title: "Itinerary updated",
    message: `"${itinerary.title}" was updated. Review the latest schedule and budget.`,
    priority: "MEDIUM",
    actionUrl: buildActionUrl(`/itineraries/${itinerary._id}`),
    metadata: {
      dedupKey: `trip-updated-${itinerary._id}`,
      tripTitle: itinerary.title,
      editorId: editorId ? String(editorId) : null,
    },
  })
}

export async function notifyCollaboratorJoined(ownerId, collaborator, itinerary) {
  if (!ownerId || !itinerary) return null
  const name = collaborator?.name || "A collaborator"
  return createNotification({
    userId: ownerId,
    tripId: itinerary._id,
    type: NOTIFICATION_TYPES.COLLAB_JOIN,
    title: "Collaborator joined",
    message: `${name} joined your trip "${itinerary.title}".`,
    priority: "MEDIUM",
    actionUrl: buildActionUrl(`/itineraries/${itinerary._id}`),
    metadata: {
      dedupKey: `collab-join-${itinerary._id}-${collaborator?._id || collaborator}`,
      tripTitle: itinerary.title,
    },
  })
}

export async function notifyCollaboratorEdit(editorId, itinerary) {
  return notifyTripUpdated(editorId, itinerary).then((list) =>
    list.map((n) => n).filter(Boolean),
  )
}

export async function notifyReviewReceived(ownerId, review, itinerary, reviewer) {
  if (!ownerId || !itinerary) return null
  const name = reviewer?.name || "Someone"
  return createNotification({
    userId: ownerId,
    tripId: itinerary._id,
    type: NOTIFICATION_TYPES.COLLAB_REVIEW,
    title: "New review on your trip",
    message: `${name} rated "${itinerary.title}" ${review.rating}/5 stars.`,
    priority: "MEDIUM",
    actionUrl: buildActionUrl(`/itineraries/${itinerary._id}`),
    metadata: {
      dedupKey: `review-${itinerary._id}-${review.userId || review._id}`,
      tripTitle: itinerary.title,
      rating: review.rating,
    },
  })
}

const BUDGET_LEVEL_MESSAGES = {
  approaching: { title: "Budget alert: 80% used", priority: "MEDIUM" },
  almost: { title: "Budget alert: 90% used", priority: "HIGH" },
  exhausted: { title: "Budget exhausted", priority: "HIGH" },
  over: { title: "Over budget", priority: "HIGH" },
}

const BUDGET_LEVEL_RANK = { approaching: 1, almost: 2, exhausted: 3, over: 4 }

export async function notifyBudgetThresholdIfChanged(userId, itineraryId, previousLevel, newLevel) {
  if (!userId || !itineraryId || !newLevel || newLevel === previousLevel) return null
  const prevRank = BUDGET_LEVEL_RANK[previousLevel] || 0
  const newRank = BUDGET_LEVEL_RANK[newLevel] || 0
  if (newRank <= prevRank) return null
  if (!BUDGET_LEVEL_MESSAGES[newLevel]) return null

  const report = await buildExpenseReport(userId, itineraryId)
  if (!report) return null

  const { title, priority } = BUDGET_LEVEL_MESSAGES[newLevel]
  const { budget, currency, trip } = report
  let message = `You have used ${Math.round(budget.percentUsed || 0)}% of your trip budget.`
  if (newLevel === "over" && budget.exceededBy > 0) {
    message = `You exceeded your budget by ${budget.exceededBy} ${currency}.`
  }

  return createNotification({
    userId,
    tripId: itineraryId,
    type: NOTIFICATION_TYPES.BUDGET_WARNING,
    title,
    message,
    priority,
    sendEmail: shouldEmailForType(NOTIFICATION_TYPES.BUDGET_WARNING),
    actionUrl: buildActionUrl(`/itineraries/${itineraryId}`),
    metadata: {
      dedupKey: `budget-${itineraryId}-${newLevel}`,
      tripTitle: trip?.title,
      warningLevel: newLevel,
      percentUsed: budget.percentUsed,
    },
  })
}

export async function notifyBookingReminder(userId, tripId, payload) {
  return createNotification({
    userId,
    tripId,
    type: payload.type || NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    title: payload.title,
    message: payload.message,
    priority: payload.priority || "HIGH",
    sendEmail: payload.sendEmail ?? false,
    actionUrl: buildActionUrl(payload.actionUrl || `/bookings/${payload.bookingId}`),
    metadata: {
      dedupKey: payload.dedupKey,
      tripTitle: payload.tripTitle,
      bookingId: payload.bookingId,
      bookingType: payload.bookingType,
    },
  })
}

export async function notifyBookingEvent(userId, itineraryId, type, details = {}) {
  const titles = {
    [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: "Booking confirmed",
    [NOTIFICATION_TYPES.BOOKING_CANCELLED]: "Booking cancelled",
    [NOTIFICATION_TYPES.BOOKING_UPDATED]: "Booking updated",
  }
  return createNotification({
    userId,
    tripId: itineraryId,
    type,
    title: titles[type] || "Booking update",
    message: details.message || "Your booking status has changed.",
    priority: "MEDIUM",
    actionUrl: buildActionUrl(details.actionUrl || `/itineraries/${itineraryId}`),
    metadata: {
      dedupKey: details.dedupKey || `booking-${type}-${itineraryId}-${Date.now()}`,
      tripTitle: details.tripTitle,
      ...details,
    },
  })
}

export async function notifyCalendarSync(userId, tripId, provider, details = {}) {
  const label = provider === "google" ? "Google Calendar" : "Outlook Calendar"
  return createNotification({
    userId,
    tripId,
    type: NOTIFICATION_TYPES.CALENDAR_SYNCED,
    title: "Calendar synced",
    message: `Your itinerary has been synced to ${label}${details.tripTitle ? ` (${details.tripTitle})` : ""}.`,
    priority: "LOW",
    actionUrl: buildActionUrl(`/itineraries/${tripId}#calendar`),
    metadata: {
      dedupKey: `calendar-sync-${tripId}-${provider}-${new Date().toISOString().slice(0, 13)}`,
      provider,
      ...details,
    },
  })
}

export async function notifyActivityReminder(userId, itinerary, activity, minutesUntil) {
  const label = minutesUntil <= 60 ? "1 hour" : `${Math.round(minutesUntil / 60)} hours`
  return createNotification({
    userId,
    tripId: itinerary._id,
    type: NOTIFICATION_TYPES.ACTIVITY_REMINDER,
    title: "Upcoming activity",
    message: `Your ${activity.name} starts in ${label}.`,
    priority: "HIGH",
    actionUrl: buildActionUrl(`/itineraries/${itinerary._id}`),
    metadata: {
      dedupKey: `activity-${itinerary._id}-${activity._id}-${activity.dayNumber}`,
      tripTitle: itinerary.title,
      activityName: activity.name,
      eventDate: activity.scheduledAt,
    },
  })
}

export async function notifyFlightReminder(userId, itinerary, flightType, message, dedupKey) {
  return createNotification({
    userId,
    tripId: itinerary._id,
    type: flightType,
    title: message.title,
    message: message.body,
    priority: "HIGH",
    sendEmail: shouldEmailForType(flightType),
    actionUrl: buildActionUrl(`/itineraries/${itinerary._id}`),
    metadata: {
      dedupKey,
      tripTitle: itinerary.title,
      eventDate: message.eventDate,
    },
  })
}

export async function notifyHotelReminder(userId, itinerary, hotelType, message, dedupKey) {
  return createNotification({
    userId,
    tripId: itinerary._id,
    type: hotelType,
    title: message.title,
    message: message.body,
    priority: "MEDIUM",
    sendEmail: shouldEmailForType(hotelType),
    actionUrl: buildActionUrl(`/itineraries/${itinerary._id}`),
    metadata: {
      dedupKey,
      tripTitle: itinerary.title,
      eventDate: message.eventDate,
    },
  })
}

export async function notifyWeatherAlert(userId, itinerary, alert) {
  return createNotification({
    userId,
    tripId: itinerary._id,
    type: NOTIFICATION_TYPES.WEATHER_ALERT,
    title: alert.title || "Weather alert",
    message: alert.message,
    priority: "HIGH",
    sendEmail: shouldEmailForType(NOTIFICATION_TYPES.WEATHER_ALERT),
    actionUrl: buildActionUrl(`/itineraries/${itinerary._id}`),
    metadata: {
      dedupKey: alert.dedupKey,
      tripTitle: itinerary.title,
      condition: alert.condition,
      suggestion: alert.suggestion,
    },
  })
}

export async function notifyAiReminder(userId, itinerary, reminder) {
  return createNotification({
    userId,
    tripId: itinerary._id,
    type: NOTIFICATION_TYPES.AI_REMINDER,
    title: reminder.title || "AI travel insight",
    message: reminder.message,
    priority: "MEDIUM",
    actionUrl: buildActionUrl(`/itineraries/${itinerary._id}`),
    metadata: {
      dedupKey: reminder.dedupKey,
      tripTitle: itinerary.title,
      source: "ai",
    },
  })
}

export async function notifyDocumentUploaded(userId, doc) {
  if (!userId || !doc) return null
  return createNotification({
    userId,
    tripId: doc.tripId || null,
    type: NOTIFICATION_TYPES.DOCUMENT_UPLOADED,
    title: "Document saved",
    message: `"${doc.title}" was added to your travel vault.`,
    priority: "LOW",
    actionUrl: buildActionUrl(doc.tripId ? `/itineraries/${doc.tripId}#documents` : `/documents`),
    metadata: {
      dedupKey: `doc-uploaded-${doc.id}`,
      documentId: doc.id,
      documentType: doc.documentType,
    },
  })
}

export async function notifyDocumentExpiry(userId, { tripId, documentId, type, title, message, dedupKey, priority }) {
  if (!userId) return null
  return createNotification({
    userId,
    tripId: tripId || null,
    type: type || NOTIFICATION_TYPES.DOCUMENT_EXPIRING,
    title: title || "Document expiring",
    message,
    priority: priority || "HIGH",
    actionUrl: buildActionUrl(tripId ? `/itineraries/${tripId}#documents` : `/documents`),
    metadata: {
      dedupKey,
      documentId: documentId ? String(documentId) : null,
    },
  })
}

export async function notifyPackingReminder(userId, trip, { message, dedupKey }) {
  if (!userId || !trip) return null
  return createNotification({
    userId,
    tripId: trip._id,
    type: NOTIFICATION_TYPES.PACKING_REMINDER,
    title: "Packing reminder",
    message: message || `Time to pack for "${trip.title}".`,
    priority: "MEDIUM",
    actionUrl: buildActionUrl(`/itineraries/${trip._id}#packing`),
    metadata: {
      dedupKey,
      tripTitle: trip.title,
    },
  })
}

export async function notifyTravelRisk(userId, tripId, { title, message, severity, dedupKey }) {
  if (!userId || !tripId) return null
  const priority = severity === "CRITICAL" || severity === "HIGH" ? "HIGH" : "MEDIUM"
  return createNotification({
    userId,
    tripId,
    type: NOTIFICATION_TYPES.TRAVEL_RISK_ALERT,
    title: title || "Travel risk detected",
    message: message || "Review your trip health dashboard.",
    priority,
    actionUrl: buildActionUrl(`/itineraries/${tripId}#risks`),
    metadata: { dedupKey, severity },
  })
}

export async function notifyBudgetOptimization(
  userId,
  tripId,
  { title, message, savings = 0, dedupKey, type = "savings" } = {},
) {
  if (!userId || !tripId) return null
  const notifType =
    type === "exceeded"
      ? NOTIFICATION_TYPES.BUDGET_WARNING
      : NOTIFICATION_TYPES.BUDGET_SAVINGS_AVAILABLE
  return createNotification({
    userId,
    tripId,
    type: notifType,
    title: title || "Budget optimization",
    message: message || "Review savings on your trip budget.",
    priority: type === "exceeded" ? "HIGH" : savings >= 3000 ? "MEDIUM" : "LOW",
    actionUrl: buildActionUrl(`/itineraries/${tripId}#budget`),
    metadata: { dedupKey, savings, optimizationType: type },
  })
}

export async function notifyTravelMilestone(userId, { title, message, milestone, count } = {}) {
  if (!userId) return null
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.TRAVEL_MILESTONE,
    title: title || "Travel milestone",
    message: message || "You reached a new travel milestone!",
    priority: "MEDIUM",
    actionUrl: buildActionUrl("/analytics"),
    metadata: { dedupKey: `milestone-${milestone}`, milestone, count },
  })
}

export { tripRecipients }
