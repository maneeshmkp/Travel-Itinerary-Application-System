import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import { logSocket } from "../logger/index.js"
import { recordSocketConnect, recordSocketDisconnect } from "../services/monitoring/metricsStore.js"
import { isRedisConfigured, logRedis, resolveRedisUrl } from "../config/redis.js"

/** @type {import("socket.io").Server | null} */
let io = null

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not configured")
  return secret
}

function extractToken(socket) {
  const authToken = socket.handshake?.auth?.token
  if (typeof authToken === "string" && authToken.trim()) return authToken.trim()

  const header = socket.handshake?.headers?.authorization
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim()
  }

  const queryToken = socket.handshake?.query?.token
  if (typeof queryToken === "string" && queryToken.trim()) return queryToken.trim()

  return null
}

export function userRoom(userId) {
  return `user:${String(userId)}`
}

async function attachRedisAdapter(serverIo) {
  if (!isRedisConfigured()) {
    logSocket.info("Socket.IO: single-node mode (Redis adapter skipped)")
    return false
  }
  try {
    const { createAdapter } = await import("@socket.io/redis-adapter")
    const Redis = (await import("ioredis")).default
    const url = resolveRedisUrl()
    if (!url) return false
    const opts = {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 5) return null
        return Math.min(times * 200, 5000)
      },
    }
    const pubClient = new Redis(url, opts)
    const subClient = pubClient.duplicate()
    pubClient.on("error", (err) => logRedis.error("Socket Redis pub error", { message: err?.message }))
    subClient.on("error", (err) => logRedis.error("Socket Redis sub error", { message: err?.message }))
    await Promise.all([pubClient.connect(), subClient.connect()])
    serverIo.adapter(createAdapter(pubClient, subClient))
    logSocket.info("Socket.IO: Redis adapter enabled (horizontal scaling)")
    logRedis.info("Socket Redis adapter ready")
    return true
  } catch (err) {
    logSocket.warn("Socket.IO Redis adapter failed — single-node fallback", {
      message: err?.message,
    })
    return false
  }
}

/**
 * Attach Socket.IO to the HTTP server. Call once from server.js.
 * JWT auth on handshake; each connection joins a private user room.
 */
export function initSocket(httpServer) {
  if (io) return io

  const origin =
    process.env.NODE_ENV === "production"
      ? [
          process.env.FRONTEND_URL,
          ...(process.env.FRONTEND_URLS || "").split(","),
        ]
          .map((o) => String(o || "").trim())
          .filter(Boolean)
      : ["http://localhost:3000", "http://127.0.0.1:3000"]

  io = new Server(httpServer, {
    cors: {
      origin,
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
    pingInterval: 25000,
    pingTimeout: 20000,
  })

  // Fire-and-forget adapter attach (does not block handshake setup)
  attachRedisAdapter(io).catch(() => {})

  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket)
      if (!token) return next(new Error("Authentication required"))

      const decoded = jwt.verify(token, getJwtSecret())
      const userId = decoded.id ?? decoded.userId
      if (!userId) return next(new Error("Invalid token payload"))

      const user = await User.findById(userId).select("_id name email")
      if (!user) return next(new Error("User not found"))

      socket.userId = String(user._id)
      socket.user = user
      next()
    } catch (err) {
      next(new Error(err.message === "jwt expired" ? "Token expired" : "Invalid token"))
    }
  })

  io.on("connection", (socket) => {
    const room = userRoom(socket.userId)
    socket.join(room)
    recordSocketConnect()
    logSocket.info("Socket connected", { userId: socket.userId, socketId: socket.id })

    socket.on("disconnect", (reason) => {
      recordSocketDisconnect()
      logSocket.info("Socket disconnected", { userId: socket.userId, reason })
    })
  })

  logSocket.info("Socket.IO: real-time notifications enabled")
  return io
}

export function getIO() {
  return io
}

/** Emit an event only to sockets in the given user's private room. */
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return false
  io.to(userRoom(userId)).emit(event, payload)
  return true
}

export function emitNotificationNew(userId, notification, unreadCount) {
  return emitToUser(userId, "notification:new", {
    notification,
    unreadCount,
    at: new Date().toISOString(),
  })
}

export function emitNotificationUpdate(userId, notification, unreadCount) {
  return emitToUser(userId, "notification:update", {
    notification,
    unreadCount,
    at: new Date().toISOString(),
  })
}

export function emitNotificationRead(userId, payload) {
  return emitToUser(userId, "notification:read", {
    ...payload,
    at: new Date().toISOString(),
  })
}

export function emitNotificationDelete(userId, notificationId, unreadCount) {
  return emitToUser(userId, "notification:delete", {
    id: String(notificationId),
    unreadCount,
    at: new Date().toISOString(),
  })
}
