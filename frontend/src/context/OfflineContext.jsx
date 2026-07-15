"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import {
  initSyncManager,
  subscribeSync,
  syncPendingChanges,
  refreshQueueCount,
  getSyncStatus,
} from "../offline/syncManager.js"
import { SYNC_STATUS } from "../offline/constants.js"

const OfflineContext = createContext(null)

export function OfflineProvider({ children }) {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [syncState, setSyncState] = useState(getSyncStatus())
  const [lastMessage, setLastMessage] = useState(null)

  useEffect(() => {
    const cleanup = initSyncManager()
    const unsub = subscribeSync(setSyncState)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    const onSyncRequest = () => retrySync()
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    window.addEventListener("travelplan:sync-request", onSyncRequest)
    return () => {
      cleanup?.()
      unsub()
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("travelplan:sync-request", onSyncRequest)
    }
  }, [])

  const retrySync = useCallback(async () => {
    const result = await syncPendingChanges()
    if (result?.message) setLastMessage(result.message)
    await refreshQueueCount()
    return result
  }, [])

  const value = {
    online,
    offline: !online,
    syncStatus: syncState.status,
    queuedCount: syncState.queuedCount,
    isSyncing: syncState.status === SYNC_STATUS.SYNCING,
    lastMessage,
    clearMessage: () => setLastMessage(null),
    retrySync,
  }

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider")
  return ctx
}
