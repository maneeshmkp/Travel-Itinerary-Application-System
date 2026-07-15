"use client"

import { CheckCircle2, Circle, AlertTriangle } from "lucide-react"

function itemStatus(item) {
  if (item.missing) return "missing"
  if (item.packed) return "packed"
  return "unpacked"
}

export default function PackingChecklistItem({ item, onToggle, onDelete, disabled }) {
  const status = itemStatus(item)

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        status === "packed"
          ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20"
          : status === "missing"
            ? "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20"
            : "border-border bg-card"
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle?.(item)}
        className="mt-0.5 shrink-0 text-primary disabled:opacity-50"
        aria-label={item.packed ? "Mark as not packed" : "Mark as packed"}
      >
        {status === "packed" ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : status === "missing" ? (
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-medium ${status === "packed" ? "line-through text-muted-foreground" : ""}`}>
            {item.name}
            {item.quantity > 1 ? ` ×${item.quantity}` : ""}
          </p>
          {item.essential ? (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
              Essential
            </span>
          ) : null}
          {item.source === "custom" ? (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Custom
            </span>
          ) : null}
        </div>
        {item.notes ? <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p> : null}
        {status === "missing" ? (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Document missing from vault</p>
        ) : null}
      </div>
      {item.source === "custom" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDelete?.(item)}
          className="text-xs text-destructive hover:underline shrink-0 disabled:opacity-50"
        >
          Remove
        </button>
      ) : null}
    </div>
  )
}
