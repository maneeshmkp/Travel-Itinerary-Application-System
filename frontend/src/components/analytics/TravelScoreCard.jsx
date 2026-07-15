"use client"

import { travelScoreColor } from "../../constants/travelAnalytics"

export default function TravelScoreCard({ score, label }) {
  const display = score ?? "—"

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Travel score</p>
      <div className="flex items-end justify-between gap-2 mt-1">
        <p className={`text-4xl font-bold ${travelScoreColor(score ?? 0)}`}>{display}</p>
        <p className="text-sm font-semibold">{label || "Not calculated"}</p>
      </div>
      <div className="h-2.5 rounded-full bg-muted mt-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, score ?? 0)}%`,
            backgroundColor: score >= 90 ? "#059669" : score >= 75 ? "#2563eb" : score >= 60 ? "#d97706" : "#dc2626",
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Based on trips completed, budget, reviews, packing, and destination diversity
      </p>
    </div>
  )
}
