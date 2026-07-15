"use client"

import { Cloud, ExternalLink } from "lucide-react"

export default function AirportInfo({ airport, weather, label }) {
  if (!airport) return null
  return (
    <div className="rounded-lg border border-border p-3 text-xs space-y-2">
      <p className="font-semibold text-sm">{label} — {airport.code}</p>
      <p className="text-muted-foreground">{airport.name}</p>
      {weather?.warning ? (
        <p className="text-amber-600 flex items-center gap-1">
          <Cloud className="h-3.5 w-3.5" />
          {weather.warning}
        </p>
      ) : null}
      <p className="text-muted-foreground">Security wait ~{airport.securityWaitMinutes} min (est.)</p>
      <ul className="text-muted-foreground space-y-0.5">
        <li>Lounge: {airport.amenities?.lounge}</li>
        <li>Food: {airport.amenities?.restaurant}</li>
        <li>ATM: {airport.amenities?.atm}</li>
      </ul>
      {airport.mapUrl ? (
        <a href={airport.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          Airport map <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  )
}
