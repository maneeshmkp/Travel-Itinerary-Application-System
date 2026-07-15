import Notification from "../../models/Notification.js"
import NotificationSettings from "../../models/NotificationSettings.js"
import User from "../../models/User.js"
import { categoryForType, typesForCategory, NOTIFICATION_CATEGORIES } from "../../constants/notificationTypes.js"
import { sendNotificationEmail } from "./notificationEmailService.js"
import {
  emitNotificationNew,
  emitNotificationUpdate,
  emitNotificationRead,
  emitNotificationDelete,
} from "../../socket/index.js"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function frontendBase() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")
}

export function buildActionUrl(path) {
  const base = frontendBase()
  const p = String(path || "").startsWith("/") ? path : `/${path || ""}`
  return `${base}${p}`
}

export function serializeNotification(doc) {
  const n = doc?.toObject ? doc.toObject() : doc
  const status = n.status
  return {
    id: String(n._id),
    user: n.user ? String(n.user) : null,
    trip: n.trip ? String(n.trip) : null,
    type: n.type,
    category: categoryForType(n.type),
    title: n.title,
    message: n.message,
    priority: n.priority,
    status,
    /** Spec alias — boolean convenience alongside status */
    read: status === "READ" || status === "ARCHIVED",
    actionUrl: n.actionUrl,
    metadata: n.metadata || {},
    scheduledFor: n.scheduledFor,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }
}

export async function getOrCreateSettings(userId) {
  let settings = await NotificationSettings.findOne({ user: userId })
  if (!settings) {
    settings = await NotificationSettings.create({ user: userId })
  }
  return settings
}

function settingsAllowType(settings, type) {
  if (!settings.inAppEnabled) return false
  const cat = categoryForType(type)
  if (cat === NOTIFICATION_CATEGORIES.BUDGET && !settings.budgetAlerts) return false
  if (cat === NOTIFICATION_CATEGORIES.WEATHER && !settings.weatherAlerts) return false
  if (cat === NOTIFICATION_CATEGORIES.BOOKINGS && !settings.bookingAlerts) return false
  if (cat === NOTIFICATION_CATEGORIES.COLLABORATION && !settings.collaborationAlerts) return false
  if (cat === NOTIFICATION_CATEGORIES.AI && !settings.aiReminders) return false
  if (
    [
      "ACTIVITY_REMINDER",
      "FLIGHT_DEPARTURE",
      "FLIGHT_CHECKIN",
      "FLIGHT_GATE_CLOSE",
      "FLIGHT_BOARDING",
      "HOTEL_CHECKIN",
      "HOTEL_CHECKOUT",
      "TRIP_CREATED",
      "TRIP_UPDATED",
    ].includes(type)
  ) {
    if (type === "ACTIVITY_REMINDER" && !settings.activityReminders) return false
    if (type.startsWith("FLIGHT_") && !settings.flightReminders) return false
    if (type.startsWith("HOTEL_") && !settings.hotelReminders) return false
  }
  return true
}

/**
 * Create notification with deduplication via metadata.dedupKey.
 * Returns null if duplicate within dedup window (default 24h).
 * Emits `notification:new` over Socket.IO to the user room.
 */
