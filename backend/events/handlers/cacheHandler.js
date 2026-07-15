import { on } from "../EventBus.js"
import { DOMAIN_EVENTS } from "../catalog.js"
import {
  invalidateTripCaches,
  invalidateBookingCaches,
  invalidateExpenseCaches,
  invalidateDocumentCaches,
  invalidateWeatherCaches,
  invalidateFlightCaches,
  invalidateAiCaches,
  invalidateUserProfileCaches,
  invalidateNotificationCaches,
} from "../../utils/cacheHelpers.js"

async function cacheOnEvent(payload, ctx) {
  const userId = payload.userId || ctx.userId
  const tripId = payload.tripId || payload.itineraryId

  switch (ctx.eventName) {
    case DOMAIN_EVENTS.TRIP_CREATED:
    case DOMAIN_EVENTS.TRIP_UPDATED:
    case DOMAIN_EVENTS.TRIP_DELETED:
      await invalidateTripCaches(userId, tripId)
      break
    case DOMAIN_EVENTS.BOOKING_CREATED:
    case DOMAIN_EVENTS.BOOKING_CANCELLED:
      await invalidateBookingCaches(userId, tripId)
      break
    case DOMAIN_EVENTS.EXPENSE_ADDED:
    case DOMAIN_EVENTS.EXPENSE_UPDATED:
    case DOMAIN_EVENTS.EXPENSE_DELETED:
    case DOMAIN_EVENTS.BUDGET_EXCEEDED:
      await invalidateExpenseCaches(userId, tripId)
      break
    case DOMAIN_EVENTS.DOCUMENT_UPLOADED:
    case DOMAIN_EVENTS.DOCUMENT_DELETED:
      await invalidateDocumentCaches(userId, tripId)
      break
    case DOMAIN_EVENTS.WEATHER_UPDATED:
      await invalidateWeatherCaches()
      break
    case DOMAIN_EVENTS.FLIGHT_STATUS_CHANGED:
      await invalidateFlightCaches(payload.flightNumber, userId, tripId)
      break
    case DOMAIN_EVENTS.AI_ITINERARY_GENERATED:
      await invalidateAiCaches()
      break
    case DOMAIN_EVENTS.ROLE_CHANGED:
    case DOMAIN_EVENTS.USER_REGISTERED:
      await invalidateUserProfileCaches(userId)
      break
    case DOMAIN_EVENTS.NOTIFICATION_CREATED:
      await invalidateNotificationCaches(userId)
      break
    default:
      break
  }
}

export function registerCacheHandlers() {
  for (const ev of Object.values(DOMAIN_EVENTS)) {
    on(ev, cacheOnEvent, { name: "RedisCacheInvalidation" })
  }
}
