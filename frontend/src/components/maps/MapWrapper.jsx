"use client"

import { useCallback, useEffect, useState } from "react"
import { loadGoogleMapsScript, onGoogleMapsAuthFailure, isUsableGoogleMapsApiKey } from "./googleMapsLoader"
import GoogleMapComponent, { DEFAULT_CENTER } from "./GoogleMapComponent"
import LeafletMapComponent from "./LeafletMapComponent"

/** Example marker location (Delhi) — shared by Google and Leaflet paths. */
export const DEMO_MAP_CENTER = DEFAULT_CENTER

/**
 * MapWrapper — orchestrates provider selection:
 * 1. If `VITE_GOOGLE_MAPS_API_KEY` exists, dynamically load the Google Maps script.
 * 2. On script `onerror`, missing `window.google.maps` after load, or map init failure → Leaflet + OSM.
 *
 * `useGoogleMap` is tri-state: `null` (resolving), `true` (Google), `false` (Leaflet fallback).
 */
export default function MapWrapper({
  center = DEMO_MAP_CENTER,
  zoom = 12,
  markers = [],
  polylines = [],
  fitToMarkers = true,
  popupTitle = "Delhi",
  className = "",
  mapClassName = "",
}) {
  /** null = still deciding; true = Google Maps; false = Leaflet fallback */
  const [useGoogleMap, setUseGoogleMap] = useState(null)
  const [fallbackNotice, setFallbackNotice] = useState(null)

  const switchToLeaflet = useCallback((message, err) => {
    setUseGoogleMap(false)
    const detail =
      import.meta.env.DEV && err?.message ? ` (${err.message})` : ""
    setFallbackNotice(
      (message || "Google Maps failed, switched to OpenStreetMap") + detail
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
    const preferLeaflet = import.meta.env.VITE_MAP_PROVIDER === "leaflet"

    if (preferLeaflet || !isUsableGoogleMapsApiKey(apiKey)) {
      setUseGoogleMap(false)
      setFallbackNotice(
        preferLeaflet
          ? "Using OpenStreetMap (VITE_MAP_PROVIDER=leaflet)."
          : "Google Maps API key missing or invalid — using OpenStreetMap.",
      )
      return () => {
        cancelled = true
      }
    }

    const offAuthFailure = onGoogleMapsAuthFailure(() => {
      if (!cancelled) {
        switchToLeaflet(
          "Google Maps could not authenticate this API key (enable Maps JavaScript API, billing, and localhost referrer). Using OpenStreetMap.",
        )
      }
    })

    setUseGoogleMap(null)
    setFallbackNotice(null)

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled) return
        if (!window.google?.maps?.importLibrary) {
          switchToLeaflet("Google Maps failed, switched to OpenStreetMap")
          return
        }
        setUseGoogleMap(true)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[MapWrapper] Google Maps load failed:", err)
          switchToLeaflet("Google Maps failed, switched to OpenStreetMap", err)
        }
      })

    return () => {
      cancelled = true
      offAuthFailure()
    }
  }, [switchToLeaflet])

  const handleGoogleMapFallback = useCallback(() => {
    switchToLeaflet("Google Maps failed, switched to OpenStreetMap")
  }, [switchToLeaflet])

  const mapProps = {
    center,
    zoom,
    markers,
    polylines,
    fitToMarkers,
    popupTitle,
  }

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {fallbackNotice ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {fallbackNotice}
        </p>
      ) : null}

      <div
        className={`relative h-[min(480px,70vh)] w-full min-h-[400px] max-h-[500px] overflow-hidden rounded-xl border border-border bg-card shadow-sm ${mapClassName}`}
      >
        {useGoogleMap === null ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Loading map…
          </div>
        ) : null}

        {useGoogleMap === true ? (
          <GoogleMapComponent {...mapProps} onFallback={handleGoogleMapFallback} />
        ) : null}

        {useGoogleMap === false ? <LeafletMapComponent {...mapProps} /> : null}
      </div>
    </div>
  )
}
