import { addDays, normalizeDateInput } from "./weatherService.shared.js"

const CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
const CURRENT_CACHE_TTL_MS = 10 * 60 * 1000
const FORECAST_CACHE_TTL_MS = 30 * 60 * 1000
const COORD_DECIMALS = 6

/** @type {Map<string, { expires: number, data: unknown }>} */
const currentCache = new Map()
/** @type {Map<string, { expires: number, data: unknown }>} */
const forecastCache = new Map()

function coordKey(lat, lon) {
  return `${Number(lat).toFixed(COORD_DECIMALS)},${Number(lon).toFixed(COORD_DECIMALS)}`
}

function getCached(map, key) {
  const hit = map.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    map.delete(key)
    return null
  }
  return hit.data
}

function setCached(map, key, data, ttlMs) {
  map.set(key, { expires: Date.now() + ttlMs, data })
}

function apiKey() {
  return process.env.OPENWEATHER_API_KEY?.trim() || ""
}

async function fetchOpenWeather(url) {
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * @param {number} unixUtc
 * @param {number} timezoneOffsetSec
 */
export function getLocalYmd(unixUtc, timezoneOffsetSec) {
  const localMs = (unixUtc + timezoneOffsetSec) * 1000
  const d = new Date(localMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * @param {string} ymd
 */
function parseYmdUtc(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

/**
 * Days from `fromYmd` to `toYmd` (negative if in the past).
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export function daysBetweenYmd(fromYmd, toYmd) {
  const msPerDay = 86400000
  return Math.round((parseYmdUtc(toYmd) - parseYmdUtc(fromYmd)) / msPerDay)
}

/**
 * @param {string} timeStr
 */
export function parseActivityTime(timeStr) {
  const raw = String(timeStr || "").trim()

  const m24 = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) {
    return { hours: Number(m24[1]), minutes: Number(m24[2]) }
  }

  const m12 = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (m12) {
    let hours = Number(m12[1])
    const minutes = Number(m12[2] || 0)
    const meridiem = m12[3].toUpperCase()
    if (meridiem === "PM" && hours < 12) hours += 12
    if (meridiem === "AM" && hours === 12) hours = 0
    return { hours, minutes }
  }

  const lower = raw.toLowerCase()
  if (/morning|sunrise|early/.test(lower)) return { hours: 9, minutes: 0 }
  if (/afternoon/.test(lower)) return { hours: 14, minutes: 0 }
  if (/evening|sunset/.test(lower)) return { hours: 18, minutes: 0 }
  if (/night/.test(lower)) return { hours: 20, minutes: 0 }

  return { hours: 12, minutes: 0 }
}

/**
 * @param {number} hours
 * @param {number} minutes
 */
export function formatTime12h(hours, minutes) {
  const h = Number(hours)
  const m = Number(minutes)
  const meridiem = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m > 0 ? `${hour12}:${String(m).padStart(2, "0")} ${meridiem}` : `${hour12} ${meridiem}`
}

/**
 * @param {string} ymd
 */
export function formatShortDate(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}

function unavailableWeather(reason) {
  return {
    available: false,
    reason,
    source: null,
    label: null,
    temperature: null,
    feelsLike: null,
    condition: null,
    description: null,
    humidity: null,
    windSpeed: null,
    rainProbability: null,
    icon: null,
    observedAt: null,
    forecastAt: null,
    timezoneOffset: null,
  }
}

function snapshotFromCurrent(data) {
  const weather = data?.weather?.[0] || {}
  const condition = weather.main || "Unknown"
  const hasRain =
    String(condition).toLowerCase().includes("rain") ||
    String(condition).toLowerCase().includes("drizzle") ||
    String(condition).toLowerCase().includes("thunder")

  return {
    available: true,
    source: "current",
    label: "Live now",
    temperature: data?.main?.temp != null ? Math.round(data.main.temp) : null,
    feelsLike: data?.main?.feels_like != null ? Math.round(data.main.feels_like) : null,
    condition,
    description: weather.description || "",
    humidity: data?.main?.humidity ?? null,
    windSpeed: data?.wind?.speed != null ? Math.round(data.wind.speed * 10) / 10 : null,
    rainProbability: hasRain ? 100 : 0,
    icon: weather.icon || "",
    observedAt: data?.dt ? new Date(data.dt * 1000).toISOString() : new Date().toISOString(),
    forecastAt: null,
    timezoneOffset: data?.timezone ?? null,
    gridLocation: data?.name || null,
  }
}

/**
 * @param {Array<Record<string, unknown>>} list
 * @param {string} targetDateYmd
 * @param {number} targetHours
 * @param {number} targetMinutes
 */
export function findClosestForecastSlot(list, targetDateYmd, targetHours, targetMinutes) {
  if (!list?.length) return null

  const sameDay = list.filter((item) => String(item.dt_txt || "").startsWith(targetDateYmd))
  if (!sameDay.length) return null

  const targetTotal = targetHours * 60 + targetMinutes
  let best = sameDay[0]
  let bestDiff = Infinity

  for (const item of sameDay) {
    const timePart = String(item.dt_txt || "").split(" ")[1] || "12:00:00"
    const [h, m] = timePart.split(":").map(Number)
    const diff = Math.abs(h * 60 + m - targetTotal)
    if (diff < bestDiff) {
      bestDiff = diff
      best = item
    }
  }

  return best
}

function snapshotFromForecastSlot(slot, dayNumber, activityDateYmd, targetHours, targetMinutes, timezoneOffset) {
  const weather = slot?.weather?.[0] || {}
  const pop = Number(slot?.pop ?? 0)
  const timeLabel = formatTime12h(targetHours, targetMinutes)
  const dateLabel = formatShortDate(activityDateYmd)

  return {
    available: true,
    source: "forecast",
    label: `Forecast for Day ${dayNumber} · ${dateLabel} · ${timeLabel}`,
    temperature: slot?.main?.temp != null ? Math.round(slot.main.temp) : null,
    feelsLike: slot?.main?.feels_like != null ? Math.round(slot.main.feels_like) : null,
    condition: weather.main || "Unknown",
    description: weather.description || "",
    humidity: slot?.main?.humidity ?? null,
    windSpeed: slot?.wind?.speed != null ? Math.round(slot.wind.speed * 10) / 10 : null,
    rainProbability: Number.isFinite(pop) ? Math.round(pop * 100) : null,
    icon: weather.icon || "",
    observedAt: null,
    forecastAt: slot?.dt ? new Date(slot.dt * 1000).toISOString() : null,
    timezoneOffset,
  }
}

/**
 * @param {number} lat
 * @param {number} lon
 */
export async function getCurrentWeatherByCoordinates(lat, lon) {
  const key = apiKey()
  if (!key) return null

  const cacheId = coordKey(lat, lon)
  const cached = getCached(currentCache, cacheId)
  if (cached) return cached

  const url = `${CURRENT_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${key}`
  const data = await fetchOpenWeather(url)
  if (!data?.main) return null

  const payload = {
    raw: data,
    timezoneOffset: data.timezone ?? null,
    gridLocation: data.name || null,
    snapshot: snapshotFromCurrent(data),
  }

  setCached(currentCache, cacheId, payload, CURRENT_CACHE_TTL_MS)
  return payload
}

/**
 * @param {number} lat
 * @param {number} lon
 */
export async function getForecastPayloadByCoordinates(lat, lon) {
  const key = apiKey()
  if (!key) return null

  const cacheId = coordKey(lat, lon)
  const cached = getCached(forecastCache, cacheId)
  if (cached) return cached

  const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${key}`
  const data = await fetchOpenWeather(url)
  const list = data?.list
  if (!Array.isArray(list) || list.length === 0) return null

  const payload = {
    list,
    timezoneOffset: data?.city?.timezone ?? null,
    gridLocation: data?.city?.name || null,
  }

  setCached(forecastCache, cacheId, payload, FORECAST_CACHE_TTL_MS)
  return payload
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {string} targetDateYmd
 * @param {string} [targetTimeStr]
 */
export async function getForecastWeatherByCoordinates(lat, lon, targetDateYmd, targetTimeStr) {
  const payload = await getForecastPayloadByCoordinates(lat, lon)
  if (!payload?.list) return null

  const { hours, minutes } = parseActivityTime(targetTimeStr)
  const slot = findClosestForecastSlot(payload.list, targetDateYmd, hours, minutes)
  if (!slot) return null

  return {
    slot,
    timezoneOffset: payload.timezoneOffset,
    gridLocation: payload.gridLocation,
    targetHours: hours,
    targetMinutes: minutes,
  }
}

/**
 * @param {object} activity
 * @param {object} trip
 * @param {string} [trip.startDate]
 */
export async function getWeatherForActivity(activity, trip) {
  const lat = Number(activity?.latitude)
  const lon = Number(activity?.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return unavailableWeather("Coordinates required for weather.")
  }

  if (!apiKey()) {
    return {
      ...unavailableWeather("Weather API not configured."),
      demo: true,
    }
  }

  const dayNumber = Number(activity?.dayNumber) || 1
  const tripStartDate = normalizeDateInput(trip?.startDate)
  const activityDateYmd = addDays(tripStartDate, dayNumber - 1)
  const activityTime = activity?.time || activity?.activityTime || null

  const forecastPayload = await getForecastPayloadByCoordinates(lat, lon)
  const currentPayload = await getCurrentWeatherByCoordinates(lat, lon)
  const timezoneOffset =
    forecastPayload?.timezoneOffset ?? currentPayload?.timezoneOffset ?? 0

  const localTodayYmd = getLocalYmd(Math.floor(Date.now() / 1000), timezoneOffset)
  const dayDiff = daysBetweenYmd(localTodayYmd, activityDateYmd)

  if (dayDiff < 0) {
    return unavailableWeather("Historical weather unavailable.")
  }

  if (dayDiff > 5) {
    return unavailableWeather("Forecast becomes available within 5 days of travel.")
  }

  if (dayDiff === 0) {
    if (!currentPayload?.snapshot) {
      return unavailableWeather("Live weather is temporarily unavailable.")
    }
    return {
      ...currentPayload.snapshot,
      gridLocation: currentPayload.gridLocation,
    }
  }

  const forecastResult = await getForecastWeatherByCoordinates(
    lat,
    lon,
    activityDateYmd,
    activityTime,
  )

  if (!forecastResult?.slot) {
    return unavailableWeather("Forecast is temporarily unavailable for this date.")
  }

  const snapshot = snapshotFromForecastSlot(
    forecastResult.slot,
    dayNumber,
    activityDateYmd,
    forecastResult.targetHours,
    forecastResult.targetMinutes,
    forecastResult.timezoneOffset,
  )

  return {
    ...snapshot,
    gridLocation: forecastResult.gridLocation,
  }
}
