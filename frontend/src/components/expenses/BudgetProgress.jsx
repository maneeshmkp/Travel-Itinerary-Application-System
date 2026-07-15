import { getBudgetBarColor, getBudgetSummaryMessage } from "./expenseUtils"

export default function BudgetProgress({ budget, currency }) {
  if (!budget || budget.planned <= 0) return null

  const { percentUsed } = budget
  const barWidth = percentUsed != null ? Math.min(100, percentUsed) : 0
  const barColor = getBudgetBarColor(percentUsed)
  const message = getBudgetSummaryMessage(budget, currency)

  return (
    <div className="space-y-2">
      {message ? <p className="text-sm text-foreground font-medium">{message}</p> : null}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {percentUsed != null && percentUsed > 100 ? (
        <div className="h-1 rounded-full bg-red-900/30 overflow-hidden">
          <div
            className="h-full bg-red-900 transition-all duration-500"
            style={{ width: `${Math.min(100, percentUsed - 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}
