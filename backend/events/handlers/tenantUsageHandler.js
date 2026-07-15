import { on } from "../EventBus.js"
import { DOMAIN_EVENTS } from "../catalog.js"
import { incrementTenantUsage } from "../../services/tenantService.js"

async function bumpUsage(payload, ctx) {
  const tenantId = payload.tenantId || ctx.metadata?.tenantId
  if (!tenantId) return

  const map = {
    [DOMAIN_EVENTS.TRIP_CREATED]: { trips: 1 },
    [DOMAIN_EVENTS.TRIP_DELETED]: { trips: -1 },
    [DOMAIN_EVENTS.DOCUMENT_UPLOADED]: { documents: 1 },
    [DOMAIN_EVENTS.DOCUMENT_DELETED]: { documents: -1 },
    [DOMAIN_EVENTS.EXPENSE_ADDED]: { expenses: 1 },
    [DOMAIN_EVENTS.EXPENSE_DELETED]: { expenses: -1 },
    [DOMAIN_EVENTS.AI_ITINERARY_GENERATED]: { aiRequests: 1 },
  }
  const inc = map[ctx.eventName]
  if (!inc) return
  if (payload.fileSize && ctx.eventName === DOMAIN_EVENTS.DOCUMENT_UPLOADED) {
    inc.storageBytes = Number(payload.fileSize) || 0
  }
  if (payload.fileSize && ctx.eventName === DOMAIN_EVENTS.DOCUMENT_DELETED) {
    inc.storageBytes = -(Number(payload.fileSize) || 0)
  }
  await incrementTenantUsage(tenantId, inc)
}

export function registerTenantUsageHandlers() {
  for (const ev of [
    DOMAIN_EVENTS.TRIP_CREATED,
    DOMAIN_EVENTS.TRIP_DELETED,
    DOMAIN_EVENTS.DOCUMENT_UPLOADED,
    DOMAIN_EVENTS.DOCUMENT_DELETED,
    DOMAIN_EVENTS.EXPENSE_ADDED,
    DOMAIN_EVENTS.EXPENSE_DELETED,
    DOMAIN_EVENTS.AI_ITINERARY_GENERATED,
  ]) {
    on(ev, bumpUsage, { name: "TenantUsage" })
  }
}
