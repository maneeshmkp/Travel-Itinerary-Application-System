import { geocodePlace } from "./geocodingService.js"
import {
  buildGeocodeQueries,
  hasValidCoordinates,
  lookupKnownCoordinates,
  lookupDestinationCoordinates,
} from "../utils/geocodingQueryBuilder.js"

/**
 * Resolve coordinates for one activity using known landmarks + Google/Nominatim geocoding.
 * Returns the activity with latitude, longitude, and geocodedName when found.
 * On failure, returns the original activity unchanged.
 *
 * @param {object} activity
 * @param {{ destination?: string }} tripContext
 * @returns {Promise<{ activity: object, geocoded: boolean, failed: boolean, query?: string }>}
 */
export async function geocodeActivityFields(activity, tripContext = {}) {
  if (!activity || typeof activity !== "object") {
    return { activity, geocoded: false, failed: true }
  }

  if (hasValidCoordinates(activity)) {
    return { activity, geocoded: false, failed: false }
  }

  const trip = { destination: tripContext.destination || "" }
  const { queries, landmarkQueries, city, landmark } = buildGeocodeQueries(activity, trip)

  if (queries.length === 0) {
    console.warn(
      `[geocode] skip "${activity.name || "activity"}": no geocoding queries (destination: ${trip.destination || "unknown"})`,
    )
    return { activity, geocoded: false, failed: true }
  }

  let hit = null
  let usedQuery = null

  try {
    const known = lookupKnownCoordinates(landmark, city, activity.name)
    if (known) {
      hit = known
      usedQuery = `known:${landmark}`
    }

    if (!hit) {
      for (const query of queries) {
        const result = await geocodePlace(query)
        if (result) {
          hit = {
            latitude: result.latitude,
            longitude: result.longitude,
            displayName: result.displayName,
          }
          usedQuery = query
          break
        }
      }
    }

    if (!hit) {
      const cityKnown = lookupKnownCoordinates(city, city, activity.name)
      if (cityKnown) {
        hit = cityKnown
        usedQuery = `known-city:${city}`
      }
    }

    if (!hit && trip.destination) {
      const destKnown = lookupDestinationCoordinates(trip.destination)
      if (destKnown) {
        hit = destKnown
        usedQuery = `known-destination:${trip.destination}`
      }
    }

    if (!hit) {
      console.warn(
        `[geocode] fail "${activity.name || "activity"}" | tried: ${queries.slice(0, 4).join(" → ")}${queries.length > 4 ? " …" : ""}`,
      )
      return { activity, geocoded: false, failed: true }
    }

    const isCityFallback =
      String(usedQuery || "").startsWith("known-city:") ||
      (usedQuery && !landmarkQueries.includes(usedQuery) && !String(usedQuery).startsWith("known:"))

    console.log(
      `[geocode] ok "${activity.name || "activity"}" → ${hit.latitude.toFixed(4)}, ${hit.longitude.toFixed(4)}${isCityFallback ? " (city fallback)" : ""} | ${usedQuery}`,
    )

    return {
      activity: {
        ...activity,
        latitude: hit.latitude,
        longitude: hit.longitude,
        geocodedName: hit.displayName,
      },
      geocoded: true,
      failed: false,
      query: usedQuery,
    }
  } catch (err) {
    console.error(`[geocode] error "${activity.name || "activity"}":`, err?.message || err)
    return { activity, geocoded: false, failed: true }
  }
}

/**
 * Geocode all activities on an in-memory itinerary (AI preview or pre-save payload).
 * Failures are logged; remaining activities continue processing.
 *
 * @param {object} itinerary - { destination, days: [{ activities: [...] }] }
 * @returns {Promise<{ itinerary: object, stats: { total: number, geocoded: number, skipped: number, failed: number } }>}
 */
export async function geocodeItineraryActivities(itinerary) {
  if (!itinerary || !Array.isArray(itinerary.days)) {
    return {
      itinerary,
      stats: { total: 0, geocoded: 0, skipped: 0, failed: 0 },
    }
  }

  const tripContext = { destination: itinerary.destination }
  const stats = { total: 0, geocoded: 0, skipped: 0, failed: 0 }
  const days = []

  for (const day of itinerary.days) {
    const activities = []
    for (const activity of day.activities || []) {
      stats.total += 1
      if (hasValidCoordinates(activity)) {
        stats.skipped += 1
        activities.push(activity)
        continue
      }

      const { activity: enriched, geocoded, failed } = await geocodeActivityFields(activity, tripContext)
      if (geocoded) stats.geocoded += 1
      else if (failed) stats.failed += 1
      else stats.skipped += 1
      activities.push(enriched)
    }
    days.push({ ...day, activities })
  }

  return {
    itinerary: { ...itinerary, days },
    stats,
  }
}
