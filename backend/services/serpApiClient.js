const SERPAPI_BASE = "https://serpapi.com/search"

const NO_RESULTS_PATTERNS = [
  "hasn't returned any results",
  "has not returned any results",
  "no results",
]

export function isSerpApiConfigured() {
  return Boolean(process.env.SERPAPI_KEY?.trim())
}

/** @param {unknown} err */
export function isSerpApiNoResultsError(err) {
  const msg = String(err?.message || err || "").toLowerCase()
  return NO_RESULTS_PATTERNS.some((p) => msg.includes(p))
}

/**
 * @param {Record<string, string | number | boolean | undefined>} params
 * @param {{ allowNoResults?: boolean }} options
 */
export async function serpApiSearch(params, { allowNoResults = false } = {}) {
  if (!isSerpApiConfigured()) {
    throw new Error("SERPAPI_KEY is not configured")
  }

  const url = new URL(SERPAPI_BASE)
  url.searchParams.set("api_key", process.env.SERPAPI_KEY.trim())
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }

  const res = await fetch(url.toString())
  const raw = await res.text()

  if (!res.ok) {
    throw new Error(`SerpAPI request failed (${res.status}): ${raw.slice(0, 200)}`)
  }

  const data = raw ? JSON.parse(raw) : {}
  if (data.error) {
    if (allowNoResults && isSerpApiNoResultsError({ message: data.error })) {
      return { best_flights: [], other_flights: [], properties: [], local_results: [] }
    }
    throw new Error(String(data.error))
  }

  return data
}

/** Google Flights — empty array instead of throw when the route has no inventory. */
export async function searchGoogleFlights(query) {
  return serpApiSearch({ engine: "google_flights", ...query }, { allowNoResults: true })
}

/** Google Hotels — tolerate empty inventory for remote destinations. */
export async function searchGoogleHotels(query) {
  return serpApiSearch({ engine: "google_hotels", ...query }, { allowNoResults: true })
}

/** Google Maps local results — tolerate empty lists. */
export async function searchGoogleMaps(query) {
  return serpApiSearch({ engine: "google_maps", ...query }, { allowNoResults: true })
}
