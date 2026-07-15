import { useCallback, useEffect, useState } from "react"
import { packingAPI } from "../services/api"
import { downloadBlob } from "../components/expenses/expenseUtils"

export function usePacking({ tripId, enabled = true, autoLoad = true } = {}) {
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const [filters, setFilters] = useState({ q: "", packed: "", category: "", missing: "" })

  const load = useCallback(async () => {
    if (!enabled || !tripId) return
    setLoading(true)
    setError(null)
    try {
      const res = await packingAPI.getByTrip(tripId)
      setList(res.data?.data || null)
    } catch (err) {
      setError(err.message || "Could not load packing list")
      setList(null)
    } finally {
      setLoading(false)
    }
  }, [enabled, tripId])

  const generate = useCallback(async () => {
    if (!tripId) return null
    setGenerating(true)
    setError(null)
    try {
      const res = await packingAPI.generate({ tripId })
      const data = res.data?.data
      setList(data)
      return data
    } catch (err) {
      setError(err.message || "Could not generate packing list")
      throw err
    } finally {
      setGenerating(false)
    }
  }, [tripId])

  const regenerate = useCallback(async () => {
    if (!tripId) return null
    setGenerating(true)
    setError(null)
    try {
      const res = await packingAPI.regenerate({ tripId })
      const data = res.data?.data
      setList(data)
      return data
    } catch (err) {
      setError(err.message || "Could not regenerate packing list")
      throw err
    } finally {
      setGenerating(false)
    }
  }, [tripId])

  const updateItem = useCallback(
    async (itemId, body) => {
      if (!tripId) return null
      setSaving(true)
      setError(null)
      try {
        const res = await packingAPI.updateItem(itemId, { tripId, ...body })
        const data = res.data?.data
        setList(data)
        return data
      } catch (err) {
        setError(err.message || "Could not update item")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [tripId],
  )

  const togglePacked = useCallback(
    async (item) => {
      return updateItem(item.id, { packed: !item.packed })
    },
    [updateItem],
  )

  const addCustomItem = useCallback(
    async (payload) => {
      if (!tripId) return null
      setSaving(true)
      setError(null)
      try {
        const res = await packingAPI.addCustom({ tripId, ...payload })
        const data = res.data?.data
        setList(data)
        return data
      } catch (err) {
        setError(err.message || "Could not add item")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [tripId],
  )

  const deleteItem = useCallback(
    async (itemId) => {
      if (!tripId) return null
      setSaving(true)
      setError(null)
      try {
        const res = await packingAPI.deleteItem(itemId, tripId)
        const data = res.data?.data
        setList(data)
        return data
      } catch (err) {
        setError(err.message || "Could not delete item")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [tripId],
  )

  const search = useCallback(
    async (params = {}) => {
      if (!tripId) return []
      const merged = { ...filters, ...params }
      setFilters(merged)
      try {
        const res = await packingAPI.search(tripId, merged)
        const items = res.data?.data?.items || []
        setSearchResults(items)
        return items
      } catch {
        setSearchResults([])
        return []
      }
    },
    [tripId, filters],
  )

  const exportPdf = useCallback(async () => {
    if (!tripId) return
    const res = await packingAPI.exportPdf(tripId)
    downloadBlob(res.data, `packing-${tripId}.pdf`)
  }, [tripId])

  const exportCsv = useCallback(async () => {
    if (!tripId) return
    const res = await packingAPI.exportCsv(tripId)
    downloadBlob(res.data, `packing-${tripId}.csv`)
  }, [tripId])

  useEffect(() => {
    if (autoLoad && enabled && tripId) load()
  }, [autoLoad, enabled, tripId, load])

  return {
    list,
    exists: Boolean(list?.exists ?? list?.id),
    loading,
    generating,
    saving,
    error,
    filters,
    searchResults,
    load,
    generate,
    regenerate,
    updateItem,
    togglePacked,
    addCustomItem,
    deleteItem,
    search,
    setFilters,
    exportPdf,
    exportCsv,
  }
}
