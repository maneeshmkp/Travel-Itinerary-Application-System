/**
 * BullMQ workers — start/stop + DLQ routing after exhausted retries.
 * Must run only after waitForRedisReady() succeeds (server.js sequences this).
 */
import { Worker } from "bullmq"
import { logRedis, createBullRedisConnection, waitForRedisReady } from "../config/redis.js"
import { QUEUE_NAMES, WORKER_QUEUES, concurrencyFor } from "../queues/definitions.js"
import { connection, getQueue, moveToDeadLetter } from "../queues/factory.js"
import { jobMetrics } from "../queues/metrics.js"
import { PROCESSORS } from "../jobs/index.js"

/** @type {Worker[]} */
const workers = []
/** @type {Map<string, { running: boolean, lastJobId?: string, lastError?: string, lastCompletedAt?: string }>} */
const workerStatus = new Map()
let lastWorkerErrorLogAt = 0
/** Prevent duplicate concurrent starts */
let starting = false

export function getWorkerStatusMap() {
  const out = {}
  for (const name of WORKER_QUEUES) {
    out[name] = workerStatus.get(name) || { running: false }
  }
  out[QUEUE_NAMES.DEAD_LETTER] = workerStatus.get(QUEUE_NAMES.DEAD_LETTER) || { running: false }
  return out
}

export function listActiveWorkers() {
  return workers.map((w) => ({
    name: w.name,
    isRunning: w.isRunning?.() ?? true,
    isPaused: w.isPaused?.() ?? false,
  }))
}

/**
 * Start BullMQ queues + workers only when Redis is ready (PING).
 * Idempotent — safe to call once from sequenced startup.
 * @returns {Promise<{ started: boolean, reason?: string }>}
 */
export async function startWorkers() {
  const connOpts = connection()
  if (!connOpts) {
    logRedis.info("BullMQ workers skipped — Redis not configured")
    return { started: false, reason: "not_configured" }
  }

  if (workers.length > 0) {
    return { started: true, reason: "already_running" }
  }

  if (starting) {
    return { started: false, reason: "starting" }
  }
  starting = true

  try {
    const redis = await waitForRedisReady({ timeoutMs: 20_000 })
    if (!redis) {
      logRedis.warn(
        "BullMQ workers skipped — Redis unreachable (start Redis or unset REDIS_URL for legacy pollers)",
      )
      return { started: false, reason: "unreachable" }
    }

    logRedis.info("Initializing BullMQ...")

    const allQueues = [...WORKER_QUEUES]
    for (const name of allQueues) {
      getQueue(name)
      const processor = PROCESSORS[name]
      if (!processor) continue

      workerStatus.set(name, { running: true })

      const workerConnection = createBullRedisConnection(`worker:${name}`)
      if (!workerConnection) continue

      const worker = new Worker(
        name,
        async (job) => {
          const t0 = Date.now()
          workerStatus.set(name, {
            running: true,
            lastJobId: job.id,
            startedAt: new Date().toISOString(),
          })
          logRedis.info("Queue processing", { name, jobId: job.id })
          const result = await processor(job)
          const ms = Date.now() - t0
          jobMetrics.recordCompleted(name, ms)
          workerStatus.set(name, {
            running: true,
            lastJobId: job.id,
            lastCompletedAt: new Date().toISOString(),
            lastMs: ms,
          })
          logRedis.info("Queue processed", { name, jobId: job.id, ms })
          return result
        },
        { connection: workerConnection, concurrency: concurrencyFor(name) },
      )

      worker.on("failed", async (job, err) => {
        jobMetrics.recordFailed(name, err?.message)
        const attempts = job?.opts?.attempts ?? 5
        const made = job?.attemptsMade ?? 0
        if (made > 1 && made < attempts) {
          jobMetrics.recordRetry(name)
        }
        logRedis.error("Queue job failed", {
          name,
          jobId: job?.id,
          attemptsMade: made,
          message: err?.message,
        })
        workerStatus.set(name, {
          ...workerStatus.get(name),
          running: true,
          lastError: err?.message,
          lastFailedAt: new Date().toISOString(),
        })

        if (job && made >= attempts) {
          await moveToDeadLetter(job, err)
        }
      })

      worker.on("error", (err) => {
        const now = Date.now()
        if (now - lastWorkerErrorLogAt > 15_000) {
          lastWorkerErrorLogAt = now
          logRedis.error("Worker error", { name, message: err?.message })
        }
      })

      workers.push(worker)
    }

    getQueue(QUEUE_NAMES.DEAD_LETTER)
    workerStatus.set(QUEUE_NAMES.DEAD_LETTER, { running: false, note: "retention only" })

    logRedis.info("BullMQ queues ready", { queues: allQueues.length })
    logRedis.info("Workers ready", { workers: workers.length })
    return { started: true }
  } finally {
    starting = false
  }
}

export async function stopWorkers() {
  await Promise.allSettled(workers.map((w) => w.close()))
  workers.length = 0
  for (const name of workerStatus.keys()) {
    workerStatus.set(name, { running: false })
  }
}

/** @deprecated alias */
export const startQueueWorkers = startWorkers
