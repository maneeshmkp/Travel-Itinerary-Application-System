"use client"

import { formatMoney, DEFAULT_CURRENCY } from "../../utils/budgetCalculations"

export default function StatisticsCards({ stats, currency = DEFAULT_CURRENCY }) {
  if (!stats) return null

  const cards = [
    { label: "Total trips", value: stats.totalTrips ?? 0 },
    { label: "Completed", value: stats.completedTrips ?? 0 },
    { label: "Countries", value: stats.countriesVisited?.length ?? 0 },
    { label: "Cities", value: stats.citiesVisited?.length ?? 0 },
    { label: "Travel days", value: stats.totalTravelDays ?? 0 },
    { label: "Total spent", value: formatMoney(stats.totalSpent ?? 0, currency) },
    { label: "Avg budget", value: formatMoney(stats.averageBudget ?? 0, currency) },
    { label: "AI savings", value: formatMoney(stats.moneySaved ?? 0, currency) },
    { label: "Distance", value: `${stats.totalDistance ?? 0} km` },
    { label: "Avg rating", value: stats.averageRating ? `${stats.averageRating}/5` : "—" },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
          <p className="text-lg font-bold mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  )
}
