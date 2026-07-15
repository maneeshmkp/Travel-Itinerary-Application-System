import Itinerary from "../../models/Itinerary.js"
import { loadExpenseSummary as loadExpenseSummaryFromService } from "../../services/expenseService.js"
import { computeBudgetInsight } from "../../utils/budgetCalculations.js"

/**
 * Build a compact itinerary snapshot for LLM + tool context.
 */
export function itineraryDocToSnapshot(it) {
  if (!it) return null
  const plain = typeof it.toObject === "function" ? it.toObject() : it
  return {
    id: String(plain._id || plain.id || ""),
    title: plain.title,
    destination: plain.destination,
    numberOfNights: plain.numberOfNights,
    totalDays: plain.totalDays,
    description: plain.description,
    budget: plain.budget,
    budgetInsight: plain.budgetInsight || computeBudgetInsight(plain),
    highlights: plain.highlights || [],
    tags: plain.tags || [],
    days: (plain.days || []).map((d) => ({
      dayNumber: d.dayNumber,
      dayLabel: d.dayLabel || "",
      hotel: d.hotel,
      activities: (d.activities || []).map((a) => ({
        _id: String(a._id || ""),
        name: a.name,
        description: a.description,
        time: a.time,
        location: a.location,
        category: a.category,
        duration: a.duration,
        cost: a.cost,
        latitude: a.latitude,
        longitude: a.longitude,
      })),
    })),
  }
}

export async function loadItinerarySnapshot(itineraryId) {
  if (!itineraryId) return null
  const itinerary = await Itinerary.findById(itineraryId).populate({
    path: "days",
    populate: { path: "activities", model: "Activity" },
  })
  if (!itinerary) return null
  const snap = itineraryDocToSnapshot(itinerary)
  snap.budgetInsight = computeBudgetInsight(itinerary)
  return snap
}

export async function loadExpenseSummary(userId, itineraryId) {
  return loadExpenseSummaryFromService(userId, itineraryId)
}

export function buildCopilotContextBlock({ itinerary, expenses, planDraft }) {
  const parts = []
  if (itinerary) {
    parts.push(`ACTIVE_ITINERARY:\n${JSON.stringify(itinerary, null, 0).slice(0, 12000)}`)
  }
  if (planDraft) {
    parts.push(`IN_PROGRESS_PLAN_DRAFT:\n${JSON.stringify(planDraft)}`)
  }
  if (expenses) {
    parts.push(`TRIP_EXPENSES:\n${JSON.stringify(expenses)}`)
  }
  return parts.join("\n\n")
}
