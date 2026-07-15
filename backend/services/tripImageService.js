import Itinerary from "../models/Itinerary.js"
import { normalizeDestination } from "../utils/geocodingQueryBuilder.js"
import {
  BROKEN_UNSPLASH_PHOTO_IDS,
  GENERIC_SHARED_PHOTO_IDS,
  TAJ_MAHAL_PHOTO_IDS,
  THEME_FALLBACKS,
  TRIP_IMAGE_FALLBACKS,
  UNIQUE_OVERFLOW_POOL,
  UNRELATED_IMAGE_PATTERNS,
} from "../config/tripImageFallbacks.js"

const LANDMARK_PATTERN =
  /temple|palace|fort|mosque|church|shrine|ghat|lake|beach|valley|garden|monument|museum|bazaar|market|gondola|buddha|taj|gate|tower|cathedral|pagoda|gurudwara|jyotirlinga|darshan|aarti/i

/** @type {Map<string, { expires: number, data: object | null }>} */
const searchCache = new Map()
/** @type {Map<string, { expires: number, ok: boolean }>} */
const urlValidationCache = new Map()
const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const URL_VALIDATION_TTL_MS = 6 * 60 * 60 * 1000

function tripSearchText(trip) {
  return [
    trip?.title,
    trip?.destination,
    trip?.description,
    ...(trip?.highlights || []),
    ...(trip?.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
}

function collectActivities(trip) {
  const out = []
  for (const day of trip?.days || []) {
    for (const activity of day?.activities || []) {
      if (activity?.name || activity?.location) out.push(activity)
    }
  }
  return out
}

function isLandmarkActivity(activity) {
  const text = `${activity?.name || ""} ${activity?.location || ""} ${activity?.description || ""}`
  return LANDMARK_PATTERN.test(text)
}

function cityForActivity(activity, cities) {
  const loc = String(activity?.location || "").split(",")[0].trim()
  if (loc && !cities.includes(loc)) return loc
  return cities[0] || ""
}

function buildActivityQuery(activity, destination) {
  const name = String(activity?.name || "").trim()
  const { cities } = normalizeDestination(destination || "")
  const city = cityForActivity(activity, cities)
  if (name && city) return `${name} ${city} India`
  if (name) return `${name} ${destination || ""}`.trim()
  return city
}

function themeGenericQuery(trip) {
  const tags = trip?.tags || []
  const dest = String(trip?.destination || "").trim()
  if (tags.includes("spiritual") || tags.includes("history")) return `${dest} temple spiritual travel`
  if (tags.includes("beach")) return `${dest} beach travel`
  if (tags.includes("mountain") || tags.includes("snowfall") || tags.includes("adventure")) {
    return `${dest} mountains travel`
  }
  if (tags.includes("cultural")) return `${dest} cultural landmark travel`
  return `${dest} landmark travel`
}

export function buildImageSearchQueries(trip) {
  const queries = []
  const seen = new Set()

  const push = (q) => {
    const s = String(q || "")
      .trim()
      .replace(/\s+/g, " ")
    if (s.length < 3) return
    const key = s.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    queries.push(s)
  }

  const activities = collectActivities(trip)
  const landmarks = activities.filter(isLandmarkActivity)
  const others = activities.filter((a) => !isLandmarkActivity(a))

  for (const activity of landmarks) {
    push(buildActivityQuery(activity, trip?.destination))
  }
  for (const activity of others) {
    push(buildActivityQuery(activity, trip?.destination))
  }

  if (trip?.title) push(trip.title)

  const { cities } = normalizeDestination(trip?.destination || "")
  for (const city of cities) {
    if (/india/i.test(trip?.destination || "")) {
      push(`${city} India temple landmark`)
    }
    push(`${city} India travel`)
    push(`${city} famous landmark`)
  }

  for (const tag of trip?.tags || []) {
    push(`${cities[0] || trip?.destination || ""} ${tag} travel`.trim())
  }

  push(themeGenericQuery(trip))
  push(`${trip?.destination || "travel"} destination`)

  return queries
}

function optimizeImageUrl(url) {
  if (!url) return url
  if (!url.includes("images.unsplash.com")) return url
  const base = url.split("?")[0]
  return `${base}?w=1200&h=800&fit=crop&q=80&auto=format`
}

/**
 * @param {string} url
 */
export async function validateImageUrl(url) {
  const trimmed = String(url || "").trim()
  if (!trimmed) return false

  const cached = urlValidationCache.get(trimmed)
  if (cached && Date.now() < cached.expires) return cached.ok

  let ok = false
  try {
    const res = await fetch(trimmed, {
      method: "GET",
      headers: {
        Range: "bytes=0-512",
        "User-Agent": "TravelItinerarySystem/1.0 (cover-image-validator)",
      },
      signal: AbortSignal.timeout(12000),
    })
    ok = res.ok || res.status === 206
  } catch {
    ok = false
  }

  urlValidationCache.set(trimmed, { expires: Date.now() + URL_VALIDATION_TTL_MS, ok })
  return ok
}

function finalizeCover(cover, queryOverride) {
  if (!cover) return null
  const url = optimizeImageUrl(cover.url)
  return {
    url,
    alt: cover.alt || queryOverride || "Travel destination",
    source: cover.source || "curated",
    photographer: cover.photographer || "",
    photographerUrl: cover.photographerUrl || "",
    query: queryOverride || cover.query || "",
    updatedAt: new Date(),
  }
}

export function urlStem(value) {
  return String(value || "")
    .split("?")[0]
    .toLowerCase()
}

function isUrlExcluded(url, excludeStems) {
  if (!excludeStems?.size) return false
  return excludeStems.has(urlStem(url))
}

/**
 * @param {object} cover
 * @param {{ excludeStems?: Set<string> }} [options]
 */
async function resolveCoverUrls(cover, options = {}) {
  const { excludeStems = new Set() } = options
  const candidates = [...(cover.urls || []), cover.url].filter(Boolean)
  const unique = [...new Set(candidates.map((u) => optimizeImageUrl(u)))]

  for (const url of unique) {
    if (isUrlExcluded(url, excludeStems)) continue
    if (await validateImageUrl(url)) {
      return finalizeCover({ ...cover, url }, cover.query)
    }
  }
  return null
}

async function resolveUniqueFromPool(urls, coverMeta, excludeStems) {
  for (const raw of urls) {
    const url = optimizeImageUrl(raw)
    if (isUrlExcluded(url, excludeStems)) continue
    if (await validateImageUrl(url)) {
      return finalizeCover({ ...coverMeta, url }, coverMeta.query)
    }
  }
  return null
}

export async function getUsedCoverUrlStems(excludeTripId = null) {
  const filter = excludeTripId ? { _id: { $ne: excludeTripId } } : {}
  const trips = await Itinerary.find(filter).select("coverImage.url imageUrl image thumbnail heroImage").lean()
  const stems = new Set()
  for (const trip of trips) {
    const url = getCoverImageUrl(trip)
    if (url) stems.add(urlStem(url))
  }
  return stems
}

function normalizeCoverPayload(result, query) {
  if (!result?.url) return null
  return finalizeCover(
    {
      ...result,
      url: result.url,
      urls: [result.url],
    },
    query,
  )
}

async function unsplashProviderSearch(query, excludeStems = new Set()) {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim()
  if (!key) return null

  const cacheKey = `unsplash:${query.toLowerCase()}`
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() < cached.expires) {
    const hit = cached.data
    if (hit?.url && !isUrlExcluded(hit.url, excludeStems)) return hit
    if (!hit?.urls?.length) return null
  }

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`
  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${key}`,
      "Accept-Version": "v1",
    },
  })

  if (!res.ok) {
    searchCache.set(cacheKey, { expires: Date.now() + 5 * 60 * 1000, data: null })
    return null
  }

  const data = await res.json()
  const results = data?.results || []
  if (!results.length) {
    searchCache.set(cacheKey, { expires: Date.now() + SEARCH_CACHE_TTL_MS, data: null })
    return null
  }

  for (const photo of results) {
    if (!photo?.urls?.regular) continue
    const imageUrl = optimizeImageUrl(photo.urls.regular)
    if (isUrlExcluded(imageUrl, excludeStems)) continue

    const payload = {
      url: imageUrl,
      urls: [imageUrl],
      alt: photo.alt_description || photo.description || query,
      source: "unsplash",
      photographer: photo.user?.name || "",
      photographerUrl: photo.user?.links?.html
        ? `${photo.user.links.html}?utm_source=travel_itinerary&utm_medium=referral`
        : "",
    }

    searchCache.set(cacheKey, { expires: Date.now() + SEARCH_CACHE_TTL_MS, data: payload })
    return payload
  }

  searchCache.set(cacheKey, { expires: Date.now() + SEARCH_CACHE_TTL_MS, data: null })
  return null
}

