import PackingList from "../../models/PackingList.js"
import Itinerary from "../../models/Itinerary.js"
import Booking from "../../models/Booking.js"
import { getWeatherForecast } from "../weatherService.js"
import { getMissingDocuments } from "../documents/documentService.js"
import { generateAIPackingList, mergeAllPackingSources } from "../packingAI/packingAIService.js"
import { weatherPackingItems } from "../weatherPacking.js"
import { estimatePackingWeight, baggageWarning } from "../weightEstimator.js"
import {
  throwStatus,
  createPackingItem,
  inferTravelStyle,
  activityPackingItems,
  documentPackingItems,
  mergeItemsIntoCategories,
  findItemInList,
  serializePackingList,
  filterItems,
  buildGenerationHash,
  preservePackedState,
  emptyCategories,
  computeProgress,
} from "../../utils/packingHelpers.js"
import { DEFAULT_BAGGAGE_KG } from "../../constants/packingCategories.js"
import { canAccessTripData } from "../../utils/itineraryAccess.js"

async function assertTripAccess(userId, tripId) {
  const trip = await Itinerary.findById(tripId)
    .populate({ path: "days", populate: { path: "activities", model: "Activity" } })
    .lean()
  if (!trip) throwStatus("Trip not found", 404)
  if (!canAccessTripData(trip, userId)) throwStatus("Not authorized for this trip", 403)
  return trip
}

function collectActivities(trip) {
  const activities = []
  for (const day of trip.days || []) {
    for (const act of day.activities || []) {
      if (!act?.skipped) activities.push(act)
    }
  }
  return activities
}

function inferBaggageAllowance(bookings = []) {
  const flight = bookings.find((b) => b.bookingType === "flight")
  if (!flight) return DEFAULT_BAGGAGE_KG
  const notes = String(flight.notes || "").toLowerCase()
  const match = notes.match(/(\d{1,2})\s*kg/)
  if (match) return Number(match[1])
  return DEFAULT_BAGGAGE_KG
}

async function buildPackingContext(userId, trip) {
  const activities = collectActivities(trip)
  const travelStyle = inferTravelStyle(trip.tags, trip.budget)
  const startDate = trip.startDate ? new Date(trip.startDate).toISOString().slice(0, 10) : null

  let forecast = []
  try {
    const wx = await getWeatherForecast(trip.destination, trip.totalDays || 3, startDate)
    forecast = wx?.forecast || []
  } catch {
    forecast = []
  }

  const { items: weatherItems, insights: weatherInsights, summary: weatherSummary } =
    weatherPackingItems(forecast)

  let missingDocs = { checklist: [] }
  try {
    missingDocs = await getMissingDocuments(userId, trip._id)
  } catch {
    missingDocs = { checklist: [] }
  }

  const bookings = await Booking.find({ userId, tripId: trip._id, bookingType: "flight" }).lean()
  const baggageAllowanceKg = inferBaggageAllowance(bookings)

  const activityItems = activityPackingItems(activities)
  const docItems = documentPackingItems(missingDocs)

  const month = startDate ? new Date(startDate).toLocaleString("en", { month: "long" }) : "unknown"

  return {
    destination: trip.destination,
    country: trip.destination,
    season: month,
    totalDays: trip.totalDays,
    numberOfNights: trip.numberOfNights,
    startDate,
    tags: trip.tags || [],
    travelStyle,
    budget: trip.budget || {},
    activities: activities.map((a) => ({
      name: a.name,
      category: a.category,
      location: a.location,
    })),
    weatherForecast: forecast,
    weatherSummary,
    weatherItems,
    weatherInsights,
    activityItems,
    documentItems: docItems,
    missingDocuments: missingDocs,
    baggageAllowanceKg,
    hasFlightBooking: bookings.length > 0,
  }
}

async function generateAndSave(userId, tripId, { force = false } = {}) {
  const trip = await assertTripAccess(userId, tripId)
  const ctx = await buildPackingContext(userId, trip)
  const hash = buildGenerationHash(ctx)

  let existing = await PackingList.findOne({ userId, tripId })
  if (existing && existing.generationHash === hash && !force) {
    return serializePackingList(existing)
  }

  const ai = await generateAIPackingList(ctx)
  let categories = mergeAllPackingSources({
    aiCategories: ai.categories,
    weatherItems: ctx.weatherItems,
    activityItems: ctx.activityItems,
    documentItems: ctx.documentItems,
  })

  if (existing && force) {
    categories = preservePackedState(existing.categories, categories)
    const customItems = existing.customItems || []
    categories = mergeItemsIntoCategories(categories, customItems)
  }

  const { estimatedWeight, weightByCategory } = estimatePackingWeight(categories, existing?.customItems || [])
  const insights = [...(ai.insights || []), ...(ctx.weatherInsights || [])]
  const warn = baggageWarning(estimatedWeight, ctx.baggageAllowanceKg)
  if (warn.overweight) insights.push(warn.message)

  const payload = {
    userId,
    tripId,
    generatedByAI: !ai.demo,
    travelStyle: ctx.travelStyle,
    categories,
    estimatedWeight,
    weightByCategory,
    baggageAllowanceKg: ctx.baggageAllowanceKg,
    insights: [...new Set(insights)].slice(0, 10),
    notes: ai.notes || "",
    generationHash: hash,
    lastGeneratedAt: new Date(),
  }

  if (existing) {
    payload.customItems = existing.customItems || []
    Object.assign(existing, payload)
    const progress = computeProgress(existing.categories, existing.customItems)
    existing.completedItems = flattenPackedIds(existing)
    await existing.save()
    return serializePackingList(existing)
  }

  const created = await PackingList.create({
    ...payload,
    customItems: [],
    completedItems: [],
  })
  return serializePackingList(created)
}

