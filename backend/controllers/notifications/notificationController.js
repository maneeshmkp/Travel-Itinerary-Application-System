import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  markNotificationsRead,
  deleteNotification,
  archiveNotification,
  getNotificationSettings,
  updateNotificationSettings,
  groupNotificationsByTime,
  createNotification,
  serializeNotification,
  buildActionUrl,
} from "../../services/notifications/notificationService.js"
import { runNotificationSchedulerNow } from "../../utils/notificationScheduler.js"
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js"

function handleError(res, err) {
  if (err?.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message })
  }
  return res.status(500).json({ success: false, message: err.message })
}

/** GET /api/notifications */
export const getNotifications = async (req, res) => {
  try {
    const data = await listNotifications(req.user._id, req.query)
    const grouped = groupNotificationsByTime(data.items)
    res.json({ success: true, data: { ...data, grouped } })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/notifications/unread-count */
export const getNotificationsUnreadCount = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user._id)
    res.json({ success: true, data: { count } })
  } catch (err) {
    handleError(res, err)
  }
}

/** POST /api/notifications/read/:id */
export const readNotification = async (req, res) => {
  try {
    const notification = await markNotificationRead(req.user._id, req.params.id)
    res.json({ success: true, data: notification })
  } catch (err) {
    handleError(res, err)
  }
}

/**
 * PATCH /api/notifications/read
 * Body: { ids?: string[] } — omit/empty ids to mark all read
 */
export const patchNotificationsRead = async (req, res) => {
  try {
    const ids = req.body?.ids ?? req.body?.id ?? null
    const result = await markNotificationsRead(req.user._id, ids)
    res.json({ success: true, data: result })
  } catch (err) {
    handleError(res, err)
  }
}

/** POST /api/notifications/read-all */
export const readAllNotifications = async (req, res) => {
  try {
    const result = await markAllNotificationsRead(req.user._id)
    res.json({ success: true, data: result })
  } catch (err) {
    handleError(res, err)
  }
}

/** DELETE /api/notifications/:id */
export const removeNotification = async (req, res) => {
  try {
    await deleteNotification(req.user._id, req.params.id)
    res.json({ success: true, message: "Notification deleted" })
  } catch (err) {
    handleError(res, err)
  }
}

/** PATCH /api/notifications/archive/:id */
export const archiveNotificationHandler = async (req, res) => {
  try {
    const notification = await archiveNotification(req.user._id, req.params.id)
    res.json({ success: true, data: notification })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/notifications/settings */
export const getSettings = async (req, res) => {
  try {
    const settings = await getNotificationSettings(req.user._id)
    res.json({ success: true, data: settings })
  } catch (err) {
    handleError(res, err)
  }
}

/** PUT /api/notifications/settings */
export const updateSettings = async (req, res) => {
  try {
    const settings = await updateNotificationSettings(req.user._id, req.body)
    res.json({ success: true, data: settings })
  } catch (err) {
    handleError(res, err)
  }
}

/** POST /api/notifications/seed — dev sample notifications */
export const seedSampleNotifications = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_NOTIFICATION_SEED !== "true") {
      return res.status(403).json({ success: false, message: "Seed disabled in production" })
    }

    const userId = req.user._id
    const samples = [
      {
        type: NOTIFICATION_TYPES.ACTIVITY_REMINDER,
        title: "Upcoming activity",
        message: "Your Museum visit starts in 1 hour.",
        priority: "HIGH",
        metadata: { dedupKey: `seed-activity-${Date.now()}`, tripTitle: "Sample Trip" },
      },
      {
        type: NOTIFICATION_TYPES.FLIGHT_DEPARTURE,
        title: "Flight departure reminder",
        message: "Your flight to Delhi departs in 2 hours.",
        priority: "HIGH",
        metadata: { dedupKey: `seed-flight-${Date.now()}`, tripTitle: "Sample Trip" },
      },
      {
        type: NOTIFICATION_TYPES.HOTEL_CHECKIN,
        title: "Hotel check-in today",
        message: "Check in at Grand Hotel today at 2:00 PM.",
        priority: "MEDIUM",
        metadata: { dedupKey: `seed-hotel-${Date.now()}`, tripTitle: "Sample Trip" },
      },
      {
        type: NOTIFICATION_TYPES.WEATHER_ALERT,
        title: "Weather alert: Heavy rain",
        message: "Heavy rain expected tomorrow. Consider indoor activities.",
        priority: "HIGH",
        metadata: { dedupKey: `seed-weather-${Date.now()}`, tripTitle: "Sample Trip" },
      },
      {
        type: NOTIFICATION_TYPES.BUDGET_WARNING,
        title: "Budget alert: 90% used",
        message: "You have used 90% of your trip budget.",
        priority: "HIGH",
        metadata: { dedupKey: `seed-budget-${Date.now()}`, tripTitle: "Sample Trip" },
      },
      {
        type: NOTIFICATION_TYPES.COLLAB_JOIN,
        title: "Collaborator joined",
        message: "Alex joined your trip \"Goa Getaway\".",
        priority: "MEDIUM",
        metadata: { dedupKey: `seed-collab-${Date.now()}`, tripTitle: "Goa Getaway" },
      },
      {
        type: NOTIFICATION_TYPES.AI_REMINDER,
        title: "AI insight: Plan adjustment",
        message: "Museum may be crowded tomorrow. Consider visiting early morning.",
        priority: "MEDIUM",
        metadata: { dedupKey: `seed-ai-${Date.now()}`, tripTitle: "Sample Trip" },
      },
      {
        type: NOTIFICATION_TYPES.FLIGHT_DELAY,
        title: "Flight delayed",
        message: "✈ Flight AI291 delayed 20 minutes.",
        priority: "HIGH",
        metadata: { dedupKey: `seed-delay-${Date.now()}`, tripTitle: "Sample Trip" },
      },
      {
        type: NOTIFICATION_TYPES.DOCUMENT_EXPIRING,
        title: "Passport expiring soon",
        message: "📄 Passport expires in 10 days.",
        priority: "HIGH",
        metadata: { dedupKey: `seed-doc-${Date.now()}` },
      },
    ]

    const created = []
    for (const s of samples) {
      const n = await createNotification({
        userId,
        type: s.type,
        title: s.title,
        message: s.message,
        priority: s.priority,
        actionUrl: buildActionUrl("/notifications"),
        metadata: s.metadata,
        skipSettingsCheck: true,
      })
      if (n) created.push(serializeNotification(n))
    }

    res.status(201).json({ success: true, data: { count: created.length, notifications: created } })
  } catch (err) {
    handleError(res, err)
  }
}

/** POST /api/notifications/scheduler/run — manual scheduler run (dev) */
export const runScheduler = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_SCHEDULER_RUN !== "true") {
      return res.status(403).json({ success: false, message: "Manual scheduler run disabled" })
    }
    const results = await runNotificationSchedulerNow()
    res.json({ success: true, data: results })
  } catch (err) {
    handleError(res, err)
  }
}
