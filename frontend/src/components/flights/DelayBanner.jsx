"use client"

import { statusBadgeClass, formatCountdown } from "../../constants/flightStatus"

export default function DelayBanner({ flight }) {
  if (!flight?.delayMinutes || flight.delayMinutes < 15) return null
  return (
    <div className="rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
      Flight delayed by <strong>{flight.delayMinutes} minutes</strong>
      {flight.metadata?.itinerarySuggestions?.length ? (
        <ul className="mt-1 text-xs list-disc pl-4">
          {flight.metadata.itinerarySuggestions.slice(0, 3).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function LiveStatusBadge({ status }) {
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusBadgeClass(status)}`}>
      {status}
    </span>
  )
}

export function CountdownTimer({ minutes }) {
  return (
    <p className="text-2xl font-bold tabular-nums">{formatCountdown(minutes)}</p>
  )
}
