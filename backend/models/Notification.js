import mongoose from "mongoose"
import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
} from "../constants/notificationTypes.js"
import { tenantScopePlugin } from "../utils/tenantScope.js"

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Itinerary",
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITIES,
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: NOTIFICATION_STATUSES,
      default: "UNREAD",
      index: true,
    },
    actionUrl: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    scheduledFor: { type: Date, index: true },
  },
  { timestamps: true },
)

notificationSchema.index({ user: 1, status: 1, createdAt: -1 })
notificationSchema.index({ user: 1, "metadata.dedupKey": 1 }, { sparse: true })
notificationSchema.index({ user: 1, scheduledFor: 1 })
notificationSchema.index({ user: 1, type: 1, createdAt: -1 })
notificationSchema.index({ status: 1, createdAt: -1 })

notificationSchema.plugin(tenantScopePlugin)

notificationSchema.index({ tenantId: 1, user: 1, createdAt: -1 })

const Notification = mongoose.model("Notification", notificationSchema)
export default Notification
