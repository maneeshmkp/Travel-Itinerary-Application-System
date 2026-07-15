/** Client-side place image matching (mirrors backend placeImageService curated URLs). */

const U = {
  goaBeach:
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&h=600&fit=crop&q=80&auto=format",
  beach:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80&auto=format",
  food: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&h=600&fit=crop&q=80&auto=format",
  heritage:
    "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&h=600&fit=crop&q=80&auto=format",
  wildlife:
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop&q=80&auto=format",
  mountain:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80&auto=format",
  boat: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&h=600&fit=crop&q=80&auto=format",
  walk: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop&q=80&auto=format",
  resort:
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop&q=80&auto=format",
  temple:
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80&auto=format",
  kerala:
    "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&h=600&fit=crop&q=80&auto=format",
}

const DEST_RULES = [
  { patterns: [/goa/i, /calangute/i, /baga/i, /anjuna/i], url: U.goaBeach, alt: "Goa beach" },
  { patterns: [/corbett/i, /jim corbett/i], url: U.wildlife, alt: "Jim Corbett wildlife" },
  { patterns: [/kerala/i, /alleppey/i, /munnar/i], url: U.kerala, alt: "Kerala backwaters" },
  { patterns: [/prayagraj/i, /sangam/i, /varanasi/i], url: U.temple, alt: "Spiritual India" },
  { patterns: [/shimla/i, /manali/i, /ladakh/i, /darjeeling/i], url: U.mountain, alt: "Hills" },
  { patterns: [/phuket/i, /krabi/i, /thailand/i], url: U.beach, alt: "Thailand coast" },
]

const ACTIVITY_RULES = [
  { patterns: [/beach|sunset|sea|coast|shore/i], url: U.goaBeach },
  { patterns: [/food|lunch|dinner|restaurant|cafe|market/i], url: U.food },
  { patterns: [/fort|church|temple|heritage|monument|museum/i], url: U.heritage },
  { patterns: [/wildlife|safari|jungle|national park/i], url: U.wildlife },
  { patterns: [/trek|mountain|valley|hill/i], url: U.mountain },
  { patterns: [/boat|cruise|backwater|ferry/i], url: U.boat },
  { patterns: [/walk|neighborhood|stroll|explore/i], url: U.walk },
  { patterns: [/spa|wellness|yoga/i], url: U.resort },
]

function matchUrl(blob, rules, fallback) {
  for (const rule of rules) {
    if (rule.patterns.some((rx) => rx.test(blob))) {
      return { url: rule.url, alt: rule.alt || "Place" }
    }
  }
  return fallback
}

function resolveClientPlace(place, trip, used) {
  const label = place.name || "Place"
  const blob = [place.name, place.location, place.description, trip?.destination, ...(trip?.tags || [])]
    .filter(Boolean)
    .join(" ")

  let hit =
    matchUrl(blob, DEST_RULES, null) ||
    matchUrl(blob, ACTIVITY_RULES, null) ||
  { url: U.walk, alt: label }

  if (trip?.tags?.includes("beach")) hit = { url: U.goaBeach, alt: label }
  if (trip?.tags?.includes("mountain")) hit = { url: U.mountain, alt: label }

  const stem = hit.url.split("?")[0]
  if (used.has(stem)) {
    const pool = [U.beach, U.walk, U.food, U.heritage, U.mountain, U.boat]
    hit = { url: pool[used.size % pool.length], alt: label }
  }
  used.add(hit.url.split("?")[0])
  return { ...hit, alt: hit.alt || label }
}

/** Build gallery when API has not yet returned placeImages. */
export function buildClientPlaceImages(itinerary, max = 1) {
  if (!itinerary?.days?.length) return []
  const used = new Set()
  const out = []
  const seen = new Set()

  for (const day of itinerary.days) {
    if (day.hotel?.name) {
      const key = `h-${day.hotel.name}`
      if (!seen.has(key)) {
        seen.add(key)
        const img = resolveClientPlace(
          { name: day.hotel.name, location: day.hotel.location, description: day.hotel.name },
          itinerary,
          used,
        )
        out.push({
          ...img,
          dayNumber: day.dayNumber,
          label: day.hotel.name,
          location: day.hotel.location,
          type: "hotel",
        })
      }
    }
    for (const act of day.activities || []) {
      if (!act?.name) continue
      const key = `a-${act.name}`
      if (seen.has(key)) continue
      seen.add(key)
      const img = resolveClientPlace(act, itinerary, used)
      out.push({
        ...img,
        dayNumber: day.dayNumber,
        label: act.name,
        location: act.location || "",
        type: "activity",
        category: act.category,
      })
      if (out.length >= max) return out
    }
  }
  return out
}
