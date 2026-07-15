"use client"

import { Search } from "lucide-react"

export default function DocumentSearch({ value, onChange, onSubmit, placeholder = "Search documents, OCR text, tags…" }) {
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
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm"
      />
    </form>
  )
}
