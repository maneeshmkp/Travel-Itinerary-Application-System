/**
 * Job processor registry — maps queue name → processor.
 */
import { QUEUE_NAMES } from "../queues/definitions.js"
import { processEmailJob } from "./emailJob.js"
import { processFlightStatusJob } from "./flightStatusJob.js"
import { processWeatherRefreshJob } from "./weatherRefreshJob.js"
import { processDocumentExpiryJob } from "./documentExpiryJob.js"
import { processNotificationJob } from "./notificationJob.js"
import { processAnalyticsJob } from "./analyticsJob.js"
import { processAiRecommendationJob } from "./aiRecommendationJob.js"
import { processBudgetRecalcJob } from "./budgetRecalcJob.js"
import { processNotificationScheduleJob } from "./notificationScheduleJob.js"
import { processCleanupRedisJob } from "./cleanupRedisJob.js"
import { processCleanupLogsJob } from "./cleanupLogsJob.js"
import { processCleanupUploadsJob } from "./cleanupUploadsJob.js"

export const PROCESSORS = Object.freeze({
  [QUEUE_NAMES.EMAIL]: processEmailJob,
  [QUEUE_NAMES.FLIGHT_STATUS]: processFlightStatusJob,
  [QUEUE_NAMES.WEATHER_REFRESH]: processWeatherRefreshJob,
  [QUEUE_NAMES.DOCUMENT_EXPIRY]: processDocumentExpiryJob,
  [QUEUE_NAMES.NOTIFICATION]: processNotificationJob,
  [QUEUE_NAMES.ANALYTICS_REFRESH]: processAnalyticsJob,
  [QUEUE_NAMES.AI_RECOMMENDATION]: processAiRecommendationJob,
  [QUEUE_NAMES.BUDGET_RECALC]: processBudgetRecalcJob,
  [QUEUE_NAMES.NOTIFICATION_SCHEDULE]: processNotificationScheduleJob,
  [QUEUE_NAMES.CLEANUP_REDIS]: processCleanupRedisJob,
  [QUEUE_NAMES.CLEANUP_LOGS]: processCleanupLogsJob,
  [QUEUE_NAMES.CLEANUP_UPLOADS]: processCleanupUploadsJob,
  // DLQ has no business processor — jobs are retained for inspection/retry
  [QUEUE_NAMES.DEAD_LETTER]: async () => ({ acknowledged: true }),
})

export function getProcessor(queueName) {
  return PROCESSORS[queueName] || null
}
