import { normalizeDestinationInput } from "./destinationNormalizer.js"

const GENERIC_DESTINATION_TERMS = new Set(["trip", "tour", "travel", "package", "holiday", "vacation", "getaway"])

/** @type {Array<{ patterns: RegExp[], city: string }>} */
const ACTIVITY_CITY_HINTS = [
  { patterns: [/alleppey/i, /alappuzha/i, /kerala backwater/i], city: "Alleppey" },
  { patterns: [/vaishno devi/i, /katra market/i, /trikuta/i, /rama trident/i], city: "Katra" },
  { patterns: [/dal lake/i, /shalimar/i, /nishat bagh/i, /pari mahal/i, /shikara/i, /houseboat/i], city: "Srinagar" },
  { patterns: [/gulmarg/i, /strawberry valley/i], city: "Gulmarg" },
  { patterns: [/aru valley/i, /betaab/i, /lidder river/i, /pahalgam/i], city: "Pahalgam" },
  { patterns: [/taj mahal/i, /agra fort/i, /mehtab bagh/i, /sadar bazaar/i, /tajganj/i, /rakabganj/i], city: "Agra" },
  { patterns: [/meenakshi/i, /nayakkar/i, /koodal azhagar/i, /gandhi memorial museum/i], city: "Madurai" },
  { patterns: [/rameswaram/i, /ramanathaswamy/i, /agni theertham/i], city: "Rameswaram" },
  { patterns: [/tirupati/i, /venkateswara/i, /balaji/i], city: "Tirupati" },
  { patterns: [/grand palace/i], city: "Bangkok" },
  { patterns: [/patong/i, /bangla road/i, /big buddha/i, /promthep/i, /kata beach/i], city: "Phuket" },
  { patterns: [/phi phi/i], city: "Phuket" },
  { patterns: [/ao nang/i, /railay/i, /krabi airport/i, /emerald pool/i, /tiger cave/i], city: "Krabi" },
  { patterns: [/baga beach/i, /calangute/i], city: "Goa" },
  { patterns: [/amber fort/i, /hawa mahal/i], city: "Jaipur" },
  { patterns: [/gateway of india/i, /marine drive/i, /colaba/i, /kala ghoda/i, /juhu/i], city: "Mumbai" },
  { patterns: [/india gate/i, /chandni chowk/i, /connaught place/i, /jama masjid/i, /old delhi/i], city: "Delhi" },
  { patterns: [/lake pichola/i, /city palace.*udaipur/i], city: "Udaipur" },
  { patterns: [/dashashwamedh/i, /varanasi/i], city: "Varanasi" },
  { patterns: [/leh market/i, /ladakh/i], city: "Leh" },
  { patterns: [/tiger hill/i, /darjeeling/i], city: "Darjeeling" },
  { patterns: [/ganga river/i, /laxman jhula/i], city: "Rishikesh" },
  { patterns: [/radhanagar/i, /andaman/i], city: "Port Blair" },
  { patterns: [/ubud/i], city: "Ubud" },
  { patterns: [/burj khalifa/i, /dubai marina/i], city: "Dubai" },
  { patterns: [/marina bay/i, /sentosa/i], city: "Singapore" },
  { patterns: [/corbett|dhikala|ramnagar/i], city: "Jim Corbett National Park" },
  { patterns: [/prayagraj|allahabad|sangam|triveni/i], city: "Prayagraj" },
  { patterns: [/anand bhavan|khusro bagh|hanuman mandir/i], city: "Prayagraj" },
]

/**
 * @param {string} destination
 */
export function normalizeDestination(destination) {
  const raw = normalizeDestinationInput(String(destination || "").trim())
  const seen = new Set()
  const cities = []

  for (const part of raw.split(",")) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (GENERIC_DESTINATION_TERMS.has(trimmed.toLowerCase())) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cities.push(trimmed)
  }

  return {
    primaryCity: cities[0] || "",
    cities,
    raw,
  }
}

/**
 * @param {string[]} parts
 */
export function cleanQuery(parts) {
  const out = []
  const seen = new Set()

  for (const raw of parts) {
    const p = String(raw || "").trim()
    if (!p) continue
    const key = p.toLowerCase()
    if (seen.has(key)) continue

    if (out.length > 0) {
      const landmark = out[0].toLowerCase()
      if (landmark.includes(key)) continue
      const joined = out.join(", ").toLowerCase()
      if (joined.includes(key)) continue
    }

    seen.add(key)
    out.push(p)
  }

  return out.join(", ")
}

