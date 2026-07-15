import cron from "node-cron"
import { runAllScheduledChecks } from "../services/notifications/notificationSchedulerJobs.js"

let scheduledTask = null
let isRunning = false

/**
 * Start cron scheduler — runs every 15 minutes.
 * Checks activities, hotels, flights, weather, budget, and AI reminders.
 */
export function startNotificationScheduler() {
  if (scheduledTask) return scheduledTask

  const enabled = process.env.NOTIFICATION_SCHEDULER !== "false"
  if (!enabled) {
    console.log("Notification scheduler: disabled (NOTIFICATION_SCHEDULER=false)")
    return null
  }

  scheduledTask = cron.schedule(
    "*/15 * * * *",
    async () => {
      if (isRunning) {
        console.log("Notification scheduler: previous run still in progress, skipping")
        return
      }
      isRunning = true
      try {
        const results = await runAllScheduledChecks()
        const total = Object.values(results).reduce(
          (s, v) => (typeof v === "number" ? s + v : s),
          0,
        )
        if (total > 0) {
          console.log("Notification scheduler:", results)
        }
      } catch (err) {
        console.error("Notification scheduler error:", err.message)
      } finally {
        isRunning = false
      }
    },
    { scheduled: true },
  )

  console.log("Notification scheduler: started (every 15 minutes)")
  return scheduledTask
}

export function stopNotificationScheduler() {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
  }
}

/** Manual trigger for testing */
export async function runNotificationSchedulerNow() {
  return runAllScheduledChecks()
}
