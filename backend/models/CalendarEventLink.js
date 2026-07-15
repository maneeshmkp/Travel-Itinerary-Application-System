import mongoose from "mongoose"

const calendarEventLinkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true, index: true },
    provider: { type: String, enum: ["google", "outlook", "ics", "local"], required: true },
    sourceType: { type: String, enum: ["activity", "booking", "imported"], required: true },
    sourceId: { type: String, required: true },
    externalEventId: { type: String, default: "" },
    syncHash: { type: String, default: "" },
    uid: { type: String, required: true },
  },
  { timestamps: true },
)

calendarEventLinkSchema.index({ userId: 1, tripId: 1, provider: 1, uid: 1 }, { unique: true })
calendarEventLinkSchema.index({ userId: 1, sourceType: 1, sourceId: 1 })

export default mongoose.model("CalendarEventLink", calendarEventLinkSchema)
