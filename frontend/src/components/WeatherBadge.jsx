import { weatherBadgeClasses, weatherIcon, formatTempRange } from "../utils/weatherLogic"

/**
 * Compact weather pill — Sunny / Cloudy / Rain.
 */
export default function WeatherBadge({ condition, label, temp, className = "" }) {
  if (!condition) return null

  const text = label || condition
  const tempText = typeof temp === "string" ? temp : formatTempRange({ temp })

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${weatherBadgeClasses(condition)} ${className}`}
    >
      <span aria-hidden>{weatherIcon(condition)}</span>
      <span>{text}</span>
      {tempText ? <span className="opacity-80">· {tempText}</span> : null}
    </span>
  )
}
