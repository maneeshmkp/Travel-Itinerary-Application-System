"use client"

import { AlertTriangle, Luggage, Scale } from "lucide-react"
import { categoryLabel, PACKING_CATEGORY_IDS } from "../../constants/packingCategories"

export default function PackingWeightCard({ list }) {
  const total = Number(list?.estimatedWeight || 0).toFixed(1)
  const allowance = list?.baggageAllowanceKg ?? 23
  const overweight = Boolean(list?.overweight)
  const byCategory = list?.weightByCategory || {}

  const rows = PACKING_CATEGORY_IDS.map((id) => ({
    id,
    label: categoryLabel(id),
    kg: Number(byCategory[id] || 0),
  })).filter((r) => r.kg > 0)

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Estimated luggage weight</h3>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-2xl font-bold">{total} kg</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Luggage className="h-3.5 w-3.5" />
          Allowance: {allowance} kg
        </p>
      </div>

      {overweight ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Estimated weight exceeds your flight baggage allowance. Consider removing non-essentials.</p>
        </div>
      ) : null}

      {rows.length ? (
        <ul className="space-y-1 text-xs">
          {rows.map((row) => (
            <li key={row.id} className="flex justify-between text-muted-foreground">
              <span>{row.label}</span>
              <span>{row.kg.toFixed(1)} kg</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Weight breakdown appears after items are generated.</p>
      )}
    </div>
  )
}
