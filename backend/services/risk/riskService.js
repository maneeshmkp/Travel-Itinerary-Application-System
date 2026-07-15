import TripRisk from "../../models/TripRisk.js"
import Itinerary from "../../models/Itinerary.js"
import Booking from "../../models/Booking.js"
import TravelDocument from "../../models/TravelDocument.js"
import Activity from "../../models/Activity.js"
import Day from "../../models/Day.js"
import { getWeatherForecast } from "../weatherService.js"
import { getMissingDocuments } from "../documents/documentService.js"
import { buildExpenseReport } from "../expenseService.js"
import { buildTripCalendarEvents } from "../../utils/calendarMapper.js"
import { runRuleBasedDetection } from "../riskDetection/riskDetectionService.js"
import { analyzeRisksWithAI, replanDayWithAI } from "../riskAI/riskAIService.js"
import { buildRouteAnalysis } from "../scheduleOptimizer.js"
import { canAccessTripData } from "../../utils/itineraryAccess.js"
import { geocodeActivityFields } from "../activityGeocodingService.js"
import { persistItineraryBudgetTotals } from "../../utils/budgetCalculations.js"
import { notifyTravelRisk } from "../notifications/notificationTriggers.js"
import {
  throwStatus,
  serializeTripRisk,
  computeHealthScore,
  overallSeverity,
  collectRecommendations,
  buildAnalysisHash,
  collectActivities,
} from "../../utils/riskHelpers.js"

const analysisCache = new Map()
const CACHE_TTL_MS = 15 * 60 * 1000

async function assertTripAccess(userId, tripId) {
  const trip = await Itinerary.findById(tripId)
    .populate({ path: "days", populate: { path: "activities", model: "Activity" } })
    .lean()
  if (!trip) throwStatus("Trip not found", 404)
  if (!canAccessTripData(trip, userId)) throwStatus("Not authorized for this trip", 403)
  return trip
}

async function buildRiskContext(userId, trip) {
  const startDate = trip.startDate ? new Date(trip.startDate).toISOString().slice(0, 10) : null
  let forecast = []
  try {
    const wx = await getWeatherForecast(trip.destination, trip.totalDays || 5, startDate)
    forecast = (wx?.forecast || []).map((day, idx) => ({
      ...day,
      dayNumber: idx + 1,
    }))
  } catch {
    forecast = []
  }

  let missingDocuments = { missing: [], present: [] }
  try {
    missingDocuments = await getMissingDocuments(userId, trip._id)
  } catch {
    missingDocuments = { missing: [], present: [] }
  }

  const documents = await TravelDocument.find({ userId, tripId: trip._id }).lean()
  const bookings = await Booking.find({ userId, tripId: trip._id }).lean()

  let budgetSummary = null
  try {
    budgetSummary = await buildExpenseReport(userId, trip._id)
  } catch {
    budgetSummary = null
  }

  let calendarEvents = []
  try {
    calendarEvents = buildTripCalendarEvents(trip, bookings)
  } catch {
    calendarEvents = []
  }

  const activities = collectActivities(trip)

  return {
    trip,
    destination: trip.destination,
    totalDays: trip.totalDays,
    startDate,
    tags: trip.tags || [],
    budget: trip.budget || {},
    weatherForecast: forecast,
    weatherSummary: {
      rainDays: forecast.filter((d) => String(d.condition || "").includes("rain")).length,
    },
    missingDocuments,
    documents: documents.map((d) => ({
      id: String(d._id),
      documentType: d.documentType,
      title: d.title,
      expiryDate: d.expiryDate,
    })),
    bookings,
    budgetSummary,
    calendarEvents,
    activities,
    routeAnalysis: buildRouteAnalysis(trip),
  }
}

