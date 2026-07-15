"use client"

import { useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, Calendar, Loader2, Unplug } from "lucide-react"
import { useCalendarIntegrations } from "../../hooks/useCalendar"
import { useToast } from "../../hooks/useToast"
import Toast from "../Toast"

function ProviderCard({ provider, label, icon, data, onConnect, onDisconnect, connecting }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-2xl" aria-hidden>{icon}</span>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{label}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {data?.connected ? data.accountEmail || "Connected" : "Not connected"}
          </p>
          {data?.lastSync ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last sync: {new Date(data.lastSync).toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">
        {data?.connected ? (
          <button
            type="button"
            onClick={() => onDisconnect(provider)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50"
          >
            <Unplug className="h-4 w-4" />
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            disabled={connecting}
            onClick={() => onConnect(provider)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  )
}

export default function CalendarSettings() {
  const { integrations, loading, connect, disconnect, refresh } = useCalendarIntegrations()
  const [params] = useSearchParams()
  const { toasts, showSuccess, showError, removeToast } = useToast()

  useEffect(() => {
    const connected = params.get("connected")
    const error = params.get("error")
    if (connected) {
      showSuccess(`${connected === "google" ? "Google" : "Outlook"} Calendar connected`)
      refresh()
    }
    if (error) showError(decodeURIComponent(error))
  }, [params, refresh, showSuccess, showError])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {toasts.map((t) => (
        <Toast key={t.id} type={t.type} message={t.message} onClose={() => removeToast(t.id)} />
      ))}

      <Link to="/itineraries" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to trips
      </Link>

      <header className="mb-8">
        <h1 className="font-heading font-bold text-3xl flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          Calendar Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Connect Google or Outlook to sync trip activities and bookings automatically. Export .ics for Apple Calendar.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          <ProviderCard
            provider="google"
            label="Google Calendar"
            icon="📅"
            data={integrations.google}
            onConnect={connect}
            onDisconnect={disconnect}
          />
          <ProviderCard
            provider="outlook"
            label="Microsoft Outlook"
            icon="📆"
            data={integrations.outlook}
            onConnect={connect}
            onDisconnect={disconnect}
          />

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">How sync works</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Itinerary activities and saved bookings become calendar events.</li>
              <li>Updates on the trip page trigger automatic sync when connected.</li>
              <li>Export .ics works without OAuth — open in Apple Calendar or any app.</li>
              <li>OAuth tokens are encrypted at rest on the server.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
