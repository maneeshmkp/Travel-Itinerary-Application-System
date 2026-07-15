import mongoose from "mongoose"

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    itineraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Itinerary",
      required: [true, "Itinerary is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
      default: "",
    },
  },
  { timestamps: true },
)

reviewSchema.index({ userId: 1, itineraryId: 1 }, { unique: true })
reviewSchema.index({ itineraryId: 1, createdAt: -1 })

const Review = mongoose.model("Review", reviewSchema)
export default Review
