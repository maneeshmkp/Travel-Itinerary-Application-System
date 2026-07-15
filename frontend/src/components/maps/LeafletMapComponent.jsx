"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { DEFAULT_CENTER } from "./GoogleMapComponent"

/** Fix default marker assets when bundling with Vite (broken URLs otherwise). */
const defaultIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

/** Colored pin for day-wise marker grouping on Leaflet maps. */
function leafletIconForDay(dayNumber, strokeColor = "#2563eb") {
  const label = String(dayNumber ?? "")
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
      <div style="background:${strokeColor};color:#fff;font-size:10px;font-weight:700;min-width:22px;height:22px;border-radius:11px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:0 4px">${label}</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${strokeColor};margin-top:-1px"></div>
    </div>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -30],
  })
}

/** Fit the Leaflet viewport to marker positions (or single-point zoom). */
function FitBounds({ positions, zoom = 12 }) {
  const map = useMap()

  useEffect(() => {
    if (!positions?.length) return
    if (positions.length === 1) {
      map.setView(positions[0], zoom)
      return
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48] })
  }, [map, positions, zoom])

  return null
}

/**
 * OpenStreetMap fallback via react-leaflet — mirrors Google map center, markers, and polylines.
 */
export default function LeafletMapComponent({
  center = DEFAULT_CENTER,
  zoom = 12,
  markers = [],
  polylines = [],
  fitToMarkers = true,
  popupTitle = "Delhi",
}) {
  const displayMarkers =
    markers.length > 0 ? markers : [{ lat: center.lat, lng: center.lng, title: popupTitle }]

  const positions = useMemo(() => {
    const list = markers.length > 0 ? markers : [{ lat: center.lat, lng: center.lng }]
    return list.map((m) => [m.lat, m.lng])
  }, [markers, center.lat, center.lng])

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full min-h-[400px] rounded-lg z-0"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {fitToMarkers ? <FitBounds positions={positions} zoom={zoom} /> : null}

      {displayMarkers.map((m, i) => (
        <Marker
          key={m.id ?? `${m.lat}-${m.lng}-${i}`}
          position={[m.lat, m.lng]}
          icon={
            m.dayNumber != null
              ? leafletIconForDay(m.dayNumber, m.strokeColor)
              : defaultIcon
          }
        >
          <Popup>
            <span className="font-medium">{m.title || popupTitle}</span>
            {m.popupHtml ? (
              <div
                className="mt-1 text-xs text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: m.popupHtml }}
              />
            ) : (
              <span className="text-xs text-muted-foreground">
                {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
              </span>
            )}
          </Popup>
        </Marker>
      ))}

      {polylines.map((line, i) => (
        <Polyline
          key={line.id ?? `line-${i}`}
          positions={line.path.map((p) => [p.lat, p.lng])}
          pathOptions={{
            color: line.color || "#2563eb",
            weight: 4,
            opacity: 0.92,
          }}
        />
      ))}
    </MapContainer>
  )
}
