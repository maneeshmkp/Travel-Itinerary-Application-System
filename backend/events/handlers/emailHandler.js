import { on } from "../EventBus.js"
import { DOMAIN_EVENTS } from "../catalog.js"
import { jobs } from "../../queues/index.js"

/**
 * Email subscriber — enqueues BullMQ email jobs (no-ops without Redis).
 * Welcome/reset emails remain in authController for delivery guarantees.
 */
async function emailOnEvent(payload, ctx) {
  if (payload.skipEventEmail) return

  const to = payload.email
  if (!to) return

  if (ctx.eventName === DOMAIN_EVENTS.USER_REGISTERED && !payload.sendWelcomeViaEvent) {
    // Welcome email already sent synchronously from authController
    return
  }

  if (ctx.eventName === DOMAIN_EVENTS.BOOKING_CANCELLED) {
    await jobs
      .email({
        to,
        subject: "Booking cancelled — TravelPlan",
        text: payload.message || "Your booking was cancelled.",
        meta: { eventId: ctx.eventId, eventName: ctx.eventName },
      })
      .catch(() => null)
  }

  if (ctx.eventName === DOMAIN_EVENTS.ROLE_CHANGED) {
    await jobs
      .email({
        to,
        subject: "Account role updated — TravelPlan",
        text: `Your role is now ${payload.nextRole || "updated"}.`,
        meta: { eventId: ctx.eventId, eventName: ctx.eventName },
      })
      .catch(() => null)
  }

  if (ctx.eventName === DOMAIN_EVENTS.BUDGET_EXCEEDED) {
    await jobs
      .email({
        to,
        subject: "Budget exceeded — TravelPlan",
        text: payload.message || "Your trip budget has been exceeded.",
        meta: { eventId: ctx.eventId, eventName: ctx.eventName },
      })
      .catch(() => null)
  }
}

export function registerEmailHandlers() {
  for (const ev of [
    DOMAIN_EVENTS.USER_REGISTERED,
    DOMAIN_EVENTS.BOOKING_CANCELLED,
    DOMAIN_EVENTS.ROLE_CHANGED,
    DOMAIN_EVENTS.BUDGET_EXCEEDED,
  ]) {
    on(ev, emailOnEvent, { name: "EmailService" })
  }
}
