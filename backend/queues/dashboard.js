/**
 * Admin + ops snapshot of all BullMQ queues.
 */
import { QUEUE_NAMES, WORKER_QUEUES, REPEAT_SCHEDULES } from "./definitions.js"
import { getQueue, connection } from "./factory.js"
import { jobMetrics } from "./metrics.js"
import { getWorkerStatusMap, listActiveWorkers } from "../workers/index.js"
import { listRepeatableJobs } from "../scheduler/index.js"

async function countsFor(queueName) {
  const q = getQueue(queueName)
  if (!q) {
    return {
      name: queueName,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      available: false,
    }
  }
  const counts = await q.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused")
  return {
    name: queueName,
    available: true,
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
    paused: counts.paused || 0,
    size: (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0),
  }
}

async function recentJobs(queueName, state, limit = 10) {
  const q = getQueue(queueName)
  if (!q) return []
  try {
    const jobs = await q.getJobs([state], 0, limit - 1, true)
    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      queue: queueName,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
      finishedOn: j.finishedOn || null,
      processedOn: j.processedOn || null,
      failedReason: j.failedReason || null,
      executionMs:
        j.finishedOn && j.processedOn ? Math.max(0, j.finishedOn - j.processedOn) : null,
      dataSummary: summarize(j.data),
    }))
  } catch {
    return []
  }
}

function summarize(data) {
  if (!data || typeof data !== "object") return {}
  const out = {}
  for (const k of ["userId", "tripId", "to", "destination", "mode", "originalQueue"]) {
    if (data[k] != null) out[k] = String(data[k]).slice(0, 60)
  }
  return out
}

export async function getQueueDashboard() {
  if (!connection()) {
    return {
      redis: false,
      message: "Redis not configured — BullMQ inactive",
      queues: [],
      workers: {},
      schedules: REPEAT_SCHEDULES,
      metrics: jobMetrics.getSnapshot(),
    }
  }

  const queueNames = [...WORKER_QUEUES, QUEUE_NAMES.DEAD_LETTER]
  const queues = await Promise.all(queueNames.map((n) => countsFor(n)))

  const [completed, failed, active, delayed] = await Promise.all([
    Promise.all(WORKER_QUEUES.slice(0, 6).map((n) => recentJobs(n, "completed", 5))).then((a) =>
      a.flat().sort((x, y) => (y.finishedOn || 0) - (x.finishedOn || 0)).slice(0, 15),
    ),
    Promise.all(
      [...WORKER_QUEUES, QUEUE_NAMES.DEAD_LETTER].map((n) => recentJobs(n, "failed", 5)),
    ).then((a) => a.flat().sort((x, y) => (y.finishedOn || 0) - (x.finishedOn || 0)).slice(0, 15)),
    Promise.all(WORKER_QUEUES.map((n) => recentJobs(n, "active", 5))).then((a) => a.flat()),
    Promise.all(WORKER_QUEUES.map((n) => recentJobs(n, "delayed", 5))).then((a) => a.flat()),
  ])

  const dlq = await recentJobs(QUEUE_NAMES.DEAD_LETTER, "waiting", 20)
  const schedules = await listRepeatableJobs()
  const metrics = jobMetrics.getSnapshot()

  const totals = queues.reduce(
    (acc, q) => {
      acc.waiting += q.waiting
      acc.active += q.active
      acc.completed += q.completed
      acc.failed += q.failed
      acc.delayed += q.delayed
      return acc
    },
    { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
  )

  return {
    redis: true,
    totals,
    queues,
    workers: getWorkerStatusMap(),
    activeWorkers: listActiveWorkers(),
    schedules,
    runningJobs: active,
    delayedJobs: delayed,
    completedJobs: completed,
    failedJobs: failed,
    deadLetterJobs: dlq,
    metrics,
  }
}

/** Retry a failed job by id on a given queue. */
export async function retryFailedJob(queueName, jobId) {
  const q = getQueue(queueName)
  if (!q) throw Object.assign(new Error("Queue unavailable"), { statusCode: 503 })
  const job = await q.getJob(jobId)
  if (!job) throw Object.assign(new Error("Job not found"), { statusCode: 404 })
  await job.retry()
  return { retried: true, id: job.id, queue: queueName }
}

/** Re-queue a DLQ payload back onto its original queue. */
export async function requeueFromDeadLetter(dlqJobId) {
  const q = getQueue(QUEUE_NAMES.DEAD_LETTER)
  if (!q) throw Object.assign(new Error("DLQ unavailable"), { statusCode: 503 })
  const job = await q.getJob(dlqJobId)
  if (!job) throw Object.assign(new Error("DLQ job not found"), { statusCode: 404 })
  const { originalQueue, data } = job.data || {}
  if (!originalQueue) throw Object.assign(new Error("Missing originalQueue"), { statusCode: 400 })
  const { enqueue } = await import("./factory.js")
  const fresh = await enqueue(originalQueue, data || {}, {})
  await job.remove()
  return { requeued: true, queue: originalQueue, jobId: fresh?.id }
}
