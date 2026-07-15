import { normalizeDestination } from "./geocodingQueryBuilder.js"
import { normalizeDestinationInput } from "./destinationNormalizer.js"

/** @type {Array<[RegExp, string]>} */
const DESTINATION_AIRPORT_PATTERNS = [
  [/phuket/i, "HKT"],
  [/krabi/i, "KBV"],
  [/bangkok/i, "BKK"],
  [/bali|denpasar|ubud/i, "DPS"],
  [/singapore/i, "SIN"],
  [/dubai/i, "DXB"],
  [/mumbai|bombay/i, "BOM"],
  [/delhi|new delhi/i, "DEL"],
  [/bangalore|bengaluru/i, "BLR"],
  [/chennai|madras/i, "MAA"],
  [/kolkata|calcutta/i, "CCU"],
  [/hyderabad/i, "HYD"],
  [/goa|panaji|dabolim/i, "GOI"],
  [/jaipur/i, "JAI"],
  [/agra/i, "AGR"],
  [/varanasi|banaras/i, "VNS"],
  [/lucknow/i, "LKO"],
  [/srinagar|kashmir/i, "SXR"],
  [/jammu|katra|vaishno/i, "IXJ"],
  [/leh|ladakh/i, "IXL"],
  [/darjeeling|bagdogra/i, "IXB"],
  [/rishikesh|dehradun|corbett|ramnagar|jim corbett/i, "PGH"],
  [/prayagraj|allahabad/i, "IXD"],
  [/madurai/i, "IXM"],
  [/tirupati/i, "TIR"],
  [/port blair|andaman/i, "IXZ"],
  [/udaipur/i, "UDR"],
  [/kochi|cochin|kerala/i, "COK"],
  [/thiruvananthapuram|trivandrum/i, "TRV"],
]

const CITY_AIRPORT = {
  mumbai: "BOM",
  delhi: "DEL",
  bangalore: "BLR",
  chennai: "MAA",
  kolkata: "CCU",
  hyderabad: "HYD",
  phuket: "HKT",
  krabi: "KBV",
  bangkok: "BKK",
  agra: "AGR",
  jaipur: "JAI",
  goa: "GOI",
  dubai: "DXB",
  singapore: "SIN",
}

function defaultOriginAirport() {
  return process.env.AVAILABILITY_ORIGIN_AIRPORT?.trim().toUpperCase() || "DEL"
}

/** Ordered IATA codes to try when the primary airport has no flight inventory. */
const DESTINATION_AIRPORT_CANDIDATES = [
  [/corbett|ramnagar|jim corbett|nainital|uttarakhand/i, ["PGH", "DED", "IXC", "DEL"]],
  [/srinagar|kashmir|gulmarg|pahalgam/i, ["SXR", "IXJ", "DEL"]],
  [/leh|ladakh/i, ["IXL", "DEL"]],
  [/darjeeling|sikkim|west bengal/i, ["IXB", "CCU", "DEL"]],
  [/andaman|port blair|havelock/i, ["IXZ", "MAA", "CCU"]],
  [/katra|vaishno devi/i, ["IXJ", "SXR", "DEL"]],
]

/**
 * @param {string} destination
 * @returns {string[]}
 */
export function resolveDestinationAirportCandidates(destination) {
  const blob = normalizeDestinationInput(destination)
  for (const [pattern, codes] of DESTINATION_AIRPORT_CANDIDATES) {
    if (pattern.test(blob)) {
      return [...new Set(codes)]
    }
  }
  return [resolveDestinationAirport(destination)]
}

export function resolveDestinationAirport(destination) {
  const blob = normalizeDestinationInput(destination)
  for (const [pattern, iata] of DESTINATION_AIRPORT_PATTERNS) {
    if (pattern.test(blob)) return iata
  }

  const { primaryCity } = normalizeDestination(destination)
  const cityKey = primaryCity.toLowerCase()
  if (CITY_AIRPORT[cityKey]) return CITY_AIRPORT[cityKey]

  return defaultOriginAirport()
}

export function resolveOriginAirport(origin) {
  if (!origin) return defaultOriginAirport()
  const code = String(origin).trim().toUpperCase()
  if (/^[A-Z]{3}$/.test(code)) return code
  return resolveDestinationAirport(origin)
}
