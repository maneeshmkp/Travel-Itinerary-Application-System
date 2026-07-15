"use client"

import { Plane, Hotel, Ticket, Loader2, Info, Train, Bus } from "lucide-react"
import AvailabilityBadge from "./AvailabilityBadge"
import {
  FlightBookingActions,
  HotelBookingActions,
  TrainBookingActions,
  BusBookingActions,
} from "./BookingCardActions"
import { formatMoney } from "../../utils/budgetCalculations"
import { formatTime12h } from "../../utils/formatTime12h"
import { useBookingRedirect } from "../../hooks/useBookingRedirect"

export function normalizeAvailabilityKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function sourceLabel(dataSource) {
  switch (dataSource) {
    case "serpapi":
      return "Live prices from Google Travel (SerpAPI)"
    case "google-places":
      return "Activities from Google Places"
    case "amadeus":
      return "Live prices from Amadeus"
    case "recommendations":
      return "Curated suggestions — book on partner sites"
    case "railkit":
      return "Live IRCTC train fares (RailKit)"
    case "redbus-seatseller":
      return "Live redBus bus fares (SeatSeller)"
    case "mock":
    case "mock-fallback":
      return "Estimated fares — verify on partner sites before booking"
    default:
      return "Live prices"
  }
}

export function buildAvailabilityLookups(hotels = [], flights = [], activities = []) {
  const hotelsByName = new Map()
  for (const h of hotels) {
    hotelsByName.set(normalizeAvailabilityKey(h.name), h)
    if (h.requestedName) {
      hotelsByName.set(normalizeAvailabilityKey(h.requestedName), h)
    }
  }
  const activitiesByName = new Map()
  for (const a of activities) {
    activitiesByName.set(normalizeAvailabilityKey(a.name), a)
  }
  return { hotelsByName, flights, activitiesByName }
}

