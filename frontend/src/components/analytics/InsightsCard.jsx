"use client"

import { Sparkles } from "lucide-react"
import { formatMoney, DEFAULT_CURRENCY } from "../../utils/budgetCalculations"

export default function InsightsCard({ insights = [], recommendations = {}, currency = DEFAULT_CURRENCY }) {
  return (
    <div className="space-y-4">
      {insights.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI insights
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
            {insights.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {recommendations?.nextDestination ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold mb-2">Suggested next trip</p>
          <p className="text-lg font-bold">{recommendations.nextDestination}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Best month: {recommendations.bestMonth}</span>
            <span>Duration: {recommendations.recommendedDuration} days</span>
            <span>Budget: {formatMoney(recommendations.estimatedBudget, currency)}</span>
          </div>
          {recommendations.activities?.length ? (
            <p className="text-xs mt-2 text-muted-foreground">
              Try: {recommendations.activities.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
