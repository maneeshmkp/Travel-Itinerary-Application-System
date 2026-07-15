"use client"

import { healthColor } from "../../constants/riskTypes"

export default function TripHealthCard({ score, label, severity, openCount }) {
  const display = score ?? "—"

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Trip health</p>
      <div className="flex items-end justify-between gap-2 mt-1">
        <p className={`text-4xl font-bold ${healthColor(score ?? 0)}`}>{display}</p>
        <div className="text-right">
          <p className="text-sm font-semibold">{label || "Not analyzed"}</p>
          <p className="text-xs text-muted-foreground">Overall: {severity || "—"}</p>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted mt-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${healthColor(score ?? 0).replace("text-", "bg-")}`}
          style={{ width: `${Math.min(100, score ?? 0)}%`, backgroundColor: score >= 85 ? "#059669" : score >= 70 ? "#2563eb" : score >= 50 ? "#d97706" : "#dc2626" }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {openCount ?? 0} open risk{(openCount ?? 0) === 1 ? "" : "s"} to review
      </p>
    </div>
  )
}
