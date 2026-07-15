import { useEffect, useState } from "react"
import { weatherAPI } from "../services/api"
import { forecastByDayNumber } from "../utils/weatherLogic"
import { getCachedWeather } from "../offline/cacheService"

/**
 * Loads a multi-day forecast for an itinerary destination.
 * Falls back to IndexedDB cache when offline or the request fails.
 * @param {{ destination?: string, totalDays?: number, tripId?: string, enabled?: boolean }} options
 */
export function useTripWeather({ destination, totalDays = 5, tripId, enabled = true }) {
  const [forecastByDay, setForecastByDay] = useState(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [demo, setDemo] = useState(false)
  const [demoReason, setDemoReason] = useState(null)
  const [cachedAtHours, setCachedAtHours] = useState(null)
  const [fromCache, setFromCache] = useState(false)

  useEffect(() => {
    if (!enabled || !destination?.trim()) {
      setForecastByDay(new Map())
      setError(null)
      setDemo(false)
      setDemoReason(null)
      setCachedAtHours(null)
      setFromCache(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setFromCache(false)
    setCachedAtHours(null)

    const loadFromCache = async () => {
      if (!tripId) return false
      const cached = await getCachedWeather(tripId)
      if (!cached?.data || cancelled) return false
      const payload = cached.data?.data ?? cached.data
      setForecastByDay(forecastByDayNumber(payload))
      setDemo(Boolean(payload?.demo))
      setDemoReason(payload?.demoReason || null)
      setCachedAtHours(cached.ageHours ?? 0)
      setFromCache(true)
      setError(null)
      return true
    }

    ;(async () => {
      if (!navigator.onLine) {
        const ok = await loadFromCache()
        if (!ok && !cancelled) setError("Weather unavailable offline — download this trip first.")
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const res = await weatherAPI.getForecast({
          destination: destination.trim(),
          days: Math.min(Math.max(totalDays, 1), 10),
        })
        if (cancelled) return
        const payload = res.data?.data
        setForecastByDay(forecastByDayNumber(payload))
        setDemo(Boolean(payload?.demo))
        setDemoReason(payload?.demoReason || null)
      } catch (err) {
        if (!cancelled) {
          const ok = await loadFromCache()
          if (!ok) {
            setForecastByDay(new Map())
            setError(err?.message || "Could not load weather")
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [destination, totalDays, tripId, enabled])

  return { forecastByDay, loading, error, demo, demoReason, cachedAtHours, fromCache }
}