export async function createNotification({
  userId,
  tripId = null,
  type,
  title,
  message,
  priority = "MEDIUM",
  actionUrl = "",
  metadata = {},
  scheduledFor = null,
  sendEmail = false,
  skipSettingsCheck = false,
}) {
  if (!userId || !type || !title || !message) return null

  const settings = await getOrCreateSettings(userId)
  if (!skipSettingsCheck && !settingsAllowType(settings, type)) return null

  const dedupKey = metadata.dedupKey
  if (dedupKey) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const existing = await Notification.findOne({
      user: userId,
      "metadata.dedupKey": dedupKey,
      createdAt: { $gte: since },
    })
    if (existing) return null
  }

  const notification = await Notification.create({
    user: userId,
    trip: tripId || undefined,
    type,
    title,
    message,
    priority,
    status: "UNREAD",
    actionUrl: actionUrl || (tripId ? buildActionUrl(`/itineraries/${tripId}`) : ""),
    metadata,
    scheduledFor: scheduledFor || new Date(),
  })

  if (sendEmail && settings.emailEnabled) {
    const user = await User.findById(userId).select("email name")
    if (user?.email) {
      const emailPayload = {
        email: user.email,
        userName: user.name,
        title,
        message,
        actionUrl: notification.actionUrl,
        tripName: metadata.tripTitle,
        eventDate: metadata.eventDate,
      }
      import("../../queues/index.js")
        .then(({ jobs }) => jobs.email(emailPayload))
        .then(async (job) => {
          if (job) return
          await sendNotificationEmail(emailPayload)
        })
        .catch((err) => console.error("Notification email failed:", err.message))
    }
  }

  try {
    const { invalidateNotificationRedis, cacheUnreadCount, pushSocketBuffer, enqueueNotificationPayload } =
      await import("./notificationRedis.js")
    await invalidateNotificationRedis(userId)
    const unreadCount = await getUnreadCount(userId)
    emitNotificationNew(userId, serializeNotification(notification), unreadCount)
    await cacheUnreadCount(userId, unreadCount)
    await pushSocketBuffer(userId, {
      event: "notification:new",
      notification: serializeNotification(notification),
      unreadCount,
    })
    await enqueueNotificationPayload({
      userId: String(userId),
      notificationId: String(notification._id),
      type,
    })
  } catch (err) {
    console.error("[socket] notification:new emit failed:", err.message)
  }

  try {
    const { publishAsync, DOMAIN_EVENTS } = await import("../../events/index.js")
    publishAsync(
      DOMAIN_EVENTS.NOTIFICATION_CREATED,
      {
        userId: String(userId),
        tripId: tripId ? String(tripId) : null,
        id: String(notification._id),
        type,
        title,
        skipSocket: true,
      },
      {
        source: "notificationService.create",
        userId: String(userId),
        dedupeKey: `notif:${notification._id}`,
      },
    )
  } catch {
    /* events optional */
  }

  return notification
}

export async function listNotifications(userId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT))
  const skip = (page - 1) * limit

  const filter = { user: userId }

  if (query.status === "ARCHIVED") {
    filter.status = "ARCHIVED"
  } else if (query.status === "READ") {
    filter.status = "READ"
  } else if (query.category === NOTIFICATION_CATEGORIES.UNREAD || query.unread === "true") {
    filter.status = "UNREAD"
  } else if (query.status !== "all") {
    filter.status = { $ne: "ARCHIVED" }
  }

  if (query.category === "warnings" || query.warnings === "true") {
    filter.$or = [
      { priority: "HIGH" },
      {
        type: {
          $in: [
            "WEATHER_ALERT",
            "TRAVEL_RISK_ALERT",
            "BUDGET_WARNING",
            "FLIGHT_CANCELLED",
            "FLIGHT_DELAY",
          ],
        },
      },
    ]
  } else if (query.category === "finance") {
    filter.type = { $in: typesForCategory(NOTIFICATION_CATEGORIES.BUDGET) || [] }
  } else {
    const categoryTypes = query.category ? typesForCategory(query.category) : null
    if (categoryTypes?.length) {
      filter.type = { $in: categoryTypes }
    }
  }

  if (query.search?.trim()) {
    const q = query.search.trim()
    const searchClause = [
      { title: { $regex: q, $options: "i" } },
      { message: { $regex: q, $options: "i" } },
    ]
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchClause }]
      delete filter.$or
    } else {
      filter.$or = searchClause
    }
  }

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, status: "UNREAD" }),
  ])

  return {
    items: items.map(serializeNotification),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    },
    unreadCount,
  }
}

export async function getUnreadCount(userId) {
  try {
    const { getCachedUnreadCount, cacheUnreadCount } = await import("./notificationRedis.js")
    const cached = await getCachedUnreadCount(userId)
    if (cached != null) return cached
    const count = await Notification.countDocuments({ user: userId, status: "UNREAD" })
    await cacheUnreadCount(userId, count)
    return count
  } catch {
    return Notification.countDocuments({ user: userId, status: "UNREAD" })
  }
}

