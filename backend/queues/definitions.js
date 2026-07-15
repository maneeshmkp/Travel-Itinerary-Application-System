/**
 * Canonical BullMQ queue names + default options + repeat schedules.
 */
export const QUEUE_NAMES = Object.freeze({
  EMAIL: "email",
  FLIGHT_STATUS: "flight-status-refresh",
  WEATHER_REFRESH: "weather-refresh",
  DOCUMENT_EXPIRY: "document-expiry-reminder",
  NOTIFICATION: "notification-delivery",
  ANALYTICS_REFRESH: "analytics-refresh",
  AI_RECOMMENDATION: "ai-recommendation-refresh",
  BUDGET_RECALC: "budget-recalculation",
  NOTIFICATION_SCHEDULE: "notification-schedule",
  CLEANUP_REDIS: "cleanup-redis-keys",
  CLEANUP_LOGS: "cleanup-old-logs",
  CLEANUP_UPLOADS: "cleanup-temp-uploads",
  /** Permanently failed jobs land here after retries are exhausted. */
  DEAD_LETTER: "dead-letter",
})

/** All processable application queues (excludes DLQ for worker loop over processors). */
export const WORKER_QUEUES = Object.freeze(
  Object.values(QUEUE_NAMES).filter((n) => n !== QUEUE_NAMES.DEAD_LETTER),
)

export const DEFAULT_JOB_OPTIONS = Object.freeze({
  removeOnComplete: { count: 200, age: 24 * 3600 },
  removeOnFail: { count: 100, age: 7 * 24 * 3600 },
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
})

/**
 * Centralized repeatable schedules (ms).
 * jobId must be stable so restarts do not duplicate repeats.
 */
export const REPEAT_SCHEDULES = Object.freeze([
  {
    queue: QUEUE_NAMES.FLIGHT_STATUS,
    jobId: "sched:flight-status",
    every: 5 * 60 * 1000,
    description: "Flight status refresh",
  },
  {
    queue: QUEUE_NAMES.WEATHER_REFRESH,
    jobId: "sched:weather-refresh",
    every: 10 * 60 * 1000,
    description: "Weather cache refresh",
  },
  {
    queue: QUEUE_NAMES.DOCUMENT_EXPIRY,
    jobId: "sched:document-expiry",
    every: 60 * 60 * 1000,
    description: "Document expiry reminders",
  },
  {
    queue: QUEUE_NAMES.NOTIFICATION_SCHEDULE,
    jobId: "sched:notification-checks",
    every: 15 * 60 * 1000,
    description: "Notification scheduler (activity/hotel/flight/budget/AI)",
  },
  {
    queue: QUEUE_NAMES.ANALYTICS_REFRESH,
    jobId: "sched:analytics-aggregate",
    every: 60 * 60 * 1000,
    description: "Analytics aggregation for active users",
    data: { mode: "aggregate" },
  },
  {
    queue: QUEUE_NAMES.AI_RECOMMENDATION,
    jobId: "sched:ai-recommendations",
    every: 30 * 60 * 1000,
    description: "AI recommendation cache refresh",
  },
  {
    queue: QUEUE_NAMES.BUDGET_RECALC,
    jobId: "sched:budget-recalc",
    every: 30 * 60 * 1000,
    description: "Budget recalculation / threshold checks",
  },
  {
    queue: QUEUE_NAMES.CLEANUP_REDIS,
    jobId: "sched:cleanup-redis",
    every: 6 * 60 * 60 * 1000,
    description: "Redis pattern cleanup / stale key sweep",
  },
  {
    queue: QUEUE_NAMES.CLEANUP_LOGS,
    jobId: "sched:cleanup-logs",
    every: 24 * 60 * 60 * 1000,
    description: "Old log file cleanup",
  },
  {
    queue: QUEUE_NAMES.CLEANUP_UPLOADS,
    jobId: "sched:cleanup-uploads",
    every: 12 * 60 * 60 * 1000,
    description: "Temporary upload cleanup",
  },
])

export const QUEUE_CONCURRENCY = Object.freeze({
  [QUEUE_NAMES.EMAIL]: 3,
  [QUEUE_NAMES.NOTIFICATION]: 2,
  [QUEUE_NAMES.DEAD_LETTER]: 1,
})

export function concurrencyFor(queueName) {
  return QUEUE_CONCURRENCY[queueName] || 1
}
