import { useCallback, useState } from "react"

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60_000,
}

/**
 * Browser geolocation via navigator.geolocation.
 */
export function useUserLocation(options = DEFAULT_OPTIONS) {
  const [coords, setCoords] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const isSupported =
    typeof window !== "undefined" && typeof navigator?.geolocation?.getCurrentPosition === "function"

  const requestLocation = useCallback((overrides = {}) => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setError("Geolocation is not supported in this browser.")
      return Promise.resolve(null)
    }

    setLoading(true)
    setError(null)

    const geoOptions = { ...DEFAULT_OPTIONS, ...options, ...overrides }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }
          setCoords(next)
          setLoading(false)
          resolve(next)
        },
        (err) => {
          const messages = {
            1: "Location permission denied.",
            2: "Could not determine your location.",
            3: "Location request timed out.",
          }
          setError(messages[err.code] || err.message || "Could not get your location.")
          setLoading(false)
          resolve(null)
        },
        geoOptions,
      )
    })
  }, [options])

  const clearLocation = useCallback(() => {
    setCoords(null)
    setError(null)
  }, [])

  return { coords, loading, error, requestLocation, clearLocation, isSupported }
}
