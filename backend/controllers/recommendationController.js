import Itinerary from "../models/Itinerary.js"

// @desc    Get recommended itineraries
// @route   GET /api/recommendations
// @access  Public
export const getRecommendations = async (req, res, next) => {
  try {
    const { nights, destination, tags, budget } = req.query

    // Build query for recommended itineraries
    const query = { isRecommended: true }

    if (nights) {
      const nightsNum = Number.parseInt(nights)
      // Allow some flexibility in nights (±1 day)
      query.numberOfNights = { $gte: nightsNum - 1, $lte: nightsNum + 1 }
    }

    if (destination) {
      query.destination = { $regex: destination, $options: "i" }
    }

    if (tags) {
      const tagArray = tags.split(",")
      query.tags = { $in: tagArray }
    }

    if (budget) {
      const budgetNum = Number.parseInt(budget)
      query.$or = [{ "budget.max": { $lte: budgetNum } }, { "budget.max": { $exists: false } }]
    }

    const recommendations = await Itinerary.find(query)
      .populate({
        path: "days",
        populate: {
          path: "activities",
          model: "Activity",
        },
      })
      .sort({ numberOfNights: 1, createdAt: -1 })
      .limit(10)

    // If no exact matches, get popular destinations
    if (recommendations.length === 0) {
      const fallbackRecommendations = await Itinerary.find({ isRecommended: true })
        .populate({
          path: "days",
          populate: {
            path: "activities",
            model: "Activity",
          },
        })
        .sort({ createdAt: -1 })
        .limit(5)

      return res.status(200).json({
        success: true,
        count: fallbackRecommendations.length,
        message: "No exact matches found. Here are popular destinations:",
        data: fallbackRecommendations,
      })
    }

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get destination highlights
// @route   GET /api/recommendations/destinations
// @access  Public
export const getDestinations = async (req, res, next) => {
  try {
    const destinations = await Itinerary.aggregate([
      { $match: { isRecommended: true } },
      {
        $group: {
          _id: "$destination",
          count: { $sum: 1 },
          minNights: { $min: "$numberOfNights" },
          maxNights: { $max: "$numberOfNights" },
          tags: { $addToSet: "$tags" },
          highlights: { $addToSet: "$highlights" },
        },
      },
      { $sort: { count: -1 } },
    ])

    // Flatten tags and highlights
    const processedDestinations = destinations.map((dest) => ({
      destination: dest._id,
      itineraryCount: dest.count,
      nightRange: {
        min: dest.minNights,
        max: dest.maxNights,
      },
      tags: [...new Set(dest.tags.flat())],
      highlights: [...new Set(dest.highlights.flat())],
    }))

    res.status(200).json({
      success: true,
      count: processedDestinations.length,
      data: processedDestinations,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get similar itineraries
// @route   GET /api/recommendations/similar/:id
// @access  Public
export const getSimilarItineraries = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: "Itinerary not found",
      })
    }

    // Find similar itineraries based on destination, nights, and tags
    const similar = await Itinerary.find({
      _id: { $ne: itinerary._id },
      $or: [
        { destination: itinerary.destination },
        { numberOfNights: { $gte: itinerary.numberOfNights - 1, $lte: itinerary.numberOfNights + 1 } },
        { tags: { $in: itinerary.tags } },
      ],
    })
      .populate({
        path: "days",
        populate: {
          path: "activities",
          model: "Activity",
        },
      })
      .limit(6)

    res.status(200).json({
      success: true,
      count: similar.length,
      data: similar,
    })
  } catch (error) {
    next(error)
  }
}