function activitySearchText(activity) {
  return [
    activity?.location,
    activity?.place,
    activity?.address,
    activity?.description,
    activity?.title,
    activity?.name,
  ]
    .filter(Boolean)
    .join(" ")
}

function normalizeLandmarkKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Accurate coords for well-known seed / tourism POIs (used before Nominatim). */
const KNOWN_LANDMARK_COORDS = new Map([
  ["taj mahal", { latitude: 27.1751, longitude: 78.0421, displayName: "Taj Mahal, Agra, India" }],
  ["agra fort", { latitude: 27.1797, longitude: 78.0211, displayName: "Agra Fort, Agra, India" }],
  ["mehtab bagh", { latitude: 27.1844, longitude: 78.0419, displayName: "Mehtab Bagh, Agra, India" }],
  ["tajganj", { latitude: 27.1687, longitude: 78.042, displayName: "Tajganj, Agra, India" }],
  ["sadar bazaar", { latitude: 27.1648, longitude: 78.0055, displayName: "Sadar Bazaar, Agra, India" }],
  ["vaishno devi temple", { latitude: 33.031, longitude: 74.9479, displayName: "Vaishno Devi Temple, Katra, India" }],
  ["katra main market", { latitude: 32.9915, longitude: 74.9318, displayName: "Katra, Jammu and Kashmir, India" }],
  ["dal lake", { latitude: 34.102, longitude: 74.8607, displayName: "Dal Lake, Srinagar, India" }],
  ["shalimar bagh", { latitude: 34.1495, longitude: 74.8737, displayName: "Shalimar Bagh, Srinagar, India" }],
  ["nishat bagh", { latitude: 34.1256, longitude: 74.8792, displayName: "Nishat Bagh, Srinagar, India" }],
  ["pari mahal", { latitude: 34.1431, longitude: 74.8783, displayName: "Pari Mahal, Srinagar, India" }],
  ["gulmarg", { latitude: 34.0484, longitude: 74.3805, displayName: "Gulmarg, Jammu and Kashmir, India" }],
  ["gulmarg gondola", { latitude: 34.0484, longitude: 74.3805, displayName: "Gulmarg Gondola, Gulmarg, India" }],
  ["pahalgam", { latitude: 34.0159, longitude: 75.314, displayName: "Pahalgam, Jammu and Kashmir, India" }],
  ["aru valley", { latitude: 34.0586, longitude: 75.2533, displayName: "Aru Valley, Pahalgam, India" }],
  ["betaab valley", { latitude: 34.0422, longitude: 75.2872, displayName: "Betaab Valley, Pahalgam, India" }],
  ["meenakshi amman temple", { latitude: 9.9195, longitude: 78.1193, displayName: "Meenakshi Amman Temple, Madurai, India" }],
  ["thirumalai nayakkar palace", { latitude: 9.9197, longitude: 78.1208, displayName: "Thirumalai Nayakkar Palace, Madurai, India" }],
  ["ramanathaswamy temple", { latitude: 9.2881, longitude: 79.3127, displayName: "Ramanathaswamy Temple, Rameswaram, India" }],
  ["tirumala venkateswara temple", { latitude: 13.6833, longitude: 79.347, displayName: "Tirumala, Tirupati, India" }],
  ["grand palace", { latitude: 13.75, longitude: 100.4913, displayName: "Grand Palace, Bangkok, Thailand" }],
  ["patong beach", { latitude: 7.8895, longitude: 98.2952, displayName: "Patong Beach, Phuket, Thailand" }],
  ["phi phi islands", { latitude: 7.7407, longitude: 98.7784, displayName: "Phi Phi Islands, Thailand" }],
  ["big buddha", { latitude: 7.8276, longitude: 98.3128, displayName: "Big Buddha, Phuket, Thailand" }],
  ["promthep cape", { latitude: 7.7625, longitude: 98.3065, displayName: "Promthep Cape, Phuket, Thailand" }],
  ["kata beach", { latitude: 7.8204, longitude: 98.2987, displayName: "Kata Beach, Phuket, Thailand" }],
  ["ao nang beach", { latitude: 8.0456, longitude: 98.8233, displayName: "Ao Nang Beach, Krabi, Thailand" }],
  ["railay beach", { latitude: 8.0113, longitude: 98.8365, displayName: "Railay Beach, Krabi, Thailand" }],
  ["gateway of india", { latitude: 18.922, longitude: 72.8347, displayName: "Gateway of India, Mumbai, India" }],
  ["national museum", { latitude: 28.6119, longitude: 77.2195, displayName: "National Museum, New Delhi, India" }],
  ["janpath", { latitude: 28.6119, longitude: 77.2195, displayName: "National Museum, Janpath, New Delhi, India" }],
  ["radhanagar beach", { latitude: 11.9794, longitude: 92.9512, displayName: "Radhanagar Beach, Havelock Island, India" }],
  ["marine drive", { latitude: 18.9432, longitude: 72.8236, displayName: "Marine Drive, Mumbai, India" }],
  ["india gate", { latitude: 28.6129, longitude: 77.2295, displayName: "India Gate, New Delhi, India" }],
  ["amber fort", { latitude: 26.9855, longitude: 75.8513, displayName: "Amber Fort, Jaipur, India" }],
  ["lake pichola", { latitude: 24.5713, longitude: 73.6835, displayName: "Lake Pichola, Udaipur, India" }],
  ["triveni sangam", { latitude: 25.423, longitude: 81.883, displayName: "Triveni Sangam, Prayagraj, India" }],
  ["anand bhavan", { latitude: 25.4516, longitude: 81.8585, displayName: "Anand Bhavan, Prayagraj, India" }],
  ["khusro bagh", { latitude: 25.443, longitude: 81.8406, displayName: "Khusro Bagh, Prayagraj, India" }],
  ["hanuman mandir", { latitude: 25.4358, longitude: 81.8463, displayName: "Hanuman Mandir, Prayagraj, India" }],
  ["alopi shankar temple", { latitude: 25.4489, longitude: 81.8439, displayName: "Alopi Shankar Temple, Prayagraj, India" }],
  ["chandrashekhar azad park", { latitude: 25.4542, longitude: 81.8511, displayName: "Chandrashekhar Azad Park, Prayagraj, India" }],
  ["corbett waterfall", { latitude: 29.4414, longitude: 79.1425, displayName: "Corbett Waterfall, Uttarakhand, India" }],
  ["dhikala", { latitude: 29.4897, longitude: 79.14, displayName: "Dhikala Zone, Jim Corbett National Park, India" }],
  ["dhikala zone", { latitude: 29.4897, longitude: 79.14, displayName: "Dhikala Zone, Jim Corbett National Park, India" }],
  ["ramnagar market", { latitude: 29.3949, longitude: 79.126, displayName: "Ramnagar Market, Uttarakhand, India" }],
  ["ramnagar town", { latitude: 29.3949, longitude: 79.126, displayName: "Ramnagar, Uttarakhand, India" }],
])

