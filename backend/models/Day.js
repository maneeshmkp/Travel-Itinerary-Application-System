import mongoose from "mongoose"

const daySchema = new mongoose.Schema(
  {
    dayNumber: {
      type: Number,
      required: [true, "Day number is required"],
      min: 1,
    },
    hotel: {
      name: {
        type: String,
        required: [true, "Hotel name is required"],
        trim: true,
      },
      location: {
        type: String,
        required: [true, "Hotel location is required"],
        trim: true,
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 4,
      },
      checkIn: String,
      checkOut: String,
    },
    transfers: [
      {
        type: {
          type: String,
          enum: ["airport", "hotel", "activity", "restaurant"],
          required: true,
        },
        from: {
          type: String,
          required: true,
          trim: true,
        },
        to: {
          type: String,
          required: true,
          trim: true,
        },
        time: String,
        mode: {
          type: String,
          enum: ["car", "bus", "boat", "flight", "walking"],
          default: "car",
        },
      },
    ],
    activities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Activity",
      },
    ],
    meals: [
      {
        type: {
          type: String,
          enum: ["breakfast", "lunch", "dinner", "snack"],
          required: true,
        },
        restaurant: String,
        location: String,
        time: String,
      },
    ],
  },
  {
    timestamps: true,
  },
)

const Day = mongoose.model("Day", daySchema)
export default Day
