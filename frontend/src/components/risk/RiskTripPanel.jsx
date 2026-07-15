"use client"

import { useState } from "react"
import { Loader2, ShieldAlert, Sparkles } from "lucide-react"
import { useTravelRisk } from "../../hooks/useTravelRisk"
import TripHealthCard from "./TripHealthCard"
import RiskCard from "./RiskCard"
import RiskInsights from "./RiskInsights"
import RiskCopilot from "./RiskCopilot"
import ReplanCompare from "./ReplanCompare"

function Skeleton() {
  return <div className="h-32 rounded-lg bg-muted/50 animate-pulse" />
}

export default function RiskTripPanel({ tripId, tripTitle, onItineraryRefresh }) {
  const {
    report,
    openRisks,
    risks,
    healthScore,
    healthLabel,
    severity,
    recommendations,
    reasoning,
    exists,
    loading,
    analyzing,
    saving,
    error,
    replanResult,
    analyze,
    resolveRisk,
    replan,
    askAi,
  } = useTravelRisk({ tripId, enabled: Boolean(tripId) })

  const [filter, setFilter] = useState("OPEN")
  const [pendingReplan, setPendingReplan] = useState(null)

  const displayed = risks.filter((r) => {
    if (filter === "ALL") return true
    return r.status === filter
  })

  const handleReplan = async (risk) => {
    setPendingReplan(risk)
    await replan({ riskId: risk.id, dayNumber: risk.affectedDay, apply: false })
  }

  const handleApplyReplan = async () => {
    if (!pendingReplan) return
    await replan({ riskId: pendingReplan.id, dayNumber: pendingReplan.affectedDay, apply: true })
    onItineraryRefresh?.()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Trip Health & Risk Detection
          </h2>
          {tripTitle ? <p className="text-sm text-muted-foreground mt-0.5">{tripTitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => analyze(exists)}
          disabled={analyzing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {exists ? "Re-analyze" : "Analyze trip"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? <Skeleton /> : null}

      {!loading && !exists ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-2">
          <ShieldAlert className="h-10 w-10 text-primary mx-auto opacity-80" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Proactively detect weather, booking, budget, document, and schedule risks — with AI replanning for affected days.
          </p>
        </div>
      ) : null}

      {!loading && exists ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TripHealthCard
              score={healthScore}
              label={healthLabel}
              severity={severity}
              openCount={openRisks.length}
            />
            <RiskInsights reasoning={reasoning} recommendations={recommendations} />
          </div>

          <div className="flex flex-wrap gap-2">
            {["OPEN", "RESOLVED", "IGNORED", "ALL"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                }`}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {displayed.length ? (
              displayed.map((risk) => (
                <RiskCard
                  key={risk.id}
                  risk={risk}
                  saving={saving}
                  onResolve={(id) => resolveRisk(id, "RESOLVED")}
                  onIgnore={(id) => resolveRisk(id, "IGNORED")}
                  onReplan={handleReplan}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No risks in this filter.</p>
            )}
          </div>

          <ReplanCompare replanResult={replanResult} onApply={handleApplyReplan} saving={saving} />

          <RiskCopilot onAsk={askAi} disabled={!exists} />

          {report?.demo ? (
            <p className="text-xs text-muted-foreground">Demo mode — add GEMINI_API_KEY for full AI risk analysis.</p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
