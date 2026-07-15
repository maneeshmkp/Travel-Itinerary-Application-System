import Itinerary from "../models/Itinerary.js"
import Day from "../models/Day.js"
import Activity from "../models/Activity.js"
import {
  hasValidCoordinates,
  inferActivityCity,
  normalizeDestination,
} from "../utils/geocodingQueryBuilder.js"
import { addDays, normalizeDateInput } from "./weatherService.shared.js"
import {
  getWeatherForActivity,
  parseActivityTime,
} from "./activityWeatherService.js"

const MAX_CONCURRENT_REQUESTS = 3
const COORD_DECIMALS = 6

function throwClientError(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

function coordCacheKey(lat, lon) {
  return `${Number(lat).toFixed(COORD_DECIMALS)},${Number(lon).toFixed(COORD_DECIMALS)}`
}

function roundCoord(value) {
  return Number(Number(value).toFixed(COORD_DECIMALS))
}

/**
 * Pick the earliest activity time for a coordinate group.
 * @param {string[]} times
 */
function pickRepresentativeActivityTime(times) {
  if (!times.length) return null
  const parsed = times.map((t) => ({ raw: t, ...parseActivityTime(t) }))
  parsed.sort((a, b) => a.hours * 60 + a.minutes - (b.hours * 60 + b.minutes))
  return parsed[0]?.raw || null
}

function shortPlaceLabel(raw) {
  const s = String(raw || "").trim()
  if (!s) return ""
  return s.split(",")[0].trim()
}

function isGenericCityLabel(label, cities) {
  const s = String(label || "").trim().toLowerCase()
  if (!s) return true
  return cities.some((city) => city.toLowerCase() === s)
}

function isMealOrTransitName(name) {
  return /^(lunch|dinner|breakfast|brunch|snack|check[\s-]?(in|out)|return to|transfer|departure|arrival)\b/i.test(
    String(name || "").trim(),
  )
}

function placeNameScore(name, cities) {
  const label = String(name || "").trim()
  if (!label) return -100

  let score = 0
  const lower = label.toLowerCase()

  if (isGenericCityLabel(label, cities)) score -= 20
  if (/temple|palace|fort|museum|lake|valley|beach|shrine|mosque|church|monument|garden|market|ghat/i.test(lower)) {
    score += 25
  }
  if (isMealOrTransitName(label)) score -= 8
  score += Math.min(label.length, 48) / 12

  return score
}

/**
 * Pick the most specific label for a coordinate group.
 * @param {string[]} candidates
 * @param {string[]} cities
 */
export function pickPrimaryPlaceName(candidates, cities) {
  const unique = [...new Set(candidates.map((c) => String(c || "").trim()).filter(Boolean))]
  if (unique.length === 0) return "Stop"

  unique.sort((a, b) => placeNameScore(b, cities) - placeNameScore(a, cities))
  return unique[0]
}

/**
 * @param {object} activity
 * @param {string} tripDestination
 */
export function resolveActivityPlaceName(activity, tripDestination) {
  const normalized = normalizeDestination(tripDestination)
  const cities = normalized.cities

  const locationName = activity?.locationName || activity?.geocodedName
  if (locationName) {
    const short = shortPlaceLabel(locationName)
    if (short && !isGenericCityLabel(short, cities)) return short
  }

  const activityName = shortPlaceLabel(activity?.name)
  if (activityName && !isMealOrTransitName(activityName) && !isGenericCityLabel(activityName, cities)) {
    return activityName
  }

  for (const field of ["location", "place", "city"]) {
    const val = shortPlaceLabel(activity?.[field])
    if (val && !isGenericCityLabel(val, cities)) return val
  }

  if (activityName) return activityName

  const inferred = inferActivityCity(activity, normalized)
  if (inferred) return inferred

  return normalized.primaryCity || shortPlaceLabel(tripDestination) || "Stop"
}

/**
 * @param {Array<{ dayNumber: number, activities: object[] }>} days
 * @param {string} tripDestination
 */
export function collectPlaceGroups(days, tripDestination) {
  const normalized = normalizeDestination(tripDestination)
  /** @type {Map<string, { day: number, latitude: number, longitude: number, labels: Set<string>, activities: Set<string>, times: string[] }>} */
  const groups = new Map()

  for (const day of days || []) {
    const dayNum = Number(day.dayNumber) || 1
    for (const activity of day.activities || []) {
      if (!hasValidCoordinates(activity)) continue

      const latitude = roundCoord(activity.latitude)
      const longitude = roundCoord(activity.longitude)
      const groupKey = `${dayNum}|${coordCacheKey(latitude, longitude)}`
      const label = resolveActivityPlaceName(activity, tripDestination)
      const activityName = shortPlaceLabel(activity?.name)

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          day: dayNum,
          latitude,
          longitude,
          labels: new Set(),
          activities: new Set(),
          times: [],
        })
      }

      const group = groups.get(groupKey)
      group.labels.add(label)
      if (activityName) group.activities.add(activityName)
      if (activity?.time) group.times.push(String(activity.time))
    }
  }

  return Array.from(groups.values())
    .map((group) => {
      const labelList = Array.from(group.labels)
      const activityList = Array.from(group.activities)
      const place = pickPrimaryPlaceName([...labelList, ...activityList], normalized.cities)

      return {
        day: group.day,
        place,
        latitude: group.latitude,
        longitude: group.longitude,
        activityNames: activityList.sort((a, b) => a.localeCompare(b)),
        activityTime: pickRepresentativeActivityTime(group.times),
      }
    })
    .sort((a, b) => a.day - b.day || a.place.localeCompare(b.place))
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await mapper(items[current], current)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

/**
 * @param {string} tripId
 * @param {string} [startDate]
 */
export async function getPlaceWeatherForTrip(tripId, startDate) {
  const id = String(tripId || "").trim()
  if (!id) throw throwClientError("tripId is required")

  const itinerary = await Itinerary.findById(id).populate({
    path: "days",
    populate: { path: "activities", model: "Activity" },
  })

  if (!itinerary) {
    throw throwClientError("Trip not found", 404)
  }

  void Day
  void Activity

  const placeGroups = collectPlaceGroups(itinerary.days, itinerary.destination)
  const tripStartDate = normalizeDateInput(startDate)

  const places = await mapWithConcurrency(placeGroups, MAX_CONCURRENT_REQUESTS, async (group) => {
    const weather = await getWeatherForActivity(
      {
        latitude: group.latitude,
        longitude: group.longitude,
        dayNumber: group.day,
        time: group.activityTime,
        activityTime: group.activityTime,
      },
      { startDate: tripStartDate },
    )

    return {
      day: group.day,
      place: group.place,
      latitude: group.latitude,
      longitude: group.longitude,
      activityNames: group.activityNames,
      activityTime: group.activityTime,
      activityDate: addDays(tripStartDate, group.day - 1),
      gridLocation: weather?.gridLocation || null,
      weather,
    }
  })

  return {
    tripId: String(itinerary._id),
    destination: itinerary.destination,
    startDate: tripStartDate,
    places,
    demo: !process.env.OPENWEATHER_API_KEY?.trim(),
  }
}
