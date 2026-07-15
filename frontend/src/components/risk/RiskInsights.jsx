"use client"

import { Lightbulb } from "lucide-react"

export default function RiskInsights({ reasoning = [], recommendations = [] }) {
  if (!reasoning?.length && !recommendations?.length) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        AI insights
      </h3>
      {reasoning?.length ? (
        <ul className="text-sm space-y-1.5">
          {reasoning.map((line, i) => (
            <li key={i} className="text-muted-foreground">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {recommendations?.length ? (
        <div className="space-y-2 pt-1 border-t border-border">
          {recommendations.slice(0, 5).map((rec, i) => (
            <div key={i} className="text-xs">
              <p className="font-medium">{rec.title}</p>
              {rec.description ? <p className="text-muted-foreground">{rec.description}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
