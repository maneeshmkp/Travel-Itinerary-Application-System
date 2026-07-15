"use client"

import { AlertTriangle, CheckCircle2, Circle } from "lucide-react"

export default function MissingDocuments({ missing, loading }) {
  if (loading) {
    return <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
  }
  if (!missing?.checklist?.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Essential travel documents look complete for this trip.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {missing.isInternational ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          International trip — passport, visa, and insurance recommended.
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {missing.checklist.map((item) => (
          <li
            key={item.documentType}
            className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 ${
              item.required
                ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900"
                : "border-border bg-muted/10"
            }`}
          >
            <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{item.label}</span>
            {item.required ? <span className="text-xs text-amber-700 dark:text-amber-300 ml-auto">Required</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
