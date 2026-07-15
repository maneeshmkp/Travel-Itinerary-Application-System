"use client"

import { Link } from "react-router-dom"
import { Download } from "lucide-react"

export default function DownloadedTrips({ trips = [] }) {
  if (!trips.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No trips downloaded for offline use yet. Open a trip and tap &quot;Download for offline&quot;.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm space-y-2">
      <p className="text-sm font-semibold">Downloaded trips</p>
      <ul className="space-y-2">
        {trips.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium truncate">{t.data?.title || t.id}</p>
              <p className="text-xs text-muted-foreground">
                {t.data?.destination || "Trip"} · {new Date(t.downloadedAt).toLocaleDateString()}
              </p>
            </div>
            <Link to={`/itineraries/${t.id}`} className="text-xs font-medium text-primary hover:underline shrink-0">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
