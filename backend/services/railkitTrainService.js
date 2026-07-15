import { configure, searchTrainBetweenStations, fareLookup } from "railkit"
import { resolveOriginStation, resolveDestinationStation } from "../utils/stationResolver.js"
import { enrichTrainsWithBooking } from "./bookingEnrichmentService.js"

let configured = false

export function isRailkitConfigured() {
  return Boolean(process.env.RAILKIT_API_KEY?.trim() || process.env.IRCTC_API_KEY?.trim())
}

function ensureConfigured() {
  const key = process.env.RAILKIT_API_KEY?.trim() || process.env.IRCTC_API_KEY?.trim()
  if (!key) return false
  if (!configured) {
    configure(key)
    configured = true
  }
  return true
}

export function defaultJourneyDate(offsetDays = 30) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

const CLASS_LABEL = {
  SL: "Sleeper",
  "2S": "Second Seating",
  "3A": "AC 3 Tier",
  "3E": "AC 3 Tier Economy",
  "2A": "AC 2 Tier",
  "1A": "First AC",
  CC: "AC Chair Car",
  EC: "Executive Class",
}

function pickTravelClass(trainName = "") {
  const name = String(trainName).toUpperCase()
  if (name.includes("RAJDHANI") || name.includes("SHATABDI") || name.includes("VANDE BHARAT")) {
    return { code: "3A", label: "AC 3 Tier" }
  }
  if (name.includes("GARIB") || name.includes("PASSENGER")) {
    return { code: "SL", label: "Sleeper" }
  }
  return { code: "SL", label: "Sleeper" }
}

function parseDurationToMinutes(travelTime) {
  const raw = String(travelTime || "")
  let hours = 0
  let mins = 0
  const hMatch = raw.match(/(\d+)\s*h/i)
  const mMatch = raw.match(/(\d+)\s*m/i)
  if (hMatch) hours = Number(hMatch[1])
  if (mMatch) mins = Number(mMatch[1])
  if (!hMatch && !mMatch) {
    const parts = raw.split(":")
    if (parts.length >= 2) {
      hours = Number(parts[0]) || 0
      mins = Number(parts[1]) || 0
    }
  }
  return hours * 60 + mins || null
}

/**
 * Fetch real IRCTC fares via RailKit (requires RAILKIT_API_KEY).
 */
export async function fetchRailkitTrains({
  destination,
  origin,
  date,
  passengers = 1,
}) {
  if (!ensureConfigured()) return []

  const fromCode = resolveOriginStation(origin || process.env.AVAILABILITY_ORIGIN_CITY || "Delhi")
  const toCode = resolveDestinationStation(destination)
  if (!fromCode || !toCode) {
    console.warn(`[railkit] Could not resolve station codes for ${origin || "Delhi"} → ${destination}`)
    return []
  }

  const journeyDate = date && /^\d{2}-\d{2}-\d{4}$/.test(String(date)) ? String(date) : defaultJourneyDate()

  const search = await searchTrainBetweenStations(fromCode, toCode)
  if (!search?.success || !Array.isArray(search.data) || search.data.length === 0) {
    return []
  }

  const pax = Math.min(9, Math.max(1, Number(passengers) || 1))
  const results = []

  for (const train of search.data.slice(0, 6)) {
    const travelClass = pickTravelClass(train.train_name)
    try {
      const fareRes = await fareLookup(
        String(train.train_no),
        train.from_stn_code || fromCode,
        train.to_stn_code || toCode,
        journeyDate,
        travelClass.code,
        "GN",
      )

      const fare = fareRes?.success ? fareRes.data : null
      const totalFare = fare?.totalFare ?? null
      if (totalFare == null) continue

      results.push({
        id: `railkit-${train.train_no}-${travelClass.code}`,
        operator: "Indian Railways",
        trainName: train.train_name,
        trainNumber: train.train_no,
        origin: train.from_stn_name || origin,
        originCode: train.from_stn_code || fromCode,
        destination: train.to_stn_name || destination,
        destinationCode: train.to_stn_code || toCode,
        date: journeyDate,
        departure: train.from_time || "",
        arrival: train.to_time || "",
        durationMinutes: parseDurationToMinutes(train.travel_time),
        price: totalFare * pax,
        pricePerPassenger: totalFare,
        passengers: pax,
        currency: "INR",
        travelClass: CLASS_LABEL[travelClass.code] || travelClass.label,
        distanceKm: Number(train.distance) || null,
        isEstimate: false,
        priceLabel: "IRCTC fare",
        availability: "available",
        availabilityLabel: "Live fare",
        seatsLeft: null,
        fareBreakdown: {
          baseFare: fare.baseFare,
          reservation: fare.reservation,
          superfast: fare.superfast,
          catering: fare.catering,
          dynamicFare: fare.dynamicFare,
          gst: fare.gst,
          totalFare: fare.totalFare,
        },
        source: "railkit",
        bookingProvider: "IRCTC",
      })
    } catch (err) {
      console.warn(`[railkit] fare lookup failed for ${train.train_no}:`, err.message)
    }
  }

  return enrichTrainsWithBooking(results)
}
