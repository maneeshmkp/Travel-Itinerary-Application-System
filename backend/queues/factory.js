/**
 * Queue factory + enqueue with shared defaults.
 */
import { Queue } from "bullmq"
import { getBullConnectionOptions, logRedis } from "../config/redis.js"
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from "./definitions.js"
import { jobMetrics } from "./metrics.js"

/** @type {Map<string, Queue>} */
const queues = new Map()

export function connection() {
  return getBullConnectionOptions()
}

export function getQueue(name) {
  const conn = connection()
  if (!conn) return null
  if (queues.has(name)) return queues.get(name)
  // Use connection options; BullMQ clones clients — errors handled via option retryStrategy
  // and worker-level createBullRedisConnection for workers.
  const q = new Queue(name, {
    connection: conn,
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS },
  })
  q.on("error", (err) => {
    logRedis.error("Queue error", { name, message: err?.message })
  })
  queues.set(name, q)
  logRedis.info("Queue created", { name })
  return q
}

/**
 * Enqueue a job. Returns null if Redis unavailable.
 */
export async function enqueue(name, data = {}, opts = {}) {
  try {
    const q = getQueue(name)
    if (!q) return null
    const job = await q.add(opts.name || name, data, opts)
    jobMetrics.recordEnqueued(name)
    logRedis.info("Queue job enqueued", { name, jobId: job.id })
    return job
  } catch (err) {
    logRedis.warn("enqueue failed — caller should fall back", {
      name,
      message: err?.message,
    })
    return null
  }
}

/** Move permanently failed jobs into the dead-letter queue. */
export async function moveToDeadLetter(failedJob, err) {
  try {
    const dlq = getQueue(QUEUE_NAMES.DEAD_LETTER)
    if (!dlq || !failedJob) return null
    const job = await dlq.add(
      "dead-letter",
      {
        originalQueue: failedJob.queueName,
        originalJobId: failedJob.id,
        originalName: failedJob.name,
        data: failedJob.data,
        failedReason: err?.message || failedJob.failedReason || "unknown",
        attemptsMade: failedJob.attemptsMade,
        stacktrace: failedJob.stacktrace?.slice?.(0, 3) || [],
        failedAt: new Date().toISOString(),
      },
      {
        attempts: 1,
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 100 },
      },
    )
    jobMetrics.recordDeadLetter(failedJob.queueName)
    logRedis.error("Job moved to dead-letter queue", {
      queue: failedJob.queueName,
      jobId: failedJob.id,
      dlqJobId: job.id,
      message: err?.message,
    })
    return job
  } catch (e) {
    logRedis.warn("DLQ enqueue failed", { message: e?.message })
    return null
  }
}

export async function closeAllQueues() {
  await Promise.allSettled([...queues.values()].map((q) => q.close()))
  queues.clear()
}

export function getOpenQueues() {
  return queues
}
