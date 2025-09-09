import mongoose from "mongoose"

const itinerarySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Itinerary title is required"],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },
    numberOfNights: {
      type: Number,
      required: [true, "Number of nights is required"],
      min: 1,
      max: 30,
    },
    totalDays: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    days: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Day",
      },
    ],
    budget: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: "USD",
      },
    },
    bestTimeToVisit: {
      type: String,
      trim: true,
    },
    highlights: [String],
    tags: [
      {
        type: String,
        enum: ["beach", "adventure", "cultural", "luxury", "budget", "family", "romantic", "solo"],
      },
    ],
    isRecommended: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      default: "System",
    },
  },
  {
    timestamps: true,
  },
)

// Virtual for calculating total days
itinerarySchema.pre("save", function (next) {
  this.totalDays = this.numberOfNights + 1
  next()
})

const Itinerary = mongoose.model("Itinerary", itinerarySchema)
export default Itinerary
