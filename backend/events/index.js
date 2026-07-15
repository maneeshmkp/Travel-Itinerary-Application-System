/**
 * Domain event catalog + public API.
 */
import EventBus, { publish, publishAsync, on, off } from "./EventBus.js"
import { eventMetrics } from "./metrics.js"
import { DOMAIN_EVENTS } from "./catalog.js"
import { registerAllHandlers } from "./handlers/index.js"

export { DOMAIN_EVENTS }

let bootstrapped = false

/** Register default domain event subscribers (idempotent). */
export function bootstrapDomainEvents() {
  if (bootstrapped) return
  registerAllHandlers()
  bootstrapped = true
}

/** Test helper — allow re-register after clear. */
export function resetBootstrapFlagForTests() {
  bootstrapped = false
}

export { EventBus, publish, publishAsync, on, off, eventMetrics }

export default {
  DOMAIN_EVENTS,
  EventBus,
  publish,
  publishAsync,
  on,
  off,
  bootstrapDomainEvents,
  eventMetrics,
}
