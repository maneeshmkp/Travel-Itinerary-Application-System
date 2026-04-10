import mongoose from "mongoose"
import Itinerary from "../models/Itinerary.js"
import Day from "../models/Day.js"
import Activity from "../models/Activity.js"
import User from "../models/User.js"
import { validationResult } from "express-validator"

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Build $or conditions on Itinerary for full-text-style search (days/activities are refs, not embedded). */
async function buildItinerarySearchOr(searchTrimmed) {
  const pattern = escapeRegex(searchTrimmed)
  const rx = new RegExp(pattern, "i")

  const activityIds = await Activity.find({
    $or: [{ name: rx }, { description: rx }, { location: rx }],
  }).distinct("_id")

  const dayOr = [
    { "hotel.name": rx },
    { "hotel.location": rx },
    { "transfers.from": rx },
    { "transfers.to": rx },
  ]
  if (activityIds.length > 0) {
    dayOr.push({ activities: { $in: activityIds } })
  }

  const dayIds = await Day.find({ $or: dayOr }).distinct("_id")

  const itineraryOr = [
    { title: rx },
    { destination: rx },
    { tags: rx },
    { highlights: rx },
  ]
  if (dayIds.length > 0) {
    itineraryOr.push({ days: { $in: dayIds } })
  }

  return itineraryOr
}

// @desc    Search autocomplete suggestions
// @route   GET /api/itineraries/suggestions
// @access  Public
export const getSearchSuggestions = async (req, res, next) => {
  try {
    const raw = (req.query.search || req.query.q || "").trim()
    if (raw.length < 2) {
      return res.status(200).json({ success: true, data: [] })
    }

    const pattern = escapeRegex(raw)
    const rx = new RegExp(pattern, "i")

    const [activityLabels, itineraries] = await Promise.all([
      Activity.find({ name: rx }).select("name").limit(12).lean(),
      Itinerary.find({
        $or: [{ title: rx }, { destination: rx }, { tags: rx }],
      })
        .select("title destination tags")
        .limit(24)
        .lean(),
    ])

    const suggestions = new Set()
    for (const a of activityLabels) {
      if (a.name) suggestions.add(a.name)
    }
    for (const it of itineraries) {
      if (it.title && rx.test(it.title)) suggestions.add(it.title)
      if (it.destination && rx.test(it.destination)) suggestions.add(it.destination)
      for (const t of it.tags || []) {
        if (t && rx.test(t)) suggestions.add(t)
      }
    }

    const list = [...suggestions].slice(0, 8)
    res.status(200).json({ success: true, data: list })
  } catch (error) {
    next(error)
  }
}

