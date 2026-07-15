"use client"

import { Lightbulb, Sparkles } from "lucide-react"

export default function PackingInsights({ insights = [], notes }) {
  if (!insights?.length && !notes) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        AI suggestions
      </h3>
      {notes ? <p className="text-sm text-muted-foreground">{notes}</p> : null}
      {insights?.length ? (
        <ul className="space-y-2">
          {insights.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
