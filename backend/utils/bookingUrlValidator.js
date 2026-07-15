/** HTTPS-only booking hosts allowed for outbound redirects. */
const ALLOWED_HOST_SUFFIXES = [
  "google.com",
  "booking.com",
  "agoda.com",
  "expedia.com",
  "hotels.com",
  "goindigo.in",
  "indigo.in",
  "airindia.in",
  "airindia.com",
  "spicejet.com",
  "vistara.com",
  "akasaair.com",
  "airasia.com",
  "emirates.com",
  "qatarairways.com",
  "singaporeair.com",
  "united.com",
  "delta.com",
  "aa.com",
  "britishairways.com",
  "lufthansa.com",
  "klm.com",
  "airfrance.com",
  "makemytrip.com",
  "cleartrip.com",
  "ixigo.com",
  "yatra.com",
  "trip.com",
  "tripadvisor.com",
  "kayak.com",
  "skyscanner.com",
  "trivago.com",
  "hotelscombined.com",
  "hostelworld.com",
  "airbnb.com",
  "oyo.com",
  "treebo.com",
  "fabhotels.com",
]

/**
 * @param {string | null | undefined} url
 * @returns {boolean}
 */
export function validateBookingUrl(url) {
  const normalized = sanitizeBookingUrl(url)
  return normalized !== null
}

/**
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function sanitizeBookingUrl(url) {
  if (!url || typeof url !== "string") return null

  let parsed
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }

  if (parsed.protocol !== "https:") return null

  const host = parsed.hostname.toLowerCase()
  const allowed = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  )

  if (!allowed) return null

  return parsed.toString()
}

/**
 * @param {string} url
 * @returns {string}
 */
export function inferBookingProvider(url) {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase()
    } catch {
      return ""
    }
  })()

  if (host.includes("google.com")) {
    if (url.includes("/flights")) return "Google Flights"
    return "Google Hotels"
  }
  if (host.includes("booking.com")) return "Booking.com"
  if (host.includes("agoda.com")) return "Agoda"
  if (host.includes("expedia.com")) return "Expedia"
  if (host.includes("hotels.com")) return "Hotels.com"
  if (host.includes("makemytrip.com")) return "MakeMyTrip"
  if (host.includes("cleartrip.com")) return "Cleartrip"
  if (host.includes("goindigo.in") || host.includes("indigo")) return "IndiGo"
  if (host.includes("airindia")) return "Air India"
  if (host.includes("spicejet")) return "SpiceJet"
  if (host.includes("vistara")) return "Vistara"
  if (host.includes("akasaair")) return "Akasa Air"

  return "Partner"
}
