/**
 * Centralized Background Job Scheduler — registers all repeatable BullMQ jobs.
 */
import { logRedis } from "../config/redis.js"
import { REPEAT_SCHEDULES, QUEUE_NAMES } from "../queues/definitions.js"
import { enqueue, connection, getQueue } from "../queues/factory.js"

let started = false

/**
 * Enroll every REPEAT_SCHEDULES entry. Idempotent via stable jobId.
 */
export async function registerRepeatableJobs() {
  if (!connection()) {
    logRedis.info("Scheduler skipped — Redis not configured")
    return { registered: 0 }
  }

  let registered = 0
  for (const sched of REPEAT_SCHEDULES) {
    try {
      await enqueue(
        sched.queue,
        sched.data || {},
        {
          jobId: sched.jobId,
          repeat: { every: sched.every },
          removeOnComplete: { count: 50 },
          removeOnFail: { count: 30 },
        },
      )
      registered += 1
      logRedis.info("Repeatable job registered", {
        queue: sched.queue,
        jobId: sched.jobId,
        everyMs: sched.every,
        description: sched.description,
      })
    } catch (err) {
      logRedis.warn("Repeatable job register failed", {
        queue: sched.queue,
        message: err?.message,
      })
    }
  }
  started = true
  return { registered }
}

export async function listRepeatableJobs() {
  const out = []
  for (const sched of REPEAT_SCHEDULES) {
    const q = getQueue(sched.queue)
    if (!q) {
      out.push({ ...sched, active: false })
      continue
    }
    try {
      const reps = await q.getRepeatableJobs()
      const match = reps.find((r) => r.id === sched.jobId || r.name === sched.jobId)
      out.push({
        ...sched,
        active: Boolean(match),
        key: match?.key || null,
        next: match?.next || null,
      })
    } catch {
      out.push({ ...sched, active: false })
    }
  }
  return out
}

export async function startScheduler() {
  return registerRepeatableJobs()
}

export function isSchedulerStarted() {
  return started
}

export { REPEAT_SCHEDULES, QUEUE_NAMES }
