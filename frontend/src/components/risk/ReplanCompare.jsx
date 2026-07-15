"use client"

export default function ReplanCompare({ replanResult, onApply, saving }) {
  if (!replanResult?.updatedSchedule?.length) return null

  const day = replanResult.updatedSchedule[0]

  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
      <h3 className="font-semibold text-sm">Proposed schedule — Day {day.dayNumber}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">After replan</p>
          <ul className="space-y-2">
            {(day.activities || []).map((a, i) => (
              <li key={i} className="rounded border border-border bg-card px-2 py-1.5">
                <p className="font-medium">{a.time} — {a.name}</p>
                <p className="text-xs text-muted-foreground">{a.location}</p>
                {a.reason ? <p className="text-xs text-primary mt-0.5">{a.reason}</p> : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">AI reasoning</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            {(replanResult.reasoning || []).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
      {!replanResult.applied ? (
        <button
          type="button"
          disabled={saving}
          onClick={onApply}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          Apply changes to itinerary
        </button>
      ) : (
        <p className="text-xs text-emerald-600 font-medium">Changes applied to your itinerary.</p>
      )}
    </div>
  )
}