export async function getFallbackCoverImage(trip, options = {}) {
  const { excludeStems = new Set() } = options
  const blob = tripSearchText(trip)

  for (const entry of TRIP_IMAGE_FALLBACKS) {
    if (entry.patterns.some((rx) => rx.test(blob))) {
      const resolved = await resolveCoverUrls(entry.cover, { excludeStems })
      if (resolved) return resolved
    }
  }

  const tags = trip?.tags || []
  let theme = THEME_FALLBACKS.default
  if (tags.includes("spiritual") || /temple|pilgrimage|jyotirlinga|darshan/i.test(blob)) {
    theme = THEME_FALLBACKS.spiritual
  } else if (tags.includes("beach") || /beach|island|coast/i.test(blob)) {
    theme = THEME_FALLBACKS.beach
  } else if (
    tags.includes("mountain") ||
    tags.includes("snowfall") ||
    tags.includes("adventure") ||
    /mountain|hill|trek|valley|gondola/i.test(blob)
  ) {
    theme = THEME_FALLBACKS.mountain
  } else if (tags.includes("cultural") || tags.includes("history")) {
    theme = THEME_FALLBACKS.cultural
  } else if (/india/i.test(blob)) {
    theme = THEME_FALLBACKS.india
  }

  const themed = await resolveCoverUrls(theme, { excludeStems })
  if (themed) return themed

  const overflow = await resolveUniqueFromPool(UNIQUE_OVERFLOW_POOL, theme, excludeStems)
  if (overflow) return overflow

  return finalizeCover(theme)
}

