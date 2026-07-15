import { useCallback, useEffect, useState } from "react"
import {
  resolveLocalThemedFallback,
  resolveTripCoverAlt,
  resolveTripCoverUrl,
  DESTINATION_IMAGE_FALLBACK,
} from "../utils/destinationImage"

const LOAD_TIMEOUT_MS = 6000

function isLocalAsset(url) {
  return typeof url === "string" && url.startsWith("/")
}

/**
 * Trip hero / card image from persisted coverImage (backend), with themed local fallback.
 */
export default function DestinationHeroImage({
  destination,
  title,
  tags = [],
  coverImage,
  itinerary,
  heightClass = "h-48",
  roundedClass = "rounded-t-xl",
  imgClassName = "",
  badge = null,
  priority = false,
}) {
  const trip = itinerary || { destination, title, tags, coverImage }
  const primaryUrl = resolveTripCoverUrl(trip)
  const alt = resolveTripCoverAlt(trip)
  const themedFallback = resolveLocalThemedFallback(trip)
  const initialSrc = primaryUrl || themedFallback

  const [src, setSrc] = useState(initialSrc)
  const [loaded, setLoaded] = useState(isLocalAsset(initialSrc))
  const [attempt, setAttempt] = useState(0)

  const advanceFallback = useCallback(() => {
    setLoaded(true)
    if (attempt === 0 && primaryUrl && src === primaryUrl) {
      setAttempt(1)
      setSrc(themedFallback)
      setLoaded(isLocalAsset(themedFallback))
      return
    }
    if (attempt <= 1 && src !== DESTINATION_IMAGE_FALLBACK) {
      setAttempt(2)
      setSrc(DESTINATION_IMAGE_FALLBACK)
      setLoaded(true)
    }
  }, [attempt, primaryUrl, src, themedFallback])

  useEffect(() => {
    const nextSrc = primaryUrl || themedFallback
    setAttempt(0)
    setSrc(nextSrc)
    setLoaded(isLocalAsset(nextSrc))
  }, [primaryUrl, themedFallback])

  useEffect(() => {
    if (loaded || isLocalAsset(src)) return undefined
    const timer = window.setTimeout(() => advanceFallback(), LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [src, loaded, advanceFallback])

  const handleError = () => advanceFallback()

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 ${heightClass} ${roundedClass}`}
    >
      {!loaded ? (
        <div className="absolute inset-0 z-10 animate-pulse bg-muted/70" aria-hidden />
      ) : null}
      {src ? (
        <img
          key={`${src}-${attempt}`}
          src={src}
          alt={alt}
          className={`relative z-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${imgClassName}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      ) : null}
      {badge}
    </div>
  )
}
