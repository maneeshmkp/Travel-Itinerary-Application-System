import { Receipt, Wallet } from "lucide-react"

export default function ExpenseEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Wallet className="h-7 w-7 text-primary" />
      </div>
      <h4 className="font-medium text-foreground">No expenses yet</h4>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
        Log your first meal, ride, or ticket to start tracking real spending against your trip budget.
      </p>
      <Receipt className="mx-auto mt-4 h-8 w-8 text-muted-foreground/40" aria-hidden />
    </div>
  )
}
