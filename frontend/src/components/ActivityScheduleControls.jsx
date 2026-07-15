"use client"

import { Loader2, RotateCcw, SkipForward } from "lucide-react"

export default function ActivityScheduleControls({
  activity,
  canEdit,
  loading,
  onSkip,
  onRestore,
}) {
  if (!canEdit) return null

  if (activity?.skipped) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => onRestore?.(activity)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/60 disabled:opacity-50"
        title="Restore activity and reflow schedule"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : (
          <RotateCcw className="h-3 w-3" aria-hidden />
        )}
        Restore
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => onSkip?.(activity)}
      className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
      title="Skip this activity and move later items earlier"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <SkipForward className="h-3 w-3" aria-hidden />
      )}
      Skip
    </button>
  )
}
