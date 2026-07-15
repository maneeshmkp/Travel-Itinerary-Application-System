"use client"

import { Cloud, Bell, CalendarClock, Wallet, MessageCircle, Loader2 } from "lucide-react"
import WeatherBadge from "../WeatherBadge"
import { formatMoney, DEFAULT_CURRENCY } from "../../utils/budgetCalculations"
import { formatTempRange } from "../../utils/weatherLogic"

/**
 * Slim, sticky right rail. Shows glanceable context only — full modules live
 * inside their tabs. Deliberately compact per the workspace spec.
 */
export default function TripRightSidebar({
  itinerary,
  currency,
  forecastByDay,
  weatherLoading,
  todayActivities = [],
  onAskAi,
  onGoTo,
}) {
  const firstWeather = forecastByDay?.size ? Array.from(forecastByDay.entries())[0][1] : null

  return (
    <aside className="hidden xl:block w-72 shrink-0">
      <div className="sticky top-16 space-y-4">
        {/* Weather */}
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
            <Cloud className="h-3.5 w-3.5 text-primary" />
            Weather
          </p>
          {weatherLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : firstWeather ? (
            <div className="space-y-2">
              {Array.from(forecastByDay.entries())
                .slice(0, 4)
                .map(([dayNum, w]) => (
                  <div key={dayNum} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Day {dayNum}</span>
                    <WeatherBadge condition={w.condition} label={w.label} temp={formatTempRange(w)} />
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No forecast yet.</p>
          )}
        </div>

        {/* Today's schedule */}
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            Today's plan
          </p>
          {todayActivities.length ? (
            <ul className="space-y-1.5">
              {todayActivities.slice(0, 4).map((a, i) => (
                <li key={i} className="text-sm text-foreground truncate">
                  <span className="text-muted-foreground mr-1">{a.time || "•"}</span>
                  {a.name}
                </li>
              ))}
            </ul>
          ) : (
            <button
              type="button"
              onClick={() => onGoTo?.("schedule")}
              className="text-sm text-primary hover:underline"
            >
              View full schedule
            </button>
          )}
        </div>

        {/* Quick budget */}
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Quick budget
          </p>
          <p className="text-lg font-bold">
            {itinerary.budget?.max != null && itinerary.budget?.max !== ""
              ? formatMoney(itinerary.budget.max, itinerary.budget.currency || currency || DEFAULT_CURRENCY)
              : "—"}
          </p>
          <button
            type="button"
            onClick={() => onGoTo?.("finance")}
            className="text-xs text-primary hover:underline mt-1"
          >
            Open finance
          </button>
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm space-y-2">
          <button
            type="button"
            onClick={() => onGoTo?.("overview")}
            className="w-full inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            <Bell className="h-4 w-4 text-primary" />
            Notifications & alerts
          </button>
          <button
            type="button"
            onClick={onAskAi}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90"
          >
            <MessageCircle className="h-4 w-4" />
            Ask Copilot
          </button>
        </div>
      </div>
    </aside>
  )
}
