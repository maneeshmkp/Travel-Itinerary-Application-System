const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000,
}

/** Accuracy above this is network/Wi‑Fi estimate, not device GPS. */
export const LOW_ACCURACY_THRESHOLD_M = 5000

export function isLowAccuracyPosition(accuracyM) {
  return !Number.isFinite(accuracyM) || accuracyM > LOW_ACCURACY_THRESHOLD_M
}

function positionToCoords(position) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
    lowAccuracy: isLowAccuracyPosition(position.coords.accuracy),
  }
}

/**
 * Request a fresh browser position. Uses watchPosition first so GPS can warm up,
 * then falls back to getCurrentPosition. Picks the most accurate fix received.
 */
export function requestAccurateBrowserPosition({
  targetAccuracyM = 2000,
  maxWaitMs = 30000,
} = {}) {
  if (typeof window === "undefined" || !navigator?.geolocation) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    let best = null
    let watchId = null
    let settled = false

    const pickBest = (position) => {
      if (!best || position.coords.accuracy < best.coords.accuracy) {
        best = position
      }
    }

    const finish = (position) => {
      if (settled) return
      settled = true
      if (watchId != null) navigator.geolocation.clearWatch(watchId)
      clearTimeout(timer)
      resolve(positionToCoords(position))
    }

    const timer = setTimeout(() => {
      if (best) finish(best)
      else resolve(null)
    }, maxWaitMs)

    const onSuccess = (position) => {
      pickBest(position)
      if (position.coords.accuracy <= targetAccuracyM) {
        finish(position)
      }
    }

    const onError = () => {
      if (best) {
        finish(best)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => finish(position),
        () => resolve(null),
        GEO_OPTIONS,
      )
    }

    watchId = navigator.geolocation.watchPosition(onSuccess, onError, GEO_OPTIONS)
  })
}
