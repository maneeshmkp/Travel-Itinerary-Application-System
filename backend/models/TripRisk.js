import mongoose from "mongoose"
import { RISK_TYPE_IDS, RISK_SEVERITIES, RISK_STATUSES } from "../constants/riskTypes.js"

const tripRiskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true, index: true },
    riskType: { type: String, enum: RISK_TYPE_IDS, default: "general", index: true },
    severity: { type: String, enum: RISK_SEVERITIES, default: "LOW", index: true },
    status: { type: String, enum: RISK_STATUSES, default: "OPEN", index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    recommendation: {
      title: { type: String, trim: true, maxlength: 300, default: "" },
      description: { type: String, trim: true, maxlength: 2000, default: "" },
      suggestions: [{ type: String, trim: true, maxlength: 500 }],
      alternativeActivities: [
        {
          name: String,
          time: String,
          location: String,
          category: String,
          reason: String,
        },
      ],
      transportTip: { type: String, trim: true, maxlength: 500, default: "" },
    },
    affectedDay: { type: Number, min: 1 },
    affectedActivityIds: [{ type: String }],
    source: {
      type: String,
      enum: ["weather", "booking", "document", "budget", "schedule", "ai", "calendar"],
      default: "ai",
    },
    dedupKey: { type: String, trim: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    analyzedAt: { type: Date },
  },
  { timestamps: true },
)

tripRiskSchema.index({ userId: 1, tripId: 1, dedupKey: 1 }, { unique: true, sparse: true })
tripRiskSchema.index({ tripId: 1, status: 1 })

export default mongoose.model("TripRisk", tripRiskSchema)
