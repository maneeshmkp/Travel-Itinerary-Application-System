import { on } from "../EventBus.js"
import { DOMAIN_EVENTS } from "../catalog.js"
import { createNotification } from "../../services/notifications/notificationService.js"
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js"

/**
 * Notification subscriber for select domain events (gap-fill).
 * Skips NotificationCreated to avoid feedback loops.
 */
async function notifyOnEvent(payload, ctx) {
  const userId = payload.userId || ctx.userId
  if (!userId) return
  if (ctx.eventName === DOMAIN_EVENTS.NOTIFICATION_CREATED) return
  if (payload.skipEventNotification) return

  const map = {
    [DOMAIN_EVENTS.USER_REGISTERED]: {
      type: NOTIFICATION_TYPES.TRAVEL_MILESTONE,
      title: "Welcome to TravelPlan",
      message: "Your account is ready. Start planning your next trip.",
      priority: "LOW",
    },
    [DOMAIN_EVENTS.ROLE_CHANGED]: {
      type: NOTIFICATION_TYPES.TRAVEL_MILESTONE,
      title: "Your role was updated",
      message: `Your role is now ${payload.nextRole || "updated"}.`,
      priority: "HIGH",
    },
    [DOMAIN_EVENTS.BUDGET_EXCEEDED]: {
      type: NOTIFICATION_TYPES.BUDGET_WARNING,
      title: "Budget exceeded",
      message: payload.message || "Trip spending exceeded the planned budget.",
      priority: "HIGH",
      tripId: payload.tripId || payload.itineraryId,
    },
    [DOMAIN_EVENTS.FLIGHT_STATUS_CHANGED]: {
      type: NOTIFICATION_TYPES.FLIGHT_STATUS_UPDATE,
      title: "Flight status update",
      message:
        payload.message ||
        `Flight ${payload.flightNumber || ""} is now ${payload.status || "updated"}.`.trim(),
      priority: "HIGH",
      tripId: payload.tripId,
    },
    [DOMAIN_EVENTS.AI_ITINERARY_GENERATED]: {
      type: NOTIFICATION_TYPES.AI_REMINDER,
      title: "AI itinerary ready",
      message: "Your personalized itinerary was generated.",
      priority: "MEDIUM",
    },
  }

  const spec = map[ctx.eventName]
  if (!spec) return

  await createNotification({
    userId,
    tripId: spec.tripId || payload.tripId || null,
    type: spec.type,
    title: spec.title,
    message: spec.message,
    priority: spec.priority,
    actionUrl: payload.actionUrl || "",
    metadata: {
      domainEvent: ctx.eventName,
      eventId: ctx.eventId,
      ...(payload.metadata || {}),
    },
  })
}

export function registerNotificationHandlers() {
  const events = [
    DOMAIN_EVENTS.USER_REGISTERED,
    DOMAIN_EVENTS.ROLE_CHANGED,
    DOMAIN_EVENTS.BUDGET_EXCEEDED,
    DOMAIN_EVENTS.FLIGHT_STATUS_CHANGED,
    DOMAIN_EVENTS.AI_ITINERARY_GENERATED,
  ]
  for (const ev of events) {
    on(ev, notifyOnEvent, { name: "NotificationService" })
  }
}
