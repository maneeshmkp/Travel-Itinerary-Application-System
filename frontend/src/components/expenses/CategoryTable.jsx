import { formatMoney } from "../../utils/budgetCalculations"
import { expenseCategoryIcon } from "../../constants/expenseCategories"
import { categoryStatusLabel, getCategoryAccent } from "./expenseUtils"

function CategoryBar({ planned, actual, percentOfCategory, accentBar }) {
  const width = planned > 0 ? Math.min(100, percentOfCategory) : actual > 0 ? 100 : 0
  const over = actual > planned && planned > 0
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${over ? "bg-red-500" : accentBar}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export default function CategoryTable({ rows = [], currency }) {
  const visible = rows.filter((r) => r.planned > 0 || r.actual > 0)
  if (!visible.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No category breakdown yet. Add activity costs to your itinerary or log expenses.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {visible.map((row) => {
        const accent = getCategoryAccent(row.id)
        const status = categoryStatusLabel(row, currency)
        const isOver = row.status === "over"

        return (
          <div
            key={row.id}
            className="rounded-xl border border-border/50 bg-card p-3 shadow-sm hover:bg-muted/10 transition-colors"
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${accent.badge}`}
                aria-hidden
              >
                {row.icon || expenseCategoryIcon(row.id)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground leading-snug">{row.label}</p>

                <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                  <div className="rounded-lg bg-muted/40 px-1.5 py-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Planned
                    </p>
                    <p className="text-xs font-medium text-foreground tabular-nums mt-0.5">
                      {formatMoney(row.planned, currency)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-1.5 py-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Actual
                    </p>
                    <p className="text-xs font-semibold text-foreground tabular-nums mt-0.5">
                      {formatMoney(row.actual, currency)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-1.5 py-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <p
                      className={`text-[10px] font-medium leading-tight mt-0.5 ${
                        isOver ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      {status}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5">
                  <CategoryBar
                    planned={row.planned}
                    actual={row.actual}
                    percentOfCategory={row.percentOfCategory}
                    accentBar={accent.bar}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
