"use client"

import { MapPin, Clock, Plane } from "lucide-react"
import { LiveStatusBadge, CountdownTimer } from "./DelayBanner"
import DelayBanner from "./DelayBanner"
import GateCard from "./GateCard"
import AirportInfo from "./AirportInfo"
import BaggageInfo from "./BaggageInfo"
import BoardingTimeline from "./BoardingTimeline"

function formatTime(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function FlightCard({ flight, onRefresh, onStop, saving }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg">{flight.flightNumber}</h3>
            <LiveStatusBadge status={flight.status} />
          </div>
          <p className="text-sm text-muted-foreground">{flight.airline}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Departs in</p>
          <CountdownTimer minutes={flight.countdownMinutes} />
        </div>
      </div>

      <DelayBanner flight={flight} />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">From</p>
          <p className="font-semibold">{flight.originCode || "—"}</p>
          <p className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(flight.departureTime)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">To</p>
          <p className="font-semibold">{flight.destinationCode || "—"}</p>
          <p className="text-xs flex items-center justify-end gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(flight.arrivalTime)}
          </p>
        </div>
      </div>

      <GateCard flight={flight} />
      <BoardingTimeline flight={flight} />
      <BaggageInfo flight={flight} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AirportInfo airport={flight.originAirport} weather={flight.originWeather} label="Departure" />
        <AirportInfo airport={flight.destinationAirport} weather={flight.destinationWeather} label="Arrival" />
      </div>

      {flight.status === "Cancelled" ? (
        <p className="text-xs text-muted-foreground">
          Record refunds or fees in the Expense Tracker (refund, hotel loss, taxi cancellation).
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {flight.trackingActive ? (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => onRefresh?.(flight.id)}
              className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50"
            >
              Refresh now
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onStop?.(flight.id)}
              className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              Stop tracking
            </button>
          </>
        ) : null}
        <a href="#documents" className="text-xs px-3 py-1.5 rounded-md text-primary hover:underline inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Documents
        </a>
      </div>
    </div>
  )
}
