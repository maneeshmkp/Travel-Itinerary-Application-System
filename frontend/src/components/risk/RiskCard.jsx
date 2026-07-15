"use client"

import { AlertTriangle, CheckCircle2, EyeOff, RefreshCw, Sparkles } from "lucide-react"
import { riskTypeLabel, severityColor } from "../../constants/riskTypes"

export default function RiskCard({ risk, onResolve, onIgnore, onReplan, saving }) {
  const rec = risk.recommendation || {}
  const suggestions = rec.suggestions || []

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-sm">{risk.title}</h3>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${severityColor(risk.severity)}`}>
                {risk.severity}
              </span>
              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                {riskTypeLabel(risk.riskType)}
              </span>
            </div>
            {risk.affectedDay ? (
              <p className="text-xs text-muted-foreground mt-0.5">Day {risk.affectedDay}</p>
            ) : null}
          </div>
        </div>
        {risk.status === "OPEN" ? (
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={() => onReplan?.(risk)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-border hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              Replan
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onResolve?.(risk.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3 w-3" />
              Resolve
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onIgnore?.(risk.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <EyeOff className="h-3 w-3" />
              Ignore
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground capitalize">{risk.status.toLowerCase()}</span>
        )}
      </div>

      {risk.description ? <p className="text-sm text-muted-foreground">{risk.description}</p> : null}

      {rec.title || rec.description ? (
        <div className="rounded-md bg-primary/5 border border-primary/10 p-3 space-y-1">
          <p className="text-xs font-semibold flex items-center gap-1 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI suggestion
          </p>
          {rec.title ? <p className="text-sm font-medium">{rec.title}</p> : null}
          {rec.description ? <p className="text-xs text-muted-foreground">{rec.description}</p> : null}
          {rec.transportTip ? <p className="text-xs text-muted-foreground">🚇 {rec.transportTip}</p> : null}
        </div>
      ) : null}

      {suggestions.length ? (
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          {suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : null}

      {(rec.alternativeActivities || []).length ? (
        <div className="text-xs space-y-1">
          <p className="font-medium">Alternatives</p>
          {(rec.alternativeActivities || []).slice(0, 3).map((a, i) => (
            <p key={i} className="text-muted-foreground">
              {a.name} — {a.reason || a.category}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
