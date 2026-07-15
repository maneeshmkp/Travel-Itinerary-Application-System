"use client"

import { Search } from "lucide-react"

export default function BookingSearch({ value, onChange, onSubmit }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.(value)
      }}
      className="relative"
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search reference, provider, traveler…"
        className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2.5 text-sm"
      />
    </form>
  )
}
