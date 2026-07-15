export default function NotificationSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-2 animate-pulse p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 p-3 space-y-2">
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-muted" />
              <div className="h-2 w-full rounded bg-muted/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
