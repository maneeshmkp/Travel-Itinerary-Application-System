import Itinerary from "../models/Itinerary.js"
import { mergeBudgetIntoResponse } from "../utils/budgetCalculations.js"
import { getTripCoverImage, urlStem } from "../services/tripImageService.js"
import {
  buildContentPreferences,
  getAdvancedRecommendations,
} from "../services/recommendationEngine.js"
import { getNearbyPlaces, listNearbyCategories } from "../services/nearbyPlacesService.js"
import { geolocateClientIp } from "../utils/ipGeolocation.js"

// @desc    Get recommended itineraries
// @route   GET /api/recommendations
// @access  Public
export const getRecommendations = async (req, res, next) => {
  try {
    const { nights, destination, tags, budget } = req.query

    // Match any itinerary — user-created rows default isRecommended: false and were invisible before
    const query = {}

    if (nights) {
      const nightsNum = Number.parseInt(nights)
      // Allow some flexibility in nights (±1 night)
      query.numberOfNights = { $gte: nightsNum - 1, $lte: nightsNum + 1 }
    }

    if (destination) {
      query.destination = { $regex: destination, $options: "i" }
    }

    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim()).filter(Boolean)
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
      .sort({ isRecommended: -1, numberOfNights: 1, createdAt: -1 })
      .limit(10)

    // If filters produced nothing, suggest recent itineraries (still not limited to isRecommended)
    if (recommendations.length === 0) {
      const fallbackRecommendations = await Itinerary.find({})
        .populate({
          path: "days",
          populate: {
            path: "activities",
            model: "Activity",
          },
        })
        .sort({ isRecommended: -1, createdAt: -1 })
        .limit(5)

      return res.status(200).json({
        success: true,
        count: fallbackRecommendations.length,
        message: "No exact matches found. Here are popular destinations:",
        data: fallbackRecommendations.map((doc) => mergeBudgetIntoResponse(doc)),
      })
    }

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations.map((doc) => mergeBudgetIntoResponse(doc)),
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Advanced recommendations (content-based + collaborative)
// @route   GET /api/recommendations/advanced
// @access  Public (collaborative signals when authenticated)
export const getAdvancedRecommendationsHandler = async (req, res, next) => {
  try {
    const { nights, destination, tags, budget, budgetMin, budgetMax, itineraryId, limit } = req.query

    const preferences = buildContentPreferences({
      nights,
      destination,
      tags,
      budget,
      budgetMin,
      budgetMax,
    })

    const hasCriteria =
      preferences.nights != null ||
      preferences.destination ||
      preferences.tags.length > 0 ||
      preferences.budgetMax != null ||
      itineraryId

    if (!hasCriteria && !req.user) {
      return res.status(400).json({
        success: false,
        message:
          "Provide at least one of: nights, destination, tags, budget, itineraryId — or sign in for personalized picks.",
      })
    }

    const userId = req.user?._id?.toString() || req.user?.id || null
    const parsedLimit = limit != null ? Number.parseInt(limit, 10) : 10

    const { preferences: usedPrefs, engine, results } = await getAdvancedRecommendations({
      preferences,
      userId,
      seedItineraryId: itineraryId ? String(itineraryId).trim() : null,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 10,
    })

    const populated = await Itinerary.populate(
      results.map((r) => r.itinerary),
      {
        path: "days",
        populate: { path: "activities", model: "Activity" },
      },
    )

    const byId = new Map(populated.map((doc) => [String(doc._id), doc]))

    const data = results
      .map((r) => {
        const doc = byId.get(String(r.itinerary._id))
        if (!doc) return null
        return {
          ...mergeBudgetIntoResponse(doc),
          recommendationScore: r.scores.combined,
          scoreBreakdown: r.scores,
        }
      })
      .filter(Boolean)

    res.status(200).json({
      success: true,
      count: data.length,
      engine,
      preferences: usedPrefs,
      data,
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
      {
        $addFields: {
          hasCover: {
            $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$coverImage.url", ""] } }, 0] }, 1, 0],
          },
        },
      },
      { $sort: { hasCover: -1, isRecommended: -1, createdAt: -1 } },
      {
        $group: {
          _id: "$destination",
          count: { $sum: 1 },
          minNights: { $min: "$numberOfNights" },
          maxNights: { $max: "$numberOfNights" },
          tags: { $addToSet: "$tags" },
          highlights: { $addToSet: "$highlights" },
          coverImage: { $first: "$coverImage" },
          title: { $first: "$title" },
        },
      },
      { $sort: { count: -1 } },
    ])

    const processedDestinations = destinations.map((dest) => ({
      destination: dest._id,
      itineraryCount: dest.count,
      nightRange: {
        min: dest.minNights,
        max: dest.maxNights,
      },
      tags: [...new Set((dest.tags ?? []).flat().filter(Boolean))],
      highlights: [...new Set((dest.highlights ?? []).flat().filter(Boolean))],
      coverImage: dest.coverImage?.url ? dest.coverImage : null,
      title: dest.title || dest._id,
    }))

    const usedStems = new Set()
    for (const dest of processedDestinations) {
      let stem = dest.coverImage?.url ? urlStem(dest.coverImage.url) : ""

      if (!dest.coverImage?.url) {
        const sample = await Itinerary.findOne({
          destination: dest.destination,
          "coverImage.url": { $exists: true, $nin: [null, ""] },
        })
          .sort({ isRecommended: -1, createdAt: -1 })
          .select("coverImage")
          .lean()

        dest.coverImage = sample?.coverImage || null
        stem = dest.coverImage?.url ? urlStem(dest.coverImage.url) : ""
      }

      if (stem && !usedStems.has(stem)) {
        usedStems.add(stem)
        continue
      }

      dest.coverImage = await getTripCoverImage(
        {
          destination: dest.destination,
          title: dest.title,
          tags: dest.tags,
          highlights: dest.highlights,
        },
        { excludeStems: usedStems },
      )

      const finalStem = dest.coverImage?.url ? urlStem(dest.coverImage.url) : ""
      if (finalStem) usedStems.add(finalStem)
    }

    res.status(200).json({
      success: true,
      count: processedDestinations.length,
      data: processedDestinations,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Approximate client location from public IP (when browser GPS is coarse)
// @route   GET /api/recommendations/nearby/client-location
// @access  Public
export const getClientIpLocation = async (req, res) => {
  const location = await geolocateClientIp(req)
  if (!location) {
    return res.status(503).json({
      success: false,
      message: "Could not determine location from IP (local dev or unavailable).",
    })
  }
  res.status(200).json({ success: true, data: location })
}

// @desc    Nearby place recommendations from user coordinates
// @route   GET /api/recommendations/nearby?lat=&lng=&type=restaurant&limit=8
// @access  Public
export const getNearbyRecommendations = async (req, res, next) => {
  try {
    const query = req.query || {}
    const body = req.body || {}
    const lat = query.lat ?? query.latitude ?? body.lat ?? body.latitude
    const lng = query.lng ?? query.longitude ?? body.lng ?? body.longitude
    const type = query.type ?? body.type
    const limit = query.limit ?? body.limit
    const destination = query.destination ?? body.destination
    const locationSource = query.locationSource ?? body.locationSource
    const noCache = query.noCache ?? body.noCache

    const source = String(locationSource || "").toLowerCase()
    const isCurrent = source === "current" || source === "gps"

    if (process.env.NODE_ENV !== "production") {
      console.log("[nearby-location] Backend received", {
        latitude: lat,
        longitude: lng,
        locationSource: source,
        destination: isCurrent ? null : destination || null,
      })
    }

    const result = await getNearbyPlaces({
      latitude: lat,
      longitude: lng,
      destination: isCurrent ? undefined : destination,
      locationSource: source || undefined,
      type,
      limit,
      noCache: noCache === "1" || noCache === "true",
    })

    res.status(200).json({
      success: true,
      demo: result.demo,
      source: result.source,
      locationSource: result.locationSource,
      locationSourceLabel: result.locationSourceLabel,
      requestCoordinates: result.requestCoordinates,
      googlePlacesCoordinates: result.googlePlacesCoordinates,
      warning: result.warning || undefined,
      location: result.location,
      category: result.category,
      count: result.count,
      data: result.data,
    })
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    next(error)
  }
}

// @desc    Nearby recommendation categories (restaurants, ATMs, etc.)
// @route   GET /api/recommendations/nearby/categories
// @access  Public
export const getNearbyCategories = async (_req, res) => {
  res.status(200).json({
    success: true,
    data: listNearbyCategories(),
  })
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
      data: similar.map((doc) => mergeBudgetIntoResponse(doc)),
    })
  } catch (error) {
    next(error)
  }
}
