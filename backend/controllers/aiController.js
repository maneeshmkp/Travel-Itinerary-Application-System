import {
  aiEnrichDescriptions,
  aiSuggestDayActivities,
  aiSuggestHighlights,
  aiTripSummary,
  aiGeneratePersonalizedItinerary,
  aiBookingQuery,
  aiDocumentQuery,
  aiRiskQuery,
  aiFlightQuery,
  aiBudgetQuery,
} from "../services/aiService.js"
import { getBookingsForAi } from "../services/bookings/bookingService.js"
import { getDocumentsForAi, getMissingDocuments } from "../services/documents/documentService.js"
import { getRisksForAi } from "../services/risk/riskService.js"
import { getFlightsForAi } from "../services/flightTracking/flightTrackingService.js"
import { getBudgetForAi } from "../services/budgetOptimizer/budgetOptimizerService.js"
import { normalizeGeneratedItinerary } from "../utils/aiItineraryNormalizer.js"
import { ITINERARY_TAG_OPTIONS } from "../constants/itineraryTags.js"
import { DEFAULT_CURRENCY, normalizeCurrency } from "../constants/currencies.js"
import { geocodeItineraryActivities } from "../services/activityGeocodingService.js"

function badRequest(res, message) {
  return res.status(400).json({ success: false, message })
}

function aiErrorResponse(res, err) {
  const status =
    Number.isInteger(err?.clientStatus) && err.clientStatus >= 400 && err.clientStatus < 600
      ? err.clientStatus
      : 503
  return res.status(status).json({
    success: false,
    message: err?.message || "AI request failed",
  })
}

