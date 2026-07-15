"use client"

import { useState } from "react"
import { ChevronDown, Maximize2, X } from "lucide-react"

/**
 * Progressive-disclosure wrapper for heavy modules.
 * - Collapsed by default (optional) to avoid rendering everything at once.
 * - Supports an optional fullscreen overlay for focused work.
 *
 * When `defaultOpen` is false the children are not mounted until the user
 * expands the section — a lightweight lazy-mount that keeps tabs fast.
 */
export default function CollapsibleSection({
  title,
  description,
  icon: Icon,
  defaultOpen = true,
  allowFullscreen = true,
  badge = null,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [fullscreen, setFullscreen] = useState(false)

  const Header = (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-left group min-w-0"
        aria-expanded={open}
      >
        {Icon ? <Icon className="h-4 w-4 text-primary shrink-0" /> : null}
        <span className="font-heading font-semibold text-sm sm:text-base truncate">{title}</span>
        {badge}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {allowFullscreen && open ? (
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Open fullscreen"
          aria-label="Open fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )

  return (
    <>
      <section className="bg-card border border-border/60 rounded-xl p-4 sm:p-5 shadow-sm">
        {Header}
        {description && open ? (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        ) : null}
        <div
          className={`grid transition-all duration-300 ease-out ${
            open ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden min-h-0">{open ? children : null}</div>
        </div>
      </section>

      {fullscreen ? (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2 min-w-0">
              {Icon ? <Icon className="h-5 w-5 text-primary shrink-0" /> : null}
              <span className="font-heading font-semibold truncate">{title}</span>
            </div>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
          <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
        </div>
      ) : null}
    </>
  )
}
