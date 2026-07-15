import User from "../models/User.js"
import Itinerary from "../models/Itinerary.js"

const CONTENT_WEIGHT = 0.65
const COLLAB_WEIGHT = 0.35
const MAX_CANDIDATES = 120

/**
 * @param {object} preferences
 * @param {number} [preferences.nights]
 * @param {string} [preferences.destination]
 * @param {string[]} [preferences.tags]
 * @param {number} [preferences.budgetMin]
 * @param {number} [preferences.budgetMax]
 */
export function buildContentPreferences(preferences = {}) {
  const tags = Array.isArray(preferences.tags)
    ? preferences.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
    : String(preferences.tags || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

  const nights = preferences.nights != null ? Number(preferences.nights) : null
  const budgetMin = preferences.budgetMin != null ? Number(preferences.budgetMin) : null
  const budgetMax =
    preferences.budgetMax != null
      ? Number(preferences.budgetMax)
      : preferences.budget != null
        ? Number(preferences.budget)
        : null

  return {
    nights: Number.isFinite(nights) ? nights : null,
    destination: String(preferences.destination || "").trim(),
    tags,
    budgetMin: Number.isFinite(budgetMin) ? budgetMin : null,
    budgetMax: Number.isFinite(budgetMax) ? budgetMax : null,
  }
}

/**
 * Content-based score 0–100 from tags, duration (nights), and budget fit.
 * @param {object} itinerary - lean or mongoose doc
 * @param {ReturnType<typeof buildContentPreferences>} preferences
 */
export function scoreContentBased(itinerary, preferences) {
  let score = 0
  let maxScore = 0

  const itinTags = (itinerary.tags || []).map((t) => String(t).toLowerCase())

  if (preferences.tags.length > 0) {
    maxScore += 40
    const prefSet = new Set(preferences.tags)
    const overlap = itinTags.filter((t) => prefSet.has(t)).length
    const union = new Set([...preferences.tags, ...itinTags]).size
    score += union > 0 ? (overlap / union) * 40 : 0
  }

  if (preferences.nights != null) {
    maxScore += 30
    const diff = Math.abs(Number(itinerary.numberOfNights) - preferences.nights)
    score += Math.max(0, 30 - diff * 12)
  }

  if (preferences.budgetMax != null) {
    maxScore += 30
    const itinMin = Number(itinerary.budget?.min)
    const itinMax = Number(itinerary.budget?.max)
    if (Number.isFinite(itinMax) && itinMax <= preferences.budgetMax) {
      score += 30
    } else if (
      Number.isFinite(itinMin) &&
      Number.isFinite(itinMax) &&
      itinMin <= preferences.budgetMax &&
      itinMax >= (preferences.budgetMin ?? 0)
    ) {
      score += 18
    } else if (!Number.isFinite(itinMax)) {
      score += 10
    }
  }

  if (preferences.destination) {
    maxScore += 20
    const dest = String(itinerary.destination || "").toLowerCase()
    const pref = preferences.destination.toLowerCase()
    if (dest.includes(pref) || pref.includes(dest)) {
      score += 20
    } else {
      const prefParts = pref.split(",").map((p) => p.trim()).filter(Boolean)
      if (prefParts.some((part) => dest.includes(part))) {
        score += 12
      }
    }
  }

  if (maxScore === 0) {
    return itinerary.isRecommended ? 55 : 40
  }

  return Math.round((score / maxScore) * 100)
}

/**
 * Collaborative score 0–100: users with overlapping saved itineraries.
 * @param {string} userId
 * @param {string[]} candidateIds - itinerary ids to score
 * @param {Set<string>} excludeIds - already saved by user
 */
export async function scoreCollaborative(userId, candidateIds, excludeIds = new Set()) {
  const scores = new Map()
  for (const id of candidateIds) {
    scores.set(String(id), 0)
  }

  const user = await User.findById(userId).select("savedItineraries").lean()
  const mySaved = (user?.savedItineraries || []).map((id) => String(id))

  if (mySaved.length === 0) {
    return scores
  }

  const mySavedSet = new Set(mySaved)

  const similarUsers = await User.find({
    _id: { $ne: userId },
    savedItineraries: { $in: user.savedItineraries },
  })
    .select("savedItineraries")
    .lean()

  if (similarUsers.length === 0) {
    return scores
  }

  const rawCounts = new Map()
  for (const other of similarUsers) {
    for (const itinId of other.savedItineraries || []) {
      const idStr = String(itinId)
      if (mySavedSet.has(idStr) || excludeIds.has(idStr)) continue
      if (!scores.has(idStr)) continue
      rawCounts.set(idStr, (rawCounts.get(idStr) || 0) + 1)
    }
  }

  const maxCount = Math.max(1, ...rawCounts.values())
  for (const [id, count] of rawCounts) {
    scores.set(id, Math.round((count / maxCount) * 100))
  }

  return scores
}

/**
 * Derive preferences from a seed itinerary for content-based scoring.
 * @param {string} itineraryId
 */
export async function preferencesFromItinerary(itineraryId) {
  const seed = await Itinerary.findById(itineraryId).lean()
  if (!seed) return null
  return buildContentPreferences({
    nights: seed.numberOfNights,
    destination: seed.destination,
    tags: seed.tags,
    budgetMin: seed.budget?.min,
    budgetMax: seed.budget?.max,
  })
}

/**
 * @param {object} options
 * @param {ReturnType<typeof buildContentPreferences>} options.preferences
 * @param {string} [options.userId]
 * @param {string} [options.seedItineraryId]
 * @param {number} [options.limit]
 */
export async function getAdvancedRecommendations({
  preferences,
  userId = null,
  seedItineraryId = null,
  limit = 10,
}) {
  let prefs = preferences
  const excludeIds = new Set()

  if (seedItineraryId) {
    excludeIds.add(String(seedItineraryId))
    const seedPrefs = await preferencesFromItinerary(seedItineraryId)
    if (seedPrefs) {
      prefs = {
        nights: prefs.nights ?? seedPrefs.nights,
        destination: prefs.destination || seedPrefs.destination,
        tags: prefs.tags.length > 0 ? prefs.tags : seedPrefs.tags,
        budgetMin: prefs.budgetMin ?? seedPrefs.budgetMin,
        budgetMax: prefs.budgetMax ?? seedPrefs.budgetMax,
      }
    }
  }

  if (userId) {
    const user = await User.findById(userId).select("savedItineraries").lean()
    for (const id of user?.savedItineraries || []) {
      excludeIds.add(String(id))
    }
  }

  const candidates = await Itinerary.find(
    excludeIds.size > 0 ? { _id: { $nin: [...excludeIds] } } : {},
  )
    .sort({ isRecommended: -1, createdAt: -1 })
    .limit(MAX_CANDIDATES)
    .lean()

  const candidateIds = candidates.map((c) => String(c._id))
  const collabScores = userId
    ? await scoreCollaborative(userId, candidateIds, excludeIds)
    : new Map()

  const hasCollab = [...collabScores.values()].some((v) => v > 0)
  const contentW = hasCollab ? CONTENT_WEIGHT : 1
  const collabW = hasCollab ? COLLAB_WEIGHT : 0

  const scored = candidates.map((itinerary) => {
    const id = String(itinerary._id)
    const contentScore = scoreContentBased(itinerary, prefs)
    const collaborativeScore = collabScores.get(id) || 0
    const combinedScore = Math.round(contentScore * contentW + collaborativeScore * collabW)

    return {
      itinerary,
      scores: {
        combined: combinedScore,
        contentBased: contentScore,
        collaborative: collaborativeScore,
      },
    }
  })

  scored.sort((a, b) => {
    if (b.scores.combined !== a.scores.combined) {
      return b.scores.combined - a.scores.combined
    }
    if (b.scores.contentBased !== a.scores.contentBased) {
      return b.scores.contentBased - a.scores.contentBased
    }
    return new Date(b.itinerary.createdAt) - new Date(a.itinerary.createdAt)
  })

  const top = scored.slice(0, Math.min(Math.max(1, limit), 30))

  return {
    preferences: prefs,
    engine: {
      contentBased: true,
      collaborative: Boolean(userId && hasCollab),
      candidatePool: candidates.length,
    },
    results: top,
  }
}