/** POST /api/ai/enrich-descriptions — body: { itinerary: { title, destination, days: [{ dayNumber, activities: [{ name, description }] }] } } */
export const enrichDescriptions = async (req, res) => {
  try {
    const itinerary = req.body?.itinerary
    if (!itinerary || typeof itinerary !== "object") {
      return badRequest(res, "Missing itinerary object")
    }
    if (!String(itinerary.destination || "").trim()) {
      return badRequest(res, "Destination is required")
    }

    const result = await aiEnrichDescriptions(itinerary)
    res.status(200).json({
      success: true,
      demo: Boolean(result.demo),
      data: {
        description: result.description,
        days: result.days,
      },
    })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/ai/suggest-day — body: { destination, dayNumber, hotel?, tags?, existingActivities? } */
export const suggestDay = async (req, res) => {
  try {
    const { destination, dayNumber, hotel, tags, existingActivities, dayLabel } = req.body || {}
    if (!String(destination || "").trim()) {
      return badRequest(res, "destination is required")
    }
    const dayNum = Number(dayNumber)
    if (!Number.isFinite(dayNum) || dayNum < 1) {
      return badRequest(res, "dayNumber must be a positive number")
    }

    const result = await aiSuggestDayActivities({
      destination: String(destination).trim(),
      dayNumber: dayNum,
      hotel: hotel || {},
      tags: Array.isArray(tags) ? tags : [],
      existingActivities: existingActivities || [],
      dayLabel: typeof dayLabel === "string" ? dayLabel.trim() : "",
    })

    res.status(200).json({
      success: true,
      demo: Boolean(result.demo),
      data: { activities: result.activities },
    })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/ai/suggest-highlights — body: { itinerary: { title, destination, days: [...] } } */
export const suggestHighlights = async (req, res) => {
  try {
    const itinerary = req.body?.itinerary
    if (!itinerary || typeof itinerary !== "object") {
      return badRequest(res, "Missing itinerary object")
    }
    if (!String(itinerary.destination || "").trim()) {
      return badRequest(res, "Destination is required")
    }

    const result = await aiSuggestHighlights(itinerary)
    res.status(200).json({
      success: true,
      demo: Boolean(result.demo),
      data: { highlights: result.highlights },
    })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/ai/trip-summary — body: { itinerary: full or partial snapshot } */
export const tripSummary = async (req, res) => {
  try {
    const itinerary = req.body?.itinerary
    if (!itinerary || typeof itinerary !== "object") {
      return badRequest(res, "Missing itinerary object")
    }

    const result = await aiTripSummary(itinerary)
    res.status(200).json({
      success: true,
      demo: Boolean(result.demo),
      data: { summary: result.summary },
    })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/ai/itinerary — body: { budget, travelStyle, interests, destination?, numberOfNights? } */
export const generatePersonalizedItinerary = async (req, res) => {
  try {
    const { budget, travelStyle, interests, destination, numberOfNights } = req.body || {}

    if (!budget || typeof budget !== "object") {
      return badRequest(res, "budget object is required (min, max, currency)")
    }
    const budgetMin = Number(budget.min)
    const budgetMax = Number(budget.max)
    if (!Number.isFinite(budgetMin) || !Number.isFinite(budgetMax) || budgetMin < 0 || budgetMax < budgetMin) {
      return badRequest(res, "budget.min and budget.max must be valid numbers with max >= min")
    }

    const style = String(travelStyle || "").trim().toLowerCase()
    if (!style || !ITINERARY_TAG_OPTIONS.includes(style)) {
      return badRequest(res, `travelStyle must be one of: ${ITINERARY_TAG_OPTIONS.join(", ")}`)
    }

    const interestList = Array.isArray(interests)
      ? interests.map((x) => String(x).trim()).filter(Boolean)
      : String(interests || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)

    if (interestList.length === 0) {
      return badRequest(res, "At least one interest is required")
    }

    const nights = numberOfNights != null ? Number(numberOfNights) : 3
    if (!Number.isFinite(nights) || nights < 1 || nights > 14) {
      return badRequest(res, "numberOfNights must be between 1 and 14")
    }

    const result = await aiGeneratePersonalizedItinerary({
      budget: {
        min: budgetMin,
        max: budgetMax,
        currency: normalizeCurrency(budget.currency, DEFAULT_CURRENCY),
      },
      travelStyle: style,
      interests: interestList,
      destination: destination ? String(destination).trim() : "",
      numberOfNights: nights,
    })

    const itinerary = normalizeGeneratedItinerary(result.itinerary, {
      budget: { min: budgetMin, max: budgetMax, currency: budget.currency },
      travelStyle: style,
      interests: interestList,
      destination,
      numberOfNights: nights,
    })

    const { itinerary: geocodedItinerary, stats: geocodingStats } =
      await geocodeItineraryActivities(itinerary)

    res.status(200).json({
      success: true,
      demo: Boolean(result.demo),
      busyFallback: Boolean(result.busyFallback),
      data: { itinerary: geocodedItinerary, geocoding: geocodingStats },
    })

    if (req.user?._id) {
      const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
      publishAsync(
        DOMAIN_EVENTS.AI_ITINERARY_GENERATED,
        {
          userId: String(req.user._id),
          destination: destination ? String(destination).trim() : "",
          travelStyle: style,
          demo: Boolean(result.demo),
        },
        { source: "aiController.generatePersonalizedItinerary", userId: String(req.user._id) },
      )
    }
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/ai/booking-query — body: { question, tripId? } */
export const bookingQuery = async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim()
    const tripId = req.body?.tripId || null
    const bookings = await getBookingsForAi(req.user._id, { tripId, query: question })
    const result = await aiBookingQuery(question, bookings)
    res.status(200).json({ success: true, demo: Boolean(result.demo), data: result })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/ai/document-query — body: { question, tripId? } */
export const documentQuery = async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim()
    const tripId = req.body?.tripId || null
    const documents = await getDocumentsForAi(req.user._id, { tripId, query: question })
    let missing = null
    if (tripId) {
      try {
        missing = await getMissingDocuments(req.user._id, tripId)
      } catch {
        missing = null
      }
    }
    const result = await aiDocumentQuery(question, documents, missing)
    res.status(200).json({ success: true, demo: Boolean(result.demo), data: result })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/ai/risk-query — body: { question, tripId } */
export const riskQuery = async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim()
    const tripId = req.body?.tripId
    if (!tripId) return badRequest(res, "tripId is required")
    const context = await getRisksForAi(req.user._id, tripId)
    const result = await aiRiskQuery(question, context)
    res.status(200).json({ success: true, demo: Boolean(result.demo), data: result })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/ai/flight-query — body: { question, tripId } */
export const flightQuery = async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim()
    const tripId = req.body?.tripId
    if (!tripId) return badRequest(res, "tripId is required")
    const flights = await getFlightsForAi(req.user._id, tripId)
    const result = await aiFlightQuery(question, flights)
    res.status(200).json({ success: true, demo: Boolean(result.demo), data: result })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/ai/budget-query — body: { question, tripId } */
export const budgetQuery = async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim()
    const tripId = req.body?.tripId
    if (!tripId) return badRequest(res, "tripId is required")
    const context = await getBudgetForAi(req.user._id, tripId)
    const result = await aiBudgetQuery(question, context)
    res.status(200).json({ success: true, demo: Boolean(result.demo), data: result })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}
