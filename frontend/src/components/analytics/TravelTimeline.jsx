"use client"

export default function TravelTimeline({ timeline = [] }) {
  if (!timeline.length) return null

  const byYear = timeline.reduce((acc, t) => {
    const y = t.year || new Date(t.date).getFullYear()
    if (!acc[y]) acc[y] = []
    acc[y].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">Travel timeline</p>
      {Object.keys(byYear)
        .sort((a, b) => Number(b) - Number(a))
        .map((year) => (
          <div key={year}>
            <p className="text-xs font-bold text-primary mb-2">{year}</p>
            <div className="border-l-2 border-primary/30 ml-2 pl-4 space-y-3">
              {byYear[year].map((t) => (
                <div key={t.id} className="relative">
                  <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.destination} · {t.totalDays} days · {t.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
