import { searchGoogleMaps, isSerpApiConfigured } from "./serpApiClient.js"
import { reverseGeocodePlace, geocodePlace, isGoogleGeocodingConfigured } from "./geocodingService.js"
import { lookupDestinationCoordinates } from "../utils/geocodingQueryBuilder.js"
import { haversineKm } from "../utils/itineraryOptimizer.js"

const GOOGLE_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
const DEFAULT_MAX_RADIUS_KM = 12

const CACHE_TTL_MS = 5 * 60 * 1000
/** @type {Map<string, { expires: number, data: unknown }>} */
const cache = new Map()

export const NEARBY_CATEGORIES = [
  { id: "restaurant", label: "Restaurants", icon: "🍽️", query: "restaurants", googleType: "restaurant" },
  { id: "cafe", label: "Cafés", icon: "☕", query: "cafes", googleType: "cafe" },
  { id: "attraction", label: "Attractions", icon: "🏛️", query: "tourist attractions", googleType: "tourist_attraction" },
  { id: "atm", label: "ATMs", icon: "🏧", query: "ATM", googleType: "atm" },
  { id: "hospital", label: "Hospitals", icon: "🏥", query: "hospitals", googleType: "hospital" },
]

function categoryById(type) {
  return NEARBY_CATEGORIES.find((c) => c.id === type) || NEARBY_CATEGORIES[0]
}

function cacheKey(parts) {
  return parts.join("|")
}

function getCached(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    cache.delete(key)
    return null
  }
  return hit.data
}

function setCached(key, data) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data })
}

function getGoogleApiKey() {
  return (
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  )
}

function isGoogleNearbyConfigured() {
  if (process.env.GOOGLE_PLACES_API_KEY?.trim()) return true
  return process.env.ENABLE_GOOGLE_PLACES === "true" && isGoogleGeocodingConfigured()
}

function validateCoords(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const err = new Error("Valid latitude and longitude are required")
    err.statusCode = 400
    throw err
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const err = new Error("Coordinates out of range")
    err.statusCode = 400
    throw err
  }
  return { latitude: lat, longitude: lng }
}

function mapsUrlForPlace({ name, latitude, longitude, placeId }) {
  if (placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`
  }
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  }
  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
  }
  return null
}

function normalizePlace(raw, { userLat, userLng, category }) {
  const latitude = Number(raw.latitude)
  const longitude = Number(raw.longitude)
  const distanceKm =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? Math.round(haversineKm(userLat, userLng, latitude, longitude) * 10) / 10
      : null

  return {
    id: raw.id || raw.placeId || `${raw.name}-${latitude}-${longitude}`,
    name: raw.name,
    address: raw.address || null,
    rating: raw.rating != null ? Number(raw.rating) : null,
    reviews: raw.reviews != null ? Number(raw.reviews) : null,
    category: category.id,
    categoryLabel: category.label,
    icon: category.icon,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    distanceKm,
    openNow: raw.openNow ?? null,
    mapsUrl: mapsUrlForPlace({ name: raw.name, latitude, longitude, placeId: raw.placeId }),
    source: raw.source,
  }
}

function mapSerpResult(item, category) {
  const lat = item.gps_coordinates?.latitude
  const lng = item.gps_coordinates?.longitude
  return {
    id: item.place_id || item.data_id || item.title,
    name: item.title || item.name,
    address: item.address,
    rating: item.rating,
    reviews: item.reviews,
    latitude: lat,
    longitude: lng,
    openNow: item.open_state === "Open" || item.hours?.some?.((h) => /open/i.test(String(h))) ? true : null,
    placeId: item.place_id,
    source: "serpapi",
  }
}

async function fetchSerpNearby({ latitude, longitude, category, limit }) {
  const data = await searchGoogleMaps({
    engine: "google_maps",
    q: `${category.query} near me`,
    ll: `@${latitude},${longitude},17z`,
    type: "search",
    nearby: true,
    hl: "en",
    gl: "in",
  })

  const raw = [...(data.local_results || []), ...(data.place_results || [])]
  return raw.slice(0, limit * 2).map((item) => mapSerpResult(item, category))
}

async function fetchGoogleNearby({ latitude, longitude, category, limit }) {
  const apiKey = getGoogleApiKey()
  if (!apiKey) return []

  const url = new URL(GOOGLE_NEARBY_URL)
  url.searchParams.set("location", `${latitude},${longitude}`)
  url.searchParams.set("radius", "3000")
  url.searchParams.set("type", category.googleType)
  url.searchParams.set("key", apiKey)

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status === "REQUEST_DENIED") {
    throw new Error("Google Places API denied the request")
  }
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places nearby failed: ${data.status}`)
  }

  return (data.results || []).slice(0, limit).map((place) => ({
    id: place.place_id,
    name: place.name,
    address: place.vicinity || place.formatted_address,
    rating: place.rating,
    reviews: place.user_ratings_total,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    openNow: place.opening_hours?.open_now ?? null,
    placeId: place.place_id,
    source: "google-places",
  }))
}

