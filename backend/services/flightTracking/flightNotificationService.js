import {
  notifyFlightReminder,
  notifyTravelRisk,
} from "../notifications/notificationTriggers.js"
import { createNotification } from "../notifications/notificationService.js"
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js"

function buildActionUrl(tripId) {
  const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")
  return `${base}/itineraries/${tripId}#flights`
}

export async function notifyFlightStatusChange(userId, tripId, { type, title, message, dedupKey, priority }) {
  return createNotification({
    userId,
    tripId,
    type: type || NOTIFICATION_TYPES.FLIGHT_STATUS_UPDATE,
    title,
    message,
    priority: priority || "MEDIUM",
    actionUrl: buildActionUrl(tripId),
    metadata: { dedupKey, source: "flight_tracking" },
  })
}

export async function processFlightNotifications(userId, trip, previous, current) {
  const tripId = trip._id || trip.tripId || current.tripId
  const notifications = []

  if (!previous) return notifications

  if (current.gate && previous.gate && current.gate !== previous.gate) {
    const n = await notifyFlightStatusChange(userId, tripId, {
      type: NOTIFICATION_TYPES.FLIGHT_GATE_CHANGE,
      title: "Gate changed",
      message: `Gate changed from ${previous.gate} to ${current.gate} for ${current.flightNumber}.`,
      dedupKey: `gate-${current.id}-${current.gate}`,
      priority: "HIGH",
    })
    if (n) notifications.push(n)
  }

  if (current.delayMinutes > (previous.delayMinutes || 0) + 15) {
    const n = await notifyFlightStatusChange(userId, tripId, {
      type: NOTIFICATION_TYPES.FLIGHT_DELAY,
      title: "Flight delayed",
      message: `${current.flightNumber} delayed by ${current.delayMinutes} minutes.`,
      dedupKey: `delay-${current.id}-${current.delayMinutes}`,
      priority: "HIGH",
    })
    if (n) notifications.push(n)
  }

  if (current.status === "Cancelled" && previous.status !== "Cancelled") {
    const n = await notifyFlightStatusChange(userId, tripId, {
      type: NOTIFICATION_TYPES.FLIGHT_CANCELLED,
      title: "Flight cancelled",
      message: `${current.flightNumber} has been cancelled. Review alternative options.`,
      dedupKey: `cancel-${current.id}`,
      priority: "HIGH",
    })
    if (n) notifications.push(n)
  }

  if (current.status === "Boarding" && previous.status !== "Boarding") {
    const n = await notifyFlightReminder(
      userId,
      { _id: tripId, title: trip.title || "your trip" },
      NOTIFICATION_TYPES.FLIGHT_BOARDING,
      `Boarding starts for ${current.flightNumber}${current.gate ? ` at Gate ${current.gate}` : ""}.`,
      `boarding-${current.id}`,
    )
    if (n) notifications.push(n)
  }

  if (current.baggageClaim && !previous.baggageClaim && current.status === "Landed") {
    const n = await notifyFlightStatusChange(userId, tripId, {
      type: NOTIFICATION_TYPES.FLIGHT_BAGGAGE,
      title: "Baggage claim",
      message: `Baggage claim belt is ${current.baggageClaim} for ${current.flightNumber}.`,
      dedupKey: `baggage-${current.id}-${current.baggageClaim}`,
      priority: "MEDIUM",
    })
    if (n) notifications.push(n)
  }

  if (current.delayMinutes >= 60 && (previous.delayMinutes || 0) < 60) {
    await notifyTravelRisk(userId, tripId, {
      title: "Itinerary may need adjustment",
      message: `${current.flightNumber} delay may affect hotel check-in and activities. Review suggested changes.`,
      severity: "MEDIUM",
      dedupKey: `itinerary-delay-${current.id}`,
    }).catch(() => {})
  }

  return notifications
}

export function buildItineraryAdjustmentSuggestions(flight, delayMinutes) {
  if (!delayMinutes || delayMinutes < 30) return []
  return [
    `Contact hotel to request late check-in (${delayMinutes} min delay)`,
    "Reschedule airport taxi pickup",
    "Move first activity later or swap to tomorrow",
    "Check restaurant reservation time",
  ]
}
