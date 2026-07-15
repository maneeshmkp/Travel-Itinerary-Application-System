import { CalendarDays } from "lucide-react"
import { formatMoney } from "../../utils/budgetCalculations"
import { expenseCategoryIcon } from "../../constants/expenseCategories"
import { expenseDisplayTitle } from "./expenseUtils"

export default function ExpenseTimeline({ daily, currency }) {
  const timeline = daily?.timeline ?? []
  const averagePerDay = daily?.averagePerDay ?? 0

  if (!timeline.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Expenses will appear here grouped by trip day once you log spending.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {averagePerDay > 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Average spending per day:{" "}
          <span className="font-semibold text-foreground">{formatMoney(averagePerDay, currency)}</span>
        </p>
      ) : null}

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {timeline.map((day) => (
          <div
            key={day.dayNumber}
            className="rounded-xl border border-border bg-muted/10 p-3 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">Day {day.dayNumber}</span>
              <span className="text-sm font-semibold text-primary">{formatMoney(day.total, currency)}</span>
            </div>
            <ul className="space-y-1">
              {day.expenses.map((exp) => (
                <li key={exp.id} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span aria-hidden>{expenseCategoryIcon(exp.category)}</span>
                  <span className="truncate">{expenseDisplayTitle(exp)}</span>
                  <span className="ml-auto shrink-0 font-medium text-foreground">
                    {formatMoney(exp.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