async function upsertRisks(userId, tripId, riskItems, analyzedAt) {
  const saved = []
  const notified = new Set()

  for (const item of riskItems) {
    const doc = await TripRisk.findOneAndUpdate(
      { userId, tripId, dedupKey: item.dedupKey },
      {
        $set: {
          ...item,
          userId,
          tripId,
          status: "OPEN",
          analyzedAt,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true, runValidators: true },
    )
    saved.push(doc)

    if (
      (item.severity === "HIGH" || item.severity === "CRITICAL") &&
      !notified.has(item.dedupKey)
    ) {
      notified.add(item.dedupKey)
      notifyTravelRisk(userId, tripId, {
        title: item.title,
        message: item.description || item.recommendation?.description || item.title,
        severity: item.severity,
        dedupKey: `risk-${item.dedupKey}`,
      }).catch(() => {})
    }
  }

  return saved
}

export async function analyzeTripRisks(userId, tripId, { force = false } = {}) {
  const trip = await assertTripAccess(userId, tripId)
  const ctx = await buildRiskContext(userId, trip)
  const hash = buildAnalysisHash(ctx)

  const cacheKey = `${userId}:${tripId}`
  const cached = analysisCache.get(cacheKey)
  if (!force && cached && cached.hash === hash && Date.now() - cached.at < CACHE_TTL_MS) {
    return getTripRisks(userId, tripId)
  }

  const ruleResult = runRuleBasedDetection(ctx)
  const aiResult = await analyzeRisksWithAI(ctx, ruleResult.risks)
  const analyzedAt = new Date()

  const saved = await upsertRisks(userId, tripId, aiResult.risks, analyzedAt)
  analysisCache.set(cacheKey, { hash, at: Date.now() })

  const serialized = saved.map(serializeTripRisk)
  const openRisks = serialized.filter((r) => r.status === "OPEN")
  const health = computeHealthScore(openRisks, ruleResult.factors)

  return {
    tripId: String(tripId),
    exists: true,
    demo: aiResult.demo,
    severity: overallSeverity(serialized),
    healthScore: health.score,
    healthLabel: health.label,
    risks: serialized,
    recommendations: collectRecommendations(serialized).concat(aiResult.recommendations || []).slice(0, 15),
    updatedSchedule: aiResult.updatedSchedule || [],
    reasoning: aiResult.reasoning || [],
    routeAnalysis: ctx.routeAnalysis,
    lastAnalyzedAt: analyzedAt,
    analysisHash: hash,
  }
}

export async function getTripRisks(userId, tripId) {
  await assertTripAccess(userId, tripId)
  const rows = await TripRisk.find({ userId, tripId }).sort({ severity: -1, createdAt: -1 }).lean()
  const risks = rows.map(serializeTripRisk)
  const openRisks = risks.filter((r) => r.status === "OPEN")

  const factors = {
    budgetExceeded: openRisks.some((r) => r.riskType === "budget_exceeded"),
    missingDocuments: openRisks.some((r) => r.riskType === "missing_documents"),
    weatherAlerts: openRisks.some((r) => r.source === "weather"),
    scheduleConflicts: openRisks.some((r) =>
      ["overlapping_activities", "schedule_conflict"].includes(r.riskType),
    ),
  }

  const health = computeHealthScore(openRisks, factors)
  const last = rows.reduce((max, r) => (r.analyzedAt > max ? r.analyzedAt : max), null)

  return {
    tripId: String(tripId),
    exists: risks.length > 0,
    severity: overallSeverity(risks),
    healthScore: health.score,
    healthLabel: health.label,
    risks,
    recommendations: collectRecommendations(risks),
    updatedSchedule: [],
    reasoning: [],
    lastAnalyzedAt: last,
  }
}

export async function resolveTripRisk(userId, riskId, { status = "RESOLVED" } = {}) {
  const risk = await TripRisk.findOne({ _id: riskId, userId })
  if (!risk) throwStatus("Risk not found", 404)
  const allowed = ["RESOLVED", "IGNORED", "OPEN"]
  const next = allowed.includes(status) ? status : "RESOLVED"
  risk.status = next
  await risk.save()
  return serializeTripRisk(risk)
}

export async function replanForRisk(userId, { tripId, riskId, dayNumber, apply = false }) {
  const trip = await assertTripAccess(userId, tripId)
  const tripPop = await Itinerary.findById(tripId)
    .populate({ path: "days", populate: { path: "activities", model: "Activity" } })

  let risk = null
  if (riskId) {
    risk = await TripRisk.findOne({ _id: riskId, userId, tripId })
    if (!risk) throwStatus("Risk not found", 404)
  }

  const targetDay = dayNumber || risk?.affectedDay
  if (!targetDay) throwStatus("dayNumber or risk with affectedDay is required", 400)

  const ctx = await buildRiskContext(userId, trip)
  const aiResult = await replanDayWithAI({
    trip: tripPop,
    dayNumber: targetDay,
    risk: risk ? serializeTripRisk(risk) : null,
    weatherContext: ctx.weatherForecast?.find((d) => d.dayNumber === targetDay),
  })

  let applied = false
  if (apply && aiResult.updatedSchedule?.length) {
    const dayPlan = aiResult.updatedSchedule.find((d) => Number(d.dayNumber) === Number(targetDay))
    if (dayPlan?.activities?.length) {
      await applyDaySchedule(tripPop, targetDay, dayPlan.activities)
      applied = true
      analysisCache.delete(`${userId}:${tripId}`)
    }
  }

  return {
    ...aiResult,
    tripId: String(tripId),
    dayNumber: targetDay,
    applied,
  }
}

async function applyDaySchedule(trip, dayNumber, newActivities) {
  const day = (trip.days || []).find((d) => Number(d.dayNumber) === Number(dayNumber))
  if (!day) throwStatus("Day not found", 404)

  for (const act of day.activities || []) {
    await Activity.findByIdAndUpdate(act._id, { skipped: true })
  }

  const newIds = []
  for (const raw of newActivities) {
    const { activity: geocoded } = await geocodeActivityFields(
      {
        name: raw.name || "Activity",
        description: raw.reason || raw.description || raw.name || "",
        time: raw.time || "10:00",
        location: raw.location || trip.destination,
        category: raw.category || "sightseeing",
        duration: raw.duration || "2 hours",
        cost: 0,
      },
      { destination: trip.destination },
    )
    const created = await Activity.create(geocoded)
    newIds.push(created._id)
  }

  const existingIds = (day.activities || []).map((a) => a._id)
  await Day.findByIdAndUpdate(day._id, { activities: [...existingIds, ...newIds] })
  await persistItineraryBudgetTotals(trip._id)
}

export async function getRisksForAi(userId, tripId) {
  const data = await getTripRisks(userId, tripId)
  return {
    healthScore: data.healthScore,
    healthLabel: data.healthLabel,
    severity: data.severity,
    openRisks: data.risks.filter((r) => r.status === "OPEN").map((r) => ({
      riskType: r.riskType,
      severity: r.severity,
      title: r.title,
      description: r.description,
      affectedDay: r.affectedDay,
    })),
  }
}
