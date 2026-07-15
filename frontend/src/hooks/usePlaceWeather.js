import { useEffect, useMemo, useState } from "react"
import { weatherAPI } from "../services/api"
import { getCachedWeather } from "../offline/cacheService"

/**
 * @param {{ tripId?: string, enabled?: boolean }} options
 */
export function usePlaceWeather({ tripId, enabled = true }) {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [demo, setDemo] = useState(false)
  const [cachedAtHours, setCachedAtHours] = useState(null)

  useEffect(() => {
    if (!enabled || !tripId) {
      setPlaces([])
      setError(null)
      setDemo(false)
      setCachedAtHours(null)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setCachedAtHours(null)

    const loadFromCache = async () => {
      const cached = await getCachedWeather(tripId)
      if (!cached?.data || cancelled) return false
      const payload = cached.data?.data ?? cached.data
      setPlaces(Array.isArray(payload?.places) ? payload.places : [])
      setDemo(Boolean(payload?.demo))
      setCachedAtHours(cached.ageHours ?? 0)
      setError(null)
      return true
    }

    ;(async () => {
      if (!navigator.onLine) {
        const ok = await loadFromCache()
        if (!ok && !cancelled) setError("Place weather unavailable offline.")
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const res = await weatherAPI.getPlaceWeather(tripId)
        if (cancelled) return
        const payload = res.data
        setPlaces(Array.isArray(payload?.places) ? payload.places : [])
        setDemo(Boolean(payload?.demo))
      } catch (err) {
        if (!cancelled) {
          const ok = await loadFromCache()
          if (!ok) {
            setPlaces([])
            setError(err?.message || "Could not load place weather")
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [tripId, enabled])

  const placesByDay = useMemo(() => {
    const map = new Map()
    for (const p of places) {
      if (!map.has(p.day)) map.set(p.day, [])
      map.get(p.day).push(p)
    }
    return map
  }, [places])

  const lookupByActivity = useMemo(() => {
    const map = new Map()
    for (const p of places) {
      const key = `${p.day}|${Number(p.latitude).toFixed(6)}|${Number(p.longitude).toFixed(6)}`
      map.set(key, p)
    }
    return map
  }, [places])

  return { places, placesByDay, lookupByActivity, loading, error, demo, cachedAtHours }
}

/**
 * @param {Map<string, object>} lookupByActivity
 * @param {number} dayNumber
 * @param {{ latitude?: number, longitude?: number }} activity
 */
export function getActivityPlaceWeather(lookupByActivity, dayNumber, activity) {
  if (!lookupByActivity?.size || !activity) return null
  const lat = Number(activity.latitude)
  const lng = Number(activity.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return lookupByActivity.get(`${dayNumber}|${lat.toFixed(6)}|${lng.toFixed(6)}`) || null
}
