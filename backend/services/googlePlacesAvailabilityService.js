import { geocodePlace, isGoogleGeocodingConfigured } from "./geocodingService.js"
import { lookupDestinationCoordinates, normalizeDestination } from "../utils/geocodingQueryBuilder.js"

const PLACES_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"

/** Rough activity price hints from Google price_level (0–4). */
const PRICE_LEVEL_ESTIMATE_USD = {
  0: 0,
  1: 20,
  2: 45,
  3: 90,
  4: 160,
}

export function isGooglePlacesConfigured() {
  if (process.env.GOOGLE_PLACES_API_KEY?.trim()) return true
  return (
    process.env.ENABLE_GOOGLE_PLACES === "true" && isGoogleGeocodingConfigured()
  )
}

function getGoogleApiKey() {
  return (
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  )
}

function destinationKeyword(destination) {
  const { primaryCity } = normalizeDestination(destination)
  return primaryCity || String(destination || "").split(",")[0].trim()
}

async function resolveCoords(destination) {
  const known = lookupDestinationCoordinates(destination)
  if (known) {
    return { latitude: known.latitude, longitude: known.longitude }
  }
  const geo = await geocodePlace(destination)
  if (geo) {
    return { latitude: geo.latitude, longitude: geo.longitude }
  }
  return null
}

/**
 * @param {{ destination: string, names?: string, day?: number, currency?: string }} params
 */
export async function fetchGooglePlacesActivities({ destination, names, day, currency = "USD" }) {
  const apiKey = getGoogleApiKey()
  if (!apiKey) {
    throw new Error("Google Places API key is not configured")
  }

  const city = destinationKeyword(destination)
  const coords = await resolveCoords(destination)
  const query = `tourist attractions in ${city}`

  const url = new URL(PLACES_TEXT_SEARCH_URL)
  url.searchParams.set("query", query)
  url.searchParams.set("key", apiKey)
  if (coords) {
    url.searchParams.set("location", `${coords.latitude},${coords.longitude}`)
    url.searchParams.set("radius", "50000")
  }

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status === "REQUEST_DENIED") {
    throw new Error(
      "Google Places API denied the request. Enable Places API (New) or Places API in Google Cloud for your key.",
    )
  }
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places search failed: ${data.status}`)
  }

  const requested = String(names || "")
    .split("|")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean)

  let items = data.results || []

  if (requested.length > 0) {
    const filtered = items.filter((place) => {
      const title = String(place.name || "").toLowerCase()
      return requested.some(
        (r) => title.includes(r.slice(0, 12)) || r.includes(title.slice(0, 12)),
      )
    })
    if (filtered.length > 0) items = filtered
  }

  return items.slice(0, 8).map((place) => {
    const priceLevel = Number(place.price_level)
    const price = Number.isFinite(priceLevel)
      ? PRICE_LEVEL_ESTIMATE_USD[priceLevel] ?? 50
      : 40
    const rating = Number(place.rating)
    const slotsLeft = Number.isFinite(rating) ? Math.max(1, Math.round(rating * 2)) : 5

    return {
      id: place.place_id || `google-place-${place.name}`,
      name: place.name || "Activity",
      destination: city,
      day: day != null ? Number(day) : null,
      price,
      currency,
      availability: place.business_status === "OPERATIONAL" ? "available" : "limited",
      availabilityLabel: place.business_status === "OPERATIONAL" ? "Available" : "Check hours",
      slotsLeft,
      nextSlot: place.opening_hours?.open_now ? "Open now" : null,
      instantConfirmation: false,
      description: place.formatted_address || "",
      rating: Number.isFinite(rating) ? rating : null,
      bookingLink: place.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
        : null,
      source: "google-places",
    }
  })
}
