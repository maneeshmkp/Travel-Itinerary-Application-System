/** Common destination typos / variants → corrected spelling for geocoding & search. */
const SPELLING_REPLACEMENTS = [
  [/\bwest bangal\b/gi, "West Bengal"],
  [/\beast bangal\b/gi, "East Bengal"],
  [/\bbangal\b/gi, "Bengal"],
  [/\bjim corbarate\b/gi, "Jim Corbett"],
  [/\bcorbarate\b/gi, "Corbett"],
  [/\buttaranchal\b/gi, "Uttarakhand"],
  [/\buttarakhand\b/gi, "Uttarakhand"],
  [/\bhyderbad\b/gi, "Hyderabad"],
  [/\bbangalore\b/gi, "Bengaluru"],
  [/\bbombay\b/gi, "Mumbai"],
  [/\bcalcutta\b/gi, "Kolkata"],
  [/\ballahabad\b/gi, "Prayagraj"],
]

/**
 * @param {string} destination
 * @returns {string}
 */
export function normalizeDestinationSpelling(destination) {
  let text = String(destination || "").trim()
  if (!text) return text

  for (const [pattern, replacement] of SPELLING_REPLACEMENTS) {
    text = text.replace(pattern, replacement)
  }

  return text
}

/**
 * @param {string} destination
 * @returns {string}
 */
export function normalizeDestinationInput(destination) {
  return normalizeDestinationSpelling(destination)
}
