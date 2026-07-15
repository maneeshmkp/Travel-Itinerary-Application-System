import {
  THEME_FALLBACKS,
  TRIP_IMAGE_FALLBACKS,
  UNIQUE_OVERFLOW_POOL,
  VERIFIED_UNSPLASH,
} from "../config/tripImageFallbacks.js"

function optimizeImageUrl(url) {
  if (!url) return url
  if (!url.includes("images.unsplash.com") && !url.includes("wikimedia.org")) return url
  const base = url.split("?")[0]
  return `${base}?w=800&h=600&fit=crop&q=80&auto=format`
}

/** Activity-name patterns → curated scene (when landmark/destination rules miss). */
const ACTIVITY_SCENE_PATTERNS = [
  {
    patterns: [/beach|sunset|sea|swim|coast|shore|baga|calangute|anjuna/i],
    cover: { url: VERIFIED_UNSPLASH.goaBeach, alt: "Beach and coastline" },
  },
  {
    patterns: [/food|lunch|dinner|restaurant|cafe|breakfast|snack|flea market|market/i],
    cover: { url: VERIFIED_UNSPLASH.gatewayMumbai, alt: "Local food and markets" },
  },
  {
    patterns: [/fort|church|temple|mosque|heritage|monument|museum|palace|ghat/i],
    cover: { url: VERIFIED_UNSPLASH.jaipurHeritage, alt: "Heritage landmark" },
  },
  {
    patterns: [/wildlife|safari|jungle|national park|corbett|tiger|elephant/i],
    cover: { url: VERIFIED_UNSPLASH.rishikeshNature, alt: "Wildlife and nature" },
  },
  {
    patterns: [/trek|hike|mountain|valley|hill|gondola|ropeway/i],
    cover: { url: VERIFIED_UNSPLASH.mountains, alt: "Mountain scenery" },
  },
  {
    patterns: [/boat|cruise|backwater|houseboat|ferry/i],
    cover: { url: VERIFIED_UNSPLASH.andamanBoats, alt: "Boat and water experience" },
  },
  {
    patterns: [/walk|neighborhood|stroll|explore|city tour|old town/i],
    cover: { url: VERIFIED_UNSPLASH.travel, alt: "Neighborhood exploration" },
  },
  {
    patterns: [/spa|wellness|yoga|ayurveda|relax/i],
    cover: { url: VERIFIED_UNSPLASH.phuketResort, alt: "Wellness retreat" },
  },
  {
    patterns: [/shopping|bazaar|souvenir/i],
    cover: { url: VERIFIED_UNSPLASH.bangkokCity, alt: "Shopping district" },
  },
]

const CATEGORY_THEME = {
  sightseeing: THEME_FALLBACKS.cultural,
  adventure: THEME_FALLBACKS.adventure,
  cultural: THEME_FALLBACKS.cultural,
  relaxation: THEME_FALLBACKS.beach,
  dining: { url: VERIFIED_UNSPLASH.gatewayMumbai, alt: "Dining experience" },
  shopping: { url: VERIFIED_UNSPLASH.bangkokCity, alt: "Shopping" },
}

function pickFromCoverMeta(cover, label) {
  if (!cover?.url) return null
  return {
    url: optimizeImageUrl(cover.url),
    alt: cover.alt || label || "Place",
    source: cover.source || "curated",
  }
}

function hashIndex(str, mod) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return mod > 0 ? h % mod : 0
}

/**
 * Resolve a curated image for a place/activity using destination + name patterns.
 */
export function resolvePlaceImage(place, trip, usedUrlStems = new Set()) {
  const label = place.name || place.location || "Place"
  const blob = [place.name, place.location, place.description, trip?.destination, ...(trip?.tags || [])]
    .filter(Boolean)
    .join(" ")

  for (const entry of TRIP_IMAGE_FALLBACKS) {
    if (entry.patterns.some((rx) => rx.test(blob))) {
      const urls = [entry.cover.url, ...(entry.cover.urls || [])].filter(Boolean)
      for (const raw of urls) {
        const url = optimizeImageUrl(raw)
        const stem = url.split("?")[0].toLowerCase()
        if (!usedUrlStems.has(stem)) {
          usedUrlStems.add(stem)
          return { url, alt: entry.cover.alt || label, source: entry.cover.source || "curated" }
        }
      }
    }
  }

  for (const entry of ACTIVITY_SCENE_PATTERNS) {
    if (entry.patterns.some((rx) => rx.test(blob))) {
      const img = pickFromCoverMeta(entry.cover, label)
      if (img) {
        const stem = img.url.split("?")[0].toLowerCase()
        if (!usedUrlStems.has(stem)) {
          usedUrlStems.add(stem)
          return img
        }
      }
    }
  }

  const catTheme = CATEGORY_THEME[place.category]
  if (catTheme) {
    const img = pickFromCoverMeta(catTheme, label)
    if (img) {
      const stem = img.url.split("?")[0].toLowerCase()
      if (!usedUrlStems.has(stem)) {
        usedUrlStems.add(stem)
        return img
      }
    }
  }

  const tags = trip?.tags || []
  let theme = THEME_FALLBACKS.default
  if (tags.includes("spiritual") || /temple|pilgrimage/i.test(blob)) theme = THEME_FALLBACKS.spiritual
  else if (tags.includes("beach") || /beach|goa|coast/i.test(blob)) theme = THEME_FALLBACKS.beach
  else if (tags.includes("mountain") || tags.includes("adventure")) theme = THEME_FALLBACKS.mountain
  else if (tags.includes("cultural")) theme = THEME_FALLBACKS.cultural
  else if (/india/i.test(trip?.destination || "")) theme = THEME_FALLBACKS.india

  const themed = pickFromCoverMeta(theme, label)
  if (themed) {
    const stem = themed.url.split("?")[0].toLowerCase()
    if (!usedUrlStems.has(stem)) {
      usedUrlStems.add(stem)
      return themed
    }
  }

  const idx = hashIndex(label + (place.location || ""), UNIQUE_OVERFLOW_POOL.length)
  const overflow = optimizeImageUrl(UNIQUE_OVERFLOW_POOL[idx])
  return { url: overflow, alt: label, source: "curated" }
}

/**
 * Build location-matched gallery images for itinerary days (activities + hotels).
 * @param {object} trip - populated itinerary
 * @param {number} max
 */
export function buildItineraryPlaceImages(trip, max = 1) {
  const usedStems = new Set()
  const images = []
  const seen = new Set()

  const push = (item) => {
    if (images.length >= max) return
    const key = `${item.type}-${item.label}-${item.dayNumber}`
    if (seen.has(key)) return
    seen.add(key)
    images.push(item)
  }

  for (const day of trip?.days || []) {
    const dayNumber = day.dayNumber

    if (day.hotel?.name) {
      const img = resolvePlaceImage(
        {
          name: day.hotel.name,
          location: day.hotel.location,
          description: `Hotel stay — ${day.hotel.name}`,
          category: "sightseeing",
        },
        trip,
        usedStems,
      )
      push({
        ...img,
        dayNumber,
        label: day.hotel.name,
        location: day.hotel.location,
        type: "hotel",
      })
    }

    for (const activity of day.activities || []) {
      if (!activity?.name) continue
      const img = resolvePlaceImage(activity, trip, usedStems)
      push({
        ...img,
        dayNumber,
        label: activity.name,
        location: activity.location || activity.geocodedName || "",
        type: "activity",
        category: activity.category,
      })
    }
  }

  return images
}
