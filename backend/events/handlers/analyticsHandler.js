import { on } from "../EventBus.js"
import { DOMAIN_EVENTS } from "../catalog.js"
import { jobs } from "../../queues/index.js"

async function analyticsOnEvent(payload, ctx) {
  const userId = payload.userId || ctx.userId
  if (!userId) return

  const refreshOn = new Set([
    DOMAIN_EVENTS.TRIP_CREATED,
    DOMAIN_EVENTS.TRIP_UPDATED,
    DOMAIN_EVENTS.TRIP_DELETED,
    DOMAIN_EVENTS.BOOKING_CREATED,
    DOMAIN_EVENTS.BOOKING_CANCELLED,
    DOMAIN_EVENTS.EXPENSE_ADDED,
    DOMAIN_EVENTS.EXPENSE_UPDATED,
    DOMAIN_EVENTS.EXPENSE_DELETED,
  ])
  if (!refreshOn.has(ctx.eventName)) return

  await jobs.analyticsRefresh(String(userId), { force: false }).catch(() => null)
}

export function registerAnalyticsHandlers() {
  for (const ev of Object.values(DOMAIN_EVENTS)) {
    on(ev, analyticsOnEvent, { name: "AnalyticsService" })
  }
}
