"use client"

import { useState } from "react"
import { Loader2, Wallet, Sparkles } from "lucide-react"
import { useBudgetOptimizer } from "../../hooks/useBudgetOptimizer"
import BudgetHealthCard from "./BudgetHealthCard"
import SavingsCard from "./SavingsCard"
import BudgetCharts from "./BudgetCharts"
import ComparisonTable from "./ComparisonTable"
import RecommendationCard from "./RecommendationCard"
import OptimizationTimeline from "./OptimizationTimeline"
import WhatIfSimulator from "./WhatIfSimulator"
import BudgetCopilot from "./BudgetCopilot"

function Skeleton() {
  return <div className="h-32 rounded-lg bg-muted/50 animate-pulse" />
}

export default function BudgetTripPanel({ tripId, tripTitle, onItineraryRefresh }) {
  const {
    recommendations,
    pendingRecommendations,
    comparisons,
    categoryBreakdown,
    charts,
    reasoning,
    expenseIntegration,
    currentBudget,
    optimizedBudget,
    potentialSavings,
    healthScore,
    healthLabel,
    currency,
    exists,
    loading,
    analyzing,
    saving,
    error,
    simulation,
    analyze,
    applyRecommendations,
    simulate,
    askAi,
  } = useBudgetOptimizer({ tripId, enabled: Boolean(tripId) })

  const [filter, setFilter] = useState("pending")

  const displayed = recommendations.filter((r) => {
    if (filter === "all") return true
    return r.status === filter
  })

  const handleAccept = async (rec) => {
    await applyRecommendations({ acceptedIds: [rec.id] })
    onItineraryRefresh?.()
  }

  const handleReject = async (rec) => {
    await applyRecommendations({ rejectIds: [rec.id] })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            AI Budget Optimizer
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
          {exists ? "Re-analyze" : "Analyze budget"}
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
          <Wallet className="h-10 w-10 text-primary mx-auto opacity-80" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Analyze your trip to find savings on hotels, transport, dining, and activities — while keeping a great travel experience.
          </p>
        </div>
      ) : null}

      {!loading && exists ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BudgetHealthCard
              score={healthScore}
              label={healthLabel}
              currency={currency}
              expenseIntegration={expenseIntegration}
            />
            <SavingsCard
              currentBudget={currentBudget}
              optimizedBudget={optimizedBudget}
              potentialSavings={potentialSavings}
              currency={currency}
            />
          </div>

          {reasoning.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">AI insights</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                {reasoning.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <BudgetCharts charts={charts} currency={currency} />
          <OptimizationTimeline categoryBreakdown={categoryBreakdown} currency={currency} />
          <ComparisonTable comparisons={comparisons} currency={currency} />

          <div className="flex flex-wrap gap-2">
            {["pending", "accepted", "rejected", "all"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "pending" && pendingRecommendations.length ? ` (${pendingRecommendations.length})` : ""}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {displayed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendations in this filter.</p>
            ) : (
              displayed.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  currency={currency}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  disabled={saving}
                />
              ))
            )}
          </div>

          <WhatIfSimulator currency={currency} onSimulate={simulate} simulation={simulation} saving={saving} />
          <BudgetCopilot onAsk={askAi} disabled={analyzing} />
        </>
      ) : null}
    </div>
  )
}
