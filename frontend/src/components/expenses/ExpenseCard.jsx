"use client"

import { Calendar, Copy, CreditCard, Pencil, Trash2 } from "lucide-react"
import { formatMoney } from "../../utils/budgetCalculations"
import { expenseCategoryIcon, expenseCategoryLabel } from "../../constants/expenseCategories"
import { paymentMethodLabel } from "../../constants/paymentMethods"
import { normalizeCurrency } from "../../constants/currencies"
import { expenseDisplayTitle, getCategoryAccent } from "./expenseUtils"

function PaymentIcon({ method }) {
  if (method === "cash") {
    return <span className="text-[10px] font-semibold">$</span>
  }
  return <CreditCard className="h-3 w-3" />
}

export default function ExpenseCard({
  expense,
  currency,
  saving,
  compact = false,
  onEdit,
  onDelete,
  onDuplicate,
}) {
  const accent = getCategoryAccent(expense.category)
  const title = expenseDisplayTitle(expense)
  const catLabel = expenseCategoryLabel(expense.category)
  const amount = formatMoney(expense.amount, normalizeCurrency(expense.currency, currency))
  const dateStr = expense.spentAt
    ? new Date(expense.spentAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null

  return (
    <li
      className={`group relative overflow-hidden rounded-xl bg-card shadow-sm transition-all hover:shadow-md ${
        compact ? "border border-border/40" : "border border-border/50"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent.bar}`} aria-hidden />

      <div className="flex items-start gap-3 px-3.5 py-3 pl-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${accent.badge}`}
          aria-hidden
        >
          {expenseCategoryIcon(expense.category)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate leading-snug">{title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${accent.badge}`}>
                  {catLabel}
                </span>
                {expense.dayNumber ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Day {expense.dayNumber}
                  </span>
                ) : null}
                {dateStr ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    <Calendar className="h-2.5 w-2.5" />
                    {dateStr}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  <PaymentIcon method={expense.paymentMethod} />
                  {paymentMethodLabel(expense.paymentMethod)}
                </span>
              </div>
              {expense.notes && !compact ? (
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{expense.notes}</p>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="text-sm font-semibold text-foreground tabular-nums">{amount}</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onEdit(expense)}
                  disabled={saving}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                  aria-label="Edit expense"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(expense.id)}
                  disabled={saving}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                  aria-label="Duplicate expense"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(expense.id)}
                  disabled={saving}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 transition-colors"
                  aria-label="Delete expense"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
