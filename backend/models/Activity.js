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
  },
  {
    timestamps: true,
  },
)

const Activity = mongoose.model("Activity", activitySchema)
export default Activity
