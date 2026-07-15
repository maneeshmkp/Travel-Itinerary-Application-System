import nodemailer from "nodemailer"
import { EMAIL_ELIGIBLE_TYPES } from "../../constants/notificationTypes.js"

function createTransporter() {
  const user = String(process.env.EMAIL_USER || "").trim()
  const pass = String(process.env.EMAIL_PASSWORD || "")
    .trim()
    .replace(/\s+/g, "")
  if (!user || !pass) return null
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  })
}

/**
 * Send notification email (flight, hotel, weather, budget).
 */
export async function sendNotificationEmail({
  email,
  userName,
  title,
  message,
  actionUrl,
  tripName,
  eventDate,
}) {
  const transporter = createTransporter()
  if (!transporter) {
    return { success: false, message: "Email not configured" }
  }

  const tripLine = tripName ? `<p style="color:#555;margin:8px 0;"><strong>Trip:</strong> ${tripName}</p>` : ""
  const dateLine = eventDate
    ? `<p style="color:#555;margin:8px 0;"><strong>Date:</strong> ${eventDate}</p>`
    : ""

  const mailOptions = {
    from: `TravelPlan Notifications <${String(process.env.EMAIL_USER || "").trim()}>`,
    to: email,
    subject: title,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#fff;padding:28px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="color:#15803d;margin:0 0 16px;">${title}</h2>
          <p style="color:#333;line-height:1.6;">Hi ${userName || "Traveler"},</p>
          <p style="color:#333;line-height:1.6;">${message}</p>
          ${tripLine}
          ${dateLine}
          ${
            actionUrl
              ? `<div style="text-align:center;margin:28px 0;">
            <a href="${actionUrl}" style="background:#15803d;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              View in TravelPlan
            </a>
          </div>`
              : ""
          }
          <p style="color:#999;font-size:12px;margin-top:24px;">You can manage notification preferences in your account settings.</p>
        </div>
      </div>
    `,
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    return { success: true, messageId: result.messageId }
  } catch (err) {
    console.error("Notification email error:", err.message)
    return { success: false, message: err.message }
  }
}

export function shouldEmailForType(type) {
  return EMAIL_ELIGIBLE_TYPES.has(type)
}
