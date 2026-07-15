"use client"

import { useState } from "react"
import { Download, Check } from "lucide-react"
import { downloadTripForOffline } from "../../offline/tripDownload"

export default function DownloadOfflineButton({ tripId, className = "" }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      await downloadTripForOffline(tripId)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (err) {
      alert(err.message || "Download failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors ${className}`}
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Download className="h-3.5 w-3.5" />}
      {loading ? "Downloading…" : done ? "Downloaded" : "Download for offline"}
    </button>
  )
}
