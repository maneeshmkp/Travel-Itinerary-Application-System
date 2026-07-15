import { lookupDestinationCoordinates } from "./geocodingQueryBuilder.js"
import { haversineKm } from "./itineraryOptimizer.js"
import { normalizeDestinationInput } from "./destinationNormalizer.js"

const INR_PER_USD = 83

function hashSeed(input) {
  const s = String(input || "")
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function cityLabel(value) {
  return String(value || "")
    .split(",")[0]
    .trim()
}

export function isIndiaDestination(destination) {
  const d = String(destination || "").toLowerCase()
  if (/\bindia\b/.test(d)) return true
  return /goa|delhi|mumbai|kerala|rajasthan|uttarakhand|karnataka|tamil|maharashtra|bengal|punjab|gujarat|hyderabad|bangalore|chennai|kolkata|jaipur|varanasi|corbett|prayagraj|ladakh|shimla|manali|ooty|munnar|kochi|agra|udaipur|amritsar|pushkar|hampi|mysore|pune|nagpur|lucknow|kanpur|ahmedabad|surat|indore|bhopal|patna|ranchi|guwahati|shillong|gangtok|darjeeling|mcleod|dharamshala|rishikesh|haridwar|nainital|mussoorie|alleppey|kumarakom|thekkady|wayanad|coorg|gokarna|pondicherry|madurai|tirupati|kanyakumari|andaman|lakshadweep/.test(
    d,
  )
}

/**
 * Prefer INR for Indian trips when client sends generic USD default.
 */
export function resolveTransportCurrency(destination, requested) {
  const req = String(requested || "").toUpperCase()
  if (isIndiaDestination(destination)) {
    if (!req || req === "USD") return "INR"
    return req
  }
  return req || "USD"
}

function lookupCityCoords(city) {
  const normalized = normalizeDestinationInput(city)
  return lookupDestinationCoordinates(normalized) || lookupDestinationCoordinates(city)
}

/**
 * Road/rail distance estimate (straight-line × circuit factor).
 */
export function estimateRouteKm(origin, destination) {
  const oCity = cityLabel(origin)
  const dCity = cityLabel(destination)
  if (!oCity || !dCity) return 400
  if (oCity.toLowerCase() === dCity.toLowerCase()) return 25

  const o = lookupCityCoords(oCity)
  const d = lookupCityCoords(dCity)
  if (o?.latitude != null && d?.latitude != null) {
    const straight = haversineKm(o.latitude, o.longitude, d.latitude, d.longitude)
    return Math.max(40, Math.round(straight * 1.28))
  }

  const rng = hashSeed(`${oCity}|${dCity}`)
  return 250 + (rng % 1600)
}

function convertFromInr(amountInr, currency) {
  const cur = String(currency || "INR").toUpperCase()
  if (cur === "INR") return Math.round(amountInr)
  if (cur === "USD") return Math.round((amountInr / INR_PER_USD) * 100) / 100
  return Math.round(amountInr)
}

function fareInrPerKm(mode, tier) {
  const tables = {
    train: {
      Sleeper: [1.15, 1.75],
      "AC 3 Tier": [2.4, 3.2],
      "AC 2 Tier": [4.0, 5.5],
      "AC Chair Car": [5.0, 7.0],
    },
    bus: {
      "Non-AC Seater": [0.75, 1.1],
      "AC Seater": [1.4, 2.0],
      "AC Sleeper": [2.0, 3.0],
      "Volvo AC": [2.4, 3.5],
      "Multi-Axle AC": [2.8, 4.0],
    },
  }
  const modeTable = tables[mode] || {}
  const [lo, hi] = modeTable[tier] || Object.values(modeTable)[0] || [1, 2]
  return { lo, hi }
}

function pickInRange(lo, hi, seed) {
  const t = (seed % 100) / 100
  return lo + t * (hi - lo)
}

/**
 * Realistic India-centric train fare estimate (IRCTC-style ranges).
 */
export function estimateTrainFare({
  origin,
  destination,
  travelClass = "Sleeper",
  passengers = 1,
  currency = "INR",
  seed = 0,
}) {
  const km = estimateRouteKm(origin, destination)
  const { lo, hi } = fareInrPerKm("train", travelClass)
  const perKm = pickInRange(lo, hi, hashSeed(`${origin}|${destination}|train|${travelClass}|${seed}`))
  const minInr = travelClass.includes("AC") ? 450 : 180
  const baseInr = Math.max(minInr, Math.round(km * perKm))
  const cur = resolveTransportCurrency(destination, currency)
  const perPassenger = convertFromInr(baseInr, cur)
  const pax = Math.min(9, Math.max(1, Number(passengers) || 1))

  return {
    pricePerPassenger: perPassenger,
    price: Math.round(perPassenger * pax * 100) / 100,
    passengers: pax,
    currency: cur,
    distanceKm: km,
    isEstimate: true,
    priceLabel: "Est. fare",
  }
}

/**
 * Realistic bus fare estimate (RedBus-style ranges).
 */
export function estimateBusFare({
  origin,
  destination,
  busType = "AC Sleeper",
  passengers = 1,
  currency = "INR",
  seed = 0,
}) {
  const km = estimateRouteKm(origin, destination)
  const { lo, hi } = fareInrPerKm("bus", busType)
  const perKm = pickInRange(lo, hi, hashSeed(`${origin}|${destination}|bus|${busType}|${seed}`))
  const minInr = busType.includes("Volvo") || busType.includes("Multi") ? 500 : 220
  const baseInr = Math.max(minInr, Math.round(km * perKm))
  const cur = resolveTransportCurrency(destination, currency)
  const perPassenger = convertFromInr(baseInr, cur)
  const pax = Math.min(9, Math.max(1, Number(passengers) || 1))

  return {
    pricePerPassenger: perPassenger,
    price: Math.round(perPassenger * pax * 100) / 100,
    passengers: pax,
    currency: cur,
    distanceKm: km,
    isEstimate: true,
    priceLabel: "Est. fare",
  }
}

/**
 * Typical block durations for long-distance India routes.
 */
export function estimateTrainDurationMinutes(origin, destination, seed = 0) {
  const km = estimateRouteKm(origin, destination)
  const avgKmh = 52 + (hashSeed(`${origin}|${destination}|spd`) % 18)
  return Math.max(90, Math.round((km / avgKmh) * 60))
}

export function estimateBusDurationMinutes(origin, destination, seed = 0) {
  const km = estimateRouteKm(origin, destination)
  const avgKmh = 38 + (hashSeed(`${origin}|${destination}|busspd`) % 14)
  return Math.max(120, Math.round((km / avgKmh) * 60))
}

export function formatDurationMinutes(totalMin) {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h >= 24) {
    const d = Math.floor(h / 24)
    const rh = h % 24
    return `${d}d ${rh}h`
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function addMinutesToTime(hhmm, minutes) {
  const [hStr, mStr] = String(hhmm || "08:00").split(":")
  let total = Number(hStr) * 60 + Number(mStr) + minutes
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
