/** Availability status badge for mock inventory. */
export default function AvailabilityBadge({ status, label, className = "" }) {
  const text = label || status
  if (!text) return null

  const styles = {
    available: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    limited: "bg-amber-500/10 text-amber-800 border-amber-500/30",
    unavailable: "bg-red-500/10 text-red-700 border-red-500/30",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-muted text-muted-foreground border-border"} ${className}`}
    >
      {text}
    </span>
  )
}
