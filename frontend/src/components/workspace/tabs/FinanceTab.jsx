"use client"

import { Sparkles } from "lucide-react"
import ExpenseTracker from "../../expenses/ExpenseTracker"
import BudgetTripPanel from "../../budget/BudgetTripPanel"
import CollapsibleSection from "../CollapsibleSection"
import { formatMoney, DEFAULT_CURRENCY } from "../../../utils/budgetCalculations"

export default function FinanceTab({ ctx }) {
  const { itinerary, refreshItinerary } = ctx
  const currency = itinerary.budget?.currency || itinerary.budgetInsight?.currency || DEFAULT_CURRENCY
  const budget = itinerary.budget || {}

  return (
    <div className="space-y-6" id="finance">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading font-semibold text-xl">Finance</h2>
          <p className="text-sm text-muted-foreground">Track expenses, optimize the budget and export reports.</p>
        </div>
        {budget.max != null && budget.max !== "" ? (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Planned budget</p>
            <p className="text-lg font-bold">{formatMoney(budget.max, budget.currency || currency)}</p>
          </div>
        ) : null}
      </div>

      <div id="expenses" className="bg-card border border-border/60 rounded-xl p-4 sm:p-5 shadow-sm">
        <ExpenseTracker
          itineraryId={itinerary._id}
          defaultCurrency={currency}
          totalDays={itinerary.totalDays || itinerary.days?.length || 1}
          tripTitle={itinerary.title}
        />
      </div>

      <CollapsibleSection
        title="AI Budget Optimizer"
        description="Charts, category breakdown, savings and AI recommendations."
        icon={Sparkles}
        defaultOpen={false}
      >
        <div id="budget">
          <BudgetTripPanel tripId={itinerary._id} tripTitle={itinerary.title} onItineraryRefresh={refreshItinerary} />
        </div>
      </CollapsibleSection>
    </div>
  )
}
