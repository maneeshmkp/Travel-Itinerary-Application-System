export default function ExpenseSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-40 rounded bg-muted" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/60" />
        ))}
      </div>
      <div className="h-3 rounded-full bg-muted" />
      <div className="h-32 rounded-xl bg-muted/50" />
      <div className="h-48 rounded-xl bg-muted/40" />
    </div>
  )
}