function hashOffset(seed, index) {
  let h = 0
  const s = `${seed}|${index}`
  for (let i = 0; i < s.length; i += 1) h = (h << 5) - h + s.charCodeAt(i)
  return (Math.abs(h) % 1000) / 100000
}

function mockNearbyPlaces({ latitude, longitude, category, limit, areaLabel }) {
  const names = {
    restaurant: ["Local Kitchen", "Spice Route Bistro", "Courtyard Dining", "Street Eats Hub"],
    cafe: ["Morning Brew Café", "Corner Espresso", "Garden Tea House", "Artisan Roasters"],
    attraction: ["Heritage Walk Point", "City Viewpoint", "Cultural Square", "Riverside Promenade"],
    atm: ["City Bank ATM", "Metro Cash Point", "Mall ATM Lobby", "Station ATM"],
    hospital: ["City General Hospital", "Care Plus Clinic", "Emergency Medical Centre", "Community Health"],
  }

  const list = names[category.id] || names.restaurant
  return list.slice(0, limit).map((name, index) => {
    const dLat = hashOffset(`${latitude},${longitude}`, index)
    const dLng = hashOffset(`${longitude},${latitude}`, index + 7)
    const plat = latitude + dLat * (index % 2 === 0 ? 1 : -1)
    const plng = longitude + dLng * (index % 2 === 0 ? -1 : 1)
    return {
      id: `demo-${category.id}-${index}`,
      name: areaLabel ? `${name} — ${areaLabel.split(",")[0]}` : name,
      address: areaLabel || "Near your location",
      rating: 3.8 + (index % 3) * 0.4,
      reviews: 40 + index * 17,
      latitude: plat,
      longitude: plng,
      openNow: index % 3 !== 2,
      source: "demo",
    }
  })
}

