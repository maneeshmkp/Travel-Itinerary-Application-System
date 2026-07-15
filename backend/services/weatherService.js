import {
  activityPreference,
  buildDayActivitySuggestions,
  classifyCondition,
  conditionLabel,
  demoWeatherForDate,
  tripTip,
} from "../utils/weatherLogic.js"
import { normalizeDestination } from "../utils/geocodingQueryBuilder.js"
import { logWeather } from "../logger/index.js"
import { recordDomainEvent } from "./monitoring/metricsStore.js"

const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

/** @type {Map<string, { expires: number, data: unknown }>} */
const cache = new Map()
const CACHE_TTL_MS = 15 * 60 * 1000

function cacheKey(parts) {
  return parts.join("|")
}

function getCached(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    cache.delete(key)
    return null
  }
  return hit.data
}

function setCache(key, data) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data })
}

function throwClientError(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

function normalizeDateInput(dateInput) {
  if (!dateInput) {
    return new Date().toISOString().slice(0, 10)
  }
  const parsed = new Date(`${dateInput}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    throw throwClientError("Invalid date — use YYYY-MM-DD")
  }
  return parsed.toISOString().slice(0, 10)
}

function addDays(dateStr, offset) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

async function fetchJson(url) {
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) {
    let message = `Weather API error (${res.status})`
    try {
      const body = JSON.parse(text)
      if (body?.message) message = body.message
    } catch {
      // ignore
    }
    const err = throwClientError(message, res.status === 401 ? 401 : res.status >= 500 ? 503 : 502)
    throw err
  }
  return JSON.parse(text)
}

function isKeyNotActiveError(err) {
  const msg = String(err?.message || "").toLowerCase()
  return err?.statusCode === 401 || /invalid api key/.test(msg)
}

const DEMO_REASON_KEY_PENDING =
  "OpenWeather API key is not active yet — confirm your OpenWeather email or wait up to 2 hours after creating the key."

async function geocodeQuery(query) {
  const key = process.env.OPENWEATHER_API_KEY?.trim()
  if (!key) return null

  const trimmed = String(query || "").trim()
  if (!trimmed) return null

  const cacheId = cacheKey(["geo", trimmed.toLowerCase()])
  const cached = getCached(cacheId)
  if (cached) return cached

  const url = `${GEO_URL}?q=${encodeURIComponent(trimmed)}&limit=1&appid=${key}`
  const rows = await fetchJson(url)
  if (!Array.isArray(rows) || rows.length === 0) return null

  const place = {
    name: rows[0].name,
    country: rows[0].country,
    lat: rows[0].lat,
    lon: rows[0].lon,
  }
  setCache(cacheId, place)
  return place
}

/**
 * @param {string} destination
 */
async function geocodeDestination(destination) {
  const key = process.env.OPENWEATHER_API_KEY?.trim()
  if (!key) return { place: null, demoReason: null }

  const dest = String(destination || "").trim()
  const { cities } = normalizeDestination(dest)
  const queries = [...new Set([dest, ...cities].filter(Boolean))]

  try {
    for (const query of queries) {
      try {
        const place = await geocodeQuery(query)
        if (place) return { place, demoReason: null }
      } catch (err) {
        if (isKeyNotActiveError(err)) {
          return { place: null, demoReason: DEMO_REASON_KEY_PENDING }
        }
        // Try the next city for multi-destination strings like "Madurai, Rameswaram, Tirupati"
      }
    }
    return { place: null, demoReason: null }
  } catch (err) {
    if (isKeyNotActiveError(err)) {
      return { place: null, demoReason: DEMO_REASON_KEY_PENDING }
    }
    throw err
  }
}

/**
 * @param {number} lat
 * @param {number} lon
 */
async function fetchForecastList(lat, lon) {
  const key = process.env.OPENWEATHER_API_KEY?.trim()
  if (!key) return null

  const cacheId = cacheKey(["forecast", lat.toFixed(3), lon.toFixed(3)])
  const cached = getCached(cacheId)
  if (cached) return cached

  const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${key}`
  try {
    const data = await fetchJson(url)
    const list = data?.list
    if (!Array.isArray(list) || list.length === 0) {
      throw throwClientError("No forecast data available for this destination", 503)
    }
    setCache(cacheId, list)
    logWeather.info("Weather forecast ok")
    recordDomainEvent("weather", true)
    return list
  } catch (err) {
    logWeather.error("Weather API failed", { message: err.message })
    recordDomainEvent("weather", false, err.message)
    throw err
  }
}

/**
 * @param {Array<Record<string, unknown>>} list
 * @param {string} dateStr
 */
function aggregateForecastDay(list, dateStr) {
  const entries = list.filter((item) => String(item.dt_txt || "").startsWith(dateStr))
  const slice = entries.length > 0 ? entries : list.slice(0, 8)
  const temps = slice.map((e) => e.main?.temp).filter((t) => typeof t === "number")
  const mins = slice.map((e) => e.main?.temp_min).filter((t) => typeof t === "number")
  const maxs = slice.map((e) => e.main?.temp_max).filter((t) => typeof t === "number")
  const midday = slice[Math.floor(slice.length / 2)] || slice[0]
  const weather = midday?.weather?.[0] || {}
  const condition = classifyCondition(weather.id)

  return {
    date: dateStr,
    temp: {
      min: mins.length ? Math.round(Math.min(...mins)) : null,
      max: maxs.length ? Math.round(Math.max(...maxs)) : null,
      avg: temps.length ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null,
    },
    condition,
    label: conditionLabel(condition),
    description: weather.description || "",
    icon: weather.icon || "",
    humidity: midday?.main?.humidity ?? null,
    windKph: midday?.wind?.speed != null ? Math.round(midday.wind.speed * 3.6) : null,
    demo: false,
  }
}

/**
 * @param {string} destination
 * @param {string} dateStr
 * @param {Array<{ category?: string, name?: string }>} [activities]
 */
export async function getWeatherForDate(destination, dateStr, activities = []) {
  const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
  const dest = String(destination || "").trim()
  const date = String(dateStr || "")
  const actHash = stableHash((activities || []).map((a) => a?.category || a?.name || ""))
  const key = RedisKeys.weatherCurrent(stableHash({ dest, date, actHash }))

  return withCache(key, TTL.WEATHER, async () => {
    if (!dest) throw throwClientError("destination query parameter is required")

    const normalizedDate = normalizeDateInput(dateStr)
    let base
    let demoReason = null

    const { place, demoReason: geoDemoReason } = await geocodeDestination(dest)
    demoReason = geoDemoReason

    if (!place) {
      base = { ...demoWeatherForDate(dest, normalizedDate), location: dest, demo: true }
    } else {
      const list = await fetchForecastList(place.lat, place.lon)
      if (!list) {
        base = { ...demoWeatherForDate(dest, normalizedDate), location: place.name, demo: true }
      } else {
        const day = aggregateForecastDay(list, normalizedDate)
        base = {
          destination: dest,
          location: place.name,
          country: place.country,
          ...day,
        }
      }
    }

    const preference = activityPreference(base.condition)
    const suggestions = buildDayActivitySuggestions(base.condition, activities)

    return {
      ...base,
      demoReason: base.demo ? demoReason : null,
      activityHint: {
        preference,
        message: suggestions.summary || tripTip(base.condition),
      },
      suggestions,
    }
  })
}

/**
 * @param {string} destination
 * @param {number} days
 * @param {string} [startDate]
 */
export async function getWeatherForecast(destination, days = 5, startDate) {
  const { withCache, RedisKeys, TTL, stableHash } = await import("../utils/cacheHelpers.js")
  const dest = String(destination || "").trim()
  const count = Math.min(Math.max(Number.parseInt(String(days), 10) || 5, 1), 10)
  const key = RedisKeys.weatherForecast(stableHash({ dest, days: count, startDate: startDate || "" }))

  return withCache(key, TTL.WEATHER, async () => {
    if (!dest) throw throwClientError("destination query parameter is required")

    const start = normalizeDateInput(startDate)
    const dates = Array.from({ length: count }, (_, i) => addDays(start, i))

    const { place, demoReason } = await geocodeDestination(dest)
    let list = null
    if (place) {
      list = await fetchForecastList(place.lat, place.lon)
    }

    const forecast = dates.map((date) => {
      if (!place || !list) {
        return { ...demoWeatherForDate(dest, date), location: dest, demo: true }
      }
      return {
        destination: dest,
        location: place.name,
        country: place.country,
        ...aggregateForecastDay(list, date),
      }
    })

    const isDemo = !place || !list

    return {
      destination: dest,
      location: place?.name || dest,
      startDate: start,
      days: count,
      forecast,
      demo: isDemo,
      demoReason: isDemo ? demoReason : null,
    }
  })
}
