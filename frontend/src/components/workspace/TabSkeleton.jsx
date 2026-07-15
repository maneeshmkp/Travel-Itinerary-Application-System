"use client"

import { Loader2 } from "lucide-react"

/** Suspense fallback while a lazily-loaded tab chunk downloads. */
export default function TabSkeleton({ label = "Loading" }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}…
      </div>
      <div className="h-32 rounded-xl bg-muted/50 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    </div>
  )
}