const KNOWN_CITY_COORDS = new Map([
  ["agra", { latitude: 27.1767, longitude: 78.0081, displayName: "Agra, Uttar Pradesh, India" }],
  ["katra", { latitude: 32.9915, longitude: 74.9318, displayName: "Katra, Jammu and Kashmir, India" }],
  ["srinagar", { latitude: 34.0837, longitude: 74.7973, displayName: "Srinagar, Jammu and Kashmir, India" }],
  ["gulmarg", { latitude: 34.0484, longitude: 74.3805, displayName: "Gulmarg, Jammu and Kashmir, India" }],
  ["pahalgam", { latitude: 34.0159, longitude: 75.314, displayName: "Pahalgam, Jammu and Kashmir, India" }],
  ["madurai", { latitude: 9.9252, longitude: 78.1198, displayName: "Madurai, Tamil Nadu, India" }],
  ["rameswaram", { latitude: 9.2881, longitude: 79.3127, displayName: "Rameswaram, Tamil Nadu, India" }],
  ["tirupati", { latitude: 13.6288, longitude: 79.4192, displayName: "Tirupati, Andhra Pradesh, India" }],
  ["bangkok", { latitude: 13.7563, longitude: 100.5018, displayName: "Bangkok, Thailand" }],
  ["phuket", { latitude: 7.8804, longitude: 98.3923, displayName: "Phuket, Thailand" }],
  ["krabi", { latitude: 8.0863, longitude: 98.9063, displayName: "Krabi, Thailand" }],
  ["mumbai", { latitude: 19.076, longitude: 72.8777, displayName: "Mumbai, Maharashtra, India" }],
  ["delhi", { latitude: 28.6139, longitude: 77.209, displayName: "Delhi, India" }],
  ["jaipur", { latitude: 26.9124, longitude: 75.7873, displayName: "Jaipur, Rajasthan, India" }],
  ["goa", { latitude: 15.2993, longitude: 74.124, displayName: "Goa, India" }],
  ["varanasi", { latitude: 25.3176, longitude: 82.9739, displayName: "Varanasi, Uttar Pradesh, India" }],
  ["udaipur", { latitude: 24.5854, longitude: 73.7125, displayName: "Udaipur, Rajasthan, India" }],
  ["leh", { latitude: 34.1526, longitude: 77.577, displayName: "Leh, Ladakh, India" }],
  ["darjeeling", { latitude: 27.041, longitude: 88.2663, displayName: "Darjeeling, West Bengal, India" }],
  ["west bengal", { latitude: 22.9868, longitude: 87.855, displayName: "West Bengal, India" }],
  ["kolkata", { latitude: 22.5726, longitude: 88.3639, displayName: "Kolkata, West Bengal, India" }],
  ["rishikesh", { latitude: 30.0869, longitude: 78.2676, displayName: "Rishikesh, Uttarakhand, India" }],
  ["alleppey", { latitude: 9.4981, longitude: 76.3388, displayName: "Alleppey, Kerala, India" }],
  ["ubud", { latitude: -8.5069, longitude: 115.2625, displayName: "Ubud, Bali, Indonesia" }],
  ["jammu", { latitude: 32.7266, longitude: 74.857, displayName: "Jammu, Jammu and Kashmir, India" }],
  ["port blair", { latitude: 11.6234, longitude: 92.7265, displayName: "Port Blair, Andaman and Nicobar Islands, India" }],
  ["prayagraj", { latitude: 25.4358, longitude: 81.8463, displayName: "Prayagraj, Uttar Pradesh, India" }],
  ["allahabad", { latitude: 25.4358, longitude: 81.8463, displayName: "Prayagraj, Uttar Pradesh, India" }],
  ["jim corbett national park", { latitude: 29.3924, longitude: 79.126, displayName: "Jim Corbett National Park, Uttarakhand, India" }],
  ["ramnagar", { latitude: 29.3949, longitude: 79.126, displayName: "Ramnagar, Uttarakhand, India" }],
])

