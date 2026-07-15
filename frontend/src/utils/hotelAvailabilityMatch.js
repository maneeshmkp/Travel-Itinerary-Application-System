function normalizeAvailabilityKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Find the best availability row for an itinerary hotel name.
 * @param {string} itineraryName
 * @param {object[]} hotels
 */
export function matchHotelForItineraryName(itineraryName, hotels = []) {
  const key = normalizeAvailabilityKey(itineraryName)
  if (!key) return null

  const exact = hotels.find(
    (h) =>
      normalizeAvailabilityKey(h.requestedName) === key ||
      normalizeAvailabilityKey(h.name) === key,
  )
  if (exact) return exact

  const needle = key.slice(0, Math.min(24, key.length))
  return (
    hotels.find((h) => normalizeAvailabilityKey(h.name).includes(needle)) ||
    hotels.find((h) => needle.includes(normalizeAvailabilityKey(h.name).slice(0, 16))) ||
    null
  )
}

/**
 * Prefer itinerary hotels first, then other live results.
 * @param {string[]} itineraryHotelNames
 * @param {object[]} allHotels
 * @param {number} limit
 */
export function orderHotelsForDisplay(itineraryHotelNames, allHotels, limit = 5) {
  const picked = []
  const seen = new Set()

  for (const name of itineraryHotelNames) {
    const hit = matchHotelForItineraryName(name, allHotels)
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id)
      picked.push(hit)
    }
  }

  for (const h of allHotels) {
    if (seen.has(h.id)) continue
    seen.add(h.id)
    picked.push(h)
    if (picked.length >= limit) break
  }

  return picked
}
