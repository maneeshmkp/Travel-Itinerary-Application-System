"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"
import { resolveLocalThemedFallback } from "../utils/destinationImage"
import { buildClientPlaceImages } from "../utils/placeImages"

/**
 * Single location-matched image below the trip description (fills sidebar gap).
 */
export default function TripPlaceGallery({ itinerary, placeImages, className = "" }) {
  const item = placeImages?.[0] || buildClientPlaceImages(itinerary, 1)[0]
  const [src, setSrc] = useState(() => item?.url || "")

  if (!item?.url) return null

  const imageSrc = src || item.url
  const fallback = resolveLocalThemedFallback(itinerary)

  const handleError = () => {
    if (fallback && imageSrc !== fallback) setSrc(fallback)
  }

  return (
    <figure
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-sm w-full h-full min-h-[inherit] ${className}`}
    >
      <img
        src={imageSrc}
        alt={item.alt || item.label || itinerary?.destination || "Destination"}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        loading="lazy"
        decoding="async"
        onError={handleError}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
      <figcaption className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white">
        <p className="text-sm sm:text-base font-semibold flex items-center gap-1.5">
          <MapPin className="h-4 w-4 shrink-0 opacity-90" />
          {item.label || itinerary?.destination}
        </p>
        {item.location && item.location !== item.label ? (
          <p className="text-xs sm:text-sm text-white/85 mt-1 line-clamp-2">{item.location}</p>
        ) : null}
      </figcaption>
    </figure>
  )
}