export async function getTripCoverImage(trip, options = {}) {
  const excludeStems =
    options.excludeStems || (await getUsedCoverUrlStems(options.excludeTripId || trip?._id || null))
  const queries = buildImageSearchQueries(trip)

  for (const query of queries) {
    try {
      const hit = await unsplashProviderSearch(query, excludeStems)
      const cover = normalizeCoverPayload(hit, query)
      if (cover && !isUrlExcluded(cover.url, excludeStems) && (await validateImageUrl(cover.url))) {
        return cover
      }
    } catch {
      // try next query
    }
  }

  return getFallbackCoverImage(trip, { excludeStems })
}

export function getCoverImageUrl(trip) {
  return (
    trip?.coverImage?.url ||
    trip?.imageUrl ||
    trip?.image ||
    trip?.thumbnail ||
    trip?.heroImage ||
    null
  )
}

function getMatchedFallbackEntry(trip) {
  const blob = tripSearchText(trip)
  for (const entry of TRIP_IMAGE_FALLBACKS) {
    if (entry.patterns.some((rx) => rx.test(blob))) return entry
  }
  return null
}

function coverUrlMatchesEntry(url, entry) {
  const current = urlStem(url)
  const allowed = [...(entry.cover.urls || []), entry.cover.url].map(urlStem)
  return allowed.some((candidate) => current === candidate || current.includes(candidate) || candidate.includes(current))
}

export function isCoverImageRelevant(trip) {
  const url = getCoverImageUrl(trip)
  if (!url) return false
  if (UNRELATED_IMAGE_PATTERNS.some((rx) => rx.test(url))) return false
  if (BROKEN_UNSPLASH_PHOTO_IDS.some((id) => url.includes(id))) return false

  const blob = tripSearchText(trip).toLowerCase()
  const isAgraTrip = /\bagra\b|taj mahal/i.test(blob)

  if (!isAgraTrip && TAJ_MAHAL_PHOTO_IDS.some((id) => url.includes(id))) {
    return false
  }

  const fallbackEntry = getMatchedFallbackEntry(trip)
  if (fallbackEntry && GENERIC_SHARED_PHOTO_IDS.some((id) => url.includes(id))) {
    return false
  }

  if (fallbackEntry && trip?.coverImage?.source !== "unsplash" && !coverUrlMatchesEntry(url, fallbackEntry)) {
    return false
  }

  if (!trip?.coverImage?.query && !trip?.coverImage?.source) return false
  return true
}

/**
 * @param {object} trip
 */
export async function isCoverImageAccessible(trip) {
  const url = getCoverImageUrl(trip)
  if (!url) return false
  if (!isCoverImageRelevant(trip)) return false
  return validateImageUrl(url)
}

export async function attachCoverImageToItinerary(itineraryDoc) {
  try {
    const excludeStems = await getUsedCoverUrlStems(itineraryDoc._id)
    const coverImage = await getTripCoverImage(itineraryDoc, { excludeStems })
    if (coverImage?.url) {
      itineraryDoc.coverImage = coverImage
      await itineraryDoc.save()
    }
  } catch (err) {
    const excludeStems = await getUsedCoverUrlStems(itineraryDoc._id)
    const fallback = await getFallbackCoverImage(itineraryDoc, { excludeStems })
    itineraryDoc.coverImage = fallback
    await itineraryDoc.save()
    console.warn(`Cover image lookup failed, used fallback: ${err?.message || err}`)
  }
}

export async function refreshTripCoverImage(tripId) {
  const itinerary = await Itinerary.findById(tripId).populate({
    path: "days",
    populate: { path: "activities", model: "Activity" },
  })

  if (!itinerary) {
    const err = new Error("Trip not found")
    err.statusCode = 404
    throw err
  }

  const coverImage = await getTripCoverImage(itinerary, {
    excludeStems: await getUsedCoverUrlStems(itinerary._id),
  })
  itinerary.coverImage = coverImage
  await itinerary.save()

  return {
    tripId: String(itinerary._id),
    coverImage: itinerary.coverImage,
    query: coverImage?.query,
    source: coverImage?.source,
  }
}
