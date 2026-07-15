import { useCallback, useEffect, useState } from "react"
import { budgetAPI } from "../services/api"

export function useBudgetOptimizer({ tripId, enabled = true, autoLoad = true } = {}) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [simulation, setSimulation] = useState(null)

  const load = useCallback(async () => {
    if (!enabled || !tripId) return
    setLoading(true)
    setError(null)
    try {
      const res = await budgetAPI.getByTrip(tripId)
      setReport(res.data?.data || null)
    } catch (err) {
      setError(err.message || "Could not load budget optimization")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [enabled, tripId])

  const analyze = useCallback(
    async (force = false) => {
      if (!tripId) return null
      setAnalyzing(true)
      setError(null)
      try {
        const res = await budgetAPI.analyze({ tripId, force })
        const data = res.data?.data
        setReport(data)
        return data
      } catch (err) {
        setError(err.message || "Analysis failed")
        throw err
      } finally {
        setAnalyzing(false)
      }
    },
    [tripId],
  )

  const applyRecommendations = useCallback(
    async ({ acceptedIds = [], rejectIds = [] } = {}) => {
      if (!tripId) return null
      setSaving(true)
      setError(null)
      try {
        const res = await budgetAPI.apply({ tripId, recommendationIds: acceptedIds, rejectIds })
        const data = res.data?.data
        setReport(data)
        return data
      } catch (err) {
        setError(err.message || "Could not apply recommendations")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [tripId],
  )

  const simulate = useCallback(
    async (changes) => {
      if (!tripId) return null
      setSaving(true)
      setError(null)
      try {
        const res = await budgetAPI.simulate({ tripId, changes })
        const data = res.data?.data
        setSimulation(data)
        return data
      } catch (err) {
        setError(err.message || "Simulation failed")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [tripId],
  )

  const askAi = useCallback(
    async (question) => {
      const res = await budgetAPI.aiQuery({ tripId, question })
      return res.data?.data
    },
    [tripId],
  )

  useEffect(() => {
    if (autoLoad && enabled && tripId) load()
  }, [autoLoad, enabled, tripId, load])

  const recommendations = report?.recommendations || []
  const pending = recommendations.filter((r) => r.status === "pending")
  const accepted = recommendations.filter((r) => r.status === "accepted")

  return {
    report,
    recommendations,
    pendingRecommendations: pending,
    acceptedRecommendations: accepted,
    comparisons: report?.comparisons || [],
    categoryBreakdown: report?.categoryBreakdown || [],
    charts: report?.charts || {},
    reasoning: report?.reasoning || [],
    expenseIntegration: report?.expenseIntegration || null,
    currentBudget: report?.currentBudget ?? null,
    optimizedBudget: report?.optimizedBudget ?? null,
    potentialSavings: report?.potentialSavings ?? null,
    healthScore: report?.healthScore ?? null,
    healthLabel: report?.healthLabel ?? null,
    currency: report?.currency || "INR",
    exists: Boolean(report?.exists),
    loading,
    analyzing,
    saving,
    error,
    simulation,
    load,
    analyze,
    applyRecommendations,
    simulate,
    askAi,
  }
}
