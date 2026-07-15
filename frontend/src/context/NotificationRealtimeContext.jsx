"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { notificationAPI } from "../services/api"
import { useAuth } from "./AuthContext"
import { getCachedNotifications } from "../offline/cacheService"
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from "../services/notificationSocket"

const FALLBACK_POLL_MS = 120_000
const MAX_POLL_MS = 5 * 60_000
const TOAST_TTL_MS = 6000
const MAX_TOASTS = 4

const NotificationRealtimeContext = createContext(null)

function toastEmoji(type = "") {
  if (type.startsWith("FLIGHT_")) return "✈"
  if (type === "WEATHER_ALERT") return "🌧"
  if (type.startsWith("DOCUMENT_")) return "📄"
  if (type.startsWith("BUDGET_") || type === "BUDGET_WARNING") return "💰"
  if (type.startsWith("BOOKING_")) return "🎫"
  if (type === "PACKING_REMINDER") return "🎒"
  if (type === "CALENDAR_SYNCED" || type === "ACTIVITY_REMINDER") return "📅"
  if (type.startsWith("AI_") || type === "TRAVEL_RISK_ALERT") return "✨"
  return "🔔"
}

function playPing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = 880
    gain.gain.value = 0.04
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
    osc.stop(ctx.currentTime + 0.25)
  } catch {
    /* ignore autoplay / unsupported */
  }
}

