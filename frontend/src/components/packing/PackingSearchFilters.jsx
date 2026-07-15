"use client"

import { Search } from "lucide-react"
import { PACKING_CATEGORY_IDS, categoryLabel } from "../../constants/packingCategories"

export default function PackingSearchFilters({ filters, onChange, onSearch }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={filters.q || ""}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
          placeholder="Search passport, laptop, medicine…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
        />
      </div>
      <select
        value={filters.packed || ""}
        onChange={(e) => onChange({ ...filters, packed: e.target.value })}
        className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
      >
        <option value="">All status</option>
        <option value="true">Packed</option>
        <option value="false">Not packed</option>
      </select>
      <select
        value={filters.missing || ""}
        onChange={(e) => onChange({ ...filters, missing: e.target.value })}
        className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
      >
        <option value="">All items</option>
        <option value="true">Missing docs</option>
      </select>
      <select
        value={filters.category || ""}
        onChange={(e) => onChange({ ...filters, category: e.target.value })}
        className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
      >
        <option value="">All categories</option>
        {PACKING_CATEGORY_IDS.map((id) => (
          <option key={id} value={id}>
            {categoryLabel(id)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onSearch}
        className="px-4 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 shrink-0"
      >
        Apply
      </button>
    </div>
  )
}
