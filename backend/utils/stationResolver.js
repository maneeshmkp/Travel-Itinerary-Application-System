import { normalizeDestination } from "./geocodingQueryBuilder.js"
import { normalizeDestinationInput } from "./destinationNormalizer.js"
import { resolveOriginAirport } from "./airportResolver.js"

/** @type {Array<[RegExp, string]>} */
const CITY_STATION_PATTERNS = [
  [/delhi|new delhi/i, "NDLS"],
  [/mumbai|bombay/i, "CSTM"],
  [/goa|madgaon|panaji|margao/i, "MAO"],
  [/bangalore|bengaluru/i, "SBC"],
  [/chennai|madras/i, "MAS"],
  [/kolkata|calcutta|howrah/i, "HWH"],
  [/hyderabad/i, "HYB"],
  [/jaipur/i, "JP"],
  [/agra/i, "AGC"],
  [/varanasi|banaras/i, "BSB"],
  [/lucknow/i, "LKO"],
  [/srinagar|kashmir/i, "SXR"],
  [/jammu|katra|vaishno/i, "JAT"],
  [/leh|ladakh/i, "LEH"],
  [/darjeeling|bagdogra|siliguri/i, "NJP"],
  [/dehradun|rishikesh|haridwar|corbett|ramnagar|jim corbett|nainital/i, "DDN"],
  [/prayagraj|allahabad/i, "ALD"],
  [/madurai/i, "MDU"],
  [/tirupati/i, "TPTY"],
  [/port blair|andaman/i, "AN"],
  [/udaipur/i, "UDZ"],
  [/kochi|cochin|ernakulam/i, "ERS"],
  [/thiruvananthapuram|trivandrum/i, "TVC"],
  [/pune/i, "PUNE"],
  [/ahmedabad/i, "ADI"],
  [/chandigarh/i, "CDG"],
  [/amritsar/i, "ASR"],
  [/shimla/i, "SML"],
  [/manali/i, "JOG"],
  [/ooty|udhagamandalam/i, "UAM"],
  [/munnar|kottayam|alleppey|alappuzha/i, "KTYM"],
  [/guwahati/i, "GHY"],
  [/patna/i, "PNBE"],
  [/ranchi/i, "RNC"],
  [/bhopal/i, "BPL"],
  [/indore/i, "INDB"],
  [/nagpur/i, "NGP"],
  [/surat/i, "ST"],
  [/vadodara|baroda/i, "BRC"],
]

const CITY_STATION = {
  delhi: "NDLS",
  mumbai: "CSTM",
  goa: "MAO",
  bangalore: "SBC",
  chennai: "MAS",
  kolkata: "HWH",
  hyderabad: "HYB",
}

/**
 * Resolve a city/destination label to an Indian Railways station code.
 * @param {string} place
 * @returns {string|null}
 */
export function resolveStationCode(place) {
  if (!place) return null
  const raw = String(place).trim()
  if (/^[A-Z]{2,5}$/.test(raw)) return raw.toUpperCase()

  const blob = normalizeDestinationInput(raw)
  for (const [pattern, code] of CITY_STATION_PATTERNS) {
    if (pattern.test(blob)) return code
  }

  const { primaryCity } = normalizeDestination(blob)
  const key = primaryCity.toLowerCase()
  if (CITY_STATION[key]) return CITY_STATION[key]

  return null
}

export function resolveOriginStation(origin) {
  const fromAirport = resolveOriginAirport(origin)
  const airportToStation = {
    DEL: "NDLS",
    BOM: "CSTM",
    BLR: "SBC",
    MAA: "MAS",
    CCU: "HWH",
    HYD: "HYB",
    GOI: "MAO",
    JAI: "JP",
    PGH: "DDN",
  }
  if (fromAirport && airportToStation[fromAirport]) {
    return airportToStation[fromAirport]
  }
  return resolveStationCode(origin) || "NDLS"
}

export function resolveDestinationStation(destination) {
  return resolveStationCode(destination)
}