export async function markNotificationRead(userId, notificationId) {
  const doc = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId, status: { $ne: "ARCHIVED" } },
    { status: "READ" },
    { new: true },
  )
  if (!doc) {
    const err = new Error("Notification not found")
    err.statusCode = 404
    throw err
  }
  const serialized = serializeNotification(doc)
  try {
    const { invalidateNotificationRedis } = await import("./notificationRedis.js")
    await invalidateNotificationRedis(userId)
    const unreadCount = await getUnreadCount(userId)
    emitNotificationRead(userId, {
      id: serialized.id,
      ids: [serialized.id],
      notification: serialized,
      unreadCount,
    })
    emitNotificationUpdate(userId, serialized, unreadCount)
  } catch (err) {
    console.error("[socket] notification:read emit failed:", err.message)
  }
  return serialized
}

/**
 * Mark one or many notifications read.
 * @param {string} userId
 * @param {string[]|null} ids — if null/empty, mark all unread
 */
export async function markNotificationsRead(userId, ids = null) {
  if (!ids || (Array.isArray(ids) && ids.length === 0)) {
    return markAllNotificationsRead(userId)
  }

  const idList = Array.isArray(ids) ? ids : [ids]
  const result = await Notification.updateMany(
    { _id: { $in: idList }, user: userId, status: "UNREAD" },
    { status: "READ" },
  )
  const unreadCount = await getUnreadCount(userId)
  try {
    emitNotificationRead(userId, {
      ids: idList.map(String),
      modified: result.modifiedCount,
      unreadCount,
    })
  } catch (err) {
    console.error("[socket] notification:read emit failed:", err.message)
  }
  return { modified: result.modifiedCount, unreadCount }
}

export async function markAllNotificationsRead(userId) {
  const result = await Notification.updateMany(
    { user: userId, status: "UNREAD" },
    { status: "READ" },
  )
  try {
    emitNotificationRead(userId, {
      ids: null,
      all: true,
      modified: result.modifiedCount,
      unreadCount: 0,
    })
  } catch (err) {
    console.error("[socket] notification:read emit failed:", err.message)
  }
  return { modified: result.modifiedCount, unreadCount: 0 }
}

export async function deleteNotification(userId, notificationId) {
  const result = await Notification.deleteOne({ _id: notificationId, user: userId })
  if (result.deletedCount === 0) {
    const err = new Error("Notification not found")
    err.statusCode = 404
    throw err
  }
  try {
    const unreadCount = await getUnreadCount(userId)
    emitNotificationDelete(userId, notificationId, unreadCount)
  } catch (err) {
    console.error("[socket] notification:delete emit failed:", err.message)
  }
}

export async function archiveNotification(userId, notificationId) {
  const doc = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { status: "ARCHIVED" },
    { new: true },
  )
  if (!doc) {
    const err = new Error("Notification not found")
    err.statusCode = 404
    throw err
  }
  const serialized = serializeNotification(doc)
  try {
    const unreadCount = await getUnreadCount(userId)
    emitNotificationUpdate(userId, serialized, unreadCount)
  } catch (err) {
    console.error("[socket] notification:update emit failed:", err.message)
  }
  return serialized
}

export async function updateNotificationSettings(userId, body) {
  const allowed = [
    "emailEnabled",
    "inAppEnabled",
    "pushEnabled",
    "soundEnabled",
    "budgetAlerts",
    "weatherAlerts",
    "bookingAlerts",
    "collaborationAlerts",
    "activityReminders",
    "flightReminders",
    "hotelReminders",
    "aiReminders",
  ]
  const patch = {}
  for (const key of allowed) {
    if (typeof body[key] === "boolean") patch[key] = body[key]
  }
  const settings = await NotificationSettings.findOneAndUpdate(
    { user: userId },
    { $set: patch },
    { new: true, upsert: true },
  )
  return settings
}

export async function getNotificationSettings(userId) {
  return getOrCreateSettings(userId)
}

/** Group notifications for notification center UI */
export function groupNotificationsByTime(items) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const unread = []
  const today = []
  const earlier = []
  const archived = []

  for (const n of items) {
    if (n.status === "ARCHIVED") {
      archived.push(n)
      continue
    }
    if (n.status === "UNREAD") unread.push(n)
    const created = new Date(n.createdAt)
    if (created >= startOfToday) today.push(n)
    else earlier.push(n)
  }

  return { unread, today, earlier, archived }
}
