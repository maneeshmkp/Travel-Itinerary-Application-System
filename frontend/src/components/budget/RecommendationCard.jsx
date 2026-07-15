"use client"

import { Check, X, ExternalLink } from "lucide-react"
import { formatMoney } from "../../utils/budgetCalculations"
import { CATEGORY_LABELS, DIFFICULTY_LABELS, impactBadgeClass } from "../../constants/budgetOptimization"

export default function RecommendationCard({ rec, currency, onAccept, onReject, disabled }) {
  const statusClass =
    rec.status === "accepted"
      ? "border-emerald-300 bg-emerald-50/50"
      : rec.status === "rejected"
        ? "opacity-60 border-dashed"
        : "border-border"

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${statusClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[rec.category] || rec.category}
            {rec.affectedDay ? ` · Day ${rec.affectedDay}` : ""}
          </span>
          <h4 className="font-semibold text-sm mt-0.5">{rec.title}</h4>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${impactBadgeClass(rec.impact)}`}>
          {rec.impact} impact
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{rec.reason}</p>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="font-semibold text-emerald-600">
          Save {formatMoney(rec.estimatedSavings, currency)}
        </span>
        <span className="text-muted-foreground">Difficulty: {DIFFICULTY_LABELS[rec.difficulty] || rec.difficulty}</span>
        {rec.currentPrice > 0 ? (
          <span className="text-muted-foreground">
            {formatMoney(rec.currentPrice, currency)} → {formatMoney(rec.suggestedPrice, currency)}
          </span>
        ) : null}
      </div>

      {rec.alternative?.mapsUrl ? (
        <a
          href={rec.alternative.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {rec.alternative.name || "View on map"}
        </a>
      ) : null}

      {rec.status === "pending" ? (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAccept?.(rec)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onReject?.(rec)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      ) : (
        <p className="text-xs font-medium capitalize text-muted-foreground">{rec.status}</p>
      )}
    </div>
  )
}
