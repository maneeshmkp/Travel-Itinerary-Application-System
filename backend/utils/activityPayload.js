import { normalizeCost } from "./budgetCalculations.js"

/**
 * Coerce optional WGS84 coordinates from client input.
 * @returns {{ latitude?: number, longitude?: number }}
 */
export function parseActivityCoordinates(activityData) {
  const out = {}
  const rawLat = activityData?.latitude
  const rawLng = activityData?.longitude
  if (rawLat !== undefined && rawLat !== null && rawLat !== "") {
    const lat = Number(rawLat)
    if (Number.isFinite(lat) && lat >= -90 && lat <= 90) out.latitude = lat
  }
  if (rawLng !== undefined && rawLng !== null && rawLng !== "") {
    const lng = Number(rawLng)
    if (Number.isFinite(lng) && lng >= -180 && lng <= 180) out.longitude = lng
  }
  return out
}

/** Body fragment safe for Activity.create (cost + optional coords). */
export function buildActivityCreatePayload(activityData) {
  const { latitude, longitude, geocodedName, _id, id, __v, ...rest } = activityData || {}
  void _id
  void id
  void __v
  const payload = {
    ...rest,
    cost: normalizeCost(activityData?.cost),
    ...parseActivityCoordinates(activityData),
  }
  const resolvedName = String(geocodedName ?? activityData?.geocodedName ?? "").trim()
  if (resolvedName) payload.geocodedName = resolvedName.slice(0, 500)
  return payload
}
