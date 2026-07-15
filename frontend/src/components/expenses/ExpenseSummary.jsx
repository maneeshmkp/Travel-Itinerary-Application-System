import { formatMoney } from "../../utils/budgetCalculations"
import { getBudgetTextColor } from "./expenseUtils"

export default function ExpenseSummary({ budget, currency }) {
  if (!budget) return null

  const { planned, actual, remaining, percentUsed } = budget
  const percentClass = getBudgetTextColor(percentUsed)

  const cards = [
    { label: "Planned", value: formatMoney(planned, currency), tone: "default" },
    { label: "Spent", value: formatMoney(actual, currency), tone: "default" },
    {
      label: "Remaining",
      value: formatMoney(remaining, currency),
      tone: remaining < 0 ? "danger" : "success",
    },
    {
      label: "Used",
      value: percentUsed != null ? `${Math.round(percentUsed)}%` : "—",
      tone: "percent",
      percentClass,
    },
  ]

  const toneStyles = {
    default: "border-border/50 bg-card",
    success: "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
    danger: "border-red-200/80 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20",
    percent: "border-border/50 bg-card",
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-3 shadow-sm ${toneStyles[card.tone]}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {card.label}
          </p>
          <p
            className={`mt-1 text-lg font-semibold tabular-nums leading-tight ${
              card.percentClass || (card.tone === "danger" ? "text-red-700 dark:text-red-300" : card.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-foreground")
            }`}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  )
}
