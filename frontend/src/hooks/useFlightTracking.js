import { useCallback, useEffect, useRef, useState } from "react"
import { flightTrackingAPI } from "../services/api"

const POLL_MS = 10 * 60 * 1000

export function useFlightTracking({ tripId, enabled = true, autoLoad = true } = {}) {
  const [flights, setFlights] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [provider, setProvider] = useState("mock")
  const timerRef = useRef(null)

  const load = useCallback(async () => {
    if (!enabled || !tripId) return
    setLoading(true)
    setError(null)
    try {
      const res = await flightTrackingAPI.getTripFlights(tripId)
      const data = res.data?.data
      setFlights(data?.flights || [])
      setProvider(data?.provider || "mock")
    } catch (err) {
      setError(err.message || "Could not load flights")
    } finally {
      setLoading(false)
    }
  }, [enabled, tripId])

  const loadHistory = useCallback(async () => {
    try {
      const res = await flightTrackingAPI.getHistory({ tripId, limit: 10 })
      setHistory(res.data?.data?.items || [])
    } catch {
      setHistory([])
    }
  }, [tripId])

  const track = useCallback(
    async (body) => {
      const res = await flightTrackingAPI.track({ tripId, ...body })
      await load()
      return res.data?.data
    },
    [tripId, load],
  )

  const stopTracking = useCallback(
    async (id) => {
      await flightTrackingAPI.stopTracking(id)
      await load()
    },
    [load],
  )

  const refresh = useCallback(
    async (id) => {
      await flightTrackingAPI.refresh(id)
      await load()
    },
    [load],
  )

  const askAi = useCallback(
    async (question) => {
      const res = await flightTrackingAPI.aiQuery({ tripId, question })
      return res.data?.data
    },
    [tripId],
  )

  useEffect(() => {
    if (autoLoad && enabled && tripId) {
      load()
      loadHistory()
    }
  }, [autoLoad, enabled, tripId, load, loadHistory])

  useEffect(() => {
    if (!enabled || !tripId) return
    const hasActive = flights.some((f) => f.trackingActive && !["Landed", "Cancelled"].includes(f.status))
    if (!hasActive) return

    timerRef.current = setInterval(() => {
      load()
    }, POLL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [enabled, tripId, flights, load])

  return {
    flights,
    history,
    loading,
    error,
    provider,
    load,
    loadHistory,
    track,
    stopTracking,
    refresh,
    askAi,
  }
}
