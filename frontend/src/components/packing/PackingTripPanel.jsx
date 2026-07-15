"use client"

import { useMemo, useState } from "react"
import {
  Backpack,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { usePacking } from "../../hooks/usePacking"
import { PACKING_CATEGORY_IDS } from "../../constants/packingCategories"
import PackingProgressCard from "./PackingProgressCard"
import PackingWeightCard from "./PackingWeightCard"
import PackingInsights from "./PackingInsights"
import PackingTimeline from "./PackingTimeline"
import PackingCategorySection from "./PackingCategorySection"
import PackingSearchFilters from "./PackingSearchFilters"
import AddCustomItemForm from "./AddCustomItemForm"
import PackingChecklistItem from "./PackingChecklistItem"

function filterLocalItems(categories, customItems, filters) {
  let items = []
  for (const cat of PACKING_CATEGORY_IDS) {
    items = items.concat((categories?.[cat] || []).map((i) => ({ ...i, category: i.category || cat })))
  }
  items = items.concat(customItems || [])

  if (filters.q) {
    const q = filters.q.toLowerCase()
    items = items.filter((i) => i.name.toLowerCase().includes(q))
  }
  if (filters.packed === "true") items = items.filter((i) => i.packed)
  if (filters.packed === "false") items = items.filter((i) => !i.packed)
  if (filters.missing === "true") items = items.filter((i) => i.missing)
  if (filters.category) items = items.filter((i) => i.category === filters.category)
  return items
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
      <div className="h-40 rounded-lg bg-muted/50 animate-pulse" />
    </div>
  )
}

export default function PackingTripPanel({ tripId, tripTitle, startDate }) {
  const {
    list,
    exists,
    loading,
    generating,
    saving,
    error,
    filters,
    generate,
    regenerate,
    togglePacked,
    addCustomItem,
    deleteItem,
    search,
    setFilters,
    exportPdf,
    exportCsv,
  } = usePacking({ tripId, enabled: Boolean(tripId) })

  const [exporting, setExporting] = useState(false)
  const [searchMode, setSearchMode] = useState(false)

  const displayList = list?.exists === false ? null : list
  const categories = displayList?.categories || {}
  const customItems = displayList?.customItems || []
  const progress = displayList?.progress || { total: 0, packed: 0, percent: 0 }

  const filteredItems = useMemo(
    () => filterLocalItems(categories, customItems, filters),
    [categories, customItems, filters],
  )

  const hasActiveFilters = Boolean(filters.q || filters.packed || filters.category || filters.missing)

  const handleSearch = async () => {
    setSearchMode(hasActiveFilters)
    if (hasActiveFilters) await search(filters)
  }

  const handleExport = async (type) => {
    setExporting(true)
    try {
      if (type === "pdf") await exportPdf()
      else await exportCsv()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <Backpack className="h-5 w-5 text-primary" />
            AI Packing Assistant
          </h2>
          {tripTitle ? <p className="text-sm text-muted-foreground mt-0.5">{tripTitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {!exists ? (
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 flex-1 sm:flex-none"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate list
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={regenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-60"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-60"
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? <Skeleton /> : null}

      {!loading && !exists ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <Sparkles className="h-10 w-10 text-primary mx-auto opacity-80" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Get a personalized packing checklist based on your destination, weather forecast, activities, travel style,
            and document vault.
          </p>
        </div>
      ) : null}

      {!loading && exists ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PackingProgressCard progress={progress} />
            <PackingWeightCard list={displayList} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PackingTimeline startDate={startDate} progress={progress} />
            <PackingInsights insights={displayList?.insights} notes={displayList?.notes} />
          </div>

          <PackingSearchFilters
            filters={filters}
            onChange={(f) => {
              setFilters(f)
              if (!f.q && !f.packed && !f.category && !f.missing) setSearchMode(false)
            }}
            onSearch={handleSearch}
          />

          <AddCustomItemForm onAdd={addCustomItem} saving={saving} />

          {searchMode && hasActiveFilters ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{filteredItems.length} matching items</p>
              {filteredItems.map((item) => (
                <PackingChecklistItem
                  key={item.id}
                  item={item}
                  onToggle={togglePacked}
                  onDelete={deleteItem}
                  disabled={saving}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {PACKING_CATEGORY_IDS.map((cat) => (
                <PackingCategorySection
                  key={cat}
                  category={cat}
                  items={categories[cat] || []}
                  onToggle={togglePacked}
                  onDelete={deleteItem}
                  disabled={saving}
                />
              ))}
            </div>
          )}

          {displayList?.generatedByAI === false ? (
            <p className="text-xs text-muted-foreground">Using demo AI — add API keys for fully personalized lists.</p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
