import OAuth from "oauth-1.0a"
import crypto from "crypto"
import { enrichBusesWithBooking } from "./bookingEnrichmentService.js"
import { defaultJourneyDate } from "./railkitTrainService.js"

/** redBus / SeatSeller city IDs (partner API). */
const REDBUS_CITY_IDS = {
  delhi: 733,
  "new delhi": 733,
  mumbai: 462,
  bombay: 462,
  bangalore: 122,
  bengaluru: 122,
  chennai: 123,
  madras: 123,
  hyderabad: 124,
  kolkata: 457,
  calcutta: 457,
  goa: 4244,
  panaji: 4244,
  madgaon: 4244,
  pune: 130,
  jaipur: 548,
  ahmedabad: 285,
  surat: 820,
  indore: 551,
  bhopal: 755,
  lucknow: 732,
  varanasi: 836,
  amritsar: 278,
  chandigarh: 807,
  kochi: 707,
  cochin: 707,
  ernakulam: 707,
  thiruvananthapuram: 714,
  trivandrum: 714,
  udaipur: 840,
  nagpur: 614,
  patna: 739,
  ranchi: 826,
  guwahati: 452,
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function cityKey(place) {
  return String(place || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
}

function resolveRedBusCityId(place) {
  const key = cityKey(place)
  if (REDBUS_CITY_IDS[key]) return REDBUS_CITY_IDS[key]
  for (const [pattern, id] of Object.entries(REDBUS_CITY_IDS)) {
    if (key.includes(pattern) || pattern.includes(key)) return id
  }
  return null
}

function toSeatSellerDoj(ddMmYyyy) {
  const [dd, mm, yyyy] = String(ddMmYyyy).split("-")
  const month = MONTHS[Number(mm) - 1]
  if (!month) return null
  return `${dd}-${month}-${yyyy}`
}

function parseTimeToMinutes(timeStr) {
  const raw = String(timeStr || "")
  const m = raw.match(/(\d{1,2}):(\d{2})/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function minutesToHhmm(total) {
  const t = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function isSeatSellerConfigured() {
  return Boolean(
    process.env.SEATSELLER_CONSUMER_KEY?.trim() && process.env.SEATSELLER_CONSUMER_SECRET?.trim(),
  )
}

function buildOAuthClient() {
  return OAuth({
    consumer: {
      key: process.env.SEATSELLER_CONSUMER_KEY.trim(),
      secret: process.env.SEATSELLER_CONSUMER_SECRET.trim(),
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64")
    },
  })
}

async function signedGet(url, query = {}) {
  const oauth = buildOAuthClient()
  const token = {
    key: process.env.SEATSELLER_ACCESS_TOKEN?.trim() || "",
    secret: process.env.SEATSELLER_ACCESS_TOKEN_SECRET?.trim() || "",
  }

  const requestData = { url, method: "GET", data: query }
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token))
  const qs = new URLSearchParams(query).toString()
  const fullUrl = qs ? `${url}?${qs}` : url

  const res = await fetch(fullUrl, {
    headers: { ...authHeader, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`SeatSeller ${res.status}: ${text.slice(0, 200)}`)
  }

  return res.json()
}

/**
 * Live bus inventory from redBus SeatSeller partner API.
 * Register at https://partner.redbus.in / SeatSeller for credentials.
 */
export async function fetchSeatSellerBuses({ destination, origin, date, passengers = 1 }) {
  if (!isSeatSellerConfigured()) return []

  const sourceId = resolveRedBusCityId(origin || process.env.AVAILABILITY_ORIGIN_CITY || "Delhi")
  const destId = resolveRedBusCityId(destination)
  if (!sourceId || !destId) {
    console.warn(`[seatseller] Missing city IDs for ${origin} → ${destination}`)
    return []
  }

  const doj = toSeatSellerDoj(date && /^\d{2}-\d{2}-\d{4}$/.test(String(date)) ? date : defaultJourneyDate())
  if (!doj) return []

  const baseUrl = (process.env.SEATSELLER_API_BASE || "https://api.seatseller.travel").replace(/\/+$/, "")
  const payload = await signedGet(`${baseUrl}/availabletrips`, {
    source: String(sourceId),
    destination: String(destId),
    doj,
  })

  const trips = payload?.availableTrips || payload?.inventories || payload?.data || []
  if (!Array.isArray(trips) || trips.length === 0) return []

  const pax = Math.min(9, Math.max(1, Number(passengers) || 1))
  const originCity = cityKey(origin || "Delhi")
  const destCity = cityKey(destination)

  const mapped = trips.slice(0, 8).map((trip, index) => {
    const fares = trip.fareList || trip.fares || []
    const minFare = Array.isArray(fares)
      ? fares.reduce((min, f) => {
          const n = Number(f?.fare ?? f?.amount ?? f)
          return Number.isFinite(n) && n > 0 ? Math.min(min, n) : min
        }, Infinity)
      : Number(trip.fare || trip.minFare)

    const price = Number.isFinite(minFare) && minFare !== Infinity ? minFare : null
    const dep = trip.departureTime || trip.depTime || trip.departure || ""
    const arr = trip.arrivalTime || trip.arrTime || trip.arrival || ""
    const depMin = parseTimeToMinutes(dep)
    const arrMin = parseTimeToMinutes(arr)

    return {
      id: trip.id || trip.availableTripId || `seatseller-bus-${index}`,
      operator: trip.travelsName || trip.operatorName || trip.travels || "Bus operator",
      busType: trip.busType || trip.busTypeName || "AC",
      origin: originCity,
      destination: destCity,
      date: doj,
      departure: depMin != null ? minutesToHhmm(depMin) : String(dep).slice(0, 5),
      arrival: arrMin != null ? minutesToHhmm(arrMin) : String(arr).slice(0, 5),
      durationMinutes: depMin != null && arrMin != null ? (arrMin - depMin + 24 * 60) % (24 * 60) : null,
      price: price != null ? price * pax : null,
      pricePerPassenger: price,
      passengers: pax,
      currency: "INR",
      isEstimate: false,
      priceLabel: "redBus fare",
      availability: trip.availableSeats > 0 ? "available" : "limited",
      availabilityLabel: trip.availableSeats > 0 ? "Available" : "Limited",
      seatsLeft: trip.availableSeats ?? null,
      source: "redbus-seatseller",
      bookingProvider: "redBus",
      bookingLink: trip.bookingLink || trip.detailsUrl || null,
    }
  })

  return enrichBusesWithBooking(mapped.filter((b) => b.price != null))
}
