/**
 * Public queues API — backward compatible with previous queues/index.js.
 */
export {
  QUEUE_NAMES,
  WORKER_QUEUES,
  DEFAULT_JOB_OPTIONS,
  REPEAT_SCHEDULES,
} from "./definitions.js"
export { getQueue, enqueue, moveToDeadLetter, connection } from "./factory.js"
export { jobMetrics } from "./metrics.js"
export {
  startWorkers,
  stopWorkers,
  getWorkerStatusMap,
  listActiveWorkers,
} from "../workers/index.js"
export { startScheduler, registerRepeatableJobs, listRepeatableJobs } from "../scheduler/index.js"

import { QUEUE_NAMES } from "./definitions.js"
import { enqueue, closeAllQueues } from "./factory.js"
import { startWorkers, stopWorkers } from "../workers/index.js"

/** Convenience producers (stable for event handlers & services). */
export const jobs = {
  email: (data, opts) => enqueue(QUEUE_NAMES.EMAIL, data, opts),
  flightRefresh: (data = {}, opts) => enqueue(QUEUE_NAMES.FLIGHT_STATUS, data, opts),
  weatherRefresh: (data = {}, opts) => enqueue(QUEUE_NAMES.WEATHER_REFRESH, data, opts),
  documentExpiry: (data = {}, opts) => enqueue(QUEUE_NAMES.DOCUMENT_EXPIRY, data, opts),
  notification: (data, opts) => enqueue(QUEUE_NAMES.NOTIFICATION, data, opts),
  analyticsRefresh: (userId, opts = {}) =>
    enqueue(QUEUE_NAMES.ANALYTICS_REFRESH, { userId, force: opts.force }, opts),
  aiRecommendation: (data = {}, opts) => enqueue(QUEUE_NAMES.AI_RECOMMENDATION, data, opts),
  budgetRecalc: (data = {}, opts) => enqueue(QUEUE_NAMES.BUDGET_RECALC, data, opts),
  notificationSchedule: (data = {}, opts) => enqueue(QUEUE_NAMES.NOTIFICATION_SCHEDULE, data, opts),
  cleanupRedis: (data = {}, opts) => enqueue(QUEUE_NAMES.CLEANUP_REDIS, data, opts),
  cleanupLogs: (data = {}, opts) => enqueue(QUEUE_NAMES.CLEANUP_LOGS, data, opts),
  cleanupUploads: (data = {}, opts) => enqueue(QUEUE_NAMES.CLEANUP_UPLOADS, data, opts),
}

export async function closeQueues() {
  await stopWorkers()
  await closeAllQueues()
}

/** Alias kept for server.js and older imports — async probe + start */
export function startQueueWorkers() {
  return startWorkers()
}

export default { enqueue, startQueueWorkers, closeQueues, jobs, QUEUE_NAMES }
