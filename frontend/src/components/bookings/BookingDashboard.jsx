"use client"

import { formatMoney, DEFAULT_CURRENCY } from "../../utils/budgetCalculations"

function StatCard({ label, value, hint, emphasize = false }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
      <p className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight">{label}</p>
      <p
        className={`mt-1 font-bold text-foreground tabular-nums break-words ${
          emphasize ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{hint}</p> : null}
    </div>
  )
}

export default function BookingDashboard({ stats, currency = DEFAULT_CURRENCY, compact = false }) {
  if (!stats) return null

  return (
    <div
      className={
        compact
          ? "grid grid-cols-2 gap-2 sm:gap-3"
          : "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3"
      }
    >
      <StatCard label="Upcoming" value={stats.upcoming} />
      <StatCard label="Completed" value={stats.completed} />
      <StatCard label="Cancelled" value={stats.cancelled} />
      <StatCard label="Pending" value={stats.pending} />
      <StatCard label="Total cost" value={formatMoney(stats.totalCost, currency)} emphasize />
      <StatCard label="This week" value={stats.upcomingThisWeek} hint="Upcoming in 7 days" />
    </div>
  )
}
