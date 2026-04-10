import { useEffect, useState } from "react"
import { buildDestinationImageUrl, DESTINATION_IMAGE_FALLBACK } from "../utils/destinationImage"

/**
 * Lazy-loaded image: unique URL per destination (seeded Picsum); SVG fallback if CDN fails.
 */
export default function DestinationHeroImage({
  destination,
  heightClass = "h-48",
  roundedClass = "rounded-t-xl",
  imgClassName = "",
  badge = null,
}) {
  const [src, setSrc] = useState(() => buildDestinationImageUrl(destination))

  useEffect(() => {
    setSrc(buildDestinationImageUrl(destination))
  }, [destination])

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 ${heightClass} ${roundedClass}`}
    >
      <img
        src={src}
        alt={destination || "Travel destination"}
        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${imgClassName}`}
        loading="lazy"
        onError={() => {
          setSrc((current) => (current === DESTINATION_IMAGE_FALLBACK ? current : DESTINATION_IMAGE_FALLBACK))
        }}
      />
      {badge}
    </div>
  )
}