export function NotificationRealtimeProvider({ children }) {
  const { isAuthenticated, token } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [grouped, setGrouped] = useState({ unread: [], today: [], earlier: [], archived: [] })
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, hasMore: false })
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [liveToasts, setLiveToasts] = useState([])
  const [settings, setSettings] = useState(null)

  const filtersRef = useRef({})
  const failStreakRef = useRef(0)
  const pollMsRef = useRef(FALLBACK_POLL_MS)
  const seenIdsRef = useRef(new Set())
  const soundEnabledRef = useRef(true)

  const dismissToast = useCallback((id) => {
    setLiveToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    (notification) => {
      if (!notification?.id) return
      if (seenIdsRef.current.has(`toast:${notification.id}`)) return
      seenIdsRef.current.add(`toast:${notification.id}`)

      const toast = {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        emoji: toastEmoji(notification.type),
        actionUrl: notification.actionUrl,
        createdAt: Date.now(),
      }

      setLiveToasts((prev) => [toast, ...prev].slice(0, MAX_TOASTS))
      if (soundEnabledRef.current) playPing()

      window.setTimeout(() => dismissToast(toast.id), TOAST_TTL_MS)
    },
    [dismissToast],
  )

  const applyCachedUnreadCount = useCallback(async () => {
    const items = await getCachedNotifications()
    setUnreadCount(items.filter((n) => n.status === "UNREAD").length)
  }, [])

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await applyCachedUnreadCount()
      return
    }
    try {
      const res = await notificationAPI.getUnreadCount()
      setUnreadCount(res.data?.data?.count ?? 0)
      failStreakRef.current = 0
      pollMsRef.current = FALLBACK_POLL_MS
    } catch {
      failStreakRef.current += 1
      pollMsRef.current = Math.min(FALLBACK_POLL_MS * 2 ** failStreakRef.current, MAX_POLL_MS)
      await applyCachedUnreadCount()
    }
  }, [isAuthenticated, applyCachedUnreadCount])

  const loadNotifications = useCallback(
    async (params = {}, { append = false } = {}) => {
      if (!isAuthenticated) return
      const query = { ...filtersRef.current, ...params }
      filtersRef.current = query

      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const res = await notificationAPI.getAll(query)
        const data = res.data?.data
        const items = data?.items ?? []
        items.forEach((n) => seenIdsRef.current.add(n.id))

        setNotifications((prev) => {
          if (!append) return items
          const map = new Map(prev.map((n) => [n.id, n]))
          for (const n of items) map.set(n.id, n)
          return Array.from(map.values())
        })
        setGrouped(data?.grouped ?? { unread: [], today: [], earlier: [], archived: [] })
        setPagination(data?.pagination ?? { page: 1, pages: 1, total: 0, hasMore: false })
        setUnreadCount(data?.unreadCount ?? 0)
        failStreakRef.current = 0
        pollMsRef.current = FALLBACK_POLL_MS
      } catch (err) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const items = await getCachedNotifications()
          setNotifications(items)
          setGrouped({
            unread: items.filter((n) => n.status === "UNREAD"),
            today: [],
            earlier: items,
            archived: [],
          })
          setUnreadCount(items.filter((n) => n.status === "UNREAD").length)
          setError(null)
        } else {
          setError(err.message || "Could not load notifications")
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [isAuthenticated],
  )

  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loadingMore || loading) return
    const nextPage = (pagination.page || 1) + 1
    await loadNotifications({ ...filtersRef.current, page: nextPage }, { append: true })
  }, [pagination, loadingMore, loading, loadNotifications])

  const markRead = useCallback(async (id) => {
    await notificationAPI.markRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "READ", read: true } : n)),
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await notificationAPI.markAllRead()
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: n.status === "UNREAD" ? "READ" : n.status, read: true })),
    )
    setUnreadCount(0)
  }, [])

  const remove = useCallback(async (id) => {
    await notificationAPI.delete(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const archive = useCallback(async (id) => {
    await notificationAPI.archive(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await refreshUnreadCount()
  }, [refreshUnreadCount])

  const refreshSettings = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await notificationAPI.getSettings()
      const data = res.data?.data
      setSettings(data)
      soundEnabledRef.current = data?.soundEnabled !== false
    } catch {
      /* ignore */
    }
  }, [isAuthenticated])

  const updateLocalSettings = useCallback((next) => {
    setSettings((prev) => {
      const value = typeof next === "function" ? next(prev) : next
      if (value && typeof value.soundEnabled === "boolean") {
        soundEnabledRef.current = value.soundEnabled
      }
      return value
    })
  }, [])

  // Socket.IO lifecycle
  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectNotificationSocket()
      setSocketConnected(false)
      setUnreadCount(0)
      setNotifications([])
      setLiveToasts([])
      return undefined
    }

    const socket = connectNotificationSocket(token)

    const onConnect = () => {
      setSocketConnected(true)
      refreshUnreadCount()
    }
    const onDisconnect = () => setSocketConnected(false)

    const onNew = (payload) => {
      const n = payload?.notification
      if (!n?.id) return
      if (seenIdsRef.current.has(n.id)) {
        if (typeof payload.unreadCount === "number") setUnreadCount(payload.unreadCount)
        return
      }
      seenIdsRef.current.add(n.id)
      setNotifications((prev) => [n, ...prev.filter((x) => x.id !== n.id)])
      if (typeof payload.unreadCount === "number") setUnreadCount(payload.unreadCount)
      else setUnreadCount((c) => c + 1)
      if (n.status === "UNREAD") pushToast(n)
    }

    const onUpdate = (payload) => {
      const n = payload?.notification
      if (!n?.id) return
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, ...n } : x)))
      if (typeof payload.unreadCount === "number") setUnreadCount(payload.unreadCount)
    }

    const onRead = (payload) => {
      if (typeof payload?.unreadCount === "number") setUnreadCount(payload.unreadCount)
      if (payload?.all) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, status: n.status === "UNREAD" ? "READ" : n.status, read: true })),
        )
        return
      }
      const ids = payload?.ids || (payload?.id ? [payload.id] : [])
      if (!ids.length) return
      const idSet = new Set(ids.map(String))
      setNotifications((prev) =>
        prev.map((n) => (idSet.has(n.id) ? { ...n, status: "READ", read: true } : n)),
      )
    }

    const onDelete = (payload) => {
      const id = payload?.id
      if (id) setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (typeof payload?.unreadCount === "number") setUnreadCount(payload.unreadCount)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("notification:new", onNew)
    socket.on("notification:update", onUpdate)
    socket.on("notification:read", onRead)
    socket.on("notification:delete", onDelete)

    if (socket.connected) onConnect()
    refreshSettings()

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("notification:new", onNew)
      socket.off("notification:update", onUpdate)
      socket.off("notification:read", onRead)
      socket.off("notification:delete", onDelete)
    }
  }, [isAuthenticated, token, refreshUnreadCount, refreshSettings, pushToast])

  // Fallback poll when socket is down (keeps badge fresh offline / proxy issues)
  useEffect(() => {
    if (!isAuthenticated) return undefined

    let timer
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      if (!socketConnected) await refreshUnreadCount()
      if (cancelled) return
      timer = setTimeout(tick, pollMsRef.current)
    }

    tick()

    const onOnline = () => {
      failStreakRef.current = 0
      pollMsRef.current = FALLBACK_POLL_MS
      refreshUnreadCount()
    }
    window.addEventListener("online", onOnline)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      window.removeEventListener("online", onOnline)
    }
  }, [isAuthenticated, socketConnected, refreshUnreadCount])

  useEffect(() => {
    if (!isAuthenticated) disconnectNotificationSocket()
  }, [isAuthenticated])

  const value = useMemo(
    () => ({
      unreadCount,
      notifications,
      grouped,
      pagination,
      loading,
      loadingMore,
      error,
      socketConnected,
      liveToasts,
      settings,
      loadNotifications,
      loadMore,
      refreshUnreadCount,
      refreshSettings,
      markRead,
      markAllRead,
      remove,
      archive,
      dismissToast,
      setSettings: updateLocalSettings,
      soundEnabledRef,
    }),
    [
      unreadCount,
      notifications,
      grouped,
      pagination,
      loading,
      loadingMore,
      error,
      socketConnected,
      liveToasts,
      settings,
      loadNotifications,
      loadMore,
      refreshUnreadCount,
      refreshSettings,
      markRead,
      markAllRead,
      remove,
      archive,
      dismissToast,
      updateLocalSettings,
    ],
  )

  return (
    <NotificationRealtimeContext.Provider value={value}>{children}</NotificationRealtimeContext.Provider>
  )
}

export function useNotificationRealtime() {
  const ctx = useContext(NotificationRealtimeContext)
  if (!ctx) {
    throw new Error("useNotificationRealtime must be used within NotificationRealtimeProvider")
  }
  return ctx
}
