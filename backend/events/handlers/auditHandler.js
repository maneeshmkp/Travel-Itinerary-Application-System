import { on } from "../EventBus.js"
import { DOMAIN_EVENTS } from "../catalog.js"
import { writeAudit } from "../../services/auditService.js"

const AUDIT_MAP = {
  [DOMAIN_EVENTS.USER_REGISTERED]: "event.user_registered",
  [DOMAIN_EVENTS.USER_LOGGED_IN]: "event.user_logged_in",
  [DOMAIN_EVENTS.TRIP_CREATED]: "event.trip_created",
  [DOMAIN_EVENTS.TRIP_UPDATED]: "event.trip_updated",
  [DOMAIN_EVENTS.TRIP_DELETED]: "event.trip_deleted",
  [DOMAIN_EVENTS.BOOKING_CREATED]: "event.booking_created",
  [DOMAIN_EVENTS.BOOKING_CANCELLED]: "event.booking_cancelled",
  [DOMAIN_EVENTS.EXPENSE_ADDED]: "event.expense_added",
  [DOMAIN_EVENTS.EXPENSE_UPDATED]: "event.expense_updated",
  [DOMAIN_EVENTS.EXPENSE_DELETED]: "event.expense_deleted",
  [DOMAIN_EVENTS.DOCUMENT_UPLOADED]: "event.document_uploaded",
  [DOMAIN_EVENTS.DOCUMENT_DELETED]: "event.document_deleted",
  [DOMAIN_EVENTS.ROLE_CHANGED]: "event.role_changed",
  [DOMAIN_EVENTS.BUDGET_EXCEEDED]: "event.budget_exceeded",
  [DOMAIN_EVENTS.AI_ITINERARY_GENERATED]: "event.ai_itinerary_generated",
  [DOMAIN_EVENTS.FLIGHT_STATUS_CHANGED]: "event.flight_status_changed",
  [DOMAIN_EVENTS.WEATHER_UPDATED]: "event.weather_updated",
  [DOMAIN_EVENTS.NOTIFICATION_CREATED]: "event.notification_created",
}

async function auditOnEvent(payload, ctx) {
  const action = AUDIT_MAP[ctx.eventName]
  if (!action) return

  // Auth login/signup already write dedicated audit rows — skip duplicates
  if (
    ctx.eventName === DOMAIN_EVENTS.USER_LOGGED_IN ||
    ctx.eventName === DOMAIN_EVENTS.USER_REGISTERED
  ) {
    if (payload.auditAlreadyWritten) return
  }
  if (ctx.eventName === DOMAIN_EVENTS.ROLE_CHANGED && payload.auditAlreadyWritten) return

  await writeAudit({
    action,
    actor: payload.actor || (ctx.userId ? { _id: ctx.userId, email: payload.email } : null),
    targetType: payload.targetType || inferTargetType(ctx.eventName),
    targetId: payload.targetId || payload.id || payload._id || payload.tripId || "",
    metadata: {
      eventId: ctx.eventId,
      eventName: ctx.eventName,
      source: ctx.source,
      tenantId: payload.tenantId || ctx.metadata?.tenantId || undefined,
      ...(payload.metadata || {}),
      summary: payload.summary || undefined,
    },
    success: payload.success !== false,
  })
}

function inferTargetType(eventName) {
  if (eventName.startsWith("Trip") || eventName.includes("Itinerary")) return "Itinerary"
  if (eventName.startsWith("Booking")) return "Booking"
  if (eventName.startsWith("Expense")) return "Expense"
  if (eventName.startsWith("Document")) return "Document"
  if (eventName.startsWith("User") || eventName.includes("Role")) return "User"
  if (eventName.startsWith("Flight")) return "Flight"
  if (eventName.startsWith("Weather")) return "Weather"
  if (eventName.startsWith("Notification")) return "Notification"
  return "DomainEvent"
}

export function registerAuditHandlers() {
  for (const ev of Object.keys(AUDIT_MAP)) {
    on(ev, auditOnEvent, { name: "AuditLogs" })
  }
}
