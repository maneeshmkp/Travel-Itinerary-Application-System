import { Loader2, MapPin } from "lucide-react"
import PlaceWeatherCard from "./PlaceWeatherCard"

/**
 * Weather-by-place section grouped by itinerary day.
 */
export default function WeatherByPlace({ placesByDay, loading, error }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading weather by place…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Could not load place-wise weather. The rest of the itinerary is still available.
      </div>
    )
  }

  if (!placesByDay?.size) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Add activity coordinates to see weather for each stop. AI-generated itineraries are geocoded automatically when saved.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-1 flex items-center gap-2 font-heading text-xl font-semibold text-card-foreground">
        <MapPin className="h-5 w-5 shrink-0 text-primary" />
        Weather by place
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Live weather for today&apos;s stops; forecasts for upcoming days within 5 days of travel.
      </p>

      <div className="space-y-6">
        {Array.from(placesByDay.entries())
          .sort(([a], [b]) => a - b)
          .map(([dayNum, dayPlaces]) => (
            <div key={dayNum}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Day {dayNum}</h3>
              <div
                className={`grid gap-3 ${
                  dayPlaces.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
                }`}
              >
                {dayPlaces.map((p) => (
                  <PlaceWeatherCard
                    key={`${p.day}-${p.latitude}-${p.longitude}`}
                    day={p.day}
                    place={p.place}
                    weather={p.weather}
                    activityNames={p.activityNames}
                    latitude={p.latitude}
                    longitude={p.longitude}
                    gridLocation={p.gridLocation}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
