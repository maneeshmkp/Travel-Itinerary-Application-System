/**
 * Resolve approximate location from the user's public IP (browser fetch).
 * Works on localhost where the backend only sees 127.0.0.1.
 */
export async function fetchClientIpLocation() {
  const controllers = [
    async () => {
      const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(8000) })
      const data = await res.json()
      if (!data.success) return null
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 15000,
        label: [data.city, data.region, data.country].filter(Boolean).join(", "),
      }
    },
    async () => {
      const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(8000) })
      const data = await res.json()
      if (data.error || !Number.isFinite(data.latitude)) return null
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 15000,
        label: [data.city, data.region, data.country_name].filter(Boolean).join(", "),
      }
    },
  ]

  for (const tryFetch of controllers) {
    try {
      const hit = await tryFetch()
      if (hit) return hit
    } catch {
      /* try next provider */
    }
  }
  return null
}
