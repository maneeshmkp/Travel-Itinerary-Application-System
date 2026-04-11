import {
  aiEnrichDescriptions,
  aiSuggestDayActivities,
  aiSuggestHighlights,
  aiTripSummary,
} from "../services/aiService.js"

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
