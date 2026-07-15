import BudgetOptimization from "../../models/BudgetOptimization.js"
import Itinerary from "../../models/Itinerary.js"
import Booking from "../../models/Booking.js"
import Activity from "../../models/Activity.js"
import { getWeatherForecast } from "../weatherService.js"
import { buildExpenseReport } from "../expenseService.js"
import { runRuleBasedOptimization } from "../optimizationEngine.js"
import { analyzeBudgetWithAI } from "../aiBudget/budgetOptimizerAIService.js"
import { canAccessTripData } from "../../utils/itineraryAccess.js"
import { collectActivities } from "../../utils/riskHelpers.js"
import { notifyBudgetOptimization } from "../notifications/notificationTriggers.js"
import {
  buildAnalysisHash,
  buildCategoryBreakdown,
  buildOptimizationCharts,
  computeBudgetHealthScore,
  roundMoney,
  serializeBudgetOptimization,
  sumRecommendationSavings,
} from "../../utils/budgetCalculator.js"

const analysisCache = new Map()
const CACHE_TTL_MS = 15 * 60 * 1000

function throwStatus(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

async function assertTripAccess(userId, tripId) {
  const trip = await Itinerary.findById(tripId)
    .populate({ path: "days", populate: { path: "activities", model: "Activity" } })
    .lean()
  if (!trip) throwStatus("Trip not found", 404)
  if (!canAccessTripData(trip, userId)) throwStatus("Not authorized for this trip", 403)
  return trip
}

async function buildBudgetContext(userId, trip) {
  const startDate = trip.startDate ? new Date(trip.startDate).toISOString().slice(0, 10) : null
  let forecast = []
  try {
    const wx = await getWeatherForecast(trip.destination, trip.totalDays || 5, startDate)
    forecast = (wx?.forecast || []).map((day, idx) => ({ ...day, dayNumber: idx + 1 }))
  } catch {
    forecast = []
  }

  const bookings = await Booking.find({ userId, tripId: trip._id }).lean()
  let expenseReport = null
  try {
    expenseReport = await buildExpenseReport(userId, trip._id)
  } catch {
    expenseReport = null
  }

  const activities = collectActivities(trip).map((a) => ({
    ...a,
    dayNumber: a.dayNumber,
  }))

  const planned = expenseReport?.budget?.planned || trip.budget?.max || 0
  const currency = expenseReport?.currency || trip.budget?.currency || "INR"

  const freeCount = activities.filter((a) => !a.skipped && Number(a.cost) <= 0).length
  const totalActs = activities.filter((a) => !a.skipped).length
  const transportPlanned = expenseReport?.byCategory?.find((c) => c.id === "transport")?.planned || 0
  const totalPlanned = expenseReport?.byCategory?.reduce((s, c) => s + (c.planned || 0), 0) || planned

  return {
    trip,
    destination: trip.destination,
    totalDays: trip.totalDays,
    tags: trip.tags || [],
    budget: trip.budget || {},
    currency,
    currentBudget: roundMoney(planned),
    bookings,
    expenseReport,
    activities,
    weatherForecast: forecast,
    weatherSummary: {
      rainDays: forecast.filter((d) => String(d.condition || "").toLowerCase().includes("rain")).length,
    },
    nearbyHints: {
      restaurants: `local restaurants in ${trip.destination}`,
      hotels: `budget hotels in ${trip.destination}`,
      freeAttractions: `free attractions in ${trip.destination}`,
    },
    factors: {
      freeActivityRatio: totalActs > 0 ? freeCount / totalActs : 0,
      transportShare: totalPlanned > 0 ? transportPlanned / totalPlanned : 0,
    },
  }
}

function buildSavingsByCategory(recommendations = []) {
  const map = {}
  for (const r of recommendations) {
    const cat = r.category || "misc"
    map[cat] = roundMoney((map[cat] || 0) + Number(r.estimatedSavings || 0))
  }
  return map
}

function mergeReport(doc, expenseReport) {
  const serialized = serializeBudgetOptimization(doc)
  if (!expenseReport) return { ...serialized, exists: true }

  return {
    ...serialized,
    expenseIntegration: {
      planned: expenseReport.budget?.planned,
      actual: expenseReport.budget?.actual,
      remaining: expenseReport.budget?.remaining,
      percentUsed: expenseReport.budget?.percentUsed,
      overBudget: expenseReport.budget?.overBudget,
      warningLevel: expenseReport.budget?.warningLevel,
      byCategory: expenseReport.byCategory,
    },
    exists: true,
  }
}

export async function analyzeTripBudget(userId, tripId, { force = false } = {}) {
  const trip = await assertTripAccess(userId, tripId)
  const ctx = await buildBudgetContext(userId, trip)
  const hash = buildAnalysisHash(ctx)

  const cacheKey = `${userId}:${tripId}`
  const cached = analysisCache.get(cacheKey)
  if (!force && cached && cached.hash === hash && Date.now() - cached.at < CACHE_TTL_MS) {
    const existing = await BudgetOptimization.findOne({ userId, tripId }).lean()
    if (existing) return mergeReport(existing, ctx.expenseReport)
  }

  const ruleResult = runRuleBasedOptimization(ctx)
  const aiResult = await analyzeBudgetWithAI(ctx, ruleResult)
  const analyzedAt = new Date()

  const recommendations = aiResult.recommendations || []
  const savingsByCategory = buildSavingsByCategory(recommendations)
  const categoryBreakdown = buildCategoryBreakdown(
    ctx.expenseReport?.byCategory || [],
    savingsByCategory,
  )

  const health = computeBudgetHealthScore({
    percentUsed: ctx.expenseReport?.budget?.percentUsed,
    overBudget: ctx.expenseReport?.budget?.overBudget,
    byCategory: ctx.expenseReport?.byCategory || [],
    activities: ctx.activities,
    transportShare: ctx.factors.transportShare,
    freeActivityRatio: ctx.factors.freeActivityRatio,
  })

  const charts = buildOptimizationCharts({
    currentBudget: aiResult.currentBudget,
    optimizedBudget: aiResult.optimizedBudget,
    potentialSavings: aiResult.potentialSavings,
    categoryBreakdown,
  })

  const doc = await BudgetOptimization.findOneAndUpdate(
    { userId, tripId },
    {
      $set: {
        userId,
        tripId,
        currency: ctx.currency,
        currentBudget: aiResult.currentBudget,
        optimizedBudget: aiResult.optimizedBudget,
        potentialSavings: aiResult.potentialSavings,
        plannedBudget: ctx.expenseReport?.budget?.planned || aiResult.currentBudget,
        actualSpent: ctx.expenseReport?.budget?.actual || 0,
        healthScore: health.score,
        healthLabel: health.label,
        recommendations,
        comparisons: ruleResult.comparisons || [],
        categoryBreakdown,
        updatedItinerary: aiResult.updatedItinerary || [],
        charts,
        reasoning: aiResult.reasoning || [],
        analysisHash: hash,
        generatedByAI: !aiResult.demo,
        demo: Boolean(aiResult.demo),
        analyzedAt,
      },
      $setOnInsert: { acceptedRecommendations: [] },
    },
    { upsert: true, new: true, runValidators: true },
  )

  analysisCache.set(cacheKey, { hash, at: Date.now() })

  if (aiResult.potentialSavings >= 1000) {
    notifyBudgetOptimization(userId, tripId, {
      title: "Budget savings available",
      message: `You can save ${ctx.currency === "INR" ? "₹" : ""}${aiResult.potentialSavings} on this trip.`,
      savings: aiResult.potentialSavings,
      dedupKey: `budget-opt-${tripId}-${hash}`,
    }).catch(() => {})
  }

  if (ctx.expenseReport?.budget?.overBudget) {
    notifyBudgetOptimization(userId, tripId, {
      title: "Budget exceeded",
      message: "Your trip spending has exceeded the planned budget. Review optimization suggestions.",
      savings: 0,
      dedupKey: `budget-exceeded-${tripId}`,
      type: "exceeded",
    }).catch(() => {})
  }

  return mergeReport(doc, ctx.expenseReport)
}

export async function getTripOptimization(userId, tripId) {
  await assertTripAccess(userId, tripId)
  const doc = await BudgetOptimization.findOne({ userId, tripId }).lean()
  if (!doc) {
    return {
      exists: false,
      tripId: String(tripId),
      recommendations: [],
      comparisons: [],
      categoryBreakdown: [],
      charts: {},
      reasoning: [],
    }
  }

  let expenseReport = null
  try {
    expenseReport = await buildExpenseReport(userId, tripId)
  } catch {
    expenseReport = null
  }

  return mergeReport(doc, expenseReport)
}

export async function applyRecommendations(userId, { tripId, recommendationIds = [], rejectIds = [] } = {}) {
  await assertTripAccess(userId, tripId)
  const doc = await BudgetOptimization.findOne({ userId, tripId })
  if (!doc) throwStatus("Run budget analysis first", 404)

  const acceptSet = new Set((recommendationIds || []).map(String))
  const rejectSet = new Set((rejectIds || []).map(String))

  for (const rec of doc.recommendations) {
    if (acceptSet.has(rec.id)) rec.status = "accepted"
    if (rejectSet.has(rec.id)) rec.status = "rejected"
  }

  const accepted = doc.recommendations.filter((r) => r.status === "accepted")
  doc.acceptedRecommendations = accepted.map((r) => r.id)

  const acceptedSavings = sumRecommendationSavings(accepted, { status: "accepted" })
  doc.optimizedBudget = roundMoney(Math.max(0, doc.currentBudget - acceptedSavings))
  doc.potentialSavings = acceptedSavings

  for (const rec of accepted) {
    if (rec.activityId && rec.suggestedPrice >= 0) {
      await Activity.findByIdAndUpdate(rec.activityId, {
        $set: { cost: rec.suggestedPrice },
      }).catch(() => {})
    }
  }

  doc.charts = buildOptimizationCharts({
    currentBudget: doc.currentBudget,
    optimizedBudget: doc.optimizedBudget,
    potentialSavings: doc.potentialSavings,
    categoryBreakdown: doc.categoryBreakdown,
  })

  await doc.save()
  return mergeReport(doc, await buildExpenseReport(userId, tripId).catch(() => null))
}

export async function getBudgetForAi(userId, tripId) {
  const data = await getTripOptimization(userId, tripId)
  return {
    ...data,
    openRecommendations: (data.recommendations || []).filter((r) => r.status === "pending"),
    acceptedCount: (data.recommendations || []).filter((r) => r.status === "accepted").length,
  }
}

export async function simulateWhatIf(userId, { tripId, changes = {} } = {}) {
  const trip = await assertTripAccess(userId, tripId)
  const ctx = await buildBudgetContext(userId, trip)
  const existing = await BudgetOptimization.findOne({ userId, tripId }).lean()

  const base = existing?.currentBudget || ctx.currentBudget
  let delta = 0

  if (changes.hotelPrice != null) {
    delta += roundMoney(Number(changes.hotelPrice) - (existing?.comparisons?.find((c) => c.type === "hotel")?.currentPrice || 0))
  }
  if (changes.flightPrice != null) {
    delta += roundMoney(Number(changes.flightPrice) - (existing?.comparisons?.find((c) => c.type === "flight")?.currentPrice || 0))
  }
  if (changes.transportMode === "metro") {
    const transport = ctx.expenseReport?.byCategory?.find((c) => c.id === "transport")
    if (transport) delta -= roundMoney(transport.planned * 0.45)
  }
  if (changes.transportMode === "taxi") {
    const transport = ctx.expenseReport?.byCategory?.find((c) => c.id === "transport")
    if (transport) delta += roundMoney(transport.planned * 0.2)
  }
  if (Array.isArray(changes.activityCosts)) {
    for (const ac of changes.activityCosts) {
      delta += roundMoney(Number(ac.newCost || 0) - Number(ac.oldCost || 0))
    }
  }
  if (changes.extraSavings != null) {
    delta -= roundMoney(Number(changes.extraSavings))
  }

  const newTotal = roundMoney(Math.max(0, base + delta))
  const savings = roundMoney(Math.max(0, base - newTotal))

  return {
    tripId: String(tripId),
    currentBudget: base,
    simulatedBudget: newTotal,
    delta: roundMoney(delta),
    savings,
    currency: ctx.currency,
    changes,
  }
}
