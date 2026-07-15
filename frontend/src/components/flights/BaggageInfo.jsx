"use client"

import { Luggage } from "lucide-react"

export default function BaggageInfo({ flight }) {
  if (flight.status !== "Landed" && !flight.baggageClaim) return null
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <Luggage className="h-4 w-4 text-primary" />
      <span>
        Baggage claim: <strong>{flight.baggageClaim || "Assigning…"}</strong>
      </span>
    </div>
  )
}
