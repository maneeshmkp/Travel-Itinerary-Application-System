import { useEffect, useState } from "react"
import { Pencil, Loader2, Save } from "lucide-react"
import { itineraryAPI } from "../services/api"
import { maybeAutoDownloadTrip } from "../offline/tripDownload"

export default function ItineraryQuickEdit({ itinerary, canEdit, onSaved, showSuccess, showError }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [bestTimeToVisit, setBestTimeToVisit] = useState("")

  useEffect(() => {
    if (!itinerary) return
    setTitle(itinerary.title || "")
    setDescription(itinerary.description || "")
    setBestTimeToVisit(itinerary.bestTimeToVisit || "")
  }, [itinerary])

  if (!canEdit || !itinerary?._id) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await itineraryAPI.update(itinerary._id, {
        title: title.trim(),
        description: description.trim(),
        bestTimeToVisit: bestTimeToVisit.trim(),
      })
      showSuccess?.("Itinerary updated")
      onSaved?.(res.data?.data)
      maybeAutoDownloadTrip(itinerary._id)
      setEditing(false)
    } catch (err) {
      showError?.(err.message || "Could not save changes")
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-card-foreground hover:bg-muted/50 transition-colors"
      >
        <Pencil className="h-4 w-4 shrink-0" />
        Edit trip details
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Pencil className="h-4 w-4 text-primary" />
        Quick edit
      </p>
      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-y"
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Best time to visit
          <input
            type="text"
            value={bestTimeToVisit}
            onChange={(e) => setBestTimeToVisit(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
