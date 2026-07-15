/**
 * Seed sample notifications for a user (CLI).
 * Usage: node utils/seedNotifications.js <userEmail>
 */
import dotenv from "dotenv"
import connectDB from "../config/db.js"
import User from "../models/User.js"
import { createNotification, buildActionUrl } from "../services/notifications/notificationService.js"
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js"

dotenv.config()

const samples = [
  { type: NOTIFICATION_TYPES.ACTIVITY_REMINDER, title: "Upcoming activity", message: "Your Museum visit starts in 1 hour.", priority: "HIGH" },
  { type: NOTIFICATION_TYPES.BUDGET_WARNING, title: "Budget alert: 90% used", message: "You have used 90% of your trip budget.", priority: "HIGH" },
  { type: NOTIFICATION_TYPES.WEATHER_ALERT, title: "Weather alert: Heavy rain", message: "Heavy rain expected tomorrow. Consider indoor activities.", priority: "HIGH" },
  { type: NOTIFICATION_TYPES.COLLAB_JOIN, title: "Collaborator joined", message: "Alex joined your trip.", priority: "MEDIUM" },
]

async function main() {
  await connectDB()
  const email = process.argv[2]
  if (!email) {
    console.error("Usage: node utils/seedNotifications.js <userEmail>")
    process.exit(1)
  }
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) {
    console.error("User not found:", email)
    process.exit(1)
  }
  let count = 0
  for (const s of samples) {
    const n = await createNotification({
      userId: user._id,
      ...s,
      actionUrl: buildActionUrl("/notifications"),
      metadata: { dedupKey: `cli-seed-${s.type}-${Date.now()}-${Math.random()}` },
      skipSettingsCheck: true,
    })
    if (n) count += 1
  }
  console.log(`Created ${count} sample notifications for ${user.email}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
