/**
 * Deterministic mock availability/pricing for demo (not real inventory).
 */

import { enrichFlightsWithBooking, enrichHotelsWithBooking, enrichTrainsWithBooking, enrichBusesWithBooking } from "./bookingEnrichmentService.js"
import {
  estimateTrainFare,
  estimateBusFare,
  estimateTrainDurationMinutes,
  estimateBusDurationMinutes,
  addMinutesToTime,
  resolveTransportCurrency,
} from "../utils/transportPricing.js"

function hashSeed(input) {
  const s = String(input || "")
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function pick(rng, list) {
  if (!list?.length) return null
  return list[rng % list.length]
}

function availabilityFromRng(rng) {
  const mod = rng % 100
  if (mod < 72) return { status: "available", label: "Available" }
  if (mod < 92) return { status: "limited", label: "Limited" }
  return { status: "unavailable", label: "Sold out" }
}

const AIRLINES = [
  { name: "IndiGo", code: "6E" },
  { name: "Air India", code: "AI" },
  { name: "SpiceJet", code: "SG" },
  { name: "Vistara", code: "UK" },
  { name: "Akasa Air", code: "QP" },
]

const ORIGIN_CITIES = [
  { city: "Delhi", code: "DEL" },
  { city: "Mumbai", code: "BOM" },
  { city: "Bangalore", code: "BLR" },
  { city: "Hyderabad", code: "HYD" },
  { city: "Kolkata", code: "CCU" },
]

function destCode(destination) {
  const d = String(destination || "India").trim()
  const rng = hashSeed(d)
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  return letters[rng % 26] + letters[(rng >> 3) % 26] + letters[(rng >> 6) % 26]
}

/**
 * @param {{ destination?: string, checkIn?: string, nights?: number, name?: string, currency?: string }} params
 */
export function mockHotels({
  destination = "India",
  checkIn,
  nights = 1,
  name,
  currency = "USD",
}) {
  const dest = String(destination).trim() || "India"
  const nightCount = Math.min(14, Math.max(1, Number(nights) || 1))
  const baseRng = hashSeed(`${dest}|${checkIn || "any"}|${nightCount}`)

  const hotelNames = name
    ? [String(name).trim(), `${String(name).trim()} Premium`, `Grand ${dest.split(",")[0].trim()} Hotel`]
    : [
        `${dest.split(",")[0].trim()} Heritage Hotel`,
        `${dest.split(",")[0].trim()} Riverside Resort`,
        `City Center Inn — ${dest.split(",")[0].trim()}`,
      ]

  return enrichHotelsWithBooking(
    hotelNames.map((hotelName, index) => {
    const rng = hashSeed(`${hotelName}|${dest}|${index}`)
    const avail = availabilityFromRng(rng)
    const pricePerNight = 45 + (rng % 180) + index * 12
    const roomsLeft = avail.status === "unavailable" ? 0 : 1 + (rng % 8)

    return {
      id: `mock-hotel-${hashSeed(hotelName) % 100000}`,
      name: hotelName,
      destination: dest,
      location: dest,
      checkIn: checkIn || null,
      nights: nightCount,
      pricePerNight,
      totalPrice: pricePerNight * nightCount,
      currency,
      availability: avail.status,
      availabilityLabel: avail.label,
      roomsLeft,
      rating: 3 + (rng % 3) * 0.5,
      amenities: pick(rng, [
        ["Free WiFi", "Breakfast", "Parking"],
        ["Pool", "Spa", "Airport shuttle"],
        ["Restaurant", "Gym", "Room service"],
      ]),
    }
  }),
  )
}

/**
 * @param {{ destination?: string, origin?: string, date?: string, passengers?: number, currency?: string }} params
 */
export function mockFlights({
  destination = "India",
  origin,
  date,
  passengers = 1,
  currency = "USD",
}) {
  const dest = String(destination).trim() || "India"
  const destCity = dest.split(",")[0].trim()
  const destIata = destCode(dest)
  const originEntry =
    ORIGIN_CITIES.find((o) => o.city.toLowerCase() === String(origin || "").toLowerCase()) ||
    ORIGIN_CITIES[hashSeed(dest) % ORIGIN_CITIES.length]
  const pax = Math.min(9, Math.max(1, Number(passengers) || 1))

  const options = []
  for (let i = 0; i < 4; i += 1) {
    const rng = hashSeed(`${originEntry.code}|${destIata}|${date || "flex"}|${i}`)
    const airline = pick(rng, AIRLINES)
    const avail = availabilityFromRng(rng + i)
    const basePrice = 65 + (rng % 220) + i * 18
    const depHour = 6 + ((rng % 14) + i * 2) % 16
    const depMin = (rng % 4) * 15
    const durationMin = 75 + (rng % 150)
    const arrTotal = depHour * 60 + depMin + durationMin
    const arrHour = Math.floor(arrTotal / 60) % 24
    const arrMin = arrTotal % 60

    options.push({
      id: `mock-flight-${rng % 100000}`,
      airline: airline.name,
      flightNumber: `${airline.code}-${100 + (rng % 900)}`,
      origin: originEntry.city,
      originCode: originEntry.code,
      destination: destCity,
      destinationCode: destIata,
      date: date || null,
      departure: `${String(depHour).padStart(2, "0")}:${String(depMin).padStart(2, "0")}`,
      arrival: `${String(arrHour).padStart(2, "0")}:${String(arrMin).padStart(2, "0")}`,
      durationMinutes: durationMin,
      price: basePrice * pax,
      pricePerPassenger: basePrice,
      passengers: pax,
      currency,
      availability: avail.status,
      availabilityLabel: avail.label,
      seatsLeft: avail.status === "unavailable" ? 0 : 2 + (rng % 14),
      cabin: i === 0 ? "Economy" : pick(rng, ["Economy", "Premium Economy", "Business"]),
    })
  }

  return enrichFlightsWithBooking(
    options.sort((a, b) => a.price - b.price),
  )
}

/**
 * @param {{ destination?: string, names?: string, day?: number, currency?: string }} params
 */
export function mockActivities({
  destination = "India",
  names,
  day,
  currency = "USD",
}) {
  const dest = String(destination).trim() || "India"
  const activityNames = String(names || "")
    .split("|")
    .map((n) => n.trim())
    .filter(Boolean)

  const defaults =
    activityNames.length > 0
      ? activityNames
      : [
          `${dest.split(",")[0].trim()} guided tour`,
          "Local food walk",
          "Sunset viewpoint visit",
        ]

  return defaults.map((activityName, index) => {
    const rng = hashSeed(`${activityName}|${dest}|${day || 0}|${index}`)
    const avail = availabilityFromRng(rng)
    const basePrice = 12 + (rng % 85)
    const slots = avail.status === "unavailable" ? 0 : 1 + (rng % 12)
    const hour = 9 + ((rng + index) % 9)

    return {
      id: `mock-activity-${rng % 100000}`,
      name: activityName,
      destination: dest,
      day: day != null ? Number(day) : null,
      price: basePrice,
      currency,
      availability: avail.status,
      availabilityLabel: avail.label,
      slotsLeft: slots,
      nextSlot: avail.status === "unavailable" ? null : `${String(hour).padStart(2, "0")}:00`,
      instantConfirmation: rng % 3 !== 0,
    }
  })
}

const TRAIN_NAMES = [
  "Rajdhani Express",
  "Shatabdi Express",
  "Vande Bharat Express",
  "Duronto Express",
  "Garib Rath",
]

const BUS_TYPES = [
  "Volvo AC Sleeper",
  "AC Seater",
  "Multi-Axle AC Sleeper",
  "Bharat Benz AC",
  "Scania AC Semi-Sleeper",
]

/**
 * @param {{ destination?: string, origin?: string, date?: string, passengers?: number, currency?: string }} params
 */
export function mockTrains({
  destination = "India",
  origin,
  date,
  passengers = 1,
  currency = "USD",
}) {
  const dest = String(destination).trim() || "India"
  const destCity = dest.split(",")[0].trim()
  const destIata = destCode(dest)
  const originEntry =
    ORIGIN_CITIES.find((o) => o.city.toLowerCase() === String(origin || "").toLowerCase()) ||
    ORIGIN_CITIES[hashSeed(dest) % ORIGIN_CITIES.length]
  const pax = Math.min(9, Math.max(1, Number(passengers) || 1))
  const fareCurrency = resolveTransportCurrency(dest, currency)

  const options = []
  for (let i = 0; i < 5; i += 1) {
    const rng = hashSeed(`${originEntry.code}|${destIata}|train|${date || "flex"}|${i}`)
    const trainName = pick(rng, TRAIN_NAMES)
    const avail = availabilityFromRng(rng + i)
    const travelClass = pick(rng, ["Sleeper", "AC 3 Tier", "AC 2 Tier", "AC Chair Car"])
    const fare = estimateTrainFare({
      origin: originEntry.city,
      destination: destCity,
      travelClass,
      passengers: pax,
      currency: fareCurrency,
      seed: i,
    })
    const depHour = 5 + ((rng % 16) + i * 3) % 18
    const depMin = (rng % 4) * 15
    const departure = `${String(depHour).padStart(2, "0")}:${String(depMin).padStart(2, "0")}`
    const durationMin = estimateTrainDurationMinutes(originEntry.city, destCity, i)
    const arrival = addMinutesToTime(departure, durationMin)

    options.push({
      id: `mock-train-${rng % 100000}`,
      operator: "Indian Railways",
      trainName,
      origin: originEntry.city,
      originCode: originEntry.code,
      destination: destCity,
      destinationCode: destIata,
      date: date || null,
      departure,
      arrival,
      durationMinutes: durationMin,
      price: fare.price,
      pricePerPassenger: fare.pricePerPassenger,
      passengers: pax,
      currency: fare.currency,
      travelClass,
      distanceKm: fare.distanceKm,
      isEstimate: true,
      priceLabel: fare.priceLabel,
      availability: avail.status,
      availabilityLabel: avail.label,
      seatsLeft: avail.status === "unavailable" ? 0 : 5 + (rng % 40),
    })
  }

  return enrichTrainsWithBooking(
    options.sort((a, b) => a.price - b.price),
  )
}

/**
 * @param {{ destination?: string, origin?: string, date?: string, passengers?: number, currency?: string }} params
 */
export function mockBuses({
  destination = "India",
  origin,
  date,
  passengers = 1,
  currency = "USD",
}) {
  const dest = String(destination).trim() || "India"
  const destCity = dest.split(",")[0].trim()
  const originEntry =
    ORIGIN_CITIES.find((o) => o.city.toLowerCase() === String(origin || "").toLowerCase()) ||
    ORIGIN_CITIES[(hashSeed(dest) + 1) % ORIGIN_CITIES.length]
  const pax = Math.min(9, Math.max(1, Number(passengers) || 1))
  const fareCurrency = resolveTransportCurrency(dest, currency)

  const options = []
  for (let i = 0; i < 5; i += 1) {
    const rng = hashSeed(`${originEntry.code}|${destCity}|bus|${date || "flex"}|${i}`)
    const busType = pick(rng, BUS_TYPES)
    const avail = availabilityFromRng(rng + i)
    const fare = estimateBusFare({
      origin: originEntry.city,
      destination: destCity,
      busType,
      passengers: pax,
      currency: fareCurrency,
      seed: i,
    })
    const depHour = 6 + ((rng % 14) + i * 2) % 16
    const depMin = (rng % 4) * 15
    const departure = `${String(depHour).padStart(2, "0")}:${String(depMin).padStart(2, "0")}`
    const durationMin = estimateBusDurationMinutes(originEntry.city, destCity, i)
    const arrival = addMinutesToTime(departure, durationMin)

    options.push({
      id: `mock-bus-${rng % 100000}`,
      operator: busType,
      busType,
      origin: originEntry.city,
      destination: destCity,
      date: date || null,
      departure,
      arrival,
      durationMinutes: durationMin,
      price: fare.price,
      pricePerPassenger: fare.pricePerPassenger,
      passengers: pax,
      currency: fare.currency,
      distanceKm: fare.distanceKm,
      isEstimate: true,
      priceLabel: fare.priceLabel,
      availability: avail.status,
      availabilityLabel: avail.label,
      seatsLeft: avail.status === "unavailable" ? 0 : 3 + (rng % 18),
    })
  }

  return enrichBusesWithBooking(
    options.sort((a, b) => a.price - b.price),
  )
}
