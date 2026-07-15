import mongoose from "mongoose"
import Review from "../models/Review.js"
import Itinerary from "../models/Itinerary.js"
import { validationResult } from "express-validator"
import { notifyReviewReceived } from "../services/notifications/notificationTriggers.js"

function formatReview(doc) {
  const user = doc.userId
  return {
    _id: doc._id,
    rating: doc.rating,
    comment: doc.comment || "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    user: {
      _id: user?._id || doc.userId,
      name: user?.name || "Traveler",
    },
  }
}

async function reviewSummary(itineraryId) {
  const objectId = new mongoose.Types.ObjectId(itineraryId)
  const [agg] = await Review.aggregate([
    { $match: { itineraryId: objectId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ])

  if (!agg) {
    return { averageRating: 0, count: 0 }
  }

  return {
    averageRating: Math.round(agg.averageRating * 10) / 10,
    count: agg.count,
  }
}

// @desc    Get reviews for an itinerary
// @route   GET /api/itineraries/:id/reviews
// @access  Public
export const getItineraryReviews = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).select("_id title ownerId")
    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: "Itinerary not found",
      })
    }

    const reviews = await Review.find({ itineraryId: req.params.id })
      .populate("userId", "name")
      .sort({ createdAt: -1 })

    const summary = await reviewSummary(req.params.id)

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: {
        summary,
        reviews: reviews.map(formatReview),
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Add or update a review for an itinerary
// @route   POST /api/itineraries/:id/reviews
// @access  Private
export const addItineraryReview = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const itinerary = await Itinerary.findById(req.params.id).select("_id title ownerId")
    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: "Itinerary not found",
      })
    }

    const { rating, comment = "" } = req.body

    const review = await Review.findOneAndUpdate(
      { userId: req.user._id, itineraryId: req.params.id },
      {
        userId: req.user._id,
        itineraryId: req.params.id,
        rating: Number(rating),
        comment: String(comment).trim(),
      },
      { new: true, upsert: true, runValidators: true },
    ).populate("userId", "name")

    const summary = await reviewSummary(req.params.id)

    res.status(201).json({
      success: true,
      data: {
        review: formatReview(review),
        summary,
      },
    })

    const ownerId = itinerary.ownerId
    if (ownerId && String(ownerId) !== String(req.user._id)) {
      notifyReviewReceived(ownerId, review, itinerary, req.user).catch((err) =>
        console.error("Review notification:", err.message),
      )
    }
  } catch (error) {
    next(error)
  }
}
