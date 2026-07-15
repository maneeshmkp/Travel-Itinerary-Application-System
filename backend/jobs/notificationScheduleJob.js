/** Wraps the legacy cron body so all reminders run as a BullMQ job. */
export async function processNotificationScheduleJob() {
  const { runAllScheduledChecks } = await import("../services/notifications/notificationSchedulerJobs.js")
  const results = await runAllScheduledChecks()
  return { results }
}