function AvailabilitySection({ icon: Icon, title, count, children }) {
  if (!count) return null

  return (
    <section className="rounded-xl border border-border/70 bg-muted/15 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-card/90">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          {title}
        </h3>
        <span className="text-xs text-muted-foreground shrink-0">
          {count} option{count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function HorizontalCardRow({ children }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]">
      {children}
    </div>
  )
}

const cardClass =
  "snap-start shrink-0 w-[17.5rem] sm:w-[19rem] rounded-lg border border-border bg-card p-3 text-sm shadow-sm flex flex-col"

function formatTripDuration(minutes) {
  const total = Number(minutes)
  if (!Number.isFinite(total) || total <= 0) return null
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h >= 24) {
    const d = Math.floor(h / 24)
    const rh = h % 24
    return `${d}d ${rh}h`
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function TripAvailability({
  loading,
  error,
  warning,
  hotels,
  flights,
  trains = [],
  buses = [],
  activities,
  isRealData,
  dataSource,
  destination = "",
}) {
  const { redirectMessage, logBookingClick, logPartnerClick } = useBookingRedirect(destination)

  const handleFlightBook = (flight) =>
    logBookingClick({ bookingType: "flight", item: flight, fallbackProvider: "Google Flights", intent: "book" })

  const handleFlightView = (flight) =>
    logBookingClick({ bookingType: "flight", item: flight, fallbackProvider: "Google Flights", intent: "view" })

  const handleTrainPartner = (train, partner) =>
    logPartnerClick({ bookingType: "train", item: train, partner })

  const handleBusPartner = (bus, partner) =>
    logPartnerClick({ bookingType: "bus", item: bus, partner })

  const handleHotelBook = (hotel) =>
    logBookingClick({ bookingType: "hotel", item: hotel, fallbackProvider: "Google Hotels", intent: "book" })

  const handleHotelView = (hotel) =>
    logBookingClick({ bookingType: "hotel", item: hotel, fallbackProvider: "Google Hotels", intent: "view" })

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
        Checking availability…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  const flightList = flights.slice(0, 5)
  const trainList = trains.slice(0, 5)
  const busList = buses.slice(0, 5)
  const hotelList = hotels.slice(0, 5)
  const activityList = activities.slice(0, 6)

  const showEmpty =
    flightList.length === 0 &&
    trainList.length === 0 &&
    busList.length === 0 &&
    hotelList.length === 0 &&
    activityList.length === 0

  if (showEmpty) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">No availability results for this destination.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-semibold text-card-foreground flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary shrink-0" />
          Travel options &amp; pricing
        </h2>
        <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {isRealData
            ? `${sourceLabel(dataSource)} — verify before booking.`
            : "Trains & buses are curated suggestions with partner booking links. Prices are indicative."}
        </p>
        {warning && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400" role="status">
            {warning}
          </p>
        )}
        {redirectMessage && (
          <p className="mt-2 text-sm font-medium text-primary animate-pulse" role="status">
            {redirectMessage}
          </p>
        )}
      </div>

      <div className="space-y-5">
        <AvailabilitySection icon={Plane} title="Flights" count={flightList.length}>
          <HorizontalCardRow>
            {flightList.map((f) => (
              <div key={f.id} className={cardClass}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-medium text-foreground line-clamp-1">{f.airline}</span>
                  <AvailabilityBadge status={f.availability} label={f.availabilityLabel} />
                </div>
                <p className="text-muted-foreground text-xs mb-2 line-clamp-2">
                  {f.originCode} → {f.destinationCode} · {f.departure}–{f.arrival}
                </p>
                <div className="flex items-center justify-between gap-2 mt-auto">
                  <span className="font-semibold text-foreground text-sm">
                    {f.isSearchFallback || f.price == null
                      ? "Check on Google Flights"
                      : formatMoney(f.price, f.currency)}
                  </span>
                  <span className="text-[11px] text-muted-foreground text-right shrink-0">
                    {f.seatsLeft != null && f.seatsLeft > 0
                      ? `${f.seatsLeft} seats`
                      : f.seatsLeft === 0
                        ? "Full"
                        : f.bookingProvider || "Live"}
                  </span>
                </div>
                {!f.bookingUrl && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Booking link unavailable.</p>
                )}
                <FlightBookingActions
                  flight={f}
                  onBook={handleFlightBook}
                  onViewDetails={handleFlightView}
                />
              </div>
            ))}
          </HorizontalCardRow>
        </AvailabilitySection>

        <AvailabilitySection icon={Train} title="Train suggestions" count={trainList.length}>
          <HorizontalCardRow>
            {trainList.map((t) => (
              <div key={t.id} className={cardClass}>
                <p className="font-semibold text-foreground text-base leading-snug mb-1">
                  {t.origin} → {t.destination}
                </p>
                <p className="text-sm text-foreground/90 mb-2">
                  {t.trainName || t.operator}
                  {t.travelClass ? ` · ${t.travelClass}` : ""}
                </p>
                <div className="space-y-1 text-xs text-muted-foreground mb-3">
                  <p>
                    <span className="text-foreground/80">Departure:</span> {formatTime12h(t.departure)}
                  </p>
                  <p>
                    <span className="text-foreground/80">Arrival:</span> {formatTime12h(t.arrival)}
                    {formatTripDuration(t.durationMinutes) ? ` · ${formatTripDuration(t.durationMinutes)}` : ""}
                  </p>
                </div>
                <div className="mt-auto">
                  <span className="font-semibold text-foreground text-lg">
                    {formatMoney(t.price, t.currency)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {t.priceLabel || "Typical fare"}
                    {t.distanceKm ? ` · ~${t.distanceKm} km` : ""}
                  </span>
                </div>
                <TrainBookingActions
                  train={t}
                  onPartnerClick={(partner) => handleTrainPartner(t, partner)}
                />
              </div>
            ))}
          </HorizontalCardRow>
        </AvailabilitySection>

        <AvailabilitySection icon={Bus} title="Bus suggestions" count={busList.length}>
          <HorizontalCardRow>
            {busList.map((b) => (
              <div key={b.id} className={cardClass}>
                <p className="font-semibold text-foreground text-base leading-snug mb-1">
                  {b.origin} → {b.destination}
                </p>
                <p className="text-sm text-foreground/90 mb-2">{b.busType || b.operator}</p>
                <div className="space-y-1 text-xs text-muted-foreground mb-3">
                  <p>
                    <span className="text-foreground/80">Departure:</span> {formatTime12h(b.departure)}
                  </p>
                  <p>
                    <span className="text-foreground/80">Arrival:</span> {formatTime12h(b.arrival)}
                    {formatTripDuration(b.durationMinutes) ? ` · ${formatTripDuration(b.durationMinutes)}` : ""}
                  </p>
                </div>
                <div className="mt-auto">
                  <span className="font-semibold text-foreground text-lg">
                    {formatMoney(b.price, b.currency)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {b.priceLabel || "Typical fare"}
                    {b.distanceKm ? ` · ~${b.distanceKm} km` : ""}
                  </span>
                </div>
                <BusBookingActions
                  bus={b}
                  onPartnerClick={(partner) => handleBusPartner(b, partner)}
                />
              </div>
            ))}
          </HorizontalCardRow>
        </AvailabilitySection>

        <AvailabilitySection icon={Hotel} title="Hotels" count={hotelList.length}>
          <HorizontalCardRow>
            {hotelList.map((h) => (
              <div key={h.id} className={cardClass}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-medium text-foreground line-clamp-2">{h.name}</span>
                  <AvailabilityBadge status={h.availability} label={h.availabilityLabel} />
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {h.nights} night{h.nights === 1 ? "" : "s"}
                  {h.rating != null ? ` · ★ ${h.rating}` : ""}
                </p>
                <div className="flex items-center justify-between gap-2 mt-auto">
                  <span className="font-semibold text-foreground text-sm">
                    {formatMoney(h.totalPrice, h.currency)}
                    <span className="text-xs font-normal text-muted-foreground"> total</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground text-right shrink-0">
                    {h.roomsLeft != null && h.roomsLeft > 0
                      ? `${h.roomsLeft} rooms`
                      : h.roomsLeft === 0
                        ? "Full"
                        : h.bookingProvider || "Live"}
                  </span>
                </div>
                {!h.bookingUrl && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Booking link unavailable.</p>
                )}
                <HotelBookingActions
                  hotel={h}
                  onBook={handleHotelBook}
                  onViewHotel={handleHotelView}
                />
              </div>
            ))}
          </HorizontalCardRow>
        </AvailabilitySection>

        <AvailabilitySection icon={Ticket} title="Activities" count={activityList.length}>
          <HorizontalCardRow>
            {activityList.map((a) => (
              <div key={a.id} className={cardClass}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-medium text-foreground line-clamp-2">{a.name}</span>
                  <AvailabilityBadge status={a.availability} label={a.availabilityLabel} />
                </div>
                <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                  <span className="font-semibold text-foreground">
                    {formatMoney(a.price, a.currency)}
                  </span>
                  <span className="text-[11px] text-muted-foreground text-right line-clamp-2 max-w-[9rem]">
                    {a.nextSlot
                      ? a.nextSlot
                      : a.slotsLeft != null && a.slotsLeft > 0
                        ? `${a.slotsLeft} slots`
                        : "See details"}
                  </span>
                </div>
              </div>
            ))}
          </HorizontalCardRow>
        </AvailabilitySection>
      </div>
    </div>
  )
}
