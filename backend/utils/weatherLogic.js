/** @typedef {'sunny' | 'cloudy' | 'rain'} WeatherCondition */

export const OUTDOOR_CATEGORIES = ["sightseeing", "adventure", "relaxation"]
export const INDOOR_CATEGORIES = ["cultural", "dining", "shopping"]

/**
 * Map OpenWeather condition codes to a simple trip-planning label.
 * @param {number} weatherId
 * @returns {WeatherCondition}
 */
export function classifyCondition(weatherId) {
  const id = Number(weatherId)
  if (Number.isNaN(id)) return "cloudy"
  if (id >= 200 && id < 600) return "rain"
  if (id >= 600 && id < 700) return "rain"
  if (id >= 700 && id < 800) return "cloudy"
  if (id === 800 || id === 801) return "sunny"
  return "cloudy"
}

/**
 * @param {WeatherCondition} condition
 */
export function conditionLabel(condition) {
  if (condition === "sunny") return "Sunny"
  if (condition === "rain") return "Rain"
  return "Cloudy"
}

/**
 * @param {WeatherCondition} condition
 */
export function activityPreference(condition) {
  if (condition === "rain") return "indoor"
  if (condition === "sunny") return "outdoor"
  return "flexible"
}

/**
 * @param {WeatherCondition} condition
 */
export function tripTip(condition) {
  if (condition === "rain") {
    return "Rain expected — prioritize museums, covered markets, and indoor dining."
  }
  if (condition === "sunny") {
    return "Clear skies — great for beaches, viewpoints, and outdoor adventures."
  }
  return "Mixed clouds — flexible day; keep a light layer for changing conditions."
}

/**
 * @param {WeatherCondition} condition
 * @param {string} category
 * @returns {{ fit: 'good' | 'fair' | 'swap', message: string }}
 */
export function suggestActivityFit(condition, category) {
  const cat = String(category || "").toLowerCase()
  const isOutdoor = OUTDOOR_CATEGORIES.includes(cat)
  const isIndoor = INDOOR_CATEGORIES.includes(cat)

  if (condition === "rain") {
    if (isOutdoor) {
      return { fit: "swap", message: "Consider an indoor alternative if rain is heavy." }
    }
    if (isIndoor) {
      return { fit: "good", message: "Well suited for rainy weather." }
    }
    return { fit: "fair", message: "Flexible — check conditions before heading out." }
  }

  if (condition === "sunny") {
    if (isOutdoor) {
      return { fit: "good", message: "Ideal for outdoor plans today." }
    }
    if (isIndoor) {
      return { fit: "fair", message: "Fine anytime — save outdoor sights for sunnier hours." }
    }
    return { fit: "good", message: "Good conditions for being outside." }
  }

  // cloudy
  if (isOutdoor) {
    return { fit: "fair", message: "Usually fine outdoors; bring a light jacket." }
  }
  return { fit: "good", message: "Comfortable for indoor or flexible plans." }
}

/**
 * Summarize a day's activities against the forecast.
 * @param {WeatherCondition} condition
 * @param {Array<{ category?: string, name?: string }>} activities
 */
export function buildDayActivitySuggestions(condition, activities = []) {
  const preference = activityPreference(condition)
  const perActivity = (activities || []).map((a) => ({
    name: a.name,
    category: a.category,
    ...suggestActivityFit(condition, a.category),
  }))

  const outdoorCount = perActivity.filter((a) => OUTDOOR_CATEGORIES.includes(a.category)).length
  const indoorCount = perActivity.filter((a) => INDOOR_CATEGORIES.includes(a.category)).length

  let summary = tripTip(condition)
  if (condition === "rain" && outdoorCount > indoorCount) {
    summary = "Mostly outdoor activities scheduled — consider swapping some for indoor options."
  } else if (condition === "sunny" && indoorCount > outdoorCount && outdoorCount === 0) {
    summary = "Mostly indoor plans — add an outdoor highlight while the weather is clear."
  }

  return {
    preference,
    summary,
    activities: perActivity,
  }
}

/**
 * Deterministic demo forecast when OPENWEATHER_API_KEY is missing.
 * @param {string} destination
 * @param {string} dateStr YYYY-MM-DD
 */
export function demoWeatherForDate(destination, dateStr) {
  const seed = `${destination}|${dateStr}`.split("").reduce((s, c) => s + c.charCodeAt(0), 0)
  const conditions = /** @type {const} */ (["sunny", "cloudy", "rain"])
  const condition = conditions[seed % 3]
  const base = 22 + (seed % 12)

  return {
    destination,
    date: dateStr,
    temp: { min: base - 3, max: base + 4, avg: base },
    condition,
    label: conditionLabel(condition),
    description: condition === "rain" ? "light rain" : condition === "sunny" ? "clear sky" : "scattered clouds",
    icon: condition === "rain" ? "10d" : condition === "sunny" ? "01d" : "03d",
    humidity: 55 + (seed % 30),
    windKph: 8 + (seed % 15),
    demo: true,
  }
}
