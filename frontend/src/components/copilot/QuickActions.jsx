"use client"

export default function QuickActionsBar({ actions, onAction }) {
  if (!actions?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {actions.map((a) => (
        <button
          key={a.id + a.label}
          type="button"
          onClick={() => onAction?.(a)}
          className="text-[11px] font-medium rounded-full border border-primary/25 bg-primary/5 text-primary px-2.5 py-1 hover:bg-primary/10 transition-colors"
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

export function FollowUpChips({ items, onSelect, disabled }) {
  if (!items?.length) return null
  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-[11px] font-semibold text-muted-foreground mb-2">Suggested follow-ups</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(q)}
            className="text-[11px] rounded-full border border-border bg-background px-2.5 py-1 text-foreground hover:bg-muted/60 disabled:opacity-50 text-left"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
