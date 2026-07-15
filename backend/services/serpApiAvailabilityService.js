import { searchGoogleFlights, searchGoogleHotels, searchGoogleMaps } from "./serpApiClient.js"
import {
  resolveDestinationAirport,
  resolveDestinationAirportCandidates,
  resolveOriginAirport,
} from "../utils/airportResolver.js"
import { lookupDestinationCoordinates, normalizeDestination } from "../utils/geocodingQueryBuilder.js"
import { normalizeDestinationInput } from "../utils/destinationNormalizer.js"
import { geocodePlace } from "./geocodingService.js"
import { enrichFlightsWithBooking, enrichHotelsWithBooking, enrichTrainsWithBooking, enrichBusesWithBooking } from "./bookingEnrichmentService.js"
import {
  estimateTrainFare,
  estimateBusFare,
  estimateTrainDurationMinutes,
  estimateBusDurationMinutes,
  addMinutesToTime,
  resolveTransportCurrency,
} from "../utils/transportPricing.js"

function destinationKeyword(destination) {
  const corrected = normalizeDestinationInput(destination)
  const { primaryCity } = normalizeDestination(corrected)
  return primaryCity || corrected.split(",")[0].trim()
}

async function resolveCoords(destination) {
  const corrected = normalizeDestinationInput(destination)
  const known = lookupDestinationCoordinates(corrected)
  if (known) {
    return { latitude: known.latitude, longitude: known.longitude }
  }
  const geo = await geocodePlace(corrected)
  if (geo) {
    return { latitude: geo.latitude, longitude: geo.longitude }
  }
  return null
}

