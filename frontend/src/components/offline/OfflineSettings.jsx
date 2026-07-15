"use client"

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { HardDrive, Trash2 } from "lucide-react"
import {
  getOfflineSettings,
  setOfflineSettings,
  getStorageStats,
  listDownloadedTrips,
} from "../../offline/cacheService"
import { clearAllOfflineData } from "../../offline/db"
import { listAllQueue } from "../../offline/offlineQueue"
import StorageUsageCard from "./StorageUsageCard"
import DownloadedTrips from "./DownloadedTrips"
import OfflineQueueList from "./OfflineQueueList"

export default function OfflineSettings() {
  const [settings, setSettings] = useState(null)
  const [stats, setStats] = useState(null)
  const [trips, setTrips] = useState([])
  const [queue, setQueue] = useState([])

  const reload = async () => {
    setSettings(await getOfflineSettings())
    setStats(await getStorageStats())
    setTrips(await listDownloadedTrips())
    setQueue(await listAllQueue())
  }

  useEffect(() => {
    reload()
  }, [])

  const toggle = async (key) => {
    const next = await setOfflineSettings({ [key]: !settings[key] })
    setSettings(next)
  }

  const clearCache = async () => {
    if (!window.confirm("Clear all offline cache and pending queue?")) return
    await clearAllOfflineData()
    await reload()
  }

  if (!settings) return null

  const toggles = [
    ["autoDownloadTrips", "Auto-download trips"],
    ["autoSync", "Auto sync when online"],
    ["downloadImages", "Download images"],
    ["downloadMaps", "Download maps"],
    ["backgroundSync", "Background sync"],
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <HardDrive className="h-6 w-6 text-primary" />
          Offline settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control downloads, sync, and storage for offline travel.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2 shadow-sm">
        {toggles.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
            <span>{label}</span>
            <input type="checkbox" checked={Boolean(settings[key])} onChange={() => toggle(key)} />
          </label>
        ))}
      </div>

      {stats ? <StorageUsageCard stats={stats} onClear={clearCache} /> : null}
      <DownloadedTrips trips={trips} />
      <OfflineQueueList items={queue.filter((q) => q.status === "pending")} />

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/itineraries" className="text-primary hover:underline">
          Back to trips
        </Link>
      </p>
    </div>
  )
}
