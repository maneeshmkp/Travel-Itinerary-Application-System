"use client"

export default function YearComparisonCard({ comparison = {} }) {
  const { currentYear, previousYear, current = {}, previous = {} } = comparison
  if (!currentYear) return null

  const rows = [
    { label: "Trips", cur: current.trips, prev: previous.trips },
    { label: "Avg budget", cur: current.budget, prev: previous.budget },
    { label: "AI savings", cur: current.savings, prev: previous.savings },
    { label: "Countries", cur: current.countries, prev: previous.countries },
    { label: "Distance (km)", cur: current.distance, prev: previous.distance },
  ]

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm font-semibold mb-3">
        {currentYear} vs {previousYear}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="pb-2">Metric</th>
              <th className="pb-2">{currentYear}</th>
              <th className="pb-2">{previousYear}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border/50 last:border-0">
                <td className="py-2">{r.label}</td>
                <td className="py-2 font-medium">{r.cur ?? "—"}</td>
                <td className="py-2 text-muted-foreground">{r.prev ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
