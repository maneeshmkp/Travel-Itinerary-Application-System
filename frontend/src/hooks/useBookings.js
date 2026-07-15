import { useCallback, useEffect, useState } from "react"
import { bookingAPI } from "../services/api"

export function useBookings({ tripId, enabled = true, autoLoad = true } = {}) {
  const [items, setItems] = useState([])
  const [timeline, setTimeline] = useState({ items: [], byDate: {} })
  const [dashboard, setDashboard] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ sort: "newest" })

  const load = useCallback(
    async (params = {}) => {
      if (!enabled) return
      setLoading(true)
      setError(null)
      try {
        const merged = { ...filters, ...params }
        const res = tripId
          ? await bookingAPI.tripList(tripId, merged)
          : await bookingAPI.list(merged)
        const data = res.data?.data
        setItems(data?.items || [])
        setPagination(data?.pagination || { page: 1, pages: 1, total: 0 })
        setFilters(merged)
      } catch (err) {
        setError(err.message || "Could not load bookings")
      } finally {
        setLoading(false)
      }
    },
    [enabled, tripId, filters],
  )

  const loadTimeline = useCallback(async () => {
    if (!enabled || !tripId) return
    try {
      const res = await bookingAPI.tripTimeline(tripId)
      setTimeline(res.data?.data || { items: [], byDate: {} })
    } catch {
      setTimeline({ items: [], byDate: {} })
    }
  }, [enabled, tripId])

  const loadDashboard = useCallback(async () => {
    if (!enabled) return
    try {
      const res = await bookingAPI.dashboard(tripId ? { tripId } : {})
      setDashboard(res.data?.data || null)
    } catch {
      setDashboard(null)
    }
  }, [enabled, tripId])

  const createBooking = useCallback(
    async (payload) => {
      setSaving(true)
      setError(null)
      try {
        const res = await bookingAPI.create({ ...payload, tripId: payload.tripId || tripId })
        await Promise.all([load(), loadTimeline(), loadDashboard()])
        return res.data?.data
      } catch (err) {
        setError(err.message || "Could not create booking")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [tripId, load, loadTimeline, loadDashboard],
  )

  const updateBooking = useCallback(
    async (id, payload) => {
      setSaving(true)
      setError(null)
      try {
        const res = await bookingAPI.update(id, payload)
        await Promise.all([load(), loadTimeline(), loadDashboard()])
        return res.data?.data
      } catch (err) {
        setError(err.message || "Could not update booking")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [load, loadTimeline, loadDashboard],
  )

  const deleteBooking = useCallback(
    async (id) => {
      setSaving(true)
      try {
        await bookingAPI.delete(id)
        await Promise.all([load(), loadTimeline(), loadDashboard()])
      } finally {
        setSaving(false)
      }
    },
    [load, loadTimeline, loadDashboard],
  )

  const convertToExpense = useCallback(async (id) => {
    setSaving(true)
    try {
      const res = await bookingAPI.convertExpense(id)
      await load()
      return res.data?.data
    } finally {
      setSaving(false)
    }
  }, [load])

  const search = useCallback(
    async (q, extra = {}) => {
      setLoading(true)
      try {
        const res = await bookingAPI.search({ q, tripId, ...extra })
        const data = res.data?.data
        setItems(data?.items || [])
        setPagination(data?.pagination || { page: 1, pages: 1, total: 0 })
      } finally {
        setLoading(false)
      }
    },
    [tripId],
  )

  useEffect(() => {
    if (!autoLoad || !enabled) return
    load()
    loadDashboard()
    if (tripId) loadTimeline()
  }, [autoLoad, enabled, tripId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    items,
    timeline,
    dashboard,
    pagination,
    loading,
    saving,
    error,
    filters,
    load,
    loadTimeline,
    loadDashboard,
    createBooking,
    updateBooking,
    deleteBooking,
    convertToExpense,
    search,
    setFilters,
  }
}

export function useBookingDetail(id) {
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await bookingAPI.getById(id)
      setBooking(res.data?.data)
      setError(null)
    } catch (err) {
      setError(err.message || "Booking not found")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { booking, loading, error, refresh }
}