const GENERIC_LANDMARK_WORDS = new Set([
  "dinner",
  "lunch",
  "breakfast",
  "departure",
  "transfer",
  "check in",
  "check out",
  "relaxation",
  "return",
  "resort",
  "hotel",
  "restaurant",
  "spa",
  "grounds",
  "surroundings",
  "viewpoint",
  "area",
  "local",
  "various",
  "market",
  "town",
])

/** Too vague to geocode alone — prefer activity name or city fallback. */
const GENERIC_LOCATION_PATTERNS = [
  /^resort\b/i,
  /^hotel\b/i,
  /^local\b/i,
  /^various\b/i,
  /\barea$/i,
  /\bnear\b/i,
  /\bgrounds\b/i,
  /\bsurroundings\b/i,
  /\brestaurant\b/i,
  /\bspa\b/i,
  /\bviewpoint\b/i,
]

export function isGenericLocationTerm(text) {
  const key = normalizeLandmarkKey(text)
  if (!key || key.length < 3) return true
  if (GENERIC_LANDMARK_WORDS.has(key)) return true
  return GENERIC_LOCATION_PATTERNS.some((re) => re.test(String(text || "")))
}

export function isGenericLandmark(landmark) {
  return isGenericLocationTerm(landmark)
}

/**
 * @param {string} landmark
 * @param {string} city
 * @param {string} [activityName]
 */
export function lookupKnownCoordinates(landmark, city, activityName = "") {
  const landmarkKey = normalizeLandmarkKey(landmark)
  const blob = normalizeLandmarkKey(`${landmark} ${activityName} ${city}`)

  if (GENERIC_LANDMARK_WORDS.has(landmarkKey)) {
    const cityKey = normalizeLandmarkKey(city)
    return KNOWN_CITY_COORDS.get(cityKey) || null
  }

  if (KNOWN_LANDMARK_COORDS.has(landmarkKey)) {
    return KNOWN_LANDMARK_COORDS.get(landmarkKey)
  }

  for (const [key, coords] of KNOWN_LANDMARK_COORDS) {
    if (blob.includes(key) || landmarkKey.includes(key)) {
      return coords
    }
  }

  const cityKey = normalizeLandmarkKey(city)
  if (KNOWN_CITY_COORDS.has(cityKey)) {
    return KNOWN_CITY_COORDS.get(cityKey)
  }

  return null
}

