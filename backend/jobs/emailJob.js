export async function processEmailJob(job) {
  const { sendNotificationEmail } = await import("../services/notifications/notificationEmailService.js")
  // Also support generic { to, subject, text } from event handlers
  const data = job.data || {}
  if (data.to && (data.subject || data.text) && !data.title) {
    const nodemailer = (await import("nodemailer")).default
    const user = String(process.env.EMAIL_USER || "").trim()
    const pass = String(process.env.EMAIL_PASSWORD || "").trim().replace(/\s+/g, "")
    if (!user || !pass) return { skipped: true, reason: "email not configured" }
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } })
    await transporter.sendMail({
      from: `TravelPlan <${user}>`,
      to: data.to,
      subject: data.subject || "TravelPlan",
      text: data.text || "",
      html: data.html,
    })
    return { sent: true, mode: "generic" }
  }
  await sendNotificationEmail(data)
  return { sent: true, mode: "notification" }
}
