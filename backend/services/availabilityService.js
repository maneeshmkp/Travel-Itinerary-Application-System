import { isAmadeusConfigured } from "./amadeusClient.js"
import { isSerpApiConfigured, isSerpApiNoResultsError } from "./serpApiClient.js"
import {
  fetchRealFlights as fetchAmadeusFlights,
  fetchRealHotels as fetchAmadeusHotels,
  fetchRealActivities as fetchAmadeusActivities,
} from "./amadeusAvailabilityService.js"
import {
  fetchSerpApiFlights,
  fetchSerpApiHotels,
  fetchSerpApiActivities,
} from "./serpApiAvailabilityService.js"
import {
  fetchGooglePlacesActivities,
  isGooglePlacesConfigured,
} from "./googlePlacesAvailabilityService.js"
import {
  getBusRecommendations,
  getTrainRecommendations,
} from "./transportRecommendationService.js"
import {
  mockHotels,
  mockFlights,
  mockActivities,
} from "./mockAvailabilityService.js"

export function isRealAvailabilityEnabled() {
  return isSerpApiConfigured() || isAmadeusConfigured()
}

export function getAvailabilityProviders() {
  const providers = ["recommendations"]
  if (isSerpApiConfigured()) providers.push("serpapi")
  if (isAmadeusConfigured()) providers.push("amadeus")
  if (!isSerpApiConfigured() && isGooglePlacesConfigured()) {
    providers.push("google-places")
  }
  return providers
}

function unavailableError(kind) {
  const err = new Error(
    `Real ${kind} requires SERPAPI_KEY in backend/.env (free signup at https://serpapi.com — 100 searches/month). ` +
      "Amadeus self-service signup is closing July 2026; use SerpAPI instead. " +
      "Restart the backend after adding your key.",
  )
  err.statusCode = 503
  return err
}

function activitiesUnavailableError() {
  const err = new Error(
    "Real activities require SERPAPI_KEY (recommended) or GOOGLE_GEOCODING_API_KEY with Places API enabled.",
  )
  err.statusCode = 503
  return err
}

async function withMockFallback(kind, params, fetcher, mockFn) {
  try {
    const data = await fetcher(params)
    return data
  } catch (err) {
    console.warn(`[availability] ${kind} error:`, err.message)
    if (isSerpApiNoResultsError(err)) {
      return {
        demo: false,
        source: "serpapi",
        data: [],
        warning: err.message,
      }
    }
    if (String(err.message || "").toLowerCase().includes("geocode")) {
      return {
        demo: false,
        source: "serpapi",
        data: [],
        warning: err.message,
      }
    }
    if (process.env.ALLOW_MOCK_AVAILABILITY === "true") {
      return {
        demo: true,
        source: "mock-fallback",
        data: mockFn(params),
        warning: err.message,
      }
    }
    throw err
  }
}

export async function getHotelsAvailability(params) {
  const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
  return withCache(RedisKeys.bookingHotels(stableHash(params)), TTL.BOOKING_SEARCH, async () => {
    if (isSerpApiConfigured()) {
      return withMockFallback("SerpAPI hotels", params, async (p) => {
        const data = await fetchSerpApiHotels(p)
        return { demo: false, source: "serpapi", data }
      }, mockHotels)
    }

    if (isAmadeusConfigured()) {
      return withMockFallback("Amadeus hotels", params, async (p) => {
        const data = await fetchAmadeusHotels(p)
        return { demo: false, source: "amadeus", data }
      }, mockHotels)
    }

    throw unavailableError("hotels")
  })
}

export async function getFlightsAvailability(params) {
  const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
  return withCache(RedisKeys.bookingFlights(stableHash(params)), TTL.BOOKING_SEARCH, async () => {
    if (isSerpApiConfigured()) {
      return withMockFallback("SerpAPI flights", params, async (p) => {
        const data = await fetchSerpApiFlights(p)
        return { demo: false, source: "serpapi", data }
      }, mockFlights)
    }

    if (isAmadeusConfigured()) {
      return withMockFallback("Amadeus flights", params, async (p) => {
        const data = await fetchAmadeusFlights(p)
        return { demo: false, source: "amadeus", data }
      }, mockFlights)
    }

    throw unavailableError("flights")
  })
}

export async function getActivitiesAvailability(params) {
  const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
  return withCache(RedisKeys.bookingActivities(stableHash(params)), TTL.BOOKING_SEARCH, async () => {
    if (isSerpApiConfigured()) {
      return withMockFallback("SerpAPI activities", params, async (p) => {
        const data = await fetchSerpApiActivities(p)
        return { demo: false, source: "serpapi", data }
      }, mockActivities)
    }

    if (isGooglePlacesConfigured()) {
      return withMockFallback("Google Places activities", params, async (p) => {
        const data = await fetchGooglePlacesActivities(p)
        return { demo: false, source: "google-places", data }
      }, mockActivities)
    }

    if (isAmadeusConfigured()) {
      return withMockFallback("Amadeus activities", params, async (p) => {
        const data = await fetchAmadeusActivities(p)
        return { demo: false, source: "amadeus", data }
      }, mockActivities)
    }

    throw activitiesUnavailableError()
  })
}

export async function getTrainsAvailability(params) {
  const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
  return withCache(RedisKeys.bookingTrain(stableHash(params)), TTL.BOOKING_SEARCH, async () => ({
    demo: true,
    source: "recommendations",
    data: getTrainRecommendations(params),
    warning: undefined,
  }))
}

export async function getBusesAvailability(params) {
  const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
  return withCache(RedisKeys.bookingBus(stableHash(params)), TTL.BOOKING_SEARCH, async () => ({
    demo: true,
    source: "recommendations",
    data: getBusRecommendations(params),
    warning: undefined,
  }))
}
