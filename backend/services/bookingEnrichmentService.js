import {
  buildGoogleFlightsUrl,
  buildGoogleHotelsUrl,
  buildTrainBookingUrl,
  buildBusBookingUrl,
  normalizeGoogleTravelHotelUrl,
} from "../utils/bookingUrlBuilder.js"
import {
  inferBookingProvider,
  sanitizeBookingUrl,
  validateBookingUrl,
} from "../utils/bookingUrlValidator.js"

function addDays(isoDate, days) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Attach validated bookingUrl + bookingProvider to a flight result.
 * @param {object} flight
 */
export function enrichFlightWithBooking(flight) {
  const candidates = [flight.bookingLink, flight.bookingUrl].filter(Boolean)

  for (const raw of candidates) {
    const safe = sanitizeBookingUrl(raw)
    if (safe) {
      return {
        ...flight,
        bookingUrl: safe,
        bookingProvider: inferBookingProvider(safe),
      }
    }
  }

  const fallback = buildGoogleFlightsUrl({
    originCode: flight.originCode,
    destinationCode: flight.destinationCode,
    date: flight.date,
    passengers: flight.passengers,
  })

  if (validateBookingUrl(fallback)) {
    return {
      ...flight,
      bookingUrl: fallback,
      bookingProvider: "Google Flights",
    }
  }

  return { ...flight, bookingUrl: null, bookingProvider: null }
}

/**
 * Attach validated bookingUrl + bookingProvider to a hotel result.
 * @param {object} hotel
 */
export function enrichHotelWithBooking(hotel) {
  const candidates = [hotel.bookingLink, hotel.bookingUrl].filter(Boolean)

  for (const raw of candidates) {
    const normalized = normalizeGoogleTravelHotelUrl(raw, hotel)
    const safe = sanitizeBookingUrl(normalized)
    if (safe) {
      return {
        ...hotel,
        bookingUrl: safe,
        bookingProvider: inferBookingProvider(safe),
      }
    }
  }

  const checkOut =
    hotel.checkIn && hotel.nights ? addDays(hotel.checkIn, hotel.nights) : undefined

  const fallback = buildGoogleHotelsUrl({
    name: hotel.requestedName || hotel.name,
    destination: hotel.destination || hotel.location,
    checkIn: hotel.checkIn,
    checkOut,
    nights: hotel.nights,
  })

  if (validateBookingUrl(fallback)) {
    return {
      ...hotel,
      bookingUrl: fallback,
      bookingProvider: "Google Hotels",
    }
  }

  return { ...hotel, bookingUrl: null, bookingProvider: null }
}

/**
 * @param {object[]} flights
 */
export function enrichFlightsWithBooking(flights) {
  return (flights || []).map(enrichFlightWithBooking)
}

/**
 * @param {object[]} hotels
 */
export function enrichHotelsWithBooking(hotels) {
  return (hotels || []).map(enrichHotelWithBooking)
}

export function enrichTrainWithBooking(train) {
  const candidates = [train.bookingLink, train.bookingUrl].filter(Boolean)

  for (const raw of candidates) {
    const safe = sanitizeBookingUrl(raw)
    if (safe) {
      return {
        ...train,
        bookingUrl: safe,
        bookingProvider: inferBookingProvider(safe) || "Google Maps",
      }
    }
  }

  const fallback = buildTrainBookingUrl({
    origin: train.origin || train.originCode,
    destination: train.destination || train.destinationCode,
    date: train.date,
  })

  if (validateBookingUrl(fallback)) {
    return {
      ...train,
      bookingUrl: fallback,
      bookingProvider: "Google Maps Transit",
    }
  }

  return { ...train, bookingUrl: null, bookingProvider: null }
}

export function enrichBusWithBooking(bus) {
  const candidates = [bus.bookingLink, bus.bookingUrl].filter(Boolean)

  for (const raw of candidates) {
    const safe = sanitizeBookingUrl(raw)
    if (safe) {
      return {
        ...bus,
        bookingUrl: safe,
        bookingProvider: inferBookingProvider(safe) || "Bus operator",
      }
    }
  }

  const fallback = buildBusBookingUrl({
    origin: bus.origin,
    destination: bus.destination,
    date: bus.date,
  })

  if (validateBookingUrl(fallback)) {
    return {
      ...bus,
      bookingUrl: fallback,
      bookingProvider: "RedBus / AbhiBus",
    }
  }

  return { ...bus, bookingUrl: null, bookingProvider: null }
}

export function enrichTrainsWithBooking(trains) {
  return (trains || []).map(enrichTrainWithBooking)
}

export function enrichBusesWithBooking(buses) {
  return (buses || []).map(enrichBusWithBooking)
}
