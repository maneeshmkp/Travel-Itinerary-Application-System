"use client"

import { useOffline } from "../../context/OfflineContext"
import { SYNC_STATUS } from "../../offline/constants"

const TONES = {
  online: "bg-emerald-500",
  offline: "bg-amber-500",
  syncing: "bg-blue-500 animate-pulse",
  queued: "bg-orange-500",
  error: "bg-red-500",
}

/**
 * Small presence dot rendered on the avatar — replaces the bulky Online badge.
 * Color reflects sync / connectivity state; full details live in Settings.
 */
export default function PresenceIndicator({ className = "" }) {
  const { syncStatus, queuedCount, online } = useOffline()

  let tone = TONES.online
  let label = "Online"

  if (!online || syncStatus === SYNC_STATUS.OFFLINE) {
    tone = TONES.offline
    label = "Offline"
  } else if (syncStatus === SYNC_STATUS.SYNCING) {
    tone = TONES.syncing
    label = "Syncing"
  } else if (syncStatus === SYNC_STATUS.QUEUED || queuedCount > 0) {
    tone = TONES.queued
    label = queuedCount > 0 ? `${queuedCount} changes queued` : "Queued"
  } else if (syncStatus === SYNC_STATUS.ERROR) {
    tone = TONES.error
    label = "Sync error"
  }

  return (
    <span
      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${tone} ${className}`}
      title={label}
      aria-label={`Status: ${label}`}
    />
  )
}
