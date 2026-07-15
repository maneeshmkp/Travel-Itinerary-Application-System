"use client"

import {
  Cloud,
  Plane,
  Hotel,
  MapPin,
  Wallet,
  Utensils,
  Map,
  Sparkles,
} from "lucide-react"
import { formatMoney } from "../../utils/budgetCalculations"

function CardShell({ icon: Icon, title, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-border/60 bg-card/80 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/30">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <div className="p-3 text-sm">{children}</div>
    </div>
  )
}

function WeatherCard({ data }) {
  const f = data.forecast
  const daily = f?.daily || f?.days || (Array.isArray(f) ? f : null)
  return (
    <CardShell icon={Cloud} title={`Weather — ${data.destination || ""}`}>
      {daily?.length ? (
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {daily.slice(0, 5).map((d, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{d.date || d.dt || `Day ${i + 1}`}</span>
              <span className="text-foreground font-medium">
                {d.tempMin ?? d.min}° – {d.tempMax ?? d.max}° {d.condition || d.summary || ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{data.tip || JSON.stringify(f).slice(0, 120)}</p>
      )}
    </CardShell>
  )
}

function FlightCard({ data }) {
  const flights = data.flights || []
  return (
    <CardShell icon={Plane} title={`Flights — ${data.destination || ""}`}>
      {flights.length === 0 ? (
        <p className="text-xs text-muted-foreground">No flights found.</p>
      ) : (
        <ul className="space-y-2">
          {flights.map((f, i) => (
            <li key={i} className="flex justify-between gap-2 text-xs border-b border-border/40 pb-2 last:border-0">
              <span className="text-foreground">{f.airline || f.name || f.departure || "Flight"}</span>
              <span className="font-semibold text-primary shrink-0">
                {f.price != null ? formatMoney(f.price, data.currency || "INR") : f.duration || ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  )
}

function HotelCard({ data }) {
  const hotels = data.hotels || []
  return (
    <CardShell icon={Hotel} title={`Hotels — ${data.destination || ""}`}>
      <ul className="space-y-2">
        {hotels.map((h, i) => (
          <li key={i} className="text-xs border-b border-border/40 pb-2 last:border-0">
            <div className="font-medium text-foreground">{h.name || h.title}</div>
            <div className="flex justify-between text-muted-foreground mt-0.5">
              <span>★ {h.rating || "—"}</span>
              <span className="text-primary font-semibold">
                {h.price != null ? formatMoney(h.price || h.rate, "INR") : h.priceLevel || ""}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

function BudgetCard({ data }) {
  return (
    <CardShell icon={Wallet} title="Budget summary">
      <dl className="space-y-1 text-xs">
        {data.planned && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Planned</dt>
            <dd>
              {formatMoney(data.planned.min, data.currency)} – {formatMoney(data.planned.max, data.currency)}
            </dd>
          </div>
        )}
        {data.totalEstimated != null && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Estimated activities</dt>
            <dd className="font-medium">{formatMoney(data.totalEstimated, data.currency || "INR")}</dd>
          </div>
        )}
        {data.costPerDay != null && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Per day</dt>
            <dd>{formatMoney(data.costPerDay, data.currency || "INR")}</dd>
          </div>
        )}
        {data.expenses && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Spent</dt>
            <dd className="text-destructive">{formatMoney(data.expenses.totalSpent, data.expenses.currency)}</dd>
          </div>
        )}
        {data.remaining != null && (
          <div className="flex justify-between font-semibold text-primary pt-1 border-t border-border/50">
            <dt>Remaining</dt>
            <dd>{formatMoney(data.remaining, data.currency || "INR")}</dd>
          </div>
        )}
      </dl>
    </CardShell>
  )
}

function PlaceCard({ data }) {
  const places = data.places || []
  return (
    <CardShell icon={Utensils} title={`${data.query || "Places"} near ${data.near || ""}`}>
      <ul className="space-y-1.5 text-xs">
        {places.map((p, i) => (
          <li key={i}>
            <div className="font-medium text-foreground">{p.name}</div>
            <div className="text-muted-foreground">{p.address} {p.rating ? `· ★${p.rating}` : ""}</div>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

function MapCard({ data }) {
  return (
    <CardShell icon={Map} title="Map preview">
      <p className="text-xs text-muted-foreground mb-2">{data.markers?.length || 0} locations · {data.action}</p>
      <div className="flex flex-wrap gap-1">
        {(data.markers || []).slice(0, 4).map((m, i) => (
          <span key={i} className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">
            {m.label}
          </span>
        ))}
      </div>
    </CardShell>
  )
}

function ItineraryCard({ data }) {
  const it = data.itinerary
  return (
    <CardShell icon={Sparkles} title="Itinerary updated">
      <p className="text-xs text-muted-foreground">
        {it?.title} — {it?.days?.length || 0} days refreshed
      </p>
    </CardShell>
  )
}

export default function CopilotCard({ card }) {
  if (!card?.type) return null
  switch (card.type) {
    case "weather":
      return <WeatherCard data={card.data} />
    case "flight":
      return <FlightCard data={card.data} />
    case "hotel":
      return <HotelCard data={card.data} />
    case "budget":
      return <BudgetCard data={card.data} />
    case "place":
      return <PlaceCard data={card.data} />
    case "map":
      return <MapCard data={card.data} />
    case "itinerary":
      return <ItineraryCard data={card.data} />
    case "destination":
      return (
        <CardShell icon={MapPin} title={card.data?.name || "Destination"}>
          <p className="text-xs text-muted-foreground">{card.data?.description}</p>
        </CardShell>
      )
    default:
      return null
  }
}

export function CopilotCardList({ cards }) {
  if (!cards?.length) return null
  return (
    <div className="space-y-2 mt-2">
      {cards.map((c, i) => (
        <CopilotCard key={i} card={c} />
      ))}
    </div>
  )
}
