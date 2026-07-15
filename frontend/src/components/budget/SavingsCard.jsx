"use client"

import { PiggyBank, TrendingDown } from "lucide-react"
import { formatMoney } from "../../utils/budgetCalculations"

export default function SavingsCard({ currentBudget, optimizedBudget, potentialSavings, currency }) {
  if (currentBudget == null) return null

  const pct = currentBudget > 0 ? Math.round((potentialSavings / currentBudget) * 100) : 0

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900 p-4">
      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
        <PiggyBank className="h-5 w-5" />
        <p className="text-sm font-semibold">Potential savings</p>
      </div>
      <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">
        {formatMoney(potentialSavings || 0, currency)}
      </p>
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <TrendingDown className="h-3.5 w-3.5" />
        {pct}% below current plan of {formatMoney(currentBudget, currency)}
      </p>
      {optimizedBudget != null ? (
        <p className="text-sm mt-2">
          Optimized total: <span className="font-semibold">{formatMoney(optimizedBudget, currency)}</span>
        </p>
      ) : null}
    </div>
  )
}
