"use client"

import { formatMoney } from "../../utils/budgetCalculations"
import { healthColor } from "../../constants/budgetOptimization"

export default function BudgetHealthCard({ score, label, currency, expenseIntegration }) {
  const display = score ?? "—"
  const percentUsed = expenseIntegration?.percentUsed

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Budget health</p>
      <div className="flex items-end justify-between gap-2 mt-1">
        <p className={`text-4xl font-bold ${healthColor(score ?? 0)}`}>{display}</p>
        <div className="text-right">
          <p className="text-sm font-semibold">{label || "Not analyzed"}</p>
          {percentUsed != null ? (
            <p className="text-xs text-muted-foreground">{Math.round(percentUsed)}% of budget used</p>
          ) : null}
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted mt-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, score ?? 0)}%`,
            backgroundColor: score >= 85 ? "#059669" : score >= 70 ? "#2563eb" : score >= 50 ? "#d97706" : "#dc2626",
          }}
        />
      </div>
      {expenseIntegration ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Planned</p>
            <p className="font-medium">{formatMoney(expenseIntegration.planned, currency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Actual</p>
            <p className="font-medium">{formatMoney(expenseIntegration.actual, currency)}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
