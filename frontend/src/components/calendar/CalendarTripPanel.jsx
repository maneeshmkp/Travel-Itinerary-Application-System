"use client"

import { Link } from "react-router-dom"
import { Calendar, Download, RefreshCw, Upload, AlertTriangle, Loader2 } from "lucide-react"
import { useTripCalendar } from "../../hooks/useCalendar"
import { formatBookingDate } from "../../constants/bookingTypes"

function CalendarTimeline({ events }) {
  if (!events.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
        No calendar events yet. Sync or export after adding activities and bookings.
      </p>
    )
  }

  return (
    <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {events.slice(0, 12).map((ev) => (
        <li key={ev.uid} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm min-w-0">
          <p className="font-medium text-foreground break-words">{ev.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{formatBookingDate(ev.start)}</p>
          {ev.location ? <p className="text-xs text-muted-foreground truncate">{ev.location}</p> : null}
        </li>
      ))}
    </ul>
  )
}

export default function CalendarTripPanel({ tripId, tripTitle }) {
  const { status, events, conflicts, loading, syncing, error, sync, exportIcs, importIcs } = useTripCalendar(tripId)

  const googleOn = status?.integrations?.google?.connected
  const outlookOn = status?.integrations?.outlook?.connected
  const lastSync = [status?.lastSync?.google, status?.lastSync?.outlook].filter(Boolean).sort().pop()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Calendar Sync
          </h2>
          {tripTitle ? <p className="text-sm text-muted-foreground mt-0.5">{tripTitle}</p> : null}
        </div>
        <Link to="/calendar-settings" className="text-xs font-medium text-primary hover:underline shrink-0">
          Calendar settings →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full border px-2.5 py-1 ${googleOn ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-muted text-muted-foreground border-border"}`}>
          Google {googleOn ? "connected" : "off"}
        </span>
        <span className={`rounded-full border px-2.5 py-1 ${outlookOn ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-muted text-muted-foreground border-border"}`}>
          Outlook {outlookOn ? "connected" : "off"}
        </span>
        {lastSync ? (
          <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
            Last sync: {new Date(lastSync).toLocaleString()}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={syncing || !googleOn}
          onClick={() => sync("google")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
        >
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sync Google
        </button>
        <button
          type="button"
          disabled={syncing || !outlookOn}
          onClick={() => sync("outlook")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium disabled:opacity-50"
        >
          Sync Outlook
        </button>
        <button
          type="button"
          onClick={exportIcs}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium"
        >
          <Download className="h-3.5 w-3.5" />
          Export .ics
        </button>
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          Import .ics
          <input
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) await importIcs(f)
              e.target.value = ""
            }}
          />
        </label>
      </div>

      {conflicts.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-100">
          <p className="font-semibold flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4" />
            {conflicts.length} schedule conflict{conflicts.length > 1 ? "s" : ""}
          </p>
          <ul className="text-xs space-y-1 list-disc pl-4">
            {conflicts.slice(0, 3).map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <CalendarTimeline events={events} />
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
