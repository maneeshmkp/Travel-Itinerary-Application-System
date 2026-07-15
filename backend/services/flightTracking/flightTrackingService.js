import FlightStatus from "../../models/FlightStatus.js"
import Booking from "../../models/Booking.js"
import Itinerary from "../../models/Itinerary.js"
import { canAccessTripData } from "../../utils/itineraryAccess.js"
import {
  serializeFlightStatus,
  parseFlightNumberInput,
  extractAirlineFromFlightNumber,
} from "../../utils/flightMapper.js"
import { ACTIVE_FLIGHT_STATUSES, TERMINAL_FLIGHT_STATUSES } from "../../constants/flightStatus.js"
import { fetchLiveFlightStatus } from "./providers/index.js"
import { mergeBaggageIntoStatus } from "../baggageService.js"
import { getAirportInfo, getAirportWeather } from "../airportService.js"
import {
  processFlightNotifications,
  buildItineraryAdjustmentSuggestions,
} from "./flightNotificationService.js"
import { getConfiguredProviderName } from "./flightProvider.js"

function throwStatus(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

async function assertTripAccess(userId, tripId) {
  const trip = await Itinerary.findById(tripId).select("title ownerId collaborators destination")
  if (!trip) throwStatus("Trip not found", 404)
  if (!canAccessTripData(trip, userId)) throwStatus("Not authorized for this trip", 403)
  return trip
}

export async function getLiveStatusByFlightNumber(userId, flightNumber, query = {}) {
  const { withCache, RedisKeys, TTL, stableHash } = await import("../../utils/cacheHelpers.js")
  const fn = parseFlightNumberInput(flightNumber)
  if (!fn) throwStatus("flightNumber is required")

  const key = RedisKeys.flightStatus(
    stableHash({
      fn,
      originCode: query.originCode,
      destinationCode: query.destinationCode,
      departureTime: query.departureTime || query.date,
    }),
  )

  return withCache(key, TTL.FLIGHT, async () => {
    const live = await fetchLiveFlightStatus({
      flightNumber: fn,
      originCode: query.originCode,
      destinationCode: query.destinationCode,
      departureTime: query.departureTime || query.date,
      delayMinutes: query.delayMinutes,
    })

    const merged = mergeBaggageIntoStatus(live)
    const originAirport = getAirportInfo(merged.originCode)
    const destAirport = getAirportInfo(merged.destinationCode)
    const [originWx, destWx] = await Promise.all([
      getAirportWeather(merged.originCode),
      getAirportWeather(merged.destinationCode),
    ])

    return {
      ...merged,
      provider: getConfiguredProviderName(),
      originAirport,
      destinationAirport: destAirport,
      originWeather: originWx,
      destinationWeather: destWx,
    }
  })
}

export async function startTracking(userId, body) {
  const tripId = body.tripId
  if (!tripId) throwStatus("tripId is required")
  const trip = await assertTripAccess(userId, tripId)

  let booking = null
  if (body.bookingId) {
    booking = await Booking.findOne({ _id: body.bookingId, userId, tripId, bookingType: "flight" })
    if (!booking) throwStatus("Flight booking not found", 404)
  }

  const flightNumber = parseFlightNumberInput(body.flightNumber || booking?.flightNumber || booking?.bookingReference)
  if (!flightNumber) throwStatus("flightNumber is required")

  const existing = await FlightStatus.findOne({
    userId,
    tripId,
    flightNumber,
    trackingActive: true,
  })
  if (existing) return enrichFlightRecord(existing)

  const live = await fetchLiveFlightStatus({
    flightNumber,
    originCode: body.originCode || booking?.originCode,
    destinationCode: body.destinationCode || booking?.destinationCode,
    departureTime: body.departureTime || booking?.departureDate,
  })

  const doc = await FlightStatus.create({
    userId,
    tripId,
    bookingId: booking?._id || body.bookingId || null,
    airline: live.airline || booking?.provider || extractAirlineFromFlightNumber(flightNumber),
    flightNumber,
    origin: live.origin || booking?.locationName || "",
    originCode: live.originCode || booking?.originCode || "",
    destination: live.destination || trip.destination || "",
    destinationCode: live.destinationCode || booking?.destinationCode || "",
    departureTime: live.departureTime || booking?.departureDate,
    arrivalTime: live.arrivalTime || booking?.arrivalDate,
    terminal: live.terminal || booking?.terminal || "",
    gate: live.gate || booking?.gate || "",
    boardingTime: live.boardingTime,
    status: live.status,
    baggageClaim: live.baggageClaim || "",
    aircraftType: live.aircraftType || "",
    durationMinutes: live.durationMinutes,
    delayMinutes: live.delayMinutes || 0,
    trackingActive: true,
    provider: live.provider,
    lastUpdated: new Date(),
    metadata: live.metadata || {},
  })

  if (booking) {
    await Booking.findByIdAndUpdate(booking._id, {
      gate: doc.gate,
      terminal: doc.terminal,
      flightNumber: doc.flightNumber,
      originCode: doc.originCode,
      destinationCode: doc.destinationCode,
    })
  }

  return enrichFlightRecord(doc)
}

export async function stopTracking(userId, trackingId) {
  const doc = await FlightStatus.findOne({ _id: trackingId, userId })
  if (!doc) throwStatus("Tracking record not found", 404)
  doc.trackingActive = false
  await doc.save()
  return serializeFlightStatus(doc)
}

export async function refreshFlightRecord(doc, trip = null) {
  const previous = serializeFlightStatus(doc)
  const live = await fetchLiveFlightStatus({
    flightNumber: doc.flightNumber,
    originCode: doc.originCode,
    destinationCode: doc.destinationCode,
    departureTime: doc.departureTime,
    delayMinutes: doc.delayMinutes,
  })
  const merged = mergeBaggageIntoStatus(live)

  if (merged.gate && doc.gate && merged.gate !== doc.gate) {
    doc.previousGate = doc.gate
  }

  Object.assign(doc, {
    airline: merged.airline || doc.airline,
    origin: merged.origin || doc.origin,
    destination: merged.destination || doc.destination,
    departureTime: merged.departureTime || doc.departureTime,
    arrivalTime: merged.arrivalTime || doc.arrivalTime,
    actualDeparture: merged.actualDeparture,
    actualArrival: merged.actualArrival,
    terminal: merged.terminal || doc.terminal,
    gate: merged.gate || doc.gate,
    boardingTime: merged.boardingTime || doc.boardingTime,
    status: merged.status,
    baggageClaim: merged.baggageClaim || doc.baggageClaim,
    aircraftType: merged.aircraftType || doc.aircraftType,
    durationMinutes: merged.durationMinutes || doc.durationMinutes,
    delayMinutes: merged.delayMinutes,
    provider: merged.provider,
    lastUpdated: new Date(),
  })

  if (TERMINAL_FLIGHT_STATUSES.has(doc.status)) {
    doc.trackingActive = false
  }

  const suggestions = buildItineraryAdjustmentSuggestions(serializeFlightStatus(doc), doc.delayMinutes)
  if (suggestions.length) {
    doc.metadata = { ...(doc.metadata || {}), itinerarySuggestions: suggestions }
  }

  await doc.save()

  if (doc.bookingId) {
    await Booking.findByIdAndUpdate(doc.bookingId, {
      gate: doc.gate,
      terminal: doc.terminal,
      status: doc.status === "Cancelled" ? "cancelled" : undefined,
    })
  }

  const current = serializeFlightStatus(doc)
  if (trip) {
    await processFlightNotifications(doc.userId, trip, previous, current)
  }

  if (previous?.status !== current?.status || previous?.delayMinutes !== current?.delayMinutes) {
    try {
      const { publishAsync, DOMAIN_EVENTS } = await import("../../events/index.js")
      publishAsync(
        DOMAIN_EVENTS.FLIGHT_STATUS_CHANGED,
        {
          userId: String(doc.userId),
          tripId: doc.tripId ? String(doc.tripId) : null,
          flightNumber: current.flightNumber || doc.flightNumber,
          status: current.status,
          message: `Flight ${current.flightNumber || ""} is now ${current.status}`,
          skipEventNotification: true,
        },
        {
          source: "flightTrackingService.refresh",
          userId: String(doc.userId),
          dedupeKey: `flight:${doc._id}:${current.status}:${current.delayMinutes || 0}`,
        },
      )
    } catch {
      /* events optional */
    }
  }

  return current
}

async function enrichFlightRecord(doc) {
  const base = serializeFlightStatus(doc)
  const originAirport = getAirportInfo(base.originCode)
  const destAirport = getAirportInfo(base.destinationCode)
  const [originWeather, destinationWeather] = await Promise.all([
    getAirportWeather(base.originCode),
    getAirportWeather(base.destinationCode),
  ])

  return {
    ...base,
    originAirport,
    destinationAirport: destAirport,
    originWeather,
    destinationWeather,
    itinerarySuggestions: base.metadata?.itinerarySuggestions || [],
  }
}

export async function getTripFlights(userId, tripId) {
  await assertTripAccess(userId, tripId)
  const rows = await FlightStatus.find({ userId, tripId }).sort({ departureTime: 1 }).lean()
  const enriched = await Promise.all(rows.map((r) => enrichFlightRecord(r)))
  return { flights: enriched, provider: getConfiguredProviderName() }
}

export async function getTrackingHistory(userId, query = {}) {
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const filter = { userId, trackingActive: false }
  if (query.tripId) filter.tripId = query.tripId

  const rows = await FlightStatus.find(filter).sort({ updatedAt: -1 }).limit(limit).lean()
  return { items: rows.map(serializeFlightStatus) }
}

export async function refreshActiveFlights() {
  const active = await FlightStatus.find({
    trackingActive: true,
    status: { $in: [...ACTIVE_FLIGHT_STATUSES] },
  })

  const tripIds = [...new Set(active.map((d) => String(d.tripId)).filter((id) => id && id !== "null"))]
  const trips = tripIds.length
    ? await Itinerary.find({ _id: { $in: tripIds } }).select("title").lean()
    : []
  const tripById = new Map(trips.map((t) => [String(t._id), t]))

  let updated = 0
  for (const doc of active) {
    try {
      const trip = tripById.get(String(doc.tripId)) || null
      await refreshFlightRecord(doc, trip)
      updated += 1
    } catch (err) {
      console.error("Flight refresh error:", doc.flightNumber, err.message)
    }
  }
  return updated
}

export async function autoTrackFromBooking(userId, booking) {
  if (!booking || booking.bookingType !== "flight") return null
  const fn = parseFlightNumberInput(booking.flightNumber || booking.bookingReference)
  if (!fn || fn.length < 3) return null

  try {
    return await startTracking(userId, {
      tripId: booking.tripId,
      bookingId: booking._id,
      flightNumber: fn,
      originCode: booking.originCode,
      destinationCode: booking.destinationCode,
      departureTime: booking.departureDate,
    })
  } catch (err) {
    if (err.statusCode === 400) return null
    console.error("Auto-track flight:", err.message)
    return null
  }
}

export async function getFlightsForAi(userId, tripId) {
  const data = await getTripFlights(userId, tripId)
  return data.flights.map((f) => ({
    flightNumber: f.flightNumber,
    status: f.status,
    gate: f.gate,
    terminal: f.terminal,
    delayMinutes: f.delayMinutes,
    departureTime: f.departureTime,
    arrivalTime: f.arrivalTime,
    originCode: f.originCode,
    destinationCode: f.destinationCode,
  }))
}