function parsePriceHint(priceStr) {
  const raw = String(priceStr || "")
  if (raw.includes("$$$$")) return 120
  if (raw.includes("$$$")) return 75
  if (raw.includes("$$")) return 40
  if (raw.includes("$")) return 20
  return 35
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

function formatTime(dateTime) {
  if (!dateTime) return ""
  const m = String(dateTime).match(/(\d{2}:\d{2})/)
  return m ? m[1] : ""
}

function availabilityFromPrice(price) {
  if (!Number.isFinite(price) || price <= 0) {
    return { status: "limited", label: "Check price" }
  }
  return { status: "available", label: "Available" }
}

function pickHotelBookingLink(property) {
  const candidates = [
    property.link,
    property.google_hotels_link,
    property.serpapi_google_hotels_link,
  ].filter((link) => typeof link === "string" && link.includes("google.com/travel"))

  return candidates[0] || null
}

function flattenFlightOffers(result) {
  return [...(result.best_flights || []), ...(result.other_flights || [])]
}

function flightOfferKey(offer) {
  const seg = offer.flights?.[0]
  return (
    offer.departure_token ||
    `${seg?.departure_airport?.id}-${seg?.arrival_airport?.id}-${seg?.departure_airport?.time}-${offer.price}`
  )
}

function mapSingleFlightOffer(offer, index, { departure_id, arrival_id, outbound_date, adults, currency }) {
  const segment = offer.flights?.[0] || {}
  const price = Number(offer.price) || 0
  const avail = availabilityFromPrice(price)

  return {
    id: offer.departure_token || `serpapi-flight-${index}`,
    airline: segment.airline || "Airline",
    flightNumber: segment.flight_number || "",
    origin: segment.departure_airport?.name || departure_id,
    originCode: segment.departure_airport?.id || departure_id,
    destination: segment.arrival_airport?.name || arrival_id,
    destinationCode: segment.arrival_airport?.id || arrival_id,
    date: outbound_date,
    departure: formatTime(segment.departure_airport?.time),
    arrival: formatTime(segment.arrival_airport?.time),
    durationMinutes: offer.total_duration ?? segment.duration ?? null,
    price,
    pricePerPassenger: adults > 0 ? Math.round((price / adults) * 100) / 100 : price,
    passengers: adults,
    currency,
    availability: avail.status,
    availabilityLabel: avail.label,
    seatsLeft: null,
    cabin: segment.travel_class || "Economy",
    source: "serpapi",
    bookingLink: null,
  }
}

function buildFlightSearchPlaceholder({
  departure_id,
  arrival_id,
  destination,
  outbound_date,
  adults,
  currency,
}) {
  const city = destinationKeyword(destination)
  return {
    id: "serpapi-flight-search-fallback",
    airline: "Search on Google Flights",
    flightNumber: "",
    origin: departure_id,
    originCode: departure_id,
    destination: city || arrival_id,
    destinationCode: arrival_id,
    date: outbound_date,
    departure: "—",
    arrival: "—",
    durationMinutes: null,
    price: null,
    pricePerPassenger: null,
    passengers: adults,
    currency,
    availability: "limited",
    availabilityLabel: "Search required",
    seatsLeft: null,
    cabin: "Economy",
    source: "serpapi",
    bookingLink: null,
    isSearchFallback: true,
  }
}

/**
 * @param {{ destination: string, origin?: string, date?: string, passengers?: number, currency?: string }} params
 */
export async function fetchSerpApiFlights({
  destination,
  origin,
  date,
  passengers = 1,
  currency = "USD",
}) {
  const departure_id = resolveOriginAirport(origin)
  const outbound_date = date || defaultCheckInDate(30)
  const adults = Math.min(9, Math.max(1, Number(passengers) || 1))
  const arrivalCandidates = resolveDestinationAirportCandidates(destination)
  const collected = []
  const seen = new Set()

  for (const arrival_id of arrivalCandidates) {
    if (arrival_id === departure_id) continue

    const result = await searchGoogleFlights({
      departure_id,
      arrival_id,
      outbound_date,
      type: "2",
      adults,
      currency,
      gl: "in",
      hl: "en",
      show_hidden: true,
    })

    for (const offer of flattenFlightOffers(result)) {
      const key = flightOfferKey(offer)
      if (seen.has(key)) continue
      seen.add(key)
      collected.push(
        mapSingleFlightOffer(offer, collected.length, {
          departure_id,
          arrival_id,
          outbound_date,
          adults,
          currency,
        }),
      )
      if (collected.length >= 5) break
    }

    if (collected.length >= 5) break
  }

  if (collected.length > 0) {
    return enrichFlightsWithBooking(collected)
  }

  const fallbackArrival = arrivalCandidates.find((c) => c !== departure_id) || arrivalCandidates[0]
  console.info(
    `[availability] No SerpAPI flights for ${departure_id}→${fallbackArrival} (${destination}); returning Google Flights search link`,
  )

  return enrichFlightsWithBooking([
    buildFlightSearchPlaceholder({
      departure_id,
      arrival_id: fallbackArrival,
      destination,
      outbound_date,
      adults,
      currency,
    }),
  ])
}

function normalizeHotelKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function pickBestHotelMatch(batch, hotelName) {
  if (!batch.length) return null
  const needle = normalizeHotelKey(hotelName)
  if (!needle) return batch[0]

  const exact = batch.find((h) => normalizeHotelKey(h.name) === needle)
  if (exact) return exact

  const tokens = needle.split(" ").filter((t) => t.length > 3)
  let best = batch[0]
  let bestScore = -1

  for (const h of batch) {
    const title = normalizeHotelKey(h.name)
    let score = 0
    for (const token of tokens) {
      if (title.includes(token)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = h
    }
  }

  return bestScore > 0 ? best : batch[0]
}

function hotelStableId(property, index, searchQuery = "") {
  if (property.property_token) return property.property_token
  const label = `${searchQuery}|${property.name || ""}|${index}`
  let hash = 0
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash << 5) - hash + label.charCodeAt(i)
    hash |= 0
  }
  return `serpapi-hotel-${Math.abs(hash)}`
}

async function fetchSerpApiHotelBatch({
  destination,
  checkIn,
  nights,
  name,
  currency,
}) {
  const checkInDate = checkIn || defaultCheckInDate(30)
  const nightCount = Math.min(14, Math.max(1, Number(nights) || 1))
  const checkOutDate = addDays(checkInDate, nightCount)
  const city = destinationKeyword(destination)
  const q = name ? `${name} ${city}` : `hotels in ${city}`

  const result = await searchGoogleHotels({
    q,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    currency,
    gl: "in",
    hl: "en",
    adults: 1,
  })

  return (result.properties || []).slice(0, 5).map((property, index) => {
    const totalPrice =
      Number(property.total_rate?.extracted_lowest) ||
      Number(property.rate_per_night?.extracted_lowest) * nightCount ||
      0
    const perNight =
      Number(property.rate_per_night?.extracted_lowest) ||
      (nightCount > 0 ? Math.round((totalPrice / nightCount) * 100) / 100 : totalPrice)
    const avail = availabilityFromPrice(totalPrice)
    const hotelName = property.name || name || "Hotel"

    return {
      id: hotelStableId(property, index, q),
      name: hotelName,
      requestedName: name || hotelName,
      destination: city,
      location: city,
      checkIn: checkInDate,
      nights: nightCount,
      pricePerNight: perNight,
      totalPrice: totalPrice || perNight * nightCount,
      currency,
      availability: avail.status,
      availabilityLabel: avail.label,
      roomsLeft: null,
      rating: property.overall_rating ? Math.round(property.overall_rating * 10) / 10 : null,
      amenities: property.amenities?.slice(0, 3) || [],
      source: "serpapi",
      bookingLink: pickHotelBookingLink(property),
    }
  })
}

