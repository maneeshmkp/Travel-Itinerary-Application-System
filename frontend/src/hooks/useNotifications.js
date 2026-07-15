import { useNotificationRealtime } from "../context/NotificationRealtimeContext"

/**
 * Backward-compatible hook. Real-time state lives in NotificationRealtimeProvider.
 * `poll` is ignored when Socket.IO is connected (HTTP poll is only a fallback).
 */
export function useNotifications(_options = {}) {
  return useNotificationRealtime()
}
