import { useCallback, useEffect, useRef, useState } from "react"
import { logLocationDebug } from "../utils/locationDebug"
import {
  isLowAccuracyPosition,
  requestAccurateBrowserPosition,
} from "../utils/browserGeolocation"

/**
 * Browser geolocation only — never itinerary or cached coordinates.
 */
export function useCurrentLocation() {
  const [coords, setCoords] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [permission, setPermission] = useState("prompt")
  const inFlightRef = useRef(null)

  const isSupported =
    typeof window !== "undefined" && typeof navigator?.geolocation?.getCurrentPosition === "function"

  const syncPermission = useCallback(async () => {
    if (!isSupported || !navigator.permissions?.query) {
      setPermission(isSupported ? "prompt" : "unsupported")
      return
    }
    try {
      const status = await navigator.permissions.query({ name: "geolocation" })
      setPermission(status.state)
      status.onchange = () => setPermission(status.state)
    } catch {
      setPermission("prompt")
    }
  }, [isSupported])

  useEffect(() => {
    syncPermission()
  }, [syncPermission])

  const refreshLocation = useCallback(() => {
    if (!isSupported) {
      const msg = "Geolocation is not supported in this browser."
      setError(msg)
      setPermission("unsupported")
      return Promise.resolve(null)
    }

    if (inFlightRef.current) {
      return inFlightRef.current
    }

    setCoords(null)
    setLoading(true)
    setError(null)

    const promise = requestAccurateBrowserPosition({
      targetAccuracyM: 2000,
      maxWaitMs: 30000,
    })
      .then((next) => {
        if (!next) {
          const msg = "Could not get your location. Enable GPS/Location in Windows Settings and try again."
          setError(msg)
          setPermission("prompt")
          setLoading(false)
          return null
        }

        logLocationDebug("Browser returned", {
          browser: {
            latitude: next.latitude,
            longitude: next.longitude,
            accuracy: next.accuracy,
            lowAccuracy: next.lowAccuracy,
          },
        })

        setCoords(next)
        setPermission("granted")
        setLoading(false)

        if (isLowAccuracyPosition(next.accuracy)) {
          setError(
            `Location accuracy is ~${Math.round(next.accuracy / 1000)} km (network estimate, not GPS). ` +
              "Enable Location Services in Windows Settings or try on a phone for precise results.",
          )
        } else {
          setError(null)
        }

        logLocationDebug("React state", {
          state: {
            latitude: next.latitude,
            longitude: next.longitude,
            accuracy: next.accuracy,
          },
        })

        return next
      })
      .finally(() => {
        inFlightRef.current = null
        setLoading(false)
      })

    inFlightRef.current = promise
    return promise
  }, [isSupported])

  const clearLocation = useCallback(() => {
    setCoords(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    coords,
    loading,
    error,
    permission,
    isSupported,
    refreshLocation,
    clearLocation,
    clearError,
    syncPermission,
  }
}
