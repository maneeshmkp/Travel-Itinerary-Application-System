import { on } from "../EventBus.js"
import { DOMAIN_EVENTS } from "../catalog.js"
import { emitToUser } from "../../socket/index.js"

/**
 * Socket.IO subscriber — real-time domain event fan-out to the acting user.
 */
async function socketOnEvent(payload, ctx) {
  const userId = payload.userId || ctx.userId
  if (!userId) return
  if (payload.skipSocket) return

  // NotificationCreated already emits via notificationService — skip duplicate
  if (ctx.eventName === DOMAIN_EVENTS.NOTIFICATION_CREATED) return

  try {
    emitToUser(String(userId), "domain:event", {
      eventName: ctx.eventName,
      eventId: ctx.eventId,
      correlationId: ctx.correlationId,
      publishedAt: ctx.publishedAt,
      payload: {
        id: payload.id || payload._id,
        tripId: payload.tripId || payload.itineraryId,
        status: payload.status,
        type: payload.type,
        summary: payload.summary,
      },
    })
  } catch {
    /* socket may be uninitialized in workers/tests */
  }
}

export function registerSocketHandlers() {
  for (const ev of Object.values(DOMAIN_EVENTS)) {
    on(ev, socketOnEvent, { name: "SocketIONotifications" })
  }
}
