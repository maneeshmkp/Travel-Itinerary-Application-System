import mongoose from "mongoose"

const notificationSettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    emailEnabled: { type: Boolean, default: true },
    inAppEnabled: { type: Boolean, default: true },
    /** Browser/OS push — reserved; toggle persists for preferences UI */
    pushEnabled: { type: Boolean, default: false },
    /** Play a short sound when a live toast arrives */
    soundEnabled: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    weatherAlerts: { type: Boolean, default: true },
    bookingAlerts: { type: Boolean, default: true },
    collaborationAlerts: { type: Boolean, default: true },
    activityReminders: { type: Boolean, default: true },
    flightReminders: { type: Boolean, default: true },
    hotelReminders: { type: Boolean, default: true },
    aiReminders: { type: Boolean, default: true },
  },
  { timestamps: true },
)

const NotificationSettings = mongoose.model("NotificationSettings", notificationSettingsSchema)
export default NotificationSettings
