export async function processNotificationJob(job) {
  const { createNotification } = await import("../services/notifications/notificationService.js")
  if (job.data?.skipCreate) return { skipped: true }
  await createNotification(job.data || {})
  return { created: true }
}
