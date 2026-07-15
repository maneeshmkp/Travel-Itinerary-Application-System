import mongoose from "mongoose"
import Itinerary from "../models/Itinerary.js"
import Day from "../models/Day.js"
import Activity from "../models/Activity.js"
import User from "../models/User.js"
import { validationResult } from "express-validator"
import { mergeBudgetIntoResponse, persistItineraryBudgetTotals } from "../utils/budgetCalculations.js"
import { buildActivityCreatePayload } from "../utils/activityPayload.js"
import { attachCoverImageToItinerary, refreshTripCoverImage } from "../services/tripImageService.js"
import { buildItineraryPlaceImages } from "../services/placeImageService.js"
import { generateItineraryPdfBuffer, safeFilename } from "../services/itineraryPdfService.js"
import { geocodeActivityFields } from "../services/activityGeocodingService.js"
import { optimizeItineraryDays } from "../utils/itineraryOptimizer.js"
import { applyActivitySkipAndReflow } from "../utils/scheduleReflow.js"
import {
  buildCollaborationMeta,
  canEditItinerary,
  generateCollaborateToken,
  isItineraryCollaborator,
  isItineraryOwner,
  userIdString,
} from "../utils/itineraryAccess.js"
import {
  notifyTripCreated,
  notifyTripUpdated,
  notifyCollaboratorJoined,
} from "../services/notifications/notificationTriggers.js"
import { syncTripCalendarsForUser } from "../services/calendar/calendarSyncService.js"
import { publishAsync, DOMAIN_EVENTS } from "../events/index.js"
import { getTenantContext } from "../utils/tenantScope.js"
import {
  browseItineraryVisibilityFilter,
  canViewItineraryInBrowse,
  withBrowseItineraryScope,
} from "../utils/itineraryVisibility.js"

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

    const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
    const list = await withCache(
      RedisKeys.searchAutocomplete(stableHash(raw.toLowerCase())),
      TTL.SEARCH,
      async () => {
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

        return [...suggestions].slice(0, 8)
      },
    )

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

    // Include platform catalog (createdBy System) + caller's tenant/own trips.
    // Tenant ALS alone would hide legacy seed rows with tenantId=null.
    andParts.push(browseItineraryVisibilityFilter(req.user, getTenantContext()?.tenantId))

    const query =
      andParts.length === 1 ? andParts[0] : { $and: andParts }

    const skip = (page - 1) * limit
    const [itineraries, total] = await withBrowseItineraryScope(req.user, async () =>
      Promise.all([
        Itinerary.find(query)
          .select(
            "title destination numberOfNights totalDays description budget totalBudget costPerDay tags highlights isRecommended coverImage imageUrl startDate ownerId createdBy createdAt updatedAt",
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number.parseInt(limit))
          .lean(),
        Itinerary.countDocuments(query),
      ]),
    )

    res.status(200).json({
      success: true,
      count: itineraries.length,
      total,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        pages: Math.ceil(total / limit) || 1,
      },
      data: itineraries.map((doc) => mergeBudgetIntoResponse(doc)),
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
    const itinerary = await withBrowseItineraryScope(req.user, () =>
      Itinerary.findById(req.params.id)
        .select("+collaborateToken")
        .populate({
          path: "days",
          populate: {
            path: "activities",
            model: "Activity",
          },
        })
        .populate("ownerId", "name email")
        .populate("collaborators.userId", "name email"),
    )

    if (!itinerary || !canViewItineraryInBrowse(itinerary, req.user, getTenantContext()?.tenantId)) {
      return res.status(404).json({
        success: false,
        error: "Itinerary not found",
      })
    }

    if (!itinerary.coverImage?.url) {
      await attachCoverImageToItinerary(itinerary)
    }

    const data = mergeBudgetIntoResponse(itinerary)
    data.placeImages = buildItineraryPlaceImages(itinerary)

    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")
    data.collaboration = buildCollaborationMeta(itinerary, req.user, frontendBase)

    res.status(200).json({
      success: true,
      data,
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
          const { activity: geocodedActivity } = await geocodeActivityFields(activityData, {
            destination,
          })
          const activity = await Activity.create(buildActivityCreatePayload(geocodedActivity))
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
    const ownerId = req.user?._id || req.user?.id || null
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
      ownerId,
      createdBy: ownerId ? String(ownerId) : "System",
    })

    await persistItineraryBudgetTotals(itinerary._id)

    const populatedItinerary = await Itinerary.findById(itinerary._id).populate({
      path: "days",
      populate: {
        path: "activities",
        model: "Activity",
      },
    })

    await attachCoverImageToItinerary(populatedItinerary)

    const withCover = await Itinerary.findById(itinerary._id).populate({
      path: "days",
      populate: {
        path: "activities",
        model: "Activity",
      },
    })

    res.status(201).json({
      success: true,
      data: mergeBudgetIntoResponse(withCover),
    })

    if (ownerId) {
      notifyTripCreated(ownerId, withCover).catch((err) =>
        console.error("Trip created notification:", err.message),
      )
      syncTripCalendarsForUser(ownerId, withCover._id).catch((err) =>
        console.error("Calendar sync after create:", err.message),
      )
      publishAsync(
        DOMAIN_EVENTS.TRIP_CREATED,
        {
          userId: String(ownerId),
          tripId: String(withCover._id),
          id: String(withCover._id),
          title: withCover.title,
          destination: withCover.destination,
          skipEventNotification: true,
        },
        { source: "itineraryController.create", userId: String(ownerId), dedupeKey: `trip:create:${withCover._id}` },
      )
    }
  } catch (error) {
    next(error)
  }
}

