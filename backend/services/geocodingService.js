const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
const DEFAULT_USER_AGENT = "TravelItinerarySystem/1.0 (contact: developer@example.com)"
const MIN_NOMINATIM_INTERVAL_MS = 1100

/** @type {Map<string, { latitude: number, longitude: number, displayName: string } | null>} */
const queryCache = new Map()

let lastNominatimRequestAt = 0

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getUserAgent() {
  return process.env.NOMINATIM_USER_AGENT?.trim() || DEFAULT_USER_AGENT
}

function getGoogleGeocodingApiKey() {
  return (
    process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  )
}

async function waitForNominatimRateLimit() {
  const elapsed = Date.now() - lastNominatimRequestAt
  if (elapsed < MIN_NOMINATIM_INTERVAL_MS) {
    await sleep(MIN_NOMINATIM_INTERVAL_MS - elapsed)
  }
  lastNominatimRequestAt = Date.now()
}

function cacheResult(cacheKey, result) {
  queryCache.set(cacheKey, result)
  return result
}

/**
 * Geocode via Google Geocoding API (preferred when GOOGLE_GEOCODING_API_KEY is set).
 * @param {string} query
 * @returns {Promise<{ latitude: number, longitude: number, displayName: string } | null>}
 */
async function geocodePlaceGoogle(query) {
  const q = String(query || "").trim()
  const apiKey = getGoogleGeocodingApiKey()
  if (!q || !apiKey) return null

  const cacheKey = `google:${q.toLowerCase()}`
  if (queryCache.has(cacheKey)) {
    return queryCache.get(cacheKey)
  }

  try {
    const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(q)}&key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) {
      console.warn(`[geocode] Google HTTP ${res.status} for "${q.slice(0, 80)}"`)
      return cacheResult(cacheKey, null)
    }

    const data = await res.json()
    const status = String(data?.status || "")

    if (status === "ZERO_RESULTS") {
      return cacheResult(cacheKey, null)
    }

    if (status !== "OK") {
      console.warn(`[geocode] Google status ${status} for "${q.slice(0, 80)}"`)
      return cacheResult(cacheKey, null)
    }

    const first = data?.results?.[0]
    const lat = Number(first?.geometry?.location?.lat)
    const lng = Number(first?.geometry?.location?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return cacheResult(cacheKey, null)
    }

    const result = {
      latitude: lat,
      longitude: lng,
      displayName: String(first.formatted_address || q),
    }
    return cacheResult(cacheKey, result)
  } catch (err) {
    console.warn(`[geocode] Google error for "${q.slice(0, 80)}":`, err?.message || err)
    return cacheResult(cacheKey, null)
  }
}

/**
 * Geocode via OpenStreetMap Nominatim (fallback when Google is unavailable).
 * @param {string} query
 * @returns {Promise<{ latitude: number, longitude: number, displayName: string } | null>}
 */
async function geocodePlaceNominatim(query) {
  const q = String(query || "").trim()
  if (!q) return null

  const cacheKey = `nominatim:${q.toLowerCase()}`
  if (queryCache.has(cacheKey)) {
    return queryCache.get(cacheKey)
  }

  await waitForNominatimRateLimit()

  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: {
        "User-Agent": getUserAgent(),
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      return cacheResult(cacheKey, null)
    }

    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return cacheResult(cacheKey, null)
    }

    const hit = rows[0]
    const latitude = Number(hit.lat)
    const longitude = Number(hit.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return cacheResult(cacheKey, null)
    }

    const result = {
      latitude,
      longitude,
      displayName: String(hit.display_name || q),
    }
    return cacheResult(cacheKey, result)
  } catch {
    return cacheResult(cacheKey, null)
  }
}

/**
 * Geocode a place name. Prefers Google Geocoding API when configured, else Nominatim.
 * @param {string} query
 * @returns {Promise<{ latitude: number, longitude: number, displayName: string } | null>}
 */
export async function geocodePlace(query) {
  const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
  const q = String(query || "").trim()
  const key = RedisKeys.mapsGeocode(stableHash(q.toLowerCase()))

  return withCache(key, TTL.MAPS, async () => {
    try {
      const google = await geocodePlaceGoogle(query)
      if (google) {
        const { logMaps } = await import("../logger/index.js")
        const { recordDomainEvent } = await import("./monitoring/metricsStore.js")
        logMaps.info("Geocode ok", { provider: "google" })
        recordDomainEvent("maps", true)
        return google
      }
      const nominatim = await geocodePlaceNominatim(query)
      if (nominatim) {
        const { logMaps } = await import("../logger/index.js")
        const { recordDomainEvent } = await import("./monitoring/metricsStore.js")
        logMaps.info("Geocode ok", { provider: "nominatim" })
        recordDomainEvent("maps", true)
      }
      return nominatim
    } catch (err) {
      const { logMaps } = await import("../logger/index.js")
      const { recordDomainEvent } = await import("./monitoring/metricsStore.js")
      logMaps.error("Geocode failed", { message: err.message })
      recordDomainEvent("maps", false, err.message)
      throw err
    }
  })
}

/** Clear in-memory cache (useful for tests). */
export function clearGeocodeCache() {
  queryCache.clear()
}

/** Whether Google Geocoding API key is configured on the server. */
export function isGoogleGeocodingConfigured() {
  return Boolean(getGoogleGeocodingApiKey())
}

/**
 * Reverse geocode coordinates to a human-readable label.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ latitude: number, longitude: number, displayName: string } | null>}
 */
export async function reverseGeocodePlace(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
  const key = RedisKeys.mapsReverse(stableHash(`${lat.toFixed(5)},${lng.toFixed(5)}`))

  return withCache(key, TTL.MAPS, async () => {
    const cacheKey = `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`
    if (queryCache.has(cacheKey)) {
      return queryCache.get(cacheKey)
    }

    const apiKey = getGoogleGeocodingApiKey()
    if (apiKey) {
      try {
        const url = `${GOOGLE_GEOCODE_URL}?latlng=${encodeURIComponent(`${lat},${lng}`)}&key=${encodeURIComponent(apiKey)}`
        const res = await fetch(url, { headers: { Accept: "application/json" } })
        const data = await res.json()
        if (data.status === "OK" && data.results?.[0]) {
          const result = {
            latitude: lat,
            longitude: lng,
            displayName: String(data.results[0].formatted_address || ""),
          }
          return cacheResult(cacheKey, result)
        }
      } catch (err) {
        console.warn("[geocode] Google reverse error:", err?.message || err)
      }
    }

    // Fall through to existing Nominatim path below by re-calling inner logic:
    // Keep original body after Google attempt — read rest of file.
    return reverseGeocodePlaceUncached(lat, lng, cacheKey)
  })
}

async function reverseGeocodePlaceUncached(lat, lng, cacheKey) {
  try {
    await waitForNominatimRateLimit()
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": getUserAgent() },
    })
    if (res.ok) {
      const data = await res.json()
      const result = {
        latitude: lat,
        longitude: lng,
        displayName: String(data.display_name || ""),
      }
      return cacheResult(cacheKey, result)
    }
  } catch {
    /* fall through */
  }

  return cacheResult(cacheKey, null)
}
