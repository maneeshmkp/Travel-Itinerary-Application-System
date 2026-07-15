"use client"

export default function PackingProgressCard({ progress }) {
  const percent = progress?.percent ?? 0
  const total = progress?.total ?? 0
  const packed = progress?.packed ?? 0

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-end justify-between gap-2 mb-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Packing progress</p>
          <p className="text-3xl font-bold text-foreground">{percent}%</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {packed} of {total} packed
        </p>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  )
}
