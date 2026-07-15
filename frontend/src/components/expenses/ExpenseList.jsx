"use client"

import { useMemo, useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { expenseCategoryLabel } from "../../constants/expenseCategories"
import ExpenseEmptyState from "./ExpenseEmptyState"
import ExpenseCard from "./ExpenseCard"

const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "highest", label: "Highest" },
  { id: "lowest", label: "Lowest" },
]

function sortExpenses(list, sortBy) {
  const copy = [...list]
  switch (sortBy) {
    case "oldest":
      return copy.sort((a, b) => new Date(a.spentAt) - new Date(b.spentAt))
    case "highest":
      return copy.sort((a, b) => b.amount - a.amount)
    case "lowest":
      return copy.sort((a, b) => a.amount - b.amount)
    default:
      return copy.sort((a, b) => new Date(b.spentAt) - new Date(a.spentAt))
  }
}

const selectClass =
  "h-9 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"

export default function ExpenseList({
  expenses = [],
  categories,
  currency,
  totalDays = 1,
  saving,
  variant = "full",
  onEdit,
  onDelete,
  onDuplicate,
  onViewAll,
}) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [dayFilter, setDayFilter] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const compact = variant === "compact"

  const filtered = useMemo(() => {
    let list = expenses
    if (!compact) {
      const q = search.trim().toLowerCase()
      if (q) {
        list = list.filter(
          (e) =>
            e.description?.toLowerCase().includes(q) ||
            e.notes?.toLowerCase().includes(q) ||
            expenseCategoryLabel(e.category).toLowerCase().includes(q),
        )
      }
      if (categoryFilter) list = list.filter((e) => e.category === categoryFilter)
      if (dayFilter) list = list.filter((e) => String(e.dayNumber) === dayFilter)
    }
    return sortExpenses(list, compact ? "newest" : sortBy)
  }, [expenses, search, categoryFilter, dayFilter, sortBy, compact])

  if (!expenses.length) return compact ? null : <ExpenseEmptyState />

  const dayOptions = Array.from({ length: Math.max(1, totalDays) }, (_, i) => i + 1)

  return (
    <div className="space-y-3">
      {!compact ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Expense history</p>
            <span className="text-xs text-muted-foreground tabular-nums">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, category, or notes…"
                className="w-full h-9 rounded-lg border border-border/60 bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectClass}
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className={selectClass}
                aria-label="Filter by day"
              >
                <option value="">All days</option>
                {dayOptions.map((d) => (
                  <option key={d} value={String(d)}>
                    Day {d}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={selectClass}
                aria-label="Sort expenses"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Recent expenses</p>
          {onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all →
            </button>
          ) : null}
        </div>
      )}

      <ul className={`space-y-2 ${compact ? "" : "max-h-[28rem] overflow-y-auto pr-0.5 scrollbar-thin"}`}>
        {filtered.map((exp) => (
          <ExpenseCard
            key={exp.id}
            expense={exp}
            currency={currency}
            saving={saving}
            compact={compact}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ))}
      </ul>

      {!compact && filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <SlidersHorizontal className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No expenses match your filters.</p>
        </div>
      ) : null}
    </div>
  )
}