// @desc    Update itinerary (owner or collaborators)
// @route   PUT /api/itineraries/:id
// @access  Private (collaborators)
export const updateItinerary = async (req, res, next) => {
  try {
    const existing = await Itinerary.findById(req.params.id)

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Itinerary not found",
      })
    }

    if (!canEditItinerary(existing, req.user)) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to edit this itinerary",
      })
    }

    const allowed = [
      "title",
      "description",
      "bestTimeToVisit",
      "budget",
      "highlights",
      "tags",
      "numberOfNights",
    ]
    const payload = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) payload[key] = req.body[key]
    }

    if (payload.numberOfNights != null) {
      payload.totalDays = Number(payload.numberOfNights) + 1
    }

    await Itinerary.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })

    await persistItineraryBudgetTotals(req.params.id)

    const itinerary = await Itinerary.findById(req.params.id)
      .select("+collaborateToken")
      .populate({
        path: "days",
        populate: {
          path: "activities",
          model: "Activity",
        },
      })
      .populate("ownerId", "name email")
      .populate("collaborators.userId", "name email")

    const data = mergeBudgetIntoResponse(itinerary)
    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")
    data.collaboration = buildCollaborationMeta(itinerary, req.user, frontendBase)

    res.status(200).json({
      success: true,
      data,
    })

    notifyTripUpdated(req.user._id, itinerary).catch((err) =>
      console.error("Trip updated notification:", err.message),
    )
    syncTripCalendarsForUser(req.user._id, itinerary._id).catch((err) =>
      console.error("Calendar sync after update:", err.message),
    )
    import("../utils/cacheHelpers.js")
      .then(({ invalidateTripCaches }) =>
        invalidateTripCaches(String(req.user._id), String(itinerary._id)),
      )
      .catch(() => {})

    publishAsync(
      DOMAIN_EVENTS.TRIP_UPDATED,
      {
        userId: String(req.user._id),
        tripId: String(itinerary._id),
        id: String(itinerary._id),
        title: itinerary.title,
        skipEventNotification: true,
      },
      { source: "itineraryController.update", userId: String(req.user._id) },
    )
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

    // Delete associated days and activities in bulk (avoid N+1 Day.findById)
    const dayIds = (itinerary.days || []).filter(Boolean)
    if (dayIds.length > 0) {
      const days = await Day.find({ _id: { $in: dayIds } }).select("activities").lean()
      const activityIds = days.flatMap((d) => d.activities || [])
      if (activityIds.length > 0) {
        await Activity.deleteMany({ _id: { $in: activityIds } })
      }
      await Day.deleteMany({ _id: { $in: dayIds } })
    }

    // Delete itinerary
    const deletedId = String(itinerary._id)
    const ownerId = itinerary.ownerId ? String(itinerary.ownerId) : req.user?._id ? String(req.user._id) : null
    await Itinerary.findByIdAndDelete(req.params.id)

    await User.updateMany(
      { savedItineraries: req.params.id },
      { $pull: { savedItineraries: req.params.id } },
    )

    res.status(200).json({
      success: true,
      data: {},
    })

    if (ownerId) {
      publishAsync(
        DOMAIN_EVENTS.TRIP_DELETED,
        { userId: ownerId, tripId: deletedId, id: deletedId },
        { source: "itineraryController.delete", userId: ownerId, dedupeKey: `trip:delete:${deletedId}` },
      )
    }
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
    const user = await User.findById(req.user.id || req.user._id).select("savedItineraries").lean()

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" })
    }

    const ids = (user.savedItineraries || []).filter(Boolean)
    if (ids.length === 0) {
      return res.status(200).json({ success: true, data: [] })
    }

    // List cards only need summary fields + cached budget (same as getItineraries)
    const docs = await Itinerary.find({ _id: { $in: ids } })
      .select(
        "title destination numberOfNights totalDays description budget totalBudget costPerDay tags highlights isRecommended coverImage imageUrl startDate ownerId createdAt updatedAt",
      )
      .lean()

    const byId = new Map(docs.map((d) => [String(d._id), d]))
    const data = ids
      .map((id) => byId.get(String(id)))
      .filter((doc) => doc != null && doc._id)
      .map((doc) => mergeBudgetIntoResponse(doc))

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

