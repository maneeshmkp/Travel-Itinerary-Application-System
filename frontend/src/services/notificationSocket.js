import { io } from "socket.io-client"
import { resolveSocketOrigin } from "../apiBaseUrl.helper.js"

/**
 * Resolve Socket.IO HTTP origin (no /api path).
 * Dev: talk to backend directly so WS upgrades aren't lost on the Vite proxy.
 * Prod: Render backend (never Vercel origin / never localhost).
 */
export function resolveSocketUrl() {
  return resolveSocketOrigin({
    socketUrl: import.meta.env.VITE_SOCKET_URL,
    apiUrl: import.meta.env.VITE_API_URL,
    isDev: import.meta.env.DEV,
  })
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
