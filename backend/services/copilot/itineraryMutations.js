import Activity from "../../models/Activity.js"
import Day from "../../models/Day.js"
import Itinerary from "../../models/Itinerary.js"
import { buildActivityCreatePayload } from "../../utils/activityPayload.js"
import { geocodeActivityFields } from "../../services/activityGeocodingService.js"
import { persistItineraryBudgetTotals } from "../../utils/budgetCalculations.js"
import { loadItinerarySnapshot } from "./copilotContext.js"

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function findDay(days, dayNumber) {
  return days.find((d) => Number(d.dayNumber) === Number(dayNumber))
}

function findActivityByName(days, name) {
  const n = norm(name)
  for (const day of days) {
    for (const act of day.activities || []) {
      if (norm(act.name).includes(n) || n.includes(norm(act.name))) {
        return { day, activity: act }
      }
    }
  }
  return null
}

function findActivitiesByCategory(days, category) {
  const cat = norm(category)
  const hits = []
  for (const day of days) {
    for (const act of day.activities || []) {
      if (norm(act.category) === cat || norm(act.name).includes(cat)) {
        hits.push({ day, activity: act })
      }
    }
  }
  return hits
}

async function repopulateItinerary(itineraryId) {
  await persistItineraryBudgetTotals(itineraryId)
  return loadItinerarySnapshot(itineraryId)
}

/**
 * Apply structured mutations to a saved itinerary.
 * @param {string} itineraryId
 * @param {{ action: string, [key: string]: unknown }} mutation
 */
export async function applyItineraryMutation(itineraryId, mutation) {
  const itinerary = await Itinerary.findById(itineraryId).populate({
    path: "days",
    populate: { path: "activities", model: "Activity" },
  })
  if (!itinerary) throw new Error("Itinerary not found")

  const action = String(mutation?.action || "").toLowerCase()
  const days = itinerary.days || []

  switch (action) {
    case "remove_activity": {
      const hit = findActivityByName(days, mutation.activityName || mutation.name)
      if (!hit) throw new Error(`Activity "${mutation.activityName}" not found`)
      hit.day.activities = hit.day.activities.filter(
        (a) => String(a._id) !== String(hit.activity._id),
      )
      await hit.day.save()
      await Activity.findByIdAndDelete(hit.activity._id)
      break
    }
    case "remove_category": {
      const hits = findActivitiesByCategory(days, mutation.category)
      for (const { day, activity } of hits) {
        day.activities = day.activities.filter((a) => String(a._id) !== String(activity._id))
        await day.save()
        await Activity.findByIdAndDelete(activity._id)
      }
      if (hits.length === 0) throw new Error(`No ${mutation.category} activities found`)
      break
    }
    case "add_activity": {
      const day = findDay(days, mutation.dayNumber)
      if (!day) throw new Error(`Day ${mutation.dayNumber} not found`)
      const raw = mutation.activity || {}
      const { activity: geocoded } = await geocodeActivityFields(
        {
          name: raw.name || "New activity",
          description: raw.description || raw.name || "Activity",
          time: raw.time || "10:00 AM",
          location: raw.location || itinerary.destination,
          category: raw.category || "sightseeing",
          duration: raw.duration || "2 hours",
          cost: raw.cost ?? 0,
        },
        { destination: itinerary.destination },
      )
      const created = await Activity.create(buildActivityCreatePayload(geocoded))
      day.activities.push(created._id)
      await day.save()
      break
    }
    case "move_activity": {
      const hit = findActivityByName(days, mutation.activityName || mutation.name)
      if (!hit) throw new Error(`Activity "${mutation.activityName}" not found`)
      const targetDay = findDay(days, mutation.toDay || mutation.dayNumber)
      if (!targetDay) throw new Error(`Target day ${mutation.toDay} not found`)
      hit.day.activities = hit.day.activities.filter(
        (a) => String(a._id) !== String(hit.activity._id),
      )
      targetDay.activities.push(hit.activity._id)
      await hit.day.save()
      await targetDay.save()
      break
    }
    case "swap_days": {
      const a = findDay(days, mutation.dayA || mutation.fromDay)
      const b = findDay(days, mutation.dayB || mutation.toDay)
      if (!a || !b) throw new Error("Both days must exist to swap")
      const tmpNum = a.dayNumber
      a.dayNumber = b.dayNumber
      b.dayNumber = tmpNum
      await a.save()
      await b.save()
      break
    }
    case "replace_hotel": {
      const day = findDay(days, mutation.dayNumber)
      if (!day) throw new Error(`Day ${mutation.dayNumber} not found`)
      const hotel = mutation.hotel || {}
      day.hotel = {
        name: hotel.name || day.hotel?.name || "Hotel",
        location: hotel.location || day.hotel?.location || itinerary.destination,
        rating: hotel.rating ?? day.hotel?.rating ?? 4,
        checkIn: hotel.checkIn || day.hotel?.checkIn,
        checkOut: hotel.checkOut || day.hotel?.checkOut,
      }
      await day.save()
      break
    }
    case "update_budget": {
      const min = mutation.min != null ? Number(mutation.min) : itinerary.budget?.min
      const max = mutation.max != null ? Number(mutation.max) : itinerary.budget?.max
      itinerary.budget = {
        min: Math.max(0, min ?? 0),
        max: Math.max(min ?? 0, max ?? min ?? 0),
        currency: mutation.currency || itinerary.budget?.currency || "INR",
      }
      await itinerary.save()
      break
    }
    default:
      throw new Error(`Unknown mutation action: ${action}`)
  }

  return repopulateItinerary(itineraryId)
}
