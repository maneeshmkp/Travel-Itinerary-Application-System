import mongoose from "mongoose"

const activitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Activity name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Activity description is required"],
      trim: true,
    },
    time: {
      type: String,
      required: [true, "Activity time is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Activity location is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["sightseeing", "adventure", "cultural", "relaxation", "dining", "shopping"],
      default: "sightseeing",
    },
    duration: {
      type: String,
      default: "2-3 hours",
    },
    /** Estimated spend for this activity (same currency as itinerary budget). */
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    /** Resolved display name from map geocoding (Nominatim). */
    geocodedName: {
      type: String,
      trim: true,
    },
    /** When true, activity is skipped and later items are reflowed on the day schedule. */
    skipped: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

activitySchema.index({ name: 1 })
activitySchema.index({ category: 1, name: 1 })

const Activity = mongoose.model("Activity", activitySchema)
export default Activity
