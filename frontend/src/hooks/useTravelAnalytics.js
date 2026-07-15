import { useCallback, useEffect, useState } from "react"
import { travelAnalyticsAPI } from "../services/api"
import { downloadBlob } from "../components/expenses/expenseUtils"

export function useTravelAnalytics({ enabled = true, autoLoad = true } = {}) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    if (!enabled) return null
    setLoading(true)
    setError(null)
    try {
      const res = await travelAnalyticsAPI.getDashboard()
      const data = res.data?.data || null
      setReport(data)
      return data
    } catch (err) {
      setError(err.message || "Could not load analytics")
      setReport(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [enabled])

  const recalculate = useCallback(async (force = true) => {
    setRecalculating(true)
    setError(null)
    try {
      const res = await travelAnalyticsAPI.recalculate({ force })
      const data = res.data?.data
      setReport(data)
      return data
    } catch (err) {
      setError(err.message || "Recalculation failed")
      throw err
    } finally {
      setRecalculating(false)
    }
  }, [])

  const loadYear = useCallback(async (year) => {
    const res = await travelAnalyticsAPI.getYear(year || selectedYear)
    return res.data?.data
  }, [selectedYear])

  const exportCsv = useCallback(async (year) => {
    const res = await travelAnalyticsAPI.exportCsv(year ? { year } : {})
    downloadBlob(res.data, year ? `travel-stats-${year}.csv` : "travel-statistics.csv")
  }, [])

  const exportPdf = useCallback(async (year) => {
    const res = await travelAnalyticsAPI.exportPdf(year ? { year } : {})
    downloadBlob(res.data, year ? `travel-report-${year}.pdf` : "travel-analytics.pdf")
  }, [])

  useEffect(() => {
    if (autoLoad && enabled) load()
  }, [autoLoad, enabled, load])

  return {
    report,
    exists: Boolean(report?.exists),
    stats: report?.stats || report,
    charts: report?.charts || {},
    heatmap: report?.heatmap || [],
    timeline: report?.timeline || [],
    achievements: report?.achievements || [],
    insights: report?.insights || [],
    aiRecommendations: report?.aiRecommendations || {},
    yearComparison: report?.yearComparison || {},
    travelScore: report?.travelScore ?? null,
    travelScoreLabel: report?.travelScoreLabel ?? null,
    loading,
    recalculating,
    error,
    selectedYear,
    setSelectedYear,
    load,
    recalculate,
    loadYear,
    exportCsv,
    exportPdf,
  }
}
