import { useCallback, useEffect, useState } from "react"
import { calendarAPI } from "../services/api"

export function useCalendarIntegrations() {
  const [integrations, setIntegrations] = useState({ google: { connected: false }, outlook: { connected: false } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await calendarAPI.getStatus()
      setIntegrations(res.data?.data || {})
      setError(null)
    } catch (err) {
      setError(err.message || "Could not load calendar status")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = async (provider) => {
    const fn = provider === "google" ? calendarAPI.googleConnect : calendarAPI.outlookConnect
    const res = await fn()
    const url = res.data?.data?.authUrl
    if (url) window.location.href = url
  }

  const disconnect = async (provider) => {
    const fn = provider === "google" ? calendarAPI.googleDisconnect : calendarAPI.outlookDisconnect
    await fn()
    await refresh()
  }

  return { integrations, loading, error, refresh, connect, disconnect }
}

export function useTripCalendar(tripId) {
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!tripId) return
    setLoading(true)
    setError(null)
    try {
      const [statusRes, eventsRes] = await Promise.all([
        calendarAPI.getTripStatus(tripId),
        calendarAPI.getEvents(tripId),
      ])
      setStatus(statusRes.data?.data)
      setEvents(eventsRes.data?.data?.events || [])
      setConflicts(eventsRes.data?.data?.conflicts || [])
    } catch (err) {
      setError(err.message || "Could not load calendar data")
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    load()
  }, [load])

  const sync = async (provider) => {
    setSyncing(true)
    try {
      await calendarAPI.sync({ tripId, provider })
      await load()
    } finally {
      setSyncing(false)
    }
  }

  const exportIcs = async () => {
    const res = await calendarAPI.export(tripId)
    const { ics, filename } = res.data?.data || {}
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = filename || "trip.ics"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importIcs = async (file) => {
    const text = await file.text()
    const res = await calendarAPI.import(tripId, text)
    await load()
    return res.data?.data
  }

  return { status, events, conflicts, loading, syncing, error, load, sync, exportIcs, importIcs }
}
