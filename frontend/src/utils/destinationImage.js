/** Served from `public/` when remote destination images fail to load. */
export const DESTINATION_IMAGE_FALLBACK = "/default-travel.svg"

const THEME_LOCAL_FALLBACKS = {
  spiritual: "/fallbacks/temple.svg",
  beach: "/fallbacks/beach.svg",
  mountain: "/fallbacks/mountain.svg",
  adventure: "/fallbacks/mountain.svg",
  snowfall: "/fallbacks/mountain.svg",
  cultural: "/fallbacks/city.svg",
  history: "/fallbacks/temple.svg",
}

const DESTINATION_LOCAL_FALLBACKS = [
  { pattern: /ujjain|mahakal/i, src: "/fallbacks/temple.svg" },
  { pattern: /madurai|meenakshi|tirupati|rameswaram|temple|pilgrimage/i, src: "/fallbacks/temple.svg" },
  { pattern: /darjeeling|kashmir|gulmarg|pahalgam|mountain|hill|corbett|wildlife|national park/i, src: "/fallbacks/mountain.svg" },
  { pattern: /phuket|goa|krabi|beach|island/i, src: "/fallbacks/beach.svg" },
  { pattern: /agra|delhi|mumbai|jaipur|udaipur|rajasthan|city/i, src: "/fallbacks/city.svg" },
]

/**
 * Resolve persisted cover image URL from trip document (backend-selected).
 */
export function resolveTripCoverUrl(itinerary) {
  if (!itinerary) return null
  return (
    itinerary.coverImage?.url ||
    itinerary.imageUrl ||
    itinerary.image ||
    itinerary.thumbnail ||
    itinerary.heroImage ||
    null
  )
}

export function resolveTripCoverAlt(itinerary) {
  if (!itinerary) return "Travel destination"
  return (
    itinerary.coverImage?.alt ||
    `${itinerary.title || itinerary.destination || "Trip"} travel destination`
  )
}

/**
 * Last-resort local themed fallback (no API keys, no random picsum).
 */
export function resolveLocalThemedFallback(itinerary) {
  const blob = [
    itinerary?.title,
    itinerary?.destination,
    ...(itinerary?.tags || []),
    itinerary?.coverImage?.query,
  ]
    .filter(Boolean)
    .join(" ")

  for (const entry of DESTINATION_LOCAL_FALLBACKS) {
    if (entry.pattern.test(blob)) return entry.src
  }

  for (const tag of itinerary?.tags || []) {
    if (THEME_LOCAL_FALLBACKS[tag]) return THEME_LOCAL_FALLBACKS[tag]
  }

  return DESTINATION_IMAGE_FALLBACK
}

/** @deprecated Use resolveTripCoverUrl from API — kept for legacy callers */
export function buildDestinationImageUrl(destination) {
  void destination
  return DESTINATION_IMAGE_FALLBACK
}

export function destinationImageSeed(destination) {
  const raw = (destination && String(destination).trim()) || "travel"
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "travel"
}
