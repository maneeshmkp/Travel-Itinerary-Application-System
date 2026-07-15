"use client"

import { useEffect, useState } from "react"
import { Download, FileText, Wallet } from "lucide-react"
import { DEFAULT_CURRENCY } from "../../constants/currencies"
import { formatMoney } from "../../utils/budgetCalculations"
import { useExpenseReport } from "../../hooks/useExpenseReport"
import ExpenseSkeleton from "./ExpenseSkeleton"
import ExpenseSummary from "./ExpenseSummary"
import BudgetProgress from "./BudgetProgress"
import ExpenseWarnings from "./ExpenseWarnings"
import ExpenseInsights from "./ExpenseInsights"
import CategoryTable from "./CategoryTable"
import ExpenseTimeline from "./ExpenseTimeline"
import ExpenseAnalytics from "./ExpenseAnalytics"
import ExpenseForm from "./ExpenseForm"
import ExpenseList from "./ExpenseList"

export default function ExpenseTracker({
  itineraryId,
  defaultCurrency = DEFAULT_CURRENCY,
  totalDays = 1,
  tripTitle,
}) {
  const {
    report,
    categories,
    paymentMethods,
    currency,
    loading,
    saving,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    duplicateExpense,
    exportCsv,
    exportPdf,
  } = useExpenseReport(itineraryId, defaultCurrency)

  const [editingExpense, setEditingExpense] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [formOpen, setFormOpen] = useState(false)

  const budget = report?.budget
  const totalDaysResolved = report?.trip?.totalDays || totalDays

  useEffect(() => {
    if (activeTab === "history" || editingExpense) setFormOpen(true)
  }, [activeTab, editingExpense])

  const handleSubmit = async (payload) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, payload)
      setEditingExpense(null)
    } else {
      await addExpense(payload)
    }
  }

  const handleDelete = async (expenseId) => {
    if (!window.confirm("Delete this expense?")) return
    if (editingExpense?.id === expenseId) setEditingExpense(null)
    await deleteExpense(expenseId)
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setActiveTab("history")
    setFormOpen(true)
  }

  if (loading) return <ExpenseSkeleton />

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics" },
    { id: "history", label: "History" },
  ]

  const listProps = {
    categories,
    currency,
    totalDays: totalDaysResolved,
    saving,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDuplicate: duplicateExpense,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </span>
            Trip budget
          </h3>
          {tripTitle ? (
            <p className="text-xs text-muted-foreground mt-1.5 pl-10">{tripTitle}</p>
          ) : null}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={exportCsv}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>

      <ExpenseSummary budget={budget} currency={currency} />
      <BudgetProgress budget={budget} currency={currency} />
      <ExpenseWarnings budget={budget} currency={currency} />

      {report?.otherCurrencyTotals?.length > 0 ? (
        <p className="text-xs text-muted-foreground rounded-lg bg-muted/30 border border-border/40 px-3 py-2">
          Also logged:{" "}
          {report.otherCurrencyTotals.map((row) => formatMoney(row.total, row.currency)).join(" · ")}
          {" "}(excluded from {currency} totals)
        </p>
      ) : null}

      <ExpenseInsights insights={report?.insights} />

      <div className="flex gap-1 rounded-xl bg-muted/40 p-1 border border-border/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground mb-2.5">Category breakdown</p>
            <CategoryTable rows={report?.byCategory} currency={currency} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-2.5">Daily timeline</p>
            <ExpenseTimeline daily={report?.daily} currency={currency} />
          </div>
          {(report?.expenses?.length ?? 0) > 0 ? (
            <ExpenseList
              expenses={report.expenses.slice(0, 5)}
              variant="compact"
              onViewAll={() => setActiveTab("history")}
              {...listProps}
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
          <ExpenseAnalytics charts={report?.charts} currency={currency} />
        </div>
      ) : null}

      {activeTab === "history" ? (
        <div className="space-y-4">
          <ExpenseForm
            categories={categories}
            paymentMethods={paymentMethods}
            currency={currency}
            totalDays={totalDaysResolved}
            saving={saving}
            editingExpense={editingExpense}
            onSubmit={handleSubmit}
            onCancelEdit={() => setEditingExpense(null)}
            open={formOpen}
            onToggle={() => setFormOpen((v) => !v)}
          />
          <ExpenseList expenses={report?.expenses} variant="full" {...listProps} />
        </div>
      ) : null}

      {activeTab !== "history" ? (
        <ExpenseForm
          categories={categories}
          paymentMethods={paymentMethods}
          currency={currency}
          totalDays={totalDaysResolved}
          saving={saving}
          editingExpense={null}
          onSubmit={handleSubmit}
          onCancelEdit={() => {}}
          open={formOpen}
          onToggle={() => setFormOpen((v) => !v)}
        />
      ) : null}

      {error ? (
        <p
          className="text-sm text-red-600 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