function flattenPackedIds(packingList) {
  const ids = []
  for (const cat of Object.keys(packingList.categories || {})) {
    for (const item of packingList.categories[cat] || []) {
      if (item.packed) ids.push(item.id)
    }
  }
  for (const item of packingList.customItems || []) {
    if (item.packed) ids.push(item.id)
  }
  return ids
}

async function getOwnedList(userId, tripId) {
  const list = await PackingList.findOne({ userId, tripId })
  if (!list) throwStatus("Packing list not found — generate one first", 404)
  return list
}

export async function generatePackingList(userId, tripId) {
  return generateAndSave(userId, tripId, { force: false })
}

export async function regeneratePackingList(userId, tripId) {
  return generateAndSave(userId, tripId, { force: true })
}

export async function getPackingList(userId, tripId) {
  await assertTripAccess(userId, tripId)
  const list = await PackingList.findOne({ userId, tripId })
  if (!list) {
    return {
      tripId: String(tripId),
      exists: false,
      categories: emptyCategories(),
      customItems: [],
      progress: { total: 0, packed: 0, unpacked: 0, percent: 0 },
    }
  }
  return { ...serializePackingList(list), exists: true }
}

export async function updatePackingItem(userId, tripId, itemId, body) {
  const list = await getOwnedList(userId, tripId)
  const found = findItemInList(list, itemId)
  if (!found) throwStatus("Item not found", 404)

  const target =
    found.location === "customItems"
      ? list.customItems[found.index]
      : list.categories[found.category][found.index]

  if (body.packed !== undefined) target.packed = Boolean(body.packed)
  if (body.name) target.name = String(body.name).trim().slice(0, 200)
  if (body.quantity) target.quantity = Math.max(1, Number(body.quantity))
  if (body.notes !== undefined) target.notes = String(body.notes).slice(0, 500)

  list.completedItems = flattenPackedIds(list)
  const weights = estimatePackingWeight(list.categories, list.customItems)
  list.estimatedWeight = weights.estimatedWeight
  list.weightByCategory = weights.weightByCategory
  await list.save()
  return serializePackingList(list)
}

export async function addCustomItem(userId, tripId, body) {
  const list = await getOwnedList(userId, tripId)
  const item = createPackingItem({
    name: body.name,
    category: body.category,
    weightKg: body.weightKg,
    quantity: body.quantity,
    essential: body.essential,
    source: "custom",
    travelerId: body.travelerId || "owner",
    travelerName: body.travelerName || "",
    shared: body.shared,
    notes: body.notes,
  })
  if (!item.name) throwStatus("Item name is required")

  list.customItems.push(item)
  list.categories = mergeItemsIntoCategories(list.categories, [item])

  const weights = estimatePackingWeight(list.categories, list.customItems)
  list.estimatedWeight = weights.estimatedWeight
  list.weightByCategory = weights.weightByCategory
  await list.save()
  return serializePackingList(list)
}

export async function deletePackingItem(userId, tripId, itemId) {
  const list = await getOwnedList(userId, tripId)
  const found = findItemInList(list, itemId)
  if (!found) throwStatus("Item not found", 404)

  if (found.location === "customItems") {
    list.customItems.splice(found.index, 1)
  } else {
    list.categories[found.category].splice(found.index, 1)
  }

  for (const cat of Object.keys(list.categories)) {
    list.categories[cat] = (list.categories[cat] || []).filter((i) => i.id !== itemId)
  }
  list.customItems = (list.customItems || []).filter((i) => i.id !== itemId)
  list.completedItems = (list.completedItems || []).filter((id) => id !== itemId)

  const weights = estimatePackingWeight(list.categories, list.customItems)
  list.estimatedWeight = weights.estimatedWeight
  list.weightByCategory = weights.weightByCategory
  await list.save()
  return serializePackingList(list)
}

export async function searchPackingItems(userId, tripId, query = {}) {
  const data = await getPackingList(userId, tripId)
  if (!data.exists) return { items: [] }
  const list = await PackingList.findOne({ userId, tripId }).lean()
  const items = filterItems(list, query)
  return { items }
}

export async function getPackingForReminder(userId, tripId) {
  return PackingList.findOne({ userId, tripId }).lean()
}
