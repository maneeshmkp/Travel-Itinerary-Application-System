"use client"

import { formatMoney } from "../../utils/budgetCalculations"
import { CATEGORY_LABELS } from "../../constants/budgetOptimization"

export default function ComparisonTable({ comparisons = [], currency }) {
  if (!comparisons.length) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Current</th>
            <th className="px-3 py-2 font-medium">Suggested</th>
            <th className="px-3 py-2 font-medium text-right">Savings</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-3 py-2 capitalize">{CATEGORY_LABELS[row.type] || row.type}</td>
              <td className="px-3 py-2">
                <p className="font-medium">{row.currentName}</p>
                <p className="text-xs text-muted-foreground">{formatMoney(row.currentPrice, currency)}</p>
              </td>
              <td className="px-3 py-2">
                <p className="font-medium">{row.suggestedName}</p>
                <p className="text-xs text-muted-foreground">{formatMoney(row.suggestedPrice, currency)}</p>
                {row.mapsUrl ? (
                  <a href={row.mapsUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    View on map
                  </a>
                ) : null}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                {formatMoney(row.savings, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