/**
 * Match trip destination against known city / park coordinates.
 * @param {string} destination
 */
export function lookupDestinationCoordinates(destination) {
  const corrected = normalizeDestinationInput(destination)
  const normalized = normalizeDestination(corrected)
  for (const part of normalized.cities) {
    const key = normalizeLandmarkKey(part)
    if (KNOWN_CITY_COORDS.has(key)) {
      return KNOWN_CITY_COORDS.get(key)
    }
  }

  const blob = normalizeLandmarkKey(corrected)
  for (const [key, coords] of KNOWN_CITY_COORDS) {
    if (blob.includes(key)) return coords
  }
  return null
}

function stripActivityNamePrefix(name) {
  let s = String(name || "").trim()
  s = s.replace(/^(visit|explore|morning|afternoon|evening)\s+/i, "")
  s = s.replace(/^(arrive|arrival|depart|departure)(\s+(in|at|from|to)\s+[^,]+)?(\s+and\s+)?/i, "")
  s = s.replace(/^check[\s-]?(in|out)(\s+and\s+)?/i, "")
  s = s.replace(/\s*\(optional\)$/i, "").trim()
  if (!s || isGenericLocationTerm(s) || s.length < 4) return ""
  return s
}

function extractLandmark(activity, inferredCity) {
  const loc = String(activity?.location || activity?.place || activity?.address || "").trim()
  const name = String(activity?.name || activity?.title || "").trim()
  const locPrimary = loc ? loc.split(",")[0].trim() : ""
  const cleanedName = stripActivityNamePrefix(name)

  const locIsOnlyCity =
    inferredCity &&
    (locPrimary.toLowerCase() === inferredCity.toLowerCase() ||
      loc.toLowerCase() === inferredCity.toLowerCase())

  if ((locIsOnlyCity || !locPrimary) && cleanedName.length > 3) {
    return cleanedName
  }

  if (locPrimary && !isGenericLocationTerm(locPrimary)) {
    return locPrimary
  }

  if (cleanedName.length > 3 && !isGenericLocationTerm(cleanedName)) {
    return cleanedName
  }

  if (locPrimary) return locPrimary
  return cleanedName || name
}

/**
 * @param {{ primaryCity: string, cities: string[] }} normalizedDest
 */
function resolveGeoContext(destinationRaw, city, normalizedDest) {
  const blob = `${destinationRaw} ${city} ${normalizedDest.cities.join(" ")}`.toLowerCase()

  if (/thailand|phuket|krabi|bangkok/.test(blob)) {
    return { country: "Thailand", region: null }
  }
  if (/bali|indonesia/.test(blob)) {
    return { country: "Indonesia", region: "Bali" }
  }
  if (/dubai|uae|emirates/.test(blob)) {
    return { country: "United Arab Emirates", region: null }
  }
  if (/singapore/.test(blob)) {
    return { country: "Singapore", region: null }
  }

  if (
    /india|goa|agra|jaipur|mumbai|delhi|kashmir|jammu|katra|srinagar|gulmarg|pahalgam|madurai|rameswaram|tirupati|varanasi|udaipur|leh|ladakh|darjeeling|rishikesh|andaman|shimla|manali|tamil nadu|uttar pradesh/.test(
      blob,
    )
  ) {
    if (/alleppey|alappuzha|kerala/.test(blob)) {
      return { country: "India", region: "Kerala" }
    }
    if (/katra|srinagar|gulmarg|pahalgam|jammu|kashmir/.test(blob)) {
      return { country: "India", region: "Jammu and Kashmir" }
    }
    if (/madurai|rameswaram/.test(blob)) {
      return { country: "India", region: "Tamil Nadu" }
    }
    if (/tirupati/.test(blob)) {
      return { country: "India", region: "Andhra Pradesh" }
    }
    if (/agra|tajganj|fatehpur/.test(blob)) {
      return { country: "India", region: "Uttar Pradesh" }
    }
    if (/mumbai|maharashtra/.test(blob)) {
      return { country: "India", region: "Maharashtra" }
    }
    if (/delhi/.test(blob)) {
      return { country: "India", region: "Delhi" }
    }
    if (/goa/.test(blob)) {
      return { country: "India", region: "Goa" }
    }
    if (/jaipur|rajasthan/.test(blob)) {
      return { country: "India", region: "Rajasthan" }
    }
    if (/udaipur/.test(blob)) {
      return { country: "India", region: "Rajasthan" }
    }
    if (/varanasi|uttar pradesh/.test(blob)) {
      return { country: "India", region: "Uttar Pradesh" }
    }
    if (/darjeeling|west bengal/.test(blob)) {
      return { country: "India", region: "West Bengal" }
    }
    if (/uttarakhand|corbett|ramnagar|nainital/.test(blob)) {
      return { country: "India", region: "Uttarakhand" }
    }
    if (/prayagraj|allahabad|uttar pradesh/.test(blob)) {
      return { country: "India", region: "Uttar Pradesh" }
    }
    if (/andaman|port blair/.test(blob)) {
      return { country: "India", region: "Andaman and Nicobar Islands" }
    }
    return { country: "India", region: null }
  }

  const last = normalizedDest.cities[normalizedDest.cities.length - 1]
  if (last && /^(thailand|india|indonesia|singapore)$/i.test(last)) {
    return { country: last.replace(/\b\w/g, (c) => c.toUpperCase()), region: null }
  }

  return { country: null, region: null }
}

