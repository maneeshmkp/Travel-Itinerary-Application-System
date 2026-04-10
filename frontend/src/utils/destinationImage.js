/** Served from `public/` when remote destination images fail to load. */
export const DESTINATION_IMAGE_FALLBACK = "/default-travel.svg"

/**
 * Stable slug for image CDNs (seed / cache key). Not for display.
 */
export function destinationImageSeed(destination) {
  const raw = (destination && String(destination).trim()) || "travel"
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "travel"
}

/**
 * Per-destination hero image.
 *
 * `source.unsplash.com` is deprecated and usually fails in the browser, so every card
 * fell back to the same local SVG. Lorem Picsum's **seed** URLs return a stable,
 * different photo for each destination string (Singapore ≠ Bali) without an API key.
 *
 * Optional: set `VITE_UNSPLASH_ACCESS_KEY` and extend this to hit Unsplash Search for
 * truly keyword-matched (beach / mountain) imagery.
 */
export function buildDestinationImageUrl(destination) {
  const seed = destinationImageSeed(destination)
  return `https://picsum.photos/seed/${encodeURIComponent(`${seed}-travel-card`)}/800/600`
}
