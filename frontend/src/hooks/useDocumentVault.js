import { useCallback, useEffect, useState } from "react"
import { documentAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"

export function useDocumentVault({ tripId, enabled = true, autoLoad = true } = {}) {
  const { token, isAuthenticated } = useAuth()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [missing, setMissing] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ sort: "newest" })
  const [selected, setSelected] = useState(null)

  const load = useCallback(
    async (params = {}) => {
      if (!enabled) return
      setLoading(true)
      setError(null)
      try {
        const merged = { ...filters, ...params }
        const res = tripId
          ? await documentAPI.tripList(tripId, merged)
          : await documentAPI.list(merged)
        const data = res.data?.data
        setItems(data?.items || [])
        setPagination(data?.pagination || { page: 1, pages: 1, total: 0 })
        setFilters(merged)
      } catch (err) {
        setError(err.message || "Could not load documents")
      } finally {
        setLoading(false)
      }
    },
    [enabled, tripId, filters],
  )

  const loadStats = useCallback(async () => {
    if (!enabled || tripId) return
    try {
      const res = await documentAPI.stats()
      setStats(res.data?.data || null)
    } catch {
      setStats(null)
    }
  }, [enabled, tripId])

  const loadTimeline = useCallback(async () => {
    if (!enabled) return
    try {
      const res = await documentAPI.timeline()
      setTimeline(res.data?.data?.items || [])
    } catch {
      setTimeline([])
    }
  }, [enabled])

  const loadMissing = useCallback(async () => {
    if (!enabled || !tripId) return
    try {
      const res = await documentAPI.missing(tripId)
      setMissing(res.data?.data || null)
    } catch {
      setMissing(null)
    }
  }, [enabled, tripId])

  const uploadDocument = useCallback(
    async (file, meta = {}) => {
      setSaving(true)
      setError(null)
      try {
        const form = new FormData()
        form.append("file", file)
        Object.entries(meta).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") form.append(k, String(v))
        })
        if (tripId && !meta.tripId) form.append("tripId", tripId)
        const res = await documentAPI.create(form)
        await Promise.all([load(), loadStats(), loadMissing(), loadTimeline()])
        return res.data?.data
      } catch (err) {
        setError(err.message || "Upload failed")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [tripId, load, loadStats, loadMissing, loadTimeline],
  )

  const updateDocument = useCallback(
    async (id, payload) => {
      setSaving(true)
      setError(null)
      try {
        const res = await documentAPI.update(id, payload)
        await load()
        return res.data?.data
      } catch (err) {
        setError(err.message || "Update failed")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [load],
  )

  const deleteDocument = useCallback(
    async (id) => {
      setSaving(true)
      try {
        await documentAPI.delete(id)
        if (selected?.id === id) setSelected(null)
        await Promise.all([load(), loadStats(), loadMissing()])
      } catch (err) {
        setError(err.message || "Delete failed")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [load, loadStats, loadMissing, selected],
  )

  const toggleFavorite = useCallback(
    async (id) => {
      try {
        const res = await documentAPI.favorite(id)
        await load()
        return res.data?.data
      } catch (err) {
        setError(err.message || "Could not update favorite")
        throw err
      }
    },
    [load],
  )

  const downloadDocument = useCallback(async (id) => {
    const res = await documentAPI.download(id)
    const { downloadUrl, fileName } = res.data?.data || {}
    if (!downloadUrl) throw new Error("Download unavailable")
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = fileName || "document"
    a.target = "_blank"
    a.rel = "noopener"
    a.click()
  }, [])

  const searchDocuments = useCallback(
    async (q) => {
      setLoading(true)
      try {
        const res = await documentAPI.search({ q, tripId, ...filters })
        const data = res.data?.data
        setItems(data?.items || [])
        setPagination(data?.pagination || { page: 1, pages: 1, total: 0 })
      } catch (err) {
        setError(err.message || "Search failed")
      } finally {
        setLoading(false)
      }
    },
    [tripId, filters],
  )

  const askAi = useCallback(
    async (question) => {
      const res = await documentAPI.aiQuery({ question, tripId: tripId || undefined })
      return res.data?.data
    },
    [tripId],
  )

  const openDocument = useCallback(async (id) => {
    try {
      const res = await documentAPI.getById(id)
      setSelected(res.data?.data || null)
      return res.data?.data
    } catch (err) {
      setError(err.message || "Could not load document")
      throw err
    }
  }, [])

  useEffect(() => {
    if (autoLoad && enabled && isAuthenticated && token) {
      load()
      loadStats()
      loadTimeline()
      loadMissing()
    }
  }, [autoLoad, enabled, tripId, isAuthenticated, token])

  return {
    items,
    stats,
    timeline,
    missing,
    pagination,
    loading,
    saving,
    error,
    filters,
    selected,
    load,
    loadStats,
    loadTimeline,
    loadMissing,
    uploadDocument,
    updateDocument,
    deleteDocument,
    toggleFavorite,
    downloadDocument,
    searchDocuments,
    askAi,
    openDocument,
    setSelected,
    setFilters,
  }
}