// @desc    Refresh trip cover image from destination/activities
// @route   POST /api/itineraries/:id/refresh-cover-image
// @access  Public
export const refreshItineraryCoverImage = async (req, res, next) => {
  try {
    const result = await refreshTripCoverImage(req.params.id)
    const itinerary = await Itinerary.findById(req.params.id).populate({
      path: "days",
      populate: { path: "activities", model: "Activity" },
    })

    const data = mergeBudgetIntoResponse(itinerary)
    data.placeImages = buildItineraryPlaceImages(itinerary)

    res.status(200).json({
      success: true,
      data: {
        coverImage: result.coverImage,
        itinerary: data,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Reorder activities per day to minimize travel distance (uses coordinates)
// @route   POST /api/itineraries/:id/optimize
// @access  Private (collaborators)
export const optimizeItinerary = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate({
      path: "days",
      populate: { path: "activities", model: "Activity" },
    })

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: "Itinerary not found",
      })
    }

    if (!canEditItinerary(itinerary, req.user)) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to edit this itinerary",
      })
    }

    const daysPlain = (itinerary.days || []).map((day) => ({
      _id: day._id,
      dayNumber: day.dayNumber,
      activities: (day.activities || []).map((a) => (a.toObject ? a.toObject() : a)),
    }))

    const { days: optimizedDays, stats } = optimizeItineraryDays(daysPlain)

    if (stats.geocodedActivities < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Not enough activity coordinates to optimize. Save or backfill geocoded activities first, then try again.",
        stats,
      })
    }

    for (const dayResult of optimizedDays) {
      if (!dayResult.dayId || !dayResult.reordered) continue
      const activityIds = dayResult.activities
        .map((a) => a._id)
        .filter(Boolean)
      await Day.findByIdAndUpdate(dayResult.dayId, { activities: activityIds })
    }

    const updated = await Itinerary.findById(itinerary._id).populate({
      path: "days",
      populate: { path: "activities", model: "Activity" },
    })

    res.status(200).json({
      success: true,
      message:
        stats.daysOptimized > 0
          ? `Optimized ${stats.daysOptimized} day(s); saved ~${stats.savedKm} km between stops.`
          : "Trip is already in an efficient order for the current coordinates.",
      stats,
      data: mergeBudgetIntoResponse(updated),
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Skip or restore an activity and reflow the day's schedule
// @route   POST /api/itineraries/:id/activities/:activityId/skip
// @access  Private (owner / collaborator)
export const adjustActivitySchedule = async (req, res, next) => {
  try {
    const { id, activityId } = req.params
    const skipped = req.body?.skipped !== false

    const itinerary = await Itinerary.findById(id).populate({
      path: "days",
      populate: { path: "activities", model: "Activity" },
    })

    if (!itinerary) {
      return res.status(404).json({ success: false, error: "Itinerary not found" })
    }

    if (!canEditItinerary(itinerary, req.user)) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to edit this itinerary",
      })
    }

    let targetDay = null
    for (const day of itinerary.days || []) {
      const hit = (day.activities || []).find((a) => String(a._id) === String(activityId))
      if (hit) {
        targetDay = day
        break
      }
    }

    if (!targetDay) {
      return res.status(404).json({ success: false, error: "Activity not found in this itinerary" })
    }

    const activitiesPlain = (targetDay.activities || []).map((a) =>
      a.toObject ? a.toObject() : a,
    )

    const { activities: reflowed, updates, shifted, skippedActivity } = applyActivitySkipAndReflow(
      activitiesPlain,
      activityId,
      skipped,
    )

    await Activity.findByIdAndUpdate(activityId, { skipped })

    for (const change of updates) {
      await Activity.findByIdAndUpdate(change.activityId, { time: change.time })
    }

    await persistItineraryBudgetTotals(itinerary._id)

    const updated = await Itinerary.findById(itinerary._id).populate({
      path: "days",
      populate: { path: "activities", model: "Activity" },
    })

    const message = skipped
      ? shifted > 0
        ? `Skipped "${skippedActivity.name}" — ${shifted} later activit${shifted === 1 ? "y" : "ies"} moved up.`
        : `Skipped "${skippedActivity.name}".`
      : shifted > 0
        ? `Restored "${skippedActivity.name}" — schedule reflowed (${shifted} time${shifted === 1 ? "" : "s"} updated).`
        : `Restored "${skippedActivity.name}".`

    res.status(200).json({
      success: true,
      message,
      skipped,
      shifted,
      updates,
      data: mergeBudgetIntoResponse(updated),
    })
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    next(error)
  }
}

