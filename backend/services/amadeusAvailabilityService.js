import { amadeusGet } from "./amadeusClient.js"
import { geocodePlace } from "./geocodingService.js"
import { lookupDestinationCoordinates } from "../utils/geocodingQueryBuilder.js"
import { enrichFlightsWithBooking, enrichHotelsWithBooking } from "./bookingEnrichmentService.js"

const DEFAULT_ORIGIN_IATA = "DEL"

function destinationKeyword(destination) {
  return String(destination || "")
    .split(",")[0]
    .trim()
}

function defaultCheckInDate(offsetDays = 30) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function addDays(isoDate, days) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatTime(isoDateTime) {
  if (!isoDateTime) return ""
  const m = String(isoDateTime).match(/T(\d{2}:\d{2})/)
  return m ? m[1] : ""
}

function availabilityStatus(seatsOrRooms) {
  const n = Number(seatsOrRooms)
  if (!Number.isFinite(n) || n <= 0) {
    return { status: "unavailable", label: "Sold out" }
  }
  if (n <= 3) {
    return { status: "limited", label: "Limited" }
  }
  return { status: "available", label: "Available" }
}

async function resolveCoordinates(destination) {
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

async function resolveAirportIata(destination, preferredCity) {
  const coords = await resolveCoordinates(destination)
  if (coords) {
    try {
      const airports = await amadeusGet("/v1/reference-data/locations/airports", {
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius: 250,
        "page[limit]": 5,
      })
      const hit = airports?.data?.[0]
      if (hit?.iataCode) {
        return {
          iata: hit.iataCode,
          name: hit.name || hit.iataCode,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }
      }
    } catch {
      /* fall through to keyword search */
    }
  }

  const keyword = preferredCity || destinationKeyword(destination)
  const locations = await amadeusGet("/v1/reference-data/locations", {
    keyword,
    subType: "AIRPORT,CITY",
    "page[limit]": 5,
  })

  const airport =
    locations?.data?.find((loc) => loc.subType === "AIRPORT") ||
    locations?.data?.find((loc) => loc.iataCode)
  if (!airport?.iataCode) {
    throw new Error(`No airport found near ${destination}`)
  }

  return {
    iata: airport.iataCode,
    name: airport.name || airport.iataCode,
    latitude: airport.geoCode?.latitude,
    longitude: airport.geoCode?.longitude,
  }
}

async function resolveOriginIata(origin) {
  if (!origin) return DEFAULT_ORIGIN_IATA
  const keyword = String(origin).trim()
  try {
    const locations = await amadeusGet("/v1/reference-data/locations", {
      keyword,
      subType: "AIRPORT,CITY",
      "page[limit]": 3,
    })
    const hit =
      locations?.data?.find((loc) => loc.subType === "AIRPORT") || locations?.data?.[0]
    if (hit?.iataCode) return hit.iataCode
  } catch {
    /* ignore */
  }
  return DEFAULT_ORIGIN_IATA
}

async function resolveCityCode(destination) {
  const keyword = destinationKeyword(destination)
  const locations = await amadeusGet("/v1/reference-data/locations", {
    keyword,
    subType: "CITY",
    "page[limit]": 5,
  })
  const city = locations?.data?.find((loc) => loc.subType === "CITY") || locations?.data?.[0]
  if (!city?.iataCode) {
    throw new Error(`No city code found for ${destination}`)
  }
  return city.iataCode
}

/**
 * @param {{ destination: string, origin?: string, date?: string, passengers?: number }} params
 */
export async function fetchRealFlights({ destination, origin, date, passengers = 1 }) {
  const destAirport = await resolveAirportIata(destination)
  const originIata = await resolveOriginIata(origin)
  const departureDate = date || defaultCheckInDate(30)
  const adults = Math.min(9, Math.max(1, Number(passengers) || 1))

  const result = await amadeusGet("/v2/shopping/flight-offers", {
    originLocationCode: originIata,
    destinationLocationCode: destAirport.iata,
    departureDate,
    adults,
    max: 5,
    currencyCode: "USD",
  })

  const offers = result?.data || []
  return enrichFlightsWithBooking(
    offers.slice(0, 5).map((offer) => {
    const segment = offer.itineraries?.[0]?.segments?.[0] || {}
    const seats = offer.numberOfBookableSeats ?? 9
    const avail = availabilityStatus(seats)
    const price = Number(offer.price?.total) || 0
    const currency = offer.price?.currency || "USD"

    return {
      id: offer.id || `amadeus-flight-${segment.id || Math.random()}`,
      airline: segment.carrierCode || offer.validatingAirlineCodes?.[0] || "Airline",
      flightNumber: `${segment.carrierCode || ""}${segment.number || ""}`.trim(),
      origin: origin || originIata,
      originCode: segment.departure?.iataCode || originIata,
      destination: destAirport.name,
      destinationCode: segment.arrival?.iataCode || destAirport.iata,
      date: departureDate,
      departure: formatTime(segment.departure?.at),
      arrival: formatTime(segment.arrival?.at),
      durationMinutes: offer.itineraries?.[0]?.duration
        ? parseIsoDurationMinutes(offer.itineraries[0].duration)
        : null,
      price,
      pricePerPassenger: Math.round((price / adults) * 100) / 100,
      passengers: adults,
      currency,
      availability: avail.status,
      availabilityLabel: avail.label,
      seatsLeft: seats,
      cabin: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || "Economy",
      source: "amadeus",
      bookingLink: offer.self || null,
    }
    }),
  )
}

function parseIsoDurationMinutes(iso) {
  const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return null
  return (Number(m[1]) || 0) * 60 + (Number(m[2]) || 0)
}

/**
 * @param {{ destination: string, checkIn?: string, nights?: number, name?: string }} params
 */
export async function fetchRealHotels({ destination, checkIn, nights = 1, name }) {
  const cityCode = await resolveCityCode(destination)
  const checkInDate = checkIn || defaultCheckInDate(30)
  const nightCount = Math.min(14, Math.max(1, Number(nights) || 1))
  const checkOutDate = addDays(checkInDate, nightCount)

  const hotelList = await amadeusGet("/v1/reference-data/locations/hotels/by-city", {
    cityCode,
    radius: 30,
    radiusUnit: "KM",
    hotelSource: "ALL",
  })

  let hotelIds = (hotelList?.data || []).map((h) => h.hotelId).filter(Boolean).slice(0, 8)
  if (name) {
    const needle = String(name).toLowerCase()
    const matched = (hotelList?.data || []).filter((h) =>
      String(h.name || "").toLowerCase().includes(needle.split(" ")[0]),
    )
    if (matched.length > 0) {
      hotelIds = matched.map((h) => h.hotelId).slice(0, 5)
    }
  }

  if (hotelIds.length === 0) {
    return []
  }

  const offers = await amadeusGet("/v3/shopping/hotel-offers", {
    hotelIds: hotelIds.slice(0, 5).join(","),
    adults: 1,
    checkInDate,
    checkOutDate,
    roomQuantity: 1,
    currency: "USD",
  })

  return enrichHotelsWithBooking(
    (offers?.data || []).slice(0, 5).map((entry) => {
    const offer = entry.offers?.[0] || {}
    const price = Number(offer.price?.total) || 0
    const currency = offer.price?.currency || "USD"
    const roomsLeft = offer.roomQuantity ?? 5
    const avail = availabilityStatus(roomsLeft)

    return {
      id: entry.hotel?.hotelId || offer.id || `amadeus-hotel-${entry.hotel?.name}`,
      name: entry.hotel?.name || "Hotel",
      destination,
      location: entry.hotel?.cityCode || cityCode,
      checkIn: checkInDate,
      nights: nightCount,
      pricePerNight: nightCount > 0 ? Math.round((price / nightCount) * 100) / 100 : price,
      totalPrice: price,
      currency,
      availability: avail.status,
      availabilityLabel: avail.label,
      roomsLeft,
      rating: entry.hotel?.rating || 4,
      amenities: offer.room?.description?.text
        ? [offer.room.description.text.slice(0, 80)]
        : [],
      source: "amadeus",
      bookingLink: offer.self || null,
    }
    }),
  )
}

/**
 * @param {{ destination: string, names?: string, day?: number }} params
 */
export async function fetchRealActivities({ destination, names, day }) {
  const coords = await resolveCoordinates(destination)
  if (!coords) {
    throw new Error(`Could not geocode destination: ${destination}`)
  }

  const result = await amadeusGet("/v1/shopping/activities", {
    latitude: coords.latitude,
    longitude: coords.longitude,
    radius: 25,
  })

  const requested = String(names || "")
    .split("|")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean)

  let items = result?.data || []

  if (requested.length > 0) {
    const filtered = items.filter((a) => {
      const title = String(a.name || "").toLowerCase()
      return requested.some((r) => title.includes(r.slice(0, 12)) || r.includes(title.slice(0, 12)))
    })
    if (filtered.length > 0) items = filtered
  }

  return items.slice(0, 8).map((activity) => {
    const price = Number(activity.price?.amount) || 0
    const currency = activity.price?.currencyCode || "USD"
    const avail = availabilityStatus(8)

    return {
      id: activity.id || `amadeus-activity-${activity.name}`,
      name: activity.name || "Activity",
      destination,
      day: day != null ? Number(day) : null,
      price,
      currency,
      availability: avail.status,
      availabilityLabel: avail.label,
      slotsLeft: 8,
      nextSlot: null,
      instantConfirmation: true,
      description: activity.shortDescription || "",
      bookingLink: activity.bookingLink || null,
      source: "amadeus",
    }
  })
}
