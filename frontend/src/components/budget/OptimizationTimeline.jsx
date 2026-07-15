"use client"

import { formatMoney } from "../../utils/budgetCalculations"
import { CATEGORY_LABELS } from "../../constants/budgetOptimization"

export default function OptimizationTimeline({ categoryBreakdown = [], currency }) {
  if (!categoryBreakdown.length) return null

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Optimization timeline by category</p>
      {categoryBreakdown.map((row) => {
        const pct = row.current > 0 ? Math.min(100, (row.savings / row.current) * 100) : 0
        return (
          <div key={row.category} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{CATEGORY_LABELS[row.category] || row.category}</span>
              <span className="text-emerald-600">-{formatMoney(row.savings, currency)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatMoney(row.current, currency)}</span>
              <span>{formatMoney(row.optimized, currency)} optimized</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
