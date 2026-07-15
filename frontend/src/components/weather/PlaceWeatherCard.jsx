import { CloudRain, Wind, Droplets, Info, Radio, CalendarClock } from "lucide-react"

const OW_ICON_BASE = "https://openweathermap.org/img/wn"

function isRainOrStorm(condition, rainProbability) {
  const c = String(condition || "").toLowerCase()
  return (
    (rainProbability != null && rainProbability >= 50) ||
    c.includes("rain") ||
    c.includes("drizzle") ||
    c.includes("thunder") ||
    c.includes("storm")
  )
}

function formatLocalTime(isoString, timezoneOffsetSec) {
  if (!isoString) return null
  const utcMs = new Date(isoString).getTime()
  const offsetMs = Number(timezoneOffsetSec || 0) * 1000
  const d = new Date(utcMs + offsetMs)
  let hours = d.getUTCHours()
  const minutes = d.getUTCMinutes()
  const meridiem = hours >= 12 ? "PM" : "AM"
  hours = hours % 12 || 12
  return minutes > 0
    ? `${hours}:${String(minutes).padStart(2, "0")} ${meridiem}`
    : `${hours} ${meridiem}`
}

function UnavailableCard({ day, place, reason, activityNames = [], className = "" }) {
  const otherStops = activityNames.filter((name) => name && name !== place)
  const isFuture =
    String(reason || "").toLowerCase().includes("closer to your trip") ||
    String(reason || "").toLowerCase().includes("within 5 days")

  return (
    <div
      className={`rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground w-full ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Day {day}</p>
          <p className="font-semibold text-foreground">{place}</p>
          {otherStops.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Also: {otherStops.slice(0, 2).join(", ")}</p>
          ) : null}
        </div>
        <p className="text-xs shrink-0 max-w-[14rem] text-right">
          {isFuture
            ? "Detailed forecast will be available closer to your trip."
            : reason || "Weather unavailable for this stop"}
        </p>
      </div>
    </div>
  )
}

/**
 * Weather card for a single itinerary stop / place.
 */
export default function PlaceWeatherCard({
  day,
  place,
  weather,
  activityNames = [],
  latitude,
  longitude,
  gridLocation,
  className = "",
}) {
  const otherStops = activityNames.filter((name) => name && name !== place)

  if (!weather || weather.available === false) {
    return (
      <UnavailableCard
        day={day}
        place={place}
        reason={weather?.reason}
        activityNames={activityNames}
        className={className}
      />
    )
  }

  const isLive = weather.source === "current"
  const rainy = isRainOrStorm(weather.condition, weather.rainProbability)
  const updatedLabel = isLive
    ? formatLocalTime(weather.observedAt, weather.timezoneOffset)
    : formatLocalTime(weather.forecastAt, weather.timezoneOffset)

  return (
    <div
      className={`w-full rounded-lg border border-border bg-card px-4 py-3 shadow-sm sm:px-5 sm:py-4 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                <Radio className="h-3 w-3" />
                Live now
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                <CalendarClock className="h-3 w-3" />
                Forecast
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
              title="Live weather is observed now. Forecasts are estimates and can change."
            >
              <Info className="h-3 w-3 shrink-0" />
              {isLive ? "Observed now" : "Estimate"}
            </span>
          </div>

          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Day {day}</p>
          <p className="font-semibold text-foreground">{place}</p>

          {!isLive && weather.label ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{weather.label}</p>
          ) : null}

          {otherStops.length > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Also: {otherStops.slice(0, 3).join(", ")}
              {otherStops.length > 3 ? ` +${otherStops.length - 3} more` : ""}
            </p>
          ) : null}

          {latitude != null && longitude != null ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
              {isLive ? "Live at" : "Forecast at"} {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
              {gridLocation ? ` · ${gridLocation}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 shrink-0 sm:pl-4">
          {weather.icon ? (
            <img
              src={`${OW_ICON_BASE}/${weather.icon}@2x.png`}
              alt=""
              className="h-14 w-14 shrink-0"
              loading="lazy"
            />
          ) : null}
          <div className="text-left sm:text-right">
            <p className="text-3xl font-bold leading-none text-foreground">
              {weather.temperature != null ? `${weather.temperature}°C` : "—"}
            </p>
            <p className="mt-1 text-sm capitalize text-muted-foreground">{weather.condition}</p>
            {weather.description ? (
              <p className="text-xs capitalize text-muted-foreground">{weather.description}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {weather.rainProbability != null ? (
            <span className="inline-flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5" />
              Rain {weather.rainProbability}%
            </span>
          ) : null}
          {weather.windSpeed != null ? (
            <span className="inline-flex items-center gap-1">
              <Wind className="h-3.5 w-3.5" />
              {weather.windSpeed} m/s
            </span>
          ) : null}
          {weather.humidity != null ? <span>Humidity {weather.humidity}%</span> : null}
        </div>
        {updatedLabel ? (
          <span className="text-muted-foreground">
            {isLive ? `Updated ${updatedLabel}` : `Expected around ${updatedLabel}`}
          </span>
        ) : null}
      </div>

      {rainy ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <CloudRain className="h-3.5 w-3.5 shrink-0" />
          Rain expected — consider indoor activities.
        </p>
      ) : null}
    </div>
  )
}

export function formatMarkerWeatherHtml(weather) {
  if (!weather || weather.available === false) return ""

  const isLive = weather.source === "current"
  const rainy = isRainOrStorm(weather.condition, weather.rainProbability)
  const rainLine = rainy
    ? '<div style="margin-top:6px;color:#b45309;font-size:11px">Rain expected — consider indoor activities.</div>'
    : ""

  const badge = isLive
    ? '<span style="display:inline-block;background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;margin-bottom:4px">Live now</span>'
    : `<span style="display:inline-block;background:#e0f2fe;color:#075985;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;margin-bottom:4px">Forecast</span>`

  return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:12px">
    ${badge}<br/>
    <strong>${weather.temperature ?? "—"}°C</strong> · ${weather.condition || "—"}
    ${weather.rainProbability != null ? `<br/>Rain ${weather.rainProbability}% · Wind ${weather.windSpeed ?? "—"} m/s` : ""}
    ${rainLine}
  </div>`
}
