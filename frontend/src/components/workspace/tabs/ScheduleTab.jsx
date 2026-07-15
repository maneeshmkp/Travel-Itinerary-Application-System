"use client"

import { useState } from "react"
import { Calendar, Hotel, Activity, MapPin, Clock, DollarSign, Star, Ticket, Route, Loader2, ChevronDown } from "lucide-react"
import WeatherBadge from "../../WeatherBadge"
import WeatherByPlace from "../../weather/WeatherByPlace"
import ActivityScheduleControls from "../../ActivityScheduleControls"
import AvailabilityBadge from "../../availability/AvailabilityBadge"
import { normalizeAvailabilityKey } from "../../availability/TripAvailability"
import { formatMoney, DEFAULT_CURRENCY } from "../../../utils/budgetCalculations"
import { activityFitClasses, buildDayActivitySuggestions, formatTempRange, tripTip } from "../../../utils/weatherLogic"
import { categoryIcon } from "../workspaceConfig"

function DayCard({ ctx, day, defaultOpen }) {
  const {
    itinerary,
    forecastByDay,
    availabilityLookups,
    canEdit,
    scheduleAdjustId,
    handleAdjustActivity,
  } = ctx
  const [open, setOpen] = useState(defaultOpen)
  const currency = itinerary.budgetInsight?.currency || itinerary.budget?.currency || DEFAULT_CURRENCY

  const dayBudget = itinerary.budgetInsight?.byDay?.find((b) => b.dayNumber === day.dayNumber)
  const dayWeather = forecastByDay.get(day.dayNumber)
  const daySuggestions = dayWeather ? buildDayActivitySuggestions(dayWeather.condition, day.activities) : null

  return (
    <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          <span className="inline-flex items-center font-heading font-semibold text-lg">
            <Calendar className="h-5 w-5 mr-2 text-primary shrink-0" />
            Day {day.dayNumber}
          </span>
          {(day.dayLabel || "").trim() ? (
            <span className="text-card-foreground font-medium truncate">— {(day.dayLabel || "").trim()}</span>
          ) : null}
          {dayWeather ? (
            <WeatherBadge condition={dayWeather.condition} label={dayWeather.label} temp={formatTempRange(dayWeather)} />
          ) : null}
          {dayBudget && dayBudget.dayTotal > 0 ? (
            <span className="text-sm font-normal text-muted-foreground">
              · {formatMoney(dayBudget.dayTotal, currency)}
            </span>
          ) : null}
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="px-4 sm:px-5 pb-5">
          {dayWeather ? (
            <p className="mb-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {tripTip(dayWeather.condition)}
            </p>
          ) : null}

          {/* Accommodation */}
          <div className="mb-6">
            <h4 className="font-medium text-card-foreground mb-3 flex items-center">
              <Hotel className="h-4 w-4 mr-2 text-primary" />
              Accommodation
            </h4>
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h5 className="font-medium text-foreground">{day.hotel?.name}</h5>
                <div className="flex items-center gap-2 shrink-0">
                  {(() => {
                    const hotelAvail = availabilityLookups.hotelsByName.get(normalizeAvailabilityKey(day.hotel?.name))
                    return hotelAvail ? (
                      <>
                        <AvailabilityBadge status={hotelAvail.availability} label={hotelAvail.availabilityLabel} />
                        <span className="text-sm font-semibold text-foreground">
                          {formatMoney(hotelAvail.totalPrice, hotelAvail.currency || currency)}
                        </span>
                      </>
                    ) : null
                  })()}
                  {day.hotel?.rating ? (
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < day.hotel.rating ? "text-secondary fill-current" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="text-muted-foreground flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {day.hotel?.location}
              </p>
            </div>
          </div>

          {/* Activities */}
          {day.activities && day.activities.length > 0 ? (
            <div>
              <h4 className="font-medium text-card-foreground mb-3 flex items-center">
                <Activity className="h-4 w-4 mr-2 text-primary" />
                Activities
              </h4>
              <div className="space-y-4">
                {day.activities.map((activity) => {
                  const weatherHint = daySuggestions?.activities?.find(
                    (a) => a.name === activity.name && a.category === activity.category,
                  )
                  const activityAvail = availabilityLookups.activitiesByName.get(normalizeAvailabilityKey(activity.name))
                  return (
                    <div
                      key={activity._id}
                      className={`bg-muted rounded-lg p-4 ${activity.skipped ? "opacity-60 border border-dashed border-border" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex items-center min-w-0">
                          <span className="text-lg mr-2 shrink-0">{categoryIcon(activity.category)}</span>
                          <h5 className={`font-medium text-foreground ${activity.skipped ? "line-through text-muted-foreground" : ""}`}>
                            {activity.name}
                          </h5>
                          {activity.skipped ? (
                            <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted-foreground/15 text-muted-foreground">
                              Skipped
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <ActivityScheduleControls
                            activity={activity}
                            canEdit={canEdit}
                            loading={scheduleAdjustId === activity._id}
                            onSkip={(act) => handleAdjustActivity(act, true)}
                            onRestore={(act) => handleAdjustActivity(act, false)}
                          />
                          {activityAvail ? (
                            <AvailabilityBadge status={activityAvail.availability} label={activityAvail.availabilityLabel} />
                          ) : null}
                          {activity.time ? (
                            <span className="text-sm text-muted-foreground bg-background px-2 py-1 rounded">{activity.time}</span>
                          ) : null}
                          {weatherHint ? (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${activityFitClasses(weatherHint.fit)}`}
                              title={weatherHint.message}
                            >
                              {weatherHint.fit === "good"
                                ? "Great for today"
                                : weatherHint.fit === "swap"
                                  ? "Consider indoor"
                                  : "Flexible"}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <p className={`text-muted-foreground mb-2 ${activity.skipped ? "line-through" : ""}`}>{activity.description}</p>
                      {weatherHint?.message ? (
                        <p className="text-xs text-muted-foreground mb-2 italic">{weatherHint.message}</p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {activity.location}
                        </div>
                        {activity.duration ? (
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {activity.duration}
                          </div>
                        ) : null}
                        {activity.cost > 0 ? (
                          <div className="flex items-center font-medium text-foreground">
                            <DollarSign className="h-3 w-3 mr-0.5 text-primary" />
                            {formatMoney(activity.cost, currency)}
                          </div>
                        ) : null}
                        {activityAvail ? (
                          <div className="flex items-center font-medium text-primary">
                            <Ticket className="h-3 w-3 mr-0.5" />
                            {formatMoney(activityAvail.price, activityAvail.currency || currency)}
                            <span className="text-xs text-muted-foreground ml-1">live</span>
                          </div>
                        ) : null}
                        <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-xs border border-secondary/20">
                          {activity.category}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function ScheduleTab({ ctx }) {
  const {
    itinerary,
    placesByDay,
    placeWeatherLoading,
    placeWeatherError,
    handleOptimizeTrip,
    optimizeLoading,
    canEdit,
  } = ctx

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-heading font-semibold text-xl">Daily schedule</h2>
          <p className="text-sm text-muted-foreground">Collapse days to focus. Reorder stops to reduce travel time.</p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={handleOptimizeTrip}
            disabled={optimizeLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
          >
            {optimizeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
            Optimize Trip
          </button>
        ) : null}
      </div>

      <WeatherByPlace placesByDay={placesByDay} loading={placeWeatherLoading} error={placeWeatherError} />

      <div className="space-y-4">
        {itinerary.days.map((day, idx) => (
          <DayCard key={day._id} ctx={ctx} day={day} defaultOpen={idx === 0} />
        ))}
      </div>
    </div>
  )
}
