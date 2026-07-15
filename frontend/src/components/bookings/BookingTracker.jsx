"use client"

import { useState } from "react"
import { Plus, Ticket, Sparkles, Loader2 } from "lucide-react"
import { useBookings } from "../../hooks/useBookings"
import { bookingAPI } from "../../services/api"
import { DEFAULT_CURRENCY } from "../../utils/budgetCalculations"
import BookingDashboard from "./BookingDashboard"
import BookingTimeline from "./BookingTimeline"
import BookingCard from "./BookingCard"
import BookingForm from "./BookingForm"
import { BookingCalendar } from "./UpcomingBookings"

export default function BookingTracker({ tripId, tripTitle, defaultCurrency = DEFAULT_CURRENCY }) {
  const {
    items,
    timeline,
    dashboard,
    loading,
    saving,
    error,
    filters,
    load,
    createBooking,
    updateBooking,
    deleteBooking,
    setFilters,
  } = useBookings({ tripId, enabled: Boolean(tripId) })

  const [tab, setTab] = useState("timeline")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [aiQ, setAiQ] = useState("")
  const [aiA, setAiA] = useState("")
  const [aiLoading, setAiLoading] = useState(false)

  const handleSave = async (payload) => {
    if (editing) {
      await updateBooking(editing.id, payload)
      setEditing(null)
    } else {
      await createBooking(payload)
    }
    setFormOpen(false)
  }

  const askAi = async () => {
    if (!aiQ.trim()) return
    setAiLoading(true)
    try {
      const res = await bookingAPI.aiQuery({ question: aiQ, tripId })
      setAiA(res.data?.data?.answer || "No answer")
    } catch {
      setAiA("Could not reach AI. Try again.")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            My Bookings
          </h2>
          {tripTitle ? <p className="text-sm text-muted-foreground mt-0.5">{tripTitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium shrink-0 w-full sm:w-auto justify-center sm:justify-start"
        >
          <Plus className="h-4 w-4" />
          Add booking
        </button>
      </div>

      <BookingDashboard stats={dashboard} currency={defaultCurrency} />

      <div className="flex flex-wrap gap-1 border-b border-border overflow-x-auto">
        {["timeline", "list", "calendar", "ai"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "ai" ? "Ask AI" : t}
          </button>
        ))}
      </div>

      {formOpen ? (
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <BookingForm
            tripId={tripId}
            initial={editing}
            defaultCurrency={defaultCurrency}
            saving={saving}
            onSubmit={handleSave}
            onCancel={() => {
              setFormOpen(false)
              setEditing(null)
            }}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : null}

      {!loading && tab === "timeline" ? <BookingTimeline timeline={timeline} /> : null}
      {!loading && tab === "calendar" ? <BookingCalendar timeline={timeline} /> : null}
      {!loading && tab === "list" ? (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {items.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onEdit={(x) => {
                setEditing(x)
                setFormOpen(true)
              }}
              onDelete={(x) => {
                if (window.confirm("Delete this booking?")) deleteBooking(x.id)
              }}
            />
          ))}
        </div>
      ) : null}

      {tab === "ai" ? (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-primary" />
            Ask about your saved bookings for this trip
          </p>
          <div className="flex gap-2">
            <input
              value={aiQ}
              onChange={(e) => setAiQ(e.target.value)}
              placeholder="When is my flight? What hotel did I book?"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button type="button" onClick={askAi} disabled={aiLoading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              Ask
            </button>
          </div>
          {aiA ? <p className="text-sm text-foreground bg-card rounded-lg border border-border p-3">{aiA}</p> : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
    </div>
  )
}
