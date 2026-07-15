import { io } from "socket.io-client"

/**
 * Resolve Socket.IO HTTP origin (no /api path).
 * Dev: talk to backend directly so WS upgrades aren't lost on the Vite proxy.
 */
export function resolveSocketUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, "")

  const api = import.meta.env.VITE_API_URL?.trim()
  if (api) {
    return api.replace(/\/+$/, "").replace(/\/api$/i, "")
  }

  if (import.meta.env.DEV) return "http://127.0.0.1:5000"
  return window.location.origin
}

let socketSingleton = null

export function getNotificationSocket() {
  return socketSingleton
}

/**
 * Connect with JWT. Reuses a single socket; reconnects with the latest token.
 */
export function connectNotificationSocket(token) {
  if (!token) {
    disconnectNotificationSocket()
    return null
  }

  if (socketSingleton?.connected && socketSingleton.auth?.token === token) {
    return socketSingleton
  }

  if (socketSingleton) {
    socketSingleton.auth = { token }
    if (!socketSingleton.connected) socketSingleton.connect()
    return socketSingleton
  }

  socketSingleton = io(resolveSocketUrl(), {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  })

  return socketSingleton
}

export function disconnectNotificationSocket() {
  if (!socketSingleton) return
  socketSingleton.removeAllListeners()
  socketSingleton.disconnect()
  socketSingleton = null
}
