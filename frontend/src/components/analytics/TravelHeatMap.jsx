"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

function FitHeatmap({ points }) {
  const map = useMap()
  useEffect(() => {
    const valid = points.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    if (!valid.length) return
    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], 5)
      return
    }
    map.fitBounds(
      L.latLngBounds(valid.map((p) => [p.latitude, p.longitude])),
      { padding: [40, 40] },
    )
  }, [map, points])
  return null
}

function colorForCount(count = 1) {
  if (count >= 5) return "#dc2626"
  if (count >= 3) return "#f59e0b"
  if (count >= 2) return "#3b82f6"
  return "#10b981"
}

export default function TravelHeatMap({ heatmap = [] }) {
  const points = useMemo(
    () => heatmap.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)),
    [heatmap],
  )

  if (!heatmap.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No location data yet. Create trips with destinations to populate the heatmap.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Travel heatmap</p>
      {points.length > 0 ? (
        <div className="h-64 sm:h-80 rounded-lg overflow-hidden border border-border z-0">
          <MapContainer center={[20.5937, 78.9629]} zoom={4} className="h-full w-full" scrollWheelZoom={false}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitHeatmap points={points} />
            {points.map((p, i) => (
              <CircleMarker
                key={i}
                center={[p.latitude, p.longitude]}
                radius={8 + p.count * 4}
                pathOptions={{ color: colorForCount(p.count), fillColor: colorForCount(p.count), fillOpacity: 0.55 }}
              >
                <Popup>
                  <strong>{p.city || p.country}</strong>
                  <br />
                  {p.state ? `${p.state}, ` : ""}
                  {p.country}
                  <br />
                  Visits: {p.count}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {heatmap.slice(0, 12).map((p, i) => (
          <span
            key={i}
            className="text-xs px-2 py-1 rounded-full border border-border"
            style={{ backgroundColor: `${colorForCount(p.count)}22` }}
          >
            {p.city || p.country} · {p.count}
          </span>
        ))}
      </div>
    </div>
  )
}
