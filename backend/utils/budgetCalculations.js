import Itinerary from "../models/Itinerary.js"
import { DEFAULT_CURRENCY, normalizeCurrency } from "../constants/currencies.js"

/**
 * @param {unknown} value
 * @returns {number} Non-negative cost rounded to 2 decimals
 */
export function normalizeCost(value) {
  if (value === null || value === undefined || value === "") return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

function itineraryHasDeepActivityData(itinerary) {
  const days = Array.isArray(itinerary.days) ? itinerary.days : []
  if (days.length === 0) return false
  return days.every((day) => {
    const acts = Array.isArray(day.activities) ? day.activities : []
    if (acts.length === 0) return true
    const first = acts[0]
    return first && typeof first === "object" && typeof first.name === "string"
  })
}

/**
 * @param {object} itinerary - Mongoose doc or plain object with days[].activities[] (populated activity docs or empty)
 * @returns {{
 *   totalBudget: number,
 *   costPerDay: number,
 *   currency: string,
 *   totalDays: number,
 *   plannedRange: { min: number|null, max: number|null },
 *   byDay: Array<{ dayId: *, dayNumber: number, dayLabel: string, dayTotal: number, activities: Array<{ _id: *, name: string, cost: number }> }>
 * }}
 */
export function computeBudgetInsight(itinerary) {
  const currency = normalizeCurrency(itinerary.budget?.currency, DEFAULT_CURRENCY)
  const days = Array.isArray(itinerary.days) ? itinerary.days : []
  const totalDays = Math.max(1, Number(itinerary.totalDays) || days.length || 1)

  if (!days.length || !itineraryHasDeepActivityData(itinerary)) {
    return {
      totalBudget: normalizeCost(itinerary.totalBudget),
      costPerDay: normalizeCost(itinerary.costPerDay),
      currency,
      totalDays,
      plannedRange: {
        min: itinerary.budget?.min ?? null,
        max: itinerary.budget?.max ?? null,
      },
      byDay: [],
    }
  }

  let totalBudget = 0
  const byDay = days.map((day) => {
    const activities = Array.isArray(day.activities) ? day.activities : []
    let dayTotal = 0
    const activityBreakdown = activities.map((act) => {
      const cost = act?.skipped ? 0 : normalizeCost(act?.cost)
      dayTotal += cost
      return {
        _id: act._id,
        name: act.name,
        cost,
        skipped: Boolean(act?.skipped),
      }
    })
    totalBudget += dayTotal
    return {
      dayId: day._id,
      dayNumber: day.dayNumber,
      dayLabel: day.dayLabel || "",
      dayTotal: Math.round(dayTotal * 100) / 100,
      activities: activityBreakdown,
    }
  })

  totalBudget = Math.round(totalBudget * 100) / 100
  const costPerDay = totalDays > 0 ? Math.round((totalBudget / totalDays) * 100) / 100 : 0

  return {
    totalBudget,
    costPerDay,
    currency,
    totalDays,
    plannedRange: {
      min: itinerary.budget?.min ?? null,
      max: itinerary.budget?.max ?? null,
    },
    byDay,
  }
}

/**
 * Persist denormalized totals on the itinerary document.
 * @param {import("mongoose").Types.ObjectId|string} itineraryId
 * @returns {Promise<ReturnType<typeof computeBudgetInsight>|null>}
 */
export async function persistItineraryBudgetTotals(itineraryId) {
  const doc = await Itinerary.findById(itineraryId).populate({
    path: "days",
    populate: { path: "activities", model: "Activity" },
  })
  if (!doc) return null
  const insight = computeBudgetInsight(doc)
  await Itinerary.updateOne(
    { _id: itineraryId },
    { $set: { totalBudget: insight.totalBudget, costPerDay: insight.costPerDay } },
  )
  return insight
}

/**
 * Plain JSON payload for API clients (includes refreshed totals + breakdown).
 * @param {import("mongoose").Document|object} itineraryDoc
 */
export function mergeBudgetIntoResponse(itineraryDoc) {
  const plain = itineraryDoc?.toObject?.({ virtuals: false }) ?? { ...itineraryDoc }
  const insight = computeBudgetInsight(itineraryDoc)
  return {
    ...plain,
    totalBudget: insight.totalBudget,
    costPerDay: insight.costPerDay,
    budgetInsight: insight,
  }
}
