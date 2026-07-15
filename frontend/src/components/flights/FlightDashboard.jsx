"use client"

import { useState } from "react"
import { History, Loader2, Plane, Sparkles } from "lucide-react"
import { useFlightTracking } from "../../hooks/useFlightTracking"
import FlightCard from "./FlightCard"

function FlightCopilot({ onAsk, disabled }) {
  const [q, setQ] = useState("")
  const [a, setA] = useState("")
  const [loading, setLoading] = useState(false)
  const quick = ["Is my flight on time?", "When should I leave for the airport?", "Has my gate changed?"]

  const submit = async (text) => {
    const question = text || q
    if (!question.trim()) return
    setLoading(true)
    try {
      const res = await onAsk(question)
      setA(res?.answer || "No answer")
    } catch {
      setA("Could not reach flight assistant.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Flight copilot
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {quick.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled || loading}
            onClick={() => submit(item)}
            className="text-xs px-2 py-1 rounded-full border border-border hover:bg-muted disabled:opacity-50"
          >
            {item}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask about delays, gates, hotel check-in…"
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background"
          disabled={disabled || loading}
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={disabled || loading}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
        </button>
      </div>
      {a ? <p className="text-sm text-muted-foreground border-t pt-2">{a}</p> : null}
    </div>
  )
}

export default function FlightDashboard({ tripId, tripTitle }) {
  const { flights, history, loading, error, provider, refresh, stopTracking, askAi } = useFlightTracking({
    tripId,
    enabled: Boolean(tripId),
  })
  const [saving, setSaving] = useState(false)

  const handle = async (fn, id) => {
    setSaving(true)
    try {
      await fn(id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            Live Flight Tracking
          </h2>
          {tripTitle ? <p className="text-sm text-muted-foreground">{tripTitle}</p> : null}
          <p className="text-xs text-muted-foreground mt-0.5">Provider: {provider} · refreshes every 10 min</p>
        </div>
      </div>

      {error ? (
        <div className="text-sm text-destructive border border-destructive/30 rounded-lg px-3 py-2">{error}</div>
      ) : null}

      {loading && !flights.length ? (
        <div className="h-32 rounded-lg bg-muted/50 animate-pulse" />
      ) : null}

      {!loading && !flights.length ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Add a flight booking with a flight number (e.g. AI298) to start automatic tracking.
        </div>
      ) : null}

      <div className="space-y-4">
        {flights.map((f) => (
          <FlightCard
            key={f.id}
            flight={f}
            saving={saving}
            onRefresh={(id) => handle(refresh, id)}
            onStop={(id) => handle(stopTracking, id)}
          />
        ))}
      </div>

      <FlightCopilot onAsk={askAi} disabled={!flights.length} />

      {history.length ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4" />
            Flight history
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            {history.map((h) => (
              <li key={h.id}>
                {h.flightNumber} — {h.status} — {new Date(h.updatedAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
