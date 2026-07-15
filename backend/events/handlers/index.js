import { registerNotificationHandlers } from "./notificationHandler.js"
import { registerAnalyticsHandlers } from "./analyticsHandler.js"
import { registerAuditHandlers } from "./auditHandler.js"
import { registerEmailHandlers } from "./emailHandler.js"
import { registerCacheHandlers } from "./cacheHandler.js"
import { registerQueueHandlers } from "./queueHandler.js"
import { registerSocketHandlers } from "./socketHandler.js"
import { registerTenantUsageHandlers } from "./tenantUsageHandler.js"

let registered = false

export function registerAllHandlers() {
  if (registered) return
  registerNotificationHandlers()
  registerAnalyticsHandlers()
  registerAuditHandlers()
  registerEmailHandlers()
  registerCacheHandlers()
  registerQueueHandlers()
  registerSocketHandlers()
  registerTenantUsageHandlers()
  registered = true
}

export function resetHandlersFlagForTests() {
  registered = false
}
