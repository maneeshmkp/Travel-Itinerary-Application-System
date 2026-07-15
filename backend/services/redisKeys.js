/**
 * Redis key naming convention + TTL policy (seconds).
 *
 * Pattern: travelplan:{domain}:{entity}:{id|hash}[:field]
 * Never include passwords, JWT, or raw PII secrets in keys/values.
 */
import crypto from "crypto"

export const KEY_PREFIX = "travelplan"

/** TTL policy (seconds) */
export const TTL = Object.freeze({
  AI: 24 * 60 * 60, // 24h
  WEATHER: 10 * 60, // 10m
  MAPS: 24 * 60 * 60, // 24h
  PLACES: 24 * 60 * 60, // 24h
  FLIGHT: 5 * 60, // 5m
  BOOKING_SEARCH: 5 * 60, // 5m
  TRIP_DASHBOARD: 5 * 60, // 5m
  ANALYTICS: 15 * 60, // 15m
  EXPENSE: 10 * 60, // 10m
  SEARCH: 60 * 60, // 1h
  NOTIFICATION_UNREAD: 2 * 60, // 2m
  NOTIFICATION_RECENT: 2 * 60,
  RATE_LIMIT: 60 * 60, // default window max
  SOCKET_BUFFER: 5 * 60,
})

export function hashPayload(input) {
  const raw = typeof input === "string" ? input : JSON.stringify(input ?? "")
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32)
}

function join(...parts) {
  return [KEY_PREFIX, ...parts.map((p) => String(p).replace(/:/g, "_"))].join(":")
}

export const RedisKeys = {
  // AI — hash prompts before caching
  aiItinerary: (promptHash) => join("ai", "itinerary", promptHash),
  aiPacking: (promptHash) => join("ai", "packing", promptHash),
  aiTripSummary: (promptHash) => join("ai", "trip_summary", promptHash),
  aiRisk: (promptHash) => join("ai", "risk", promptHash),
  aiBudget: (promptHash) => join("ai", "budget", promptHash),
  aiCopilot: (promptHash) => join("ai", "copilot", promptHash),
  aiGeneric: (promptHash) => join("ai", "llm", promptHash),

  // Weather
  weatherCurrent: (placeHash) => join("weather", "current", placeHash),
  weatherForecast: (placeHash) => join("weather", "forecast", placeHash),

  // Google Maps
  mapsGeocode: (queryHash) => join("maps", "geocode", queryHash),
  mapsReverse: (coordHash) => join("maps", "reverse", coordHash),
  mapsDirections: (routeHash) => join("maps", "directions", routeHash),
  mapsDistance: (matrixHash) => join("maps", "distance", matrixHash),

  // Google Places
  placesNearby: (paramsHash) => join("places", "nearby", paramsHash),
  placesHotels: (paramsHash) => join("places", "hotels", paramsHash),
  placesRestaurants: (paramsHash) => join("places", "restaurants", paramsHash),
  placesAttractions: (paramsHash) => join("places", "attractions", paramsHash),
  placesHospitals: (paramsHash) => join("places", "hospitals", paramsHash),
  placesCafes: (paramsHash) => join("places", "cafes", paramsHash),

  // Flight tracking
  flightStatus: (flightHash) => join("flight", "status", flightHash),
  flightAirport: (code) => join("flight", "airport", String(code).toUpperCase()),

  // Booking search
  bookingHotels: (paramsHash) => join("booking", "hotels", paramsHash),
  bookingFlights: (paramsHash) => join("booking", "flights", paramsHash),
  bookingBus: (paramsHash) => join("booking", "bus", paramsHash),
  bookingTrain: (paramsHash) => join("booking", "train", paramsHash),
  bookingActivities: (paramsHash) => join("booking", "activities", paramsHash),

  // Trip dashboard
  tripSummary: (userId, tripId) => join("trip", "summary", userId, tripId),
  tripHealth: (userId, tripId) => join("trip", "health", userId, tripId),
  tripScheduleToday: (userId, tripId, ymd) => join("trip", "schedule", userId, tripId, ymd),
  tripUpcomingBookings: (userId, tripId) => join("trip", "upcoming", userId, tripId),
  tripDashboard: (userId, tripId) => join("trip", "dashboard", userId, tripId || "all"),

  // Analytics
  analyticsDashboard: (userId) => join("analytics", "dashboard", userId),
  analyticsScore: (userId) => join("analytics", "score", userId),
  analyticsExpense: (userId) => join("analytics", "expense", userId),
  analyticsCharts: (userId) => join("analytics", "charts", userId),

  // Expense tracker
  expenseSummary: (userId, tripId) => join("expense", "summary", userId, tripId),
  expenseBudget: (userId, tripId) => join("expense", "budget", userId, tripId),
  expenseCategories: (userId, tripId) => join("expense", "categories", userId, tripId),

  // Search
  searchDestination: (qHash) => join("search", "destination", qHash),
  searchAutocomplete: (qHash) => join("search", "autocomplete", qHash),
  searchRecent: (userId) => join("search", "recent", userId),

  // Notifications
  notifUnread: (userId) => join("notif", "unread", userId),
  notifRecent: (userId) => join("notif", "recent", userId),
  notifSocketBuffer: (userId) => join("notif", "socket_buf", userId),
  notifQueue: () => join("notif", "queue"),

  // Rate limiting
  rateLimit: (bucket, id) => join("rl", bucket, id),

  // Patterns for invalidation (SCAN)
  patternTripUser: (userId) => `${KEY_PREFIX}:trip:*:${userId}:*`,
  patternTripId: (tripId) => `${KEY_PREFIX}:trip:*:*:${tripId}*`,
  patternExpenseUserTrip: (userId, tripId) => `${KEY_PREFIX}:expense:*:${userId}:${tripId}`,
  patternAnalyticsUser: (userId) => `${KEY_PREFIX}:analytics:*:${userId}`,
  patternNotifUser: (userId) => `${KEY_PREFIX}:notif:*:${userId}`,
  patternAiAll: () => `${KEY_PREFIX}:ai:*`,
  patternWeather: () => `${KEY_PREFIX}:weather:*`,
  patternUserProfile: (userId) => `${KEY_PREFIX}:*:${userId}*`,
}

export default RedisKeys
