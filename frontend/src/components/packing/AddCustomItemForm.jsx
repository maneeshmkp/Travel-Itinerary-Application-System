"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { PACKING_CATEGORY_IDS, categoryLabel } from "../../constants/packingCategories"

export default function AddCustomItemForm({ onAdd, saving }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("miscellaneous")
  const [weightKg, setWeightKg] = useState("")

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd?.({
      name: name.trim(),
      category,
      weightKg: weightKg ? Number(weightKg) : undefined,
      essential: false,
    })
    setName("")
    setWeightKg("")
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="h-4 w-4" />
        Add custom item
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
      <p className="text-sm font-medium">Add custom item</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Camera, drone, baby food…"
          className="sm:col-span-2 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          {PACKING_CATEGORY_IDS.map((id) => (
            <option key={id} value={id}>
              {categoryLabel(id)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.1"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          placeholder="Weight (kg, optional)"
          className="w-36 px-3 py-2 rounded-lg border border-border bg-background text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        >
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-muted-foreground">
          Cancel
        </button>
      </div>
    </form>
  )
}
