import { on } from "../EventBus.js"
import { DOMAIN_EVENTS } from "../catalog.js"
import { jobs } from "../../queues/index.js"

/**
 * BullMQ job subscriber — schedules background work from domain events.
 */
async function queueOnEvent(payload, ctx) {
  const userId = payload.userId || ctx.userId

  if (ctx.eventName === DOMAIN_EVENTS.DOCUMENT_UPLOADED) {
    await jobs.documentExpiry({ userId }, {}).catch(() => null)
  }

  if (ctx.eventName === DOMAIN_EVENTS.WEATHER_UPDATED && payload.forceRefresh) {
    await jobs.weatherRefresh({ location: payload.location }, {}).catch(() => null)
  }

  if (ctx.eventName === DOMAIN_EVENTS.FLIGHT_STATUS_CHANGED && payload.enqueueRefresh) {
    await jobs.flightRefresh({ flightNumber: payload.flightNumber }, {}).catch(() => null)
  }

  if (
    [
      DOMAIN_EVENTS.TRIP_CREATED,
      DOMAIN_EVENTS.BOOKING_CREATED,
      DOMAIN_EVENTS.EXPENSE_ADDED,
    ].includes(ctx.eventName) &&
    userId
  ) {
    await jobs.analyticsRefresh(String(userId), {}).catch(() => null)
  }

  if (ctx.eventName === DOMAIN_EVENTS.NOTIFICATION_CREATED && payload.deliverAsync) {
    await jobs
      .notification({
        userId,
        ...payload.notification,
      })
      .catch(() => null)
  }
}

export function registerQueueHandlers() {
  for (const ev of Object.values(DOMAIN_EVENTS)) {
    on(ev, queueOnEvent, { name: "BullMQJobs" })
  }
}
