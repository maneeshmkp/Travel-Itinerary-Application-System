"use client"

import { useMemo } from "react"
import { MapPin } from "lucide-react"
import MapWrapper from "./maps/MapWrapper"
import { buildDayRoutes, routesToMapProps } from "./maps/itineraryMapUtils"
import { getActivityPlaceWeather } from "../hooks/usePlaceWeather"
import { formatMarkerWeatherHtml } from "./weather/PlaceWeatherCard"

const FALLBACK_CENTER = { lat: 15, lng: 101 }

/**
 * Trip map with Google-first rendering and automatic Leaflet/OSM fallback (via MapWrapper).
 */
export default function ItineraryMap({ days, destination, lookupByActivity, mapFocus }) {
  const { markers, polylines, flatMarkers, routes } = useMemo(() => {
    const dayRoutes = buildDayRoutes(days)
    const props = routesToMapProps(dayRoutes)

    let filteredMarkers = props.markers
    if (mapFocus?.dayNumber) {
      filteredMarkers = filteredMarkers.filter((m) => m.dayNumber === mapFocus.dayNumber)
    } else if (mapFocus?.markers?.length) {
      const labels = new Set(mapFocus.markers.map((m) => m.label))
      filteredMarkers = filteredMarkers.filter((m) => labels.has(m.label))
    }

    if (lookupByActivity?.size) {
      filteredMarkers = filteredMarkers.map((m) => {
        const placeWeather = getActivityPlaceWeather(lookupByActivity, m.dayNumber, {
          latitude: m.lat,
          longitude: m.lng,
        })
        const weather = placeWeather?.weather
        return {
          ...m,
          popupHtml: weather ? formatMarkerWeatherHtml(weather) : undefined,
        }
      })
    }

    return { ...props, markers: filteredMarkers, flatMarkers: filteredMarkers, routes: dayRoutes }
  }, [days, lookupByActivity, mapFocus])

  const focusCenter = mapFocus?.center
    ? { lat: mapFocus.center.lat, lng: mapFocus.center.lng }
    : mapFocus?.markers?.[0]
      ? { lat: mapFocus.markers[0].lat, lng: mapFocus.markers[0].lng }
      : null

  const displayMarkers = mapFocus ? (markers.length ? markers : flatMarkers) : markers
  const mapCenter = focusCenter || (flatMarkers[0]
    ? { lat: flatMarkers[0].lat, lng: flatMarkers[0].lng }
    : FALLBACK_CENTER)

  const hasAnyCoords = displayMarkers.length > 0

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-1 flex items-center gap-2 font-heading text-xl font-semibold text-card-foreground">
        <MapPin className="h-5 w-5 shrink-0 text-primary" />
        Trip map
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Markers and routes are grouped by day. Google Maps is tried first; if it fails, OpenStreetMap is used
        automatically.
      </p>

      <MapWrapper
        center={mapCenter}
        zoom={mapFocus?.zoom || (hasAnyCoords ? 10 : 3)}
        markers={displayMarkers}
        polylines={polylines}
        fitToMarkers={hasAnyCoords}
        mapClassName="rounded-lg"
      />

      {!hasAnyCoords ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No coordinates on activities yet. AI-generated itineraries are geocoded automatically when saved;
          you can also add latitude and longitude manually when creating a trip
          {destination ? ` for “${destination}”.` : "."}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {routes
            .filter((r) => r.path.length > 0)
            .map((r) => (
              <div
                key={String(r.dayId)}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color.stroke }} aria-hidden />
                <span className="font-medium text-foreground">Day {r.dayNumber}</span>
                <span>
                  {r.path.length} stop{r.path.length === 1 ? "" : "s"}
                  {r.dayLabel ? ` · ${r.dayLabel}` : ""}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