// @desc    Download itinerary as PDF
// @route   GET /api/itineraries/:id/pdf
// @access  Public
export const exportItineraryPdf = async (req, res, next) => {
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

    await persistItineraryBudgetTotals(itinerary._id)
    const populated = await Itinerary.findById(itinerary._id).populate({
      path: "days",
      populate: { path: "activities", model: "Activity" },
    })
    const data = mergeBudgetIntoResponse(populated)

    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")
    const publicUrl = `${frontendBase}/itineraries/${itinerary._id}`
    const pdfBuffer = await generateItineraryPdfBuffer(data, { publicUrl })

    const filename = `${safeFilename(itinerary.title)}.pdf`
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Length", pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (error) {
    next(error)
  }
}

// @desc    Enable collaborative editing and get invite link
// @route   POST /api/itineraries/:id/collaborate/enable
// @access  Private
export const enableCollaboration = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).select("+collaborateToken")

    if (!itinerary) {
      return res.status(404).json({ success: false, error: "Itinerary not found" })
    }

    const userId = req.user._id || req.user.id

    if (itinerary.ownerId) {
      if (!isItineraryOwner(itinerary, userId)) {
        return res.status(403).json({
          success: false,
          error: "Only the trip owner can enable collaboration",
        })
      }
    } else {
      itinerary.ownerId = userId
    }

    if (!itinerary.collaborateToken) {
      itinerary.collaborateToken = generateCollaborateToken()
    }
    itinerary.collaborateEnabled = true
    await itinerary.save()

    const populated = await Itinerary.findById(itinerary._id)
      .select("+collaborateToken")
      .populate("ownerId", "name email")
      .populate("collaborators.userId", "name email")

    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")
    const collaboration = buildCollaborationMeta(populated, req.user, frontendBase)

    res.status(200).json({
      success: true,
      message: "Collaborative editing enabled. Share the link with your travel companions.",
      data: { collaboration },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Join an itinerary as a collaborator via invite token
// @route   POST /api/itineraries/:id/collaborate/join
// @access  Private
export const joinCollaboration = async (req, res, next) => {
  try {
    const token = String(req.body?.token || req.query?.token || "").trim()
    if (!token) {
      return res.status(400).json({ success: false, error: "Collaboration token is required" })
    }

    const itinerary = await Itinerary.findById(req.params.id).select("+collaborateToken")

    if (!itinerary) {
      return res.status(404).json({ success: false, error: "Itinerary not found" })
    }

    if (!itinerary.collaborateEnabled || !itinerary.collaborateToken) {
      return res.status(400).json({
        success: false,
        error: "Collaborative editing is not enabled for this trip",
      })
    }

    if (itinerary.collaborateToken !== token) {
      return res.status(403).json({ success: false, error: "Invalid collaboration link" })
    }

    const userId = req.user._id || req.user.id
    const uid = userIdString(userId)

    if (isItineraryOwner(itinerary, uid)) {
      return res.status(200).json({
        success: true,
        message: "You already own this itinerary",
        data: { alreadyMember: true },
      })
    }

    if (isItineraryCollaborator(itinerary, uid)) {
      return res.status(200).json({
        success: true,
        message: "You are already a collaborator on this trip",
        data: { alreadyMember: true },
      })
    }

    itinerary.collaborators.push({ userId, addedAt: new Date() })
    await itinerary.save()

    const populated = await Itinerary.findById(itinerary._id)
      .select("+collaborateToken")
      .populate("ownerId", "name email")
      .populate("collaborators.userId", "name email")

    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")
    const collaboration = buildCollaborationMeta(populated, req.user, frontendBase)

    res.status(200).json({
      success: true,
      message: "You can now edit this itinerary with your group.",
      data: { collaboration },
    })

    const ownerId = populated.ownerId?._id || populated.ownerId
    if (ownerId && !isItineraryOwner(populated, uid)) {
      notifyCollaboratorJoined(ownerId, req.user, populated).catch((err) =>
        console.error("Collaborator joined notification:", err.message),
      )
    }
  } catch (error) {
    next(error)
  }
}
