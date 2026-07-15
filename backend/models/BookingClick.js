import mongoose from "mongoose"

const bookingClickSchema = new mongoose.Schema(
  {
    bookingType: {
      type: String,
      enum: ["flight", "hotel"],
      required: true,
    },
    itemName: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    destination: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    bookingProvider: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    bookingUrl: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    clickedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

bookingClickSchema.index({ bookingType: 1, clickedAt: -1 })
bookingClickSchema.index({ destination: 1, clickedAt: -1 })

const BookingClick = mongoose.model("BookingClick", bookingClickSchema)
export default BookingClick
