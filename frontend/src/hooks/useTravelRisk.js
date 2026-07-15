import { useCallback, useEffect, useState } from "react"
import { riskAPI } from "../services/api"

export function useTravelRisk({ tripId, enabled = true, autoLoad = true } = {}) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [replanResult, setReplanResult] = useState(null)

  const load = useCallback(async () => {
    if (!enabled || !tripId) return
    setLoading(true)
    setError(null)
    try {
      const res = await riskAPI.getByTrip(tripId)
      setReport(res.data?.data || null)
    } catch (err) {
      setError(err.message || "Could not load risks")
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
        const res = await riskAPI.analyze({ tripId, force })
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

  const resolveRisk = useCallback(
    async (riskId, status = "RESOLVED") => {
      setSaving(true)
      setError(null)
      try {
        await riskAPI.resolve(riskId, { status })
        await load()
      } catch (err) {
        setError(err.message || "Could not update risk")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [load],
  )

  const replan = useCallback(
    async ({ riskId, dayNumber, apply = false }) => {
      if (!tripId) return null
      setSaving(true)
      setError(null)
      try {
        const res = await riskAPI.replan({ tripId, riskId, dayNumber, apply })
        const data = res.data?.data
        setReplanResult(data)
        if (apply) await load()
        return data
      } catch (err) {
        setError(err.message || "Replan failed")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [tripId, load],
  )

  const askAi = useCallback(
    async (question) => {
      const res = await riskAPI.aiQuery({ tripId, question })
      return res.data?.data
    },
    [tripId],
  )

  useEffect(() => {
    if (autoLoad && enabled && tripId) load()
  }, [autoLoad, enabled, tripId, load])

  const openRisks = (report?.risks || []).filter((r) => r.status === "OPEN")

  return {
    report,
    risks: report?.risks || [],
    openRisks,
    healthScore: report?.healthScore ?? null,
    healthLabel: report?.healthLabel || null,
    severity: report?.severity || "LOW",
    recommendations: report?.recommendations || [],
    reasoning: report?.reasoning || [],
    exists: Boolean(report?.exists),
    loading,
    analyzing,
    saving,
    error,
    replanResult,
    load,
    analyze,
    resolveRisk,
    replan,
    askAi,
  }
}