/**
 * @param {object} activity
 * @param {{ primaryCity: string, cities: string[] }} normalizedDest
 */
export function inferActivityCity(activity, normalizedDest) {
  const text = activitySearchText(activity)

  for (const hint of ACTIVITY_CITY_HINTS) {
    if (hint.patterns.some((re) => re.test(text))) {
      return hint.city
    }
  }

  for (const city of normalizedDest.cities) {
    if (city.length > 2 && text.toLowerCase().includes(city.toLowerCase())) {
      return city
    }
  }

  return normalizedDest.primaryCity || normalizedDest.cities[0] || ""
}

function pushUnique(list, parts) {
  const q = cleanQuery(parts)
  if (q && !list.includes(q)) list.push(q)
}

/**
 * @param {object} activity
 * @param {{ destination?: string }} trip
 */
export function buildGeocodeQueries(activity, trip) {
  const normalizedDest = normalizeDestination(trip?.destination || "")
  const city = inferActivityCity(activity, normalizedDest)
  const { country, region } = resolveGeoContext(trip?.destination || "", city, normalizedDest)
  const landmark = extractLandmark(activity, city)
  const nameLandmark = stripActivityNamePrefix(activity?.name || "")

  const landmarkQueries = []
  const cityFallbackQueries = []

  const landmarkIsCity =
    landmark && city && landmark.toLowerCase() === city.toLowerCase()

  const pushLandmarkQueries = (label) => {
    if (!label || isGenericLocationTerm(label)) return
    if (region && country) pushUnique(landmarkQueries, [label, city, region, country])
    if (country && city) pushUnique(landmarkQueries, [label, city, country])
    if (country) pushUnique(landmarkQueries, [label, country])
    pushUnique(landmarkQueries, [label, city])
  }

  if (landmark && !landmarkIsCity) {
    pushLandmarkQueries(landmark)
  } else if (landmark) {
    if (region && country) pushUnique(landmarkQueries, [landmark, region, country])
    if (country) pushUnique(landmarkQueries, [landmark, country])
  }

  if (
    nameLandmark &&
    nameLandmark !== landmark &&
    !isGenericLocationTerm(nameLandmark)
  ) {
    pushLandmarkQueries(nameLandmark)
  }

  if (city) {
    if (region && country) pushUnique(cityFallbackQueries, [city, region, country])
    if (country) pushUnique(cityFallbackQueries, [city, country])
    pushUnique(cityFallbackQueries, [city])
  }

  const queries = [...landmarkQueries]
  for (const q of cityFallbackQueries) {
    if (!queries.includes(q)) queries.push(q)
  }

  return {
    queries,
    landmarkQueries,
    cityFallbackQueries,
    city,
    landmark,
  }
}

/**
 * @param {{ latitude?: number, longitude?: number }} activity
 */
export function hasValidCoordinates(activity) {
  const lat = Number(activity?.latitude)
  const lng = Number(activity?.longitude)
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}
