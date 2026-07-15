import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { QUEUE_NAMES, WORKER_QUEUES, DEFAULT_JOB_OPTIONS, REPEAT_SCHEDULES } from "../queues/definitions.js"
import { PROCESSORS, getProcessor } from "../jobs/index.js"
import { jobMetrics } from "../queues/metrics.js"

describe("Background job architecture", () => {
  beforeEach(() => {
    jobMetrics.resetForTests()
  })

  it("defines every required queue", () => {
    const required = [
      "email",
      "flight-status-refresh",
      "weather-refresh",
      "document-expiry-reminder",
      "notification-delivery",
      "analytics-refresh",
      "ai-recommendation-refresh",
      "budget-recalculation",
      "notification-schedule",
      "cleanup-redis-keys",
      "cleanup-old-logs",
      "cleanup-temp-uploads",
      "dead-letter",
    ]
    for (const name of required) {
      assert.ok(Object.values(QUEUE_NAMES).includes(name), `missing queue ${name}`)
    }
  })

  it("registers a processor for every worker queue", () => {
    for (const name of WORKER_QUEUES) {
      assert.equal(typeof getProcessor(name), "function", `processor missing for ${name}`)
      assert.equal(typeof PROCESSORS[name], "function")
    }
  })

  it("uses exponential backoff retry policy", () => {
    assert.equal(DEFAULT_JOB_OPTIONS.attempts, 5)
    assert.equal(DEFAULT_JOB_OPTIONS.backoff.type, "exponential")
    assert.ok(DEFAULT_JOB_OPTIONS.backoff.delay >= 1000)
  })

  it("has repeatable schedules covering core domain jobs", () => {
    const queues = REPEAT_SCHEDULES.map((s) => s.queue)
    assert.ok(queues.includes(QUEUE_NAMES.FLIGHT_STATUS))
    assert.ok(queues.includes(QUEUE_NAMES.WEATHER_REFRESH))
    assert.ok(queues.includes(QUEUE_NAMES.AI_RECOMMENDATION))
    assert.ok(queues.includes(QUEUE_NAMES.ANALYTICS_REFRESH))
    assert.ok(queues.includes(QUEUE_NAMES.BUDGET_RECALC))
    assert.ok(queues.includes(QUEUE_NAMES.DOCUMENT_EXPIRY))
    assert.ok(queues.includes(QUEUE_NAMES.NOTIFICATION_SCHEDULE))
    assert.ok(queues.includes(QUEUE_NAMES.CLEANUP_REDIS))
    assert.ok(queues.includes(QUEUE_NAMES.CLEANUP_LOGS))
    assert.ok(queues.includes(QUEUE_NAMES.CLEANUP_UPLOADS))
    for (const s of REPEAT_SCHEDULES) {
      assert.ok(s.jobId, "stable jobId required")
      assert.ok(s.every > 0)
    }
  })

  it("runs cleanup log/upload processors without Redis", async () => {
    const logs = await PROCESSORS[QUEUE_NAMES.CLEANUP_LOGS]({ data: {} })
    assert.ok(typeof logs.removed === "number")
    const uploads = await PROCESSORS[QUEUE_NAMES.CLEANUP_UPLOADS]({ data: {} })
    assert.ok(typeof uploads.removed === "number")
  })

  it("records job metrics for throughput monitoring", () => {
    jobMetrics.recordEnqueued(QUEUE_NAMES.EMAIL)
    jobMetrics.recordCompleted(QUEUE_NAMES.EMAIL, 42)
    jobMetrics.recordFailed(QUEUE_NAMES.EMAIL, "boom")
    jobMetrics.recordRetry(QUEUE_NAMES.EMAIL)
    jobMetrics.recordDeadLetter(QUEUE_NAMES.EMAIL)
    const snap = jobMetrics.getSnapshot()
    assert.equal(snap.totals.enqueued, 1)
    assert.equal(snap.totals.completed, 1)
    assert.equal(snap.totals.failed, 1)
    assert.equal(snap.totals.retries, 1)
    assert.equal(snap.totals.deadLetter, 1)
    assert.equal(snap.throughput.avgExecutionMs, 42)
  })

  it("exposes jobs convenience API for every queue family", async () => {
    const { jobs } = await import("../queues/index.js")
    assert.equal(typeof jobs.email, "function")
    assert.equal(typeof jobs.flightRefresh, "function")
    assert.equal(typeof jobs.weatherRefresh, "function")
    assert.equal(typeof jobs.documentExpiry, "function")
    assert.equal(typeof jobs.notification, "function")
    assert.equal(typeof jobs.analyticsRefresh, "function")
    assert.equal(typeof jobs.aiRecommendation, "function")
    assert.equal(typeof jobs.budgetRecalc, "function")
    assert.equal(typeof jobs.cleanupRedis, "function")
    assert.equal(typeof jobs.cleanupLogs, "function")
    assert.equal(typeof jobs.cleanupUploads, "function")
  })
})
