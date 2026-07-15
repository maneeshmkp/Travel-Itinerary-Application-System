import { hasValidCoordinates } from "./geocodingQueryBuilder.js"

const EARTH_RADIUS_KM = 6371

/**
 * Haversine distance in kilometers between two WGS84 points.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const a1 = (Number(lat1) * Math.PI) / 180
  const a2 = (Number(lat2) * Math.PI) / 180
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180

  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function parseTimeToMinutes(timeStr) {
  const m = String(timeStr || "").match(/^(\d{1,2}):(\d{2})/)
  if (!m) return Number.POSITIVE_INFINITY
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min)) return Number.POSITIVE_INFINITY
  return h * 60 + min
}

function routeDistanceKm(activities) {
  let total = 0
  for (let i = 1; i < activities.length; i += 1) {
    const prev = activities[i - 1]
    const curr = activities[i]
    if (!hasValidCoordinates(prev) || !hasValidCoordinates(curr)) continue
    total += haversineKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
  }
  return total
}

/**
 * Nearest-neighbor reorder for activities with coordinates (minimize travel distance).
 * Activities without coordinates keep their relative order and are appended at the end.
 *
 * @param {object[]} activities
 * @returns {{ activities: object[], reordered: boolean, geocodedCount: number }}
 */
export function optimizeActivityOrder(activities) {
  const list = Array.isArray(activities) ? [...activities] : []
  if (list.length <= 1) {
    return { activities: list, reordered: false, geocodedCount: list.filter(hasValidCoordinates).length }
  }

  const geocoded = list.filter(hasValidCoordinates)
  const notGeocoded = list.filter((a) => !hasValidCoordinates(a))

  if (geocoded.length <= 1) {
    return { activities: list, reordered: false, geocodedCount: geocoded.length }
  }

  geocoded.sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time) || 0,
  )

  const remaining = new Set(geocoded.slice(1))
  const ordered = [geocoded[0]]
  let current = geocoded[0]

  while (remaining.size > 0) {
    let nearest = null
    let nearestDist = Number.POSITIVE_INFINITY

    for (const cand of remaining) {
      const d = haversineKm(
        current.latitude,
        current.longitude,
        cand.latitude,
        cand.longitude,
      )
      if (d < nearestDist) {
        nearestDist = d
        nearest = cand
      }
    }

    ordered.push(nearest)
    remaining.delete(nearest)
    current = nearest
  }

  const optimized = [...ordered, ...notGeocoded]
  const originalIds = list.map((a) => String(a._id || a.id || a.name))
  const optimizedIds = optimized.map((a) => String(a._id || a.id || a.name))
  const reordered = originalIds.some((id, i) => id !== optimizedIds[i])

  return { activities: optimized, reordered, geocodedCount: geocoded.length }
}

/**
 * Optimize each day's activity order using coordinates.
 * @param {Array<{ dayNumber?: number, activities?: object[] }>} days
 */
export function optimizeItineraryDays(days) {
  const dayResults = []
  let originalDistanceKm = 0
  let optimizedDistanceKm = 0
  let daysOptimized = 0
  let activitiesReordered = 0
  let totalGeocoded = 0

  for (const day of days || []) {
    const activities = Array.isArray(day.activities) ? day.activities : []
    const beforeDist = routeDistanceKm(activities)
    const { activities: optimized, reordered, geocodedCount } = optimizeActivityOrder(activities)
    const afterDist = routeDistanceKm(optimized)

    originalDistanceKm += beforeDist
    optimizedDistanceKm += afterDist
    totalGeocoded += geocodedCount

    if (reordered) {
      daysOptimized += 1
      activitiesReordered += activities.length
    }

    dayResults.push({
      dayNumber: day.dayNumber,
      dayId: day._id,
      activities: optimized,
      reordered,
      geocodedCount,
      distanceBeforeKm: Math.round(beforeDist * 100) / 100,
      distanceAfterKm: Math.round(afterDist * 100) / 100,
    })
  }

  const savedKm = Math.max(0, originalDistanceKm - optimizedDistanceKm)

  return {
    days: dayResults,
    stats: {
      originalDistanceKm: Math.round(originalDistanceKm * 100) / 100,
      optimizedDistanceKm: Math.round(optimizedDistanceKm * 100) / 100,
      savedKm: Math.round(savedKm * 100) / 100,
      savedPercent:
        originalDistanceKm > 0
          ? Math.round((savedKm / originalDistanceKm) * 1000) / 10
          : 0,
      daysOptimized,
      activitiesReordered,
      geocodedActivities: totalGeocoded,
    },
  }
}
