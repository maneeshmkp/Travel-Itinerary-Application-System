import Itinerary from "../models/Itinerary.js"
import Day from "../models/Day.js"
import Activity from "../models/Activity.js"
import { validationResult } from "express-validator"

// @desc    Get all itineraries
// @route   GET /api/itineraries
// @access  Public
export const getItineraries = async (req, res, next) => {
  try {
    const { destination, nights, tags, page = 1, limit = 10 } = req.query

    // Build query
    const query = {}

    if (destination) {
      query.destination = { $regex: destination, $options: "i" }
    }

    if (nights) {
      query.numberOfNights = Number.parseInt(nights)
    }

    if (tags) {
      const tagArray = tags.split(",")
      query.tags = { $in: tagArray }
    }

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

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    next(error)
  }
}