/**
 * @param {{ destination: string, checkIn?: string, nights?: number, name?: string, names?: string, currency?: string }} params
 */
export async function fetchSerpApiHotels({
  destination,
  checkIn,
  nights = 1,
  name,
  names,
  currency = "USD",
}) {
  const fromList = Array.isArray(names)
    ? names
    : typeof names === "string" && names.trim()
      ? names
          .split("|")
          .map((n) => n.trim())
          .filter(Boolean)
      : []

  const requested = [
    ...fromList,
    ...(name ? [String(name).trim()] : []),
  ]
  const uniqueNames = [...new Set(requested)]

  if (uniqueNames.length === 0) {
    return enrichHotelsWithBooking(
      await fetchSerpApiHotelBatch({ destination, checkIn, nights, currency }),
    )
  }

  const merged = []
  const seen = new Set()

  for (const hotelName of uniqueNames) {
    const batch = await fetchSerpApiHotelBatch({
      destination,
      checkIn,
      nights,
      name: hotelName,
      currency,
    })

    const best = pickBestHotelMatch(batch, hotelName)
    if (best && !seen.has(best.id)) {
      seen.add(best.id)
      merged.push({ ...best, requestedName: hotelName })
    }
  }

  if (merged.length < 3) {
    const general = await fetchSerpApiHotelBatch({
      destination,
      checkIn,
      nights,
      currency,
    })
    for (const h of general) {
      if (seen.has(h.id)) continue
      seen.add(h.id)
      merged.push(h)
      if (merged.length >= 8) break
    }
  }

  return enrichHotelsWithBooking(merged.slice(0, 8))
}

/**
 * @param {{ destination: string, names?: string, day?: number, currency?: string }} params
 */
export async function fetchSerpApiActivities({ destination, names, day, currency = "USD" }) {
  const city = destinationKeyword(destination)
  const coords = await resolveCoords(destination)
  if (!coords) {
    console.warn(`[availability] No coordinates for activities: ${destination}`)
    return []
  }

  const result = await searchGoogleMaps({
    q: `things to do in ${city}`,
    ll: `@${coords.latitude},${coords.longitude},12z`,
    type: "search",
    hl: "en",
  })

  const fromList = Array.isArray(names)
    ? names
    : typeof names === "string" && names.trim()
      ? names
          .split("|")
          .map((n) => n.trim())
          .filter(Boolean)
      : []

  const requested = fromList.map((n) => String(n).trim().toLowerCase()).filter(Boolean)

  let items = result.local_results || []

  if (requested.length > 0) {
    const filtered = items.filter((place) => {
      const title = String(place.title || place.name || "").toLowerCase()
      return requested.some(
        (r) => title.includes(r.slice(0, 12)) || r.includes(title.slice(0, 12)),
      )
    })
    if (filtered.length > 0) items = filtered
  }

  return items.slice(0, 8).map((place, index) => {
    const title = place.title || place.name || "Activity"
    const rating = Number(place.rating)
    const price = parsePriceHint(place.price)
    const openState = String(place.open_state || place.hours || "")

    return {
      id: place.place_id || place.data_id || `serpapi-activity-${index}`,
      name: title,
      destination: city,
      day: day != null ? Number(day) : null,
      price,
      currency,
      availability: /open|24 hours/i.test(openState) ? "available" : "limited",
      availabilityLabel: /open|24 hours/i.test(openState) ? "Available" : "Check hours",
      slotsLeft: null,
      nextSlot: openState || null,
      instantConfirmation: false,
      description: place.description || place.address || "",
      rating: Number.isFinite(rating) ? rating : null,
      bookingLink: place.link || place.website || null,
      source: "serpapi",
    }
  })
}

/**
 * @param {{ destination: string, origin?: string, date?: string, passengers?: number, currency?: string }} params
 */
