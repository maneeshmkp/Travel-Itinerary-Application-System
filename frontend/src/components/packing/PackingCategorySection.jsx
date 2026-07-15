"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { categoryLabel } from "../../constants/packingCategories"
import PackingChecklistItem from "./PackingChecklistItem"

export default function PackingCategorySection({ category, items = [], onToggle, onDelete, disabled }) {
  const [open, setOpen] = useState(true)
  const packed = items.filter((i) => i.packed).length

  if (!items.length) return null

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 text-left"
      >
        <span className="font-medium text-sm flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {categoryLabel(category)}
        </span>
        <span className="text-xs text-muted-foreground">
          {packed}/{items.length} packed
        </span>
      </button>
      {open ? (
        <div className="p-3 space-y-2">
          {items.map((item) => (
            <PackingChecklistItem
              key={item.id}
              item={item}
              onToggle={onToggle}
              onDelete={onDelete}
              disabled={disabled}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
