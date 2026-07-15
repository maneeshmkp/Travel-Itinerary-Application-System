import { createHash } from "crypto"
import { haversineKm } from "./itineraryOptimizer.js"
import { normalizeDestination, lookupDestinationCoordinates } from "./geocodingQueryBuilder.js"
import { roundMoney } from "./expenseCalculations.js"
import { TRAVEL_SCORE_LABELS } from "../constants/travelAnalytics.js"

export { roundMoney }

export function parseGeoFromDestination(destination = "") {
  const normalized = normalizeDestination(destination)
  const blob = normalized.raw.toLowerCase()
  let country = "Unknown"
  let state = null

  if (/thailand|phuket|krabi|bangkok/.test(blob)) country = "Thailand"
  else if (/bali|indonesia/.test(blob)) country = "Indonesia"
  else if (/dubai|uae|emirates/.test(blob)) country = "United Arab Emirates"
  else if (/singapore/.test(blob)) country = "Singapore"
  else if (/nepal|kathmandu/.test(blob)) country = "Nepal"
  else if (/sri lanka|colombo/.test(blob)) country = "Sri Lanka"
  else if (/maldives/.test(blob)) country = "Maldives"
  else if (
    /india|goa|agra|jaipur|mumbai|delhi|kashmir|odisha|shimla|manali|kerala|tamil nadu|uttar pradesh|rajasthan|himachal|west bengal|punjab|gujarat|maharashtra|karnataka|andhra|telangana|bihar|assam|meghalaya|sikkim|uttarakhand|madhya pradesh/.test(
      blob,
    )
  ) {
    country = "India"
    if (/kerala|alleppey|munnar|kochi/.test(blob)) state = "Kerala"
    else if (/kashmir|jammu|srinagar|gulmarg|pahalgam|katra/.test(blob)) state = "Jammu and Kashmir"
    else if (/rajasthan|jaipur|udaipur|jodhpur/.test(blob)) state = "Rajasthan"
    else if (/goa/.test(blob)) state = "Goa"
    else if (/himachal|shimla|manali|dharamshala/.test(blob)) state = "Himachal Pradesh"
    else if (/uttarakhand|rishikesh|nainital/.test(blob)) state = "Uttarakhand"
    else if (/tamil nadu|madurai|rameswaram|ooty/.test(blob)) state = "Tamil Nadu"
    else if (/maharashtra|mumbai|pune/.test(blob)) state = "Maharashtra"
    else if (/odisha|puri|bhubaneswar/.test(blob)) state = "Odisha"
    else if (/west bengal|kolkata|darjeeling/.test(blob)) state = "West Bengal"
    else if (/delhi|noida|gurgaon/.test(blob)) state = "Delhi NCR"
  }

  const cities = normalized.cities.length ? normalized.cities : normalized.primaryCity ? [normalized.primaryCity] : []

  return { country, state, cities, primaryCity: normalized.primaryCity || cities[0] || "" }
}

export function deriveTripStatus(trip, bookings = []) {
  const tripBookings = bookings.filter((b) => String(b.tripId) === String(trip._id))
  if (tripBookings.length > 0 && tripBookings.every((b) => b.status === "cancelled")) {
    return "cancelled"
  }

  if (!trip.startDate) return trip.createdAt ? "planned" : "planned"

  const start = new Date(trip.startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + Math.max(1, Number(trip.totalDays) || 1) - 1)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (end < now) return "completed"
  if (start > now) return "upcoming"
  return "active"
}

export function computeTripDistanceKm(trip) {
  const points = []
  const days = trip.days || []
  for (const day of days) {
    const activities = day.activities || []
    for (const act of activities) {
      if (act?.skipped) continue
      const lat = Number(act.latitude)
      const lng = Number(act.longitude)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        points.push({ lat, lng })
      }
    }
  }

  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
  }
  return Math.round(total * 10) / 10
}

export function buildAnalysisHash(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16)
}