export async function fetchSerpApiTrains({
  destination,
  origin,
  date,
  passengers = 1,
  currency = "USD",
}) {
  const city = destinationKeyword(destination)
  const coords = await resolveCoords(destination)
  if (!coords) return []

  const originAirport = resolveOriginAirport(origin || "Delhi")
  const originCity = originAirport?.city || String(origin || "Delhi").split(",")[0].trim()
  const adults = Math.min(9, Math.max(1, Number(passengers) || 1))

  const result = await searchGoogleMaps({
    q: `railway station ${city}`,
    ll: `@${coords.latitude},${coords.longitude},11z`,
    type: "search",
    hl: "en",
  })

  const stations = (result.local_results || []).slice(0, 5)
  if (!stations.length) return []

  const trainNames = [
    "Rajdhani Express",
    "Shatabdi Express",
    "Vande Bharat Express",
    "Duronto Express",
    "Garib Rath",
  ]

  const mapped = stations.map((place, index) => {
    const title = place.title || place.name || "Railway Station"
    const travelClass = index % 2 === 0 ? "AC 2 Tier" : "Sleeper"
    const fareCurrency = resolveTransportCurrency(destination, currency)
    const fare = estimateTrainFare({
      origin: originCity,
      destination: city,
      travelClass,
      passengers: adults,
      currency: fareCurrency,
      seed: index,
    })
    const depHour = 6 + (index * 3) % 14
    const departure = `${String(depHour).padStart(2, "0")}:00`
    const durationMin = estimateTrainDurationMinutes(originCity, city, index)
    const arrival = addMinutesToTime(departure, durationMin)

    return {
      id: place.place_id || `serpapi-train-${index}`,
      operator: "Indian Railways",
      trainName: trainNames[index % trainNames.length],
      origin: originCity,
      originCode: originAirport?.iata || "DEL",
      destination: city,
      destinationCode: title.slice(0, 3).toUpperCase(),
      stationName: title,
      date: date || null,
      departure,
      arrival,
      durationMinutes: durationMin,
      price: fare.price,
      pricePerPassenger: fare.pricePerPassenger,
      passengers: adults,
      currency: fare.currency,
      travelClass,
      distanceKm: fare.distanceKm,
      isEstimate: true,
      priceLabel: fare.priceLabel,
      availability: "available",
      availabilityLabel: "Available",
      seatsLeft: null,
      bookingLink: place.link || place.website || null,
      source: "serpapi",
    }
  })

  return enrichTrainsWithBooking(mapped)
}

/**
 * @param {{ destination: string, origin?: string, date?: string, passengers?: number, currency?: string }} params
 */
export async function fetchSerpApiBuses({
  destination,
  origin,
  date,
  passengers = 1,
  currency = "USD",
}) {
  const city = destinationKeyword(destination)
  const coords = await resolveCoords(destination)
  if (!coords) return []

  const originCity = String(origin || "Delhi").split(",")[0].trim()
  const adults = Math.min(9, Math.max(1, Number(passengers) || 1))

  const result = await searchGoogleMaps({
    q: `bus stand ${city}`,
    ll: `@${coords.latitude},${coords.longitude},11z`,
    type: "search",
    hl: "en",
  })

  const stops = (result.local_results || []).slice(0, 5)
  if (!stops.length) return []

  const operators = ["RedBus", "UPSRTC", "KSRTC", "Orange Travels", "Volvo Multi-Axle"]

  const busTypes = ["AC Sleeper", "Volvo AC", "AC Seater", "Multi-Axle AC", "Volvo AC"]

  const mapped = stops.map((place, index) => {
    const busType = busTypes[index % busTypes.length]
    const fareCurrency = resolveTransportCurrency(destination, currency)
    const fare = estimateBusFare({
      origin: originCity,
      destination: city,
      busType,
      passengers: adults,
      currency: fareCurrency,
      seed: index,
    })
    const depHour = 7 + (index * 2) % 12
    const departure = `${String(depHour).padStart(2, "0")}:30`
    const durationMin = estimateBusDurationMinutes(originCity, city, index)
    const arrival = addMinutesToTime(departure, durationMin)

    return {
      id: place.place_id || `serpapi-bus-${index}`,
      operator: operators[index % operators.length],
      busType,
      origin: originCity,
      destination: city,
      terminalName: place.title || place.name,
      date: date || null,
      departure,
      arrival,
      durationMinutes: durationMin,
      price: fare.price,
      pricePerPassenger: fare.pricePerPassenger,
      passengers: adults,
      currency: fare.currency,
      distanceKm: fare.distanceKm,
      isEstimate: true,
      priceLabel: fare.priceLabel,
      availability: "available",
      availabilityLabel: "Available",
      seatsLeft: null,
      bookingLink: place.link || place.website || null,
      source: "serpapi",
    }
  })

  return enrichBusesWithBooking(mapped)
}