function filterAndSortByDistance(places, userLat, userLng, maxRadiusKm, limit) {
  return places
    .map((place) => {
      const lat = Number(place.latitude)
      const lng = Number(place.longitude)
      const distanceKm =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? haversineKm(userLat, userLng, lat, lng)
          : Number.POSITIVE_INFINITY
      return { ...place, distanceKm }
    })
    .filter((place) => place.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
}

function parseOptionalCoord(value) {
  if (value === undefined || value === null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function resolveSearchCoords({ latitude, longitude, destination, locationSource }) {
  const lat = parseOptionalCoord(latitude)
  const lng = parseOptionalCoord(longitude)
  const source = String(locationSource || "").toLowerCase()
  const isCurrent = source === "current" || source === "gps"
  const isTrip = source === "trip" || source === "destination"

  if (isCurrent) {
    if (lat == null || lng == null) {
      const err = new Error("Current location requires valid latitude and longitude")
      err.statusCode = 400
      throw err
    }
    return {
      ...validateCoords(lat, lng),
      locationSource: "current",
      resolvedFrom: "coordinates",
    }
  }

  if (isTrip) {
    const dest = String(destination || "").trim()
    if (!dest) {
      const err = new Error("Trip destination is required for trip-based recommendations")
      err.statusCode = 400
      throw err
    }

    const known = lookupDestinationCoordinates(dest)
    if (known) {
      return {
        latitude: known.latitude,
        longitude: known.longitude,
        locationSource: "trip",
        resolvedFrom: "destination",
        destinationLabel: known.displayName || dest,
      }
    }

    const geo = await geocodePlace(dest)
    if (!geo) {
      const err = new Error(`Could not geocode destination: ${dest}`)
      err.statusCode = 400
      throw err
    }

    return {
      latitude: geo.latitude,
      longitude: geo.longitude,
      locationSource: "trip",
      resolvedFrom: "destination",
      destinationLabel: geo.displayName || dest,
    }
  }

  // Legacy path removed — require explicit locationSource (current | trip).

  const err = new Error(
    "locationSource is required (current or trip). For current location send lat/lng; for trip send destination.",
  )
  err.statusCode = 400
  throw err
}

function devLog(stage, data) {
  if (process.env.NODE_ENV === "production") return
  console.log(`[nearby-places] ${stage}`, data)
}

function locationSourceLabel(source) {
  return source === "trip" ? "Trip Destination" : "Current Location"
}

/**
 * Recommend places near the user's coordinates.
 * @param {{ latitude?: number, longitude?: number, destination?: string, locationSource?: string, type?: string, limit?: number, maxRadiusKm?: number }} params
 */
export async function getNearbyPlaces({
  latitude,
  longitude,
  destination,
  locationSource,
  type = "restaurant",
  limit = 8,
  maxRadiusKm = DEFAULT_MAX_RADIUS_KM,
  noCache = false,
}) {
  devLog("request received", {
    latitude,
    longitude,
    destination: destination || null,
    locationSource,
    type,
    noCache,
  })

  const search = await resolveSearchCoords({ latitude, longitude, destination, locationSource })
  const coords = { latitude: search.latitude, longitude: search.longitude }

  devLog("coordinates resolved for search", {
    locationSource: search.locationSource,
    latitude: coords.latitude,
    longitude: coords.longitude,
    resolvedFrom: search.resolvedFrom,
  })
  const category = categoryById(String(type || "restaurant").toLowerCase())
  const max = Math.min(20, Math.max(1, Number(limit) || 8))
  const radiusKm = Math.min(50, Math.max(1, Number(maxRadiusKm) || DEFAULT_MAX_RADIUS_KM))

  const key = cacheKey([
    "nearby",
    coords.latitude.toFixed(5),
    coords.longitude.toFixed(5),
    search.locationSource,
    category.id,
    max,
    radiusKm,
  ])
  const cached = !noCache ? getCached(key) : null
  if (cached) return cached

  if (!noCache) {
    try {
      const { RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
      const { cacheGet } = await import("./cacheService.js")
      const placeKeyFn =
        category.id === "restaurant"
          ? RedisKeys.placesRestaurants
          : category.id === "cafe"
            ? RedisKeys.placesCafes
            : category.id === "attraction"
              ? RedisKeys.placesAttractions
              : category.id === "hospital"
                ? RedisKeys.placesHospitals
                : RedisKeys.placesNearby
      const redisHit = await cacheGet(placeKeyFn(stableHash(key)))
      if (redisHit) {
        setCached(key, redisHit)
        return redisHit
      }
    } catch {
      /* fall through */
    }
  }

  const location = search.destinationLabel
    ? { displayName: search.destinationLabel }
    : await reverseGeocodePlace(coords.latitude, coords.longitude)
  const areaLabel = location?.displayName || search.destinationLabel || null

  let rawPlaces = []
  let source = "demo"
  let warning = undefined

  if (isGoogleNearbyConfigured()) {
    try {
      devLog("Google Places request", {
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
      rawPlaces = await fetchGoogleNearby({ ...coords, category, limit: max * 2 })
      if (rawPlaces.length > 0) source = "google-places"
    } catch (err) {
      console.warn("[nearby] Google Places error:", err.message)
      warning = err.message
    }
  }

  if (rawPlaces.length === 0 && isSerpApiConfigured()) {
    try {
      rawPlaces = await fetchSerpNearby({ ...coords, category, limit: max })
      if (rawPlaces.length > 0) source = "serpapi"
    } catch (err) {
      console.warn("[nearby] SerpAPI error:", err.message)
      warning = err.message
    }
  }

  rawPlaces = filterAndSortByDistance(rawPlaces, coords.latitude, coords.longitude, radiusKm, max)

  if (rawPlaces.length === 0) {
    rawPlaces = filterAndSortByDistance(
      mockNearbyPlaces({ ...coords, category, limit: max, areaLabel }),
      coords.latitude,
      coords.longitude,
      radiusKm,
      max,
    )
    source = "demo"
    warning =
      warning ||
      (search.locationSource === "current"
        ? "No places found within range of your location — try another category or refresh."
        : "Demo nearby results — add SERPAPI_KEY or Google Places API for live recommendations.")
  }

  const data = rawPlaces.map((place) =>
    normalizePlace(place, {
      userLat: coords.latitude,
      userLng: coords.longitude,
      category,
    }),
  )

  const result = {
    source,
    demo: source === "demo",
    warning,
    locationSource: search.locationSource,
    locationSourceLabel: locationSourceLabel(search.locationSource),
    requestCoordinates: {
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
    googlePlacesCoordinates:
      source === "google-places" ? { latitude: coords.latitude, longitude: coords.longitude } : null,
    location: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      label: search.locationSource === "current" ? null : areaLabel,
      reverseGeocodeLabel: search.locationSource === "current" ? areaLabel : null,
      destination: search.destinationLabel || null,
    },
    category: { id: category.id, label: category.label, icon: category.icon },
    count: data.length,
    data,
  }

  setCached(key, result)
  try {
    const { withCache: _w, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
    const { cacheSet } = await import("./cacheService.js")
    const placeKeyFn =
      category.id === "restaurant"
        ? RedisKeys.placesRestaurants
        : category.id === "cafe"
          ? RedisKeys.placesCafes
          : category.id === "attraction"
            ? RedisKeys.placesAttractions
            : category.id === "hospital"
              ? RedisKeys.placesHospitals
              : RedisKeys.placesNearby
    await cacheSet(placeKeyFn(stableHash(key)), result, TTL.PLACES)
  } catch {
    /* redis optional */
  }
  return result
}

export function listNearbyCategories() {
  return NEARBY_CATEGORIES.map(({ id, label, icon }) => ({ id, label, icon }))
}
