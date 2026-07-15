const VALID_TAGS = new Set([
  "beach",
  "adventure",
  "cultural",
  "luxury",
  "budget",
  "family",
  "romantic",
  "solo",
  "spiritual",
  "mountain",
  "nature",
  "food",
  "history",
  "snowfall",
])

const VALID_CATEGORIES = new Set([
  "sightseeing",
  "adventure",
  "cultural",
  "relaxation",
  "dining",
  "shopping",
])

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function asString(value, max = 500) {
  return String(value ?? "")
    .trim()
    .slice(0, max)
}

function asNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeActivity(raw, dest) {
  const category = VALID_CATEGORIES.has(raw?.category) ? raw.category : "sightseeing"
  const out = {
    name: asString(raw?.name, 120) || `Explore ${dest}`,
    description:
      asString(raw?.description, 600) ||
      `A memorable ${category} experience in ${dest}.`,
    time: asString(raw?.time, 12) || "10:00",
    location: asString(raw?.location, 120) || dest,
    category,
    duration: asString(raw?.duration, 40) || "2-3 hours",
    cost: Math.max(0, asNumber(raw?.cost, 0)),
  }

  const lat = Number(raw?.latitude)
  const lng = Number(raw?.longitude)
  if (Number.isFinite(lat) && lat >= -90 && lat <= 90) out.latitude = lat
  if (Number.isFinite(lng) && lng >= -180 && lng <= 180) out.longitude = lng
  const geocodedName = asString(raw?.geocodedName, 200)
  if (geocodedName) out.geocodedName = geocodedName

  return out
}

function normalizeDay(raw, dayNumber, dest) {
  const activities = Array.isArray(raw?.activities) ? raw.activities : []
  const normalizedActivities =
    activities.length > 0
      ? activities.slice(0, 6).map((a) => normalizeActivity(a, dest))
      : [normalizeActivity({}, dest)]

  return {
    dayNumber,
    dayLabel: asString(raw?.dayLabel, 200),
    hotel: {
      name: asString(raw?.hotel?.name, 120) || `${dest} Hotel`,
      location: asString(raw?.hotel?.location, 120) || dest,
      rating: clamp(asNumber(raw?.hotel?.rating, 4), 1, 5),
      checkIn: asString(raw?.hotel?.checkIn, 40),
      checkOut: asString(raw?.hotel?.checkOut, 40),
    },
    transfers: [],
    activities: normalizedActivities,
    meals: [],
  }
}

/**
 * @param {object} raw - LLM or demo payload
 * @param {{ destination?: string, numberOfNights?: number, travelStyle?: string, budget?: object, interests?: string[] }} context
 */
export function normalizeGeneratedItinerary(raw, context = {}) {
  const nights = clamp(asNumber(raw?.numberOfNights ?? context.numberOfNights, 3), 1, 14)
  const totalDays = nights + 1
  const dest =
    asString(raw?.destination, 120) ||
    asString(context.destination, 120) ||
    "India"

  const budgetMin = Math.max(
    0,
    asNumber(raw?.budget?.min ?? context.budget?.min, context.budget?.min ?? 300),
  )
  const budgetMax = Math.max(
    budgetMin,
    asNumber(raw?.budget?.max ?? context.budget?.max, context.budget?.max ?? budgetMin + 500),
  )

  const style = asString(context.travelStyle, 40).toLowerCase()
  const tagsFromRaw = Array.isArray(raw?.tags) ? raw.tags.map((t) => asString(t, 30).toLowerCase()) : []
  const tags = [...new Set([style, ...tagsFromRaw].filter((t) => VALID_TAGS.has(t)))].slice(0, 5)
  if (tags.length === 0 && VALID_TAGS.has(style)) tags.push(style)
  if (tags.length === 0) tags.push("cultural")

  const rawDays = Array.isArray(raw?.days) ? raw.days : []
  const days = []
  for (let i = 0; i < totalDays; i += 1) {
    days.push(normalizeDay(rawDays[i] || {}, i + 1, dest))
  }

  const highlights = (Array.isArray(raw?.highlights) ? raw.highlights : [])
    .map((h) => asString(h, 120))
    .filter(Boolean)
    .slice(0, 8)

  const interests = (context.interests || []).map((x) => asString(x, 80)).filter(Boolean)

  return {
    title:
      asString(raw?.title, 120) ||
      `${dest} ${style ? style.charAt(0).toUpperCase() + style.slice(1) : ""} Trip`.trim(),
    destination: dest,
    numberOfNights: nights,
    totalDays,
    description:
      asString(raw?.description, 1200) ||
      `A personalized ${nights}-night journey in ${dest} shaped around your ${style || "travel"} style` +
        (interests.length ? ` and interests in ${interests.slice(0, 3).join(", ")}.` : "."),
    budget: {
      min: budgetMin,
      max: budgetMax,
      currency: asString(raw?.budget?.currency ?? context.budget?.currency, 8) || "USD",
    },
    bestTimeToVisit: asString(raw?.bestTimeToVisit, 80) || "October – March",
    highlights:
      highlights.length >= 3
        ? highlights
        : [
            `Top experiences in ${dest}`,
            interests[0] ? `Focused on ${interests[0]}` : "Local culture & landmarks",
            `${totalDays}-day balanced pacing`,
          ],
    tags,
    days,
  }
}
