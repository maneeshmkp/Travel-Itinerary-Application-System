/**
 * Parse hotel/activity name lists from query params.
 * Supports JSON array (preferred), repeated query keys, and legacy delimiters.
 * @param {string | string[] | undefined} raw
 * @returns {string[]}
 */
export function parseNamesFromQuery(raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((n) => String(n).trim()).filter(Boolean))]
  }

  const text = String(raw || "").trim()
  if (!text) return []

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((n) => String(n).trim()).filter(Boolean))]
      }
    } catch {
      /* fall through */
    }
  }

  const recordSep = "\u001e"
  if (text.includes(recordSep)) {
    return [...new Set(text.split(recordSep).map((n) => n.trim()).filter(Boolean))]
  }

  return [...new Set(text.split("|").map((n) => n.trim()).filter(Boolean))]
}
