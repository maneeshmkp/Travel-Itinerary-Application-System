"use client"

import { Link } from "react-router-dom"
import MapWrapper from "../components/maps/MapWrapper"

/**
 * Demo page: Google-first map with Leaflet/OSM fallback.
 * Visit `/map-demo` (public) to verify behavior with or without a valid Google API key.
 */
export default function MapDemo() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/" className="mb-6 inline-block text-sm font-medium text-primary hover:underline">
        ← Back home
      </Link>
      <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Map demo</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Tries Google Maps first (when <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
        is set). If the script fails or <code className="rounded bg-muted px-1 py-0.5 text-xs">window.google.maps</code> is
        missing, the view switches to Leaflet with OpenStreetMap tiles.
      </p>
      <div className="mt-8">
        <MapWrapper />
      </div>
    </div>
  )
}