// @desc    Get all itineraries
// @route   GET /api/itineraries
// @access  Public
export const getItineraries = async (req, res, next) => {
  try {
    const { destination, nights, tags, page = 1, limit = 10, search } = req.query

    const andParts = []

    if (destination) {
      andParts.push({ destination: { $regex: destination, $options: "i" } })
    }

    if (nights) {
      andParts.push({ numberOfNights: Number.parseInt(nights) })
    }

    if (tags) {
      const tagArray = tags.split(",")
      andParts.push({ tags: { $in: tagArray } })
    }

    const searchTrimmed =
      typeof search === "string" ? search.trim().slice(0, 120) : ""
    if (searchTrimmed) {
      const searchOr = await buildItinerarySearchOr(searchTrimmed)
      andParts.push({ $or: searchOr })
    }

    const query =
      andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0] : { $and: andParts }

    // Execute query with pagination
    const skip = (page - 1) * limit
    const itineraries = await Itinerary.find(query)
      .populate({
        path: "days",
        populate: {
          path: "activities",
          model: "Activity",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Itinerary.countDocuments(query)

    res.status(200).json({
      success: true,
      count: itineraries.length,
      total,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        pages: Math.ceil(total / limit),
      },
      data: itineraries,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get single itinerary
// @route   GET /api/itineraries/:id
// @access  Public
export const getItinerary = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate({
      path: "days",
      populate: {
        path: "activities",
        model: "Activity",
      },
    })

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: "Itinerary not found",
      })
    }

    res.status(200).json({
      success: true,
      data: itinerary,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Create new itinerary
// @route   POST /api/itineraries
// @access  Public
export const createItinerary = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { title, destination, numberOfNights, description, days, budget, bestTimeToVisit, highlights, tags } =
      req.body

    // Create activities first
    const createdDays = []

    for (const dayData of days) {
      // Create activities for this day
      const createdActivities = []

      if (dayData.activities && dayData.activities.length > 0) {
        for (const activityData of dayData.activities) {
          const activity = await Activity.create(activityData)
          createdActivities.push(activity._id)
        }
      }

      // Create day with activity references
      const day = await Day.create({
        ...dayData,
        activities: createdActivities,
      })

      createdDays.push(day._id)
    }

    // Create itinerary with day references
    const itinerary = await Itinerary.create({
      title,
      destination,
      numberOfNights,
      description,
      days: createdDays,
      budget,
      bestTimeToVisit,
      highlights,
      tags,
    })

    // Populate the created itinerary
    const populatedItinerary = await Itinerary.findById(itinerary._id).populate({
      path: "days",
      populate: {
        path: "activities",
        model: "Activity",
      },
    })

    res.status(201).json({
      success: true,
      data: populatedItinerary,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update itinerary
// @route   PUT /api/itineraries/:id
// @access  Public
export const updateItinerary = async (req, res, next) => {
  try {
    let itinerary = await Itinerary.findById(req.params.id)

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: "Itinerary not found",
      })
    }

    itinerary = await Itinerary.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate({
      path: "days",
      populate: {
        path: "activities",
        model: "Activity",
      },
    })

    res.status(200).json({
      success: true,
      data: itinerary,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Delete itinerary
// @route   DELETE /api/itineraries/:id
// @access  Public
export const deleteItinerary = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: "Itinerary not found",
      })
    }

    // Delete associated days and activities
    for (const dayId of itinerary.days) {
      const day = await Day.findById(dayId)
      if (day) {
        // Delete activities
        await Activity.deleteMany({ _id: { $in: day.activities } })
        // Delete day
        await Day.findByIdAndDelete(dayId)
      }
    }

    // Delete itinerary
    await Itinerary.findByIdAndDelete(req.params.id)

    await User.updateMany(
      { savedItineraries: req.params.id },
      { $pull: { savedItineraries: req.params.id } },
    )

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Save itinerary for current user
// @route   POST /api/itineraries/:id/save
// @access  Private
export const saveItinerary = async (req, res) => {
  try {
    const itineraryIdParam = req.params.id?.trim()
    if (!itineraryIdParam || !mongoose.Types.ObjectId.isValid(itineraryIdParam)) {
      return res.status(400).json({ success: false, message: "Invalid itinerary id" })
    }

    const itinerary = await Itinerary.findById(itineraryIdParam)
    if (!itinerary) {
      return res.status(404).json({ success: false, message: "Itinerary not found" })
    }

    const user = await User.findById(req.user.id || req.user._id)
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" })
    }

    if (!Array.isArray(user.savedItineraries)) {
      user.savedItineraries = []
    }

    const itineraryId = itinerary._id
    // ObjectId refs: use .equals(), not Array.includes(string)
    const alreadySaved = user.savedItineraries.some((id) => id.equals(itineraryId))
    if (!alreadySaved) {
      user.savedItineraries.push(itineraryId)
      await user.save()
    }

    res.status(200).json({
      success: true,
      message: "Itinerary saved",
      saved: true,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error saving itinerary",
    })
  }
}

// @desc    Remove itinerary from saved list
// @route   DELETE /api/itineraries/:id/save
// @access  Private
export const unsaveItineraryForUser = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid itinerary id" })
    }

    const user = await User.findById(req.user.id || req.user._id)
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" })
    }

    const targetId = new mongoose.Types.ObjectId(req.params.id)
    const list = Array.isArray(user.savedItineraries) ? user.savedItineraries : []
    user.savedItineraries = list.filter((x) => !x.equals(targetId))
    await user.save()

    res.status(200).json({
      success: true,
      message: "Removed from saved",
      saved: false,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Check if itinerary is saved by current user
// @route   GET /api/itineraries/:id/saved
// @access  Private
export const checkItinerarySaved = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid itinerary id" })
    }

    const user = await User.findById(req.user.id || req.user._id).select("savedItineraries")
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" })
    }

    const targetId = new mongoose.Types.ObjectId(req.params.id)
    const list = Array.isArray(user.savedItineraries) ? user.savedItineraries : []
    const saved = list.some((x) => x.equals(targetId))

    res.status(200).json({
      success: true,
      saved,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    List current user's saved itineraries
// @route   GET /api/itineraries/saved | GET /api/itineraries/saved/mine
// @access  Private
export const getSavedItineraries = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).populate("savedItineraries")

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" })
    }

    const data = (user.savedItineraries || []).filter((doc) => doc != null && doc._id)

    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error loading saved itineraries",
    })
  }
}
