/**
 * Build a Google Flights search URL for planner hand-off (not a direct airline checkout).
 * @param {{ originCode?: string, destinationCode?: string, date?: string | null, passengers?: number }} params
 */
export function buildGoogleFlightsUrl({ originCode, destinationCode, date, passengers }) {
  const parts = ["Flights"]
  if (originCode) parts.push(`from ${originCode}`)
  if (destinationCode) parts.push(`to ${destinationCode}`)
  if (date) parts.push(`on ${date}`)
  if (passengers && passengers > 1) parts.push(`for ${passengers} passengers`)

  const url = new URL("https://www.google.com/travel/flights")
  url.searchParams.set("q", parts.join(" "))
  url.searchParams.set("hl", "en")
  url.searchParams.set("gl", "in")
  return url.toString()
}

/**
 * Build a Google Hotels search URL (uses /travel/search — same as Google Travel UI).
 * @param {{ name?: string, destination?: string, checkIn?: string, checkOut?: string, nights?: number }} params
 */
export function buildGoogleHotelsUrl({ name, destination, checkIn, checkOut, nights }) {
  const city = String(destination || "")
    .split(",")[0]
    .trim() || "hotels"
  const cleanName = name
    ? String(name)
        .split(/[|–—]/)[0]
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80)
    : ""
  const q = cleanName ? `${cleanName} ${city}` : `hotels in ${city}`

  const url = new URL("https://www.google.com/travel/search")
  url.searchParams.set("q", q)
  url.searchParams.set("qs", "OAA")
  url.searchParams.set("hl", "en")
  url.searchParams.set("gl", "in")

  let checkOutDate = checkOut
  if (!checkOutDate && checkIn && nights) {
    checkOutDate = addDaysIso(checkIn, nights)
  }
  if (checkIn && checkOutDate) {
    url.searchParams.set("dates", `${checkIn},${checkOutDate}`)
  }

  return url.toString()
}

/**
 * Ensure Google Travel hotel links include check-in/out dates when missing.
 * @param {string} url
 * @param {{ checkIn?: string, checkOut?: string, nights?: number }} hotel
 */
export function normalizeGoogleTravelHotelUrl(url, hotel = {}) {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes("google.com") || !parsed.pathname.includes("/travel")) {
      return url
    }
    if (parsed.searchParams.has("dates")) {
      return parsed.toString()
    }
    const checkIn = hotel.checkIn
    let checkOut = hotel.checkOut
    if (!checkOut && checkIn && hotel.nights) {
      checkOut = addDaysIso(checkIn, hotel.nights)
    }
    if (checkIn && checkOut) {
      parsed.searchParams.set("dates", `${checkIn},${checkOut}`)
    }
    if (!parsed.searchParams.has("hl")) parsed.searchParams.set("hl", "en")
    if (!parsed.searchParams.has("gl")) parsed.searchParams.set("gl", "in")
    return parsed.toString()
  } catch {
    return url
  }
}

function addDaysIso(isoDate, days) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Google Maps transit directions (trains / rail connections).
 */
export function buildTrainBookingUrl({ origin, destination, date }) {
  const originCity = String(origin || "Delhi").split(",")[0].trim()
  const destCity = String(destination || "").split(",")[0].trim()
  const url = new URL("https://www.google.com/maps/dir/")
  url.searchParams.set("api", "1")
  url.searchParams.set("origin", originCity)
  url.searchParams.set("destination", destCity)
  url.searchParams.set("travelmode", "transit")
  if (date) url.searchParams.set("departure_time", date)
  return url.toString()
}

/**
 * Hand-off to bus search (RedBus / Google).
 */
export function buildBusBookingUrl({ origin, destination, date }) {
  const originCity = String(origin || "Delhi").split(",")[0].trim()
  const destCity = String(destination || "").split(",")[0].trim()
  const parts = [`bus from ${originCity} to ${destCity}`]
  if (date) parts.push(`on ${date}`)
  const url = new URL("https://www.google.com/search")
  url.searchParams.set("q", `${parts.join(" ")} redbus OR abhibus`)
  url.searchParams.set("hl", "en")
  url.searchParams.set("gl", "in")
  return url.toString()
}
