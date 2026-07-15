"use client"

import { useEffect, useRef } from "react"
import { probeGoogleMapRenderError } from "./googleMapsLoader"

export const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }

/**
 * Renders a map with the Google Maps JavaScript API (`google.maps.importLibrary`).
 */
export default function GoogleMapComponent({
  center = DEFAULT_CENTER,
  zoom = 12,
  markers = [],
  polylines = [],
  onFallback,
  fitToMarkers = true,
}) {
  const containerRef = useRef(null)
  const onFallbackRef = useRef(onFallback)
  onFallbackRef.current = onFallback

  const markersKey = JSON.stringify(markers)
  const polylinesKey = JSON.stringify(polylines)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    let cancelled = false
    const mapObjects = []
    let stopProbe = () => {}

    ;(async () => {
      try {
        if (!window.google?.maps?.importLibrary) {
          throw new Error("google.maps.importLibrary unavailable")
        }

        const [{ Map }] = await Promise.all([
          window.google.maps.importLibrary("maps"),
          window.google.maps.importLibrary("marker"),
        ])

        if (cancelled) return

        const MarkerCtor = window.google.maps.Marker
        if (!MarkerCtor) {
          throw new Error("google.maps.Marker unavailable after marker library load")
        }

        const displayMarkers =
          markers.length > 0
            ? markers
            : [{ lat: center.lat, lng: center.lng, title: "Delhi", label: "★" }]

        const map = new Map(el, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        })

        stopProbe = probeGoogleMapRenderError(el, () => {
          if (!cancelled) onFallbackRef.current?.()
        })

        const infoWindow = new window.google.maps.InfoWindow()

        displayMarkers.forEach((m) => {
          const marker = new MarkerCtor({
            map,
            position: { lat: m.lat, lng: m.lng },
            title: m.title,
            label: m.label
              ? { text: m.label, color: "#1e293b", fontSize: "11px", fontWeight: "700" }
              : undefined,
            icon: m.icon,
            zIndex: m.zIndex,
          })

          if (m.popupHtml) {
            marker.addListener("click", () => {
              infoWindow.setContent(
                `<div style="font-family:system-ui,sans-serif;max-width:220px"><strong>${m.title || "Stop"}</strong>${m.popupHtml}</div>`,
              )
              infoWindow.open({ map, anchor: marker })
            })
          }

          mapObjects.push(marker)
        })

        polylines.forEach((line) => {
          const poly = new window.google.maps.Polyline({
            map,
            path: line.path,
            strokeColor: line.color || "#2563eb",
            strokeOpacity: 0.92,
            strokeWeight: 4,
            geodesic: true,
            zIndex: line.zIndex,
          })
          mapObjects.push(poly)
        })

        if (fitToMarkers && displayMarkers.length > 0) {
          if (displayMarkers.length === 1) {
            map.setCenter({ lat: displayMarkers[0].lat, lng: displayMarkers[0].lng })
            map.setZoom(zoom)
          } else {
            const bounds = new window.google.maps.LatLngBounds()
            displayMarkers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }))
            map.fitBounds(bounds, 56)
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[GoogleMapComponent]", err)
          onFallbackRef.current?.()
        }
      }
    })()

    return () => {
      cancelled = true
      stopProbe()
      mapObjects.forEach((obj) => {
        if (typeof obj.setMap === "function") obj.setMap(null)
      })
    }
  }, [center.lat, center.lng, zoom, markersKey, polylinesKey, fitToMarkers])

  return (
    <div
      ref={containerRef}
      className="h-full w-full min-h-[400px] rounded-lg bg-muted"
      role="application"
      aria-label="Google map"
    />
  )
}