export function computeTravelScore({
  completedTrips = 0,
  totalTrips = 0,
  budgetHealthAvg = 70,
  averageRating = 0,
  packingCompletionAvg = 0,
  countriesCount = 0,
  reviewCount = 0,
  moneySaved = 0,
} = {}) {
  let score = 50

  const completionRate = totalTrips > 0 ? completedTrips / totalTrips : 0
  score += Math.min(20, completionRate * 20)

  score += Math.min(15, (budgetHealthAvg / 100) * 15)
  score += averageRating > 0 ? Math.min(10, (averageRating / 5) * 10) : 0
  score += Math.min(10, (packingCompletionAvg / 100) * 10)
  score += Math.min(10, Math.min(countriesCount, 5) * 2)
  score += reviewCount >= 3 ? 5 : reviewCount >= 1 ? 2 : 0
  score += moneySaved > 5000 ? 5 : moneySaved > 1000 ? 3 : 0

  score = Math.max(0, Math.min(100, Math.round(score)))

  let label = TRAVEL_SCORE_LABELS.needsImprovement
  if (score >= 90) label = TRAVEL_SCORE_LABELS.excellent
  else if (score >= 75) label = TRAVEL_SCORE_LABELS.veryGood
  else if (score >= 60) label = TRAVEL_SCORE_LABELS.good

  return { score, label }
}

export function buildHeatmapEntries(trips = []) {
  const map = new Map()

  for (const trip of trips) {
    const geo = parseGeoFromDestination(trip.destination)
    const coords = lookupDestinationCoordinates(trip.destination)
    for (const city of geo.cities.length ? geo.cities : [geo.primaryCity].filter(Boolean)) {
      const key = `${geo.country}|${geo.state || ""}|${city}`
      const existing = map.get(key) || {
        country: geo.country,
        state: geo.state,
        city,
        count: 0,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      }
      existing.count += 1
      map.set(key, existing)
    }
    if (!geo.cities.length && !geo.primaryCity && geo.country) {
      const key = `${geo.country}|${geo.state || ""}|`
      const existing = map.get(key) || {
        country: geo.country,
        state: geo.state,
        city: "",
        count: 0,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      }
      existing.count += 1
      map.set(key, existing)
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count)
}

export function buildTimeline(trips = []) {
  return [...trips]
    .sort((a, b) => {
      const da = a.startDate ? new Date(a.startDate) : new Date(a.createdAt)
      const db = b.startDate ? new Date(b.startDate) : new Date(b.createdAt)
      return da - db
    })
    .map((t) => ({
      id: String(t._id),
      title: t.title,
      destination: t.destination,
      year: (t.startDate ? new Date(t.startDate) : new Date(t.createdAt)).getFullYear(),
      date: t.startDate || t.createdAt,
      totalDays: t.totalDays,
      status: t._derivedStatus,
    }))
}

export function groupByMonth(items, dateField = "date", valueField = "value") {
  const map = new Map()
  for (const item of items) {
    const d = new Date(item[dateField])
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    map.set(key, roundMoney((map.get(key) || 0) + Number(item[valueField] || 0)))
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }))
}

export { parseGeoFromDestination as extractTripGeo }

export function serializeTravelAnalytics(doc) {
  if (!doc) return null
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc
  return {
    id: String(o._id),
    userId: String(o.userId),
    totalTrips: o.totalTrips,
    completedTrips: o.completedTrips,
    cancelledTrips: o.cancelledTrips,
    upcomingTrips: o.upcomingTrips,
    countriesVisited: o.countriesVisited || [],
    statesVisited: o.statesVisited || [],
    citiesVisited: o.citiesVisited || [],
    totalTravelDays: o.totalTravelDays,
    totalSpent: o.totalSpent,
    averageBudget: o.averageBudget,
    averageActualExpense: o.averageActualExpense,
    favoriteDestination: o.favoriteDestination,
    favoriteCountry: o.favoriteCountry,
    favoriteCategory: o.favoriteCategory,
    mostExpensiveTrip: o.mostExpensiveTrip,
    cheapestTrip: o.cheapestTrip,
    longestTrip: o.longestTrip,
    shortestTrip: o.shortestTrip,
    totalDistance: o.totalDistance,
    moneySaved: o.moneySaved,
    averageRating: o.averageRating,
    travelScore: o.travelScore,
    travelScoreLabel: o.travelScoreLabel,
    achievements: o.achievements || [],
    charts: o.charts || {},
    heatmap: o.heatmap || [],
    timeline: o.timeline || [],
    insights: o.insights || [],
    aiRecommendations: o.aiRecommendations || {},
    yearComparison: o.yearComparison || {},
    currency: o.currency,
    recalculatedAt: o.recalculatedAt,
    updatedAt: o.updatedAt,
  }
}
