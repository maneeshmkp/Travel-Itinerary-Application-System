/**
 * Admin portal API — users, dashboard, roles, audit, settings.
 * Does not rewrite trip/booking/AI business logic; aggregates existing models.
 */
import crypto from "crypto"
import User from "../models/User.js"
import AuditLog from "../models/AuditLog.js"
import SystemSettings from "../models/SystemSettings.js"
import Itinerary from "../models/Itinerary.js"
import Booking from "../models/Booking.js"
import TravelDocument from "../models/TravelDocument.js"
import {
  ASSIGNABLE_ROLES,
  ROLE_PERMISSIONS,
  ROLES,
  canAssignRole,
  effectiveRoleForUser,
  normalizeRole,
  permissionsForRole,
  resolvePermissions,
  ROLE_RANK,
  PERMISSIONS,
} from "../constants/rbac.js"
import { AuditActions, writeAudit } from "../services/auditService.js"

function publicUser(u) {
  const role = effectiveRoleForUser(u)
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role,
    permissions: resolvePermissions({ ...u.toObject?.() || u, role }),
    status: u.status || "active",
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    createdBy: u.createdBy,
    updatedBy: u.updatedBy,
  }
}

async function getUserCountByRole() {
  const rows = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])
  const map = Object.fromEntries(rows.map((r) => [r._id || "user", r.count]))
  return map
}

/** GET /admin/dashboard */
export async function getDashboard(req, res) {
  try {
    const [users, trips, bookings, documents, suspended, recentAudits, byRole] = await Promise.all([
      User.countDocuments(),
      Itinerary.countDocuments().catch(() => 0),
      Booking.countDocuments().catch(() => 0),
      TravelDocument.countDocuments().catch(() => 0),
      User.countDocuments({ status: "suspended" }),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
      getUserCountByRole(),
    ])

    res.json({
      success: true,
      data: {
        stats: { users, trips, bookings, documents, suspended },
        usersByRole: byRole,
        recentAudit: recentAudits,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Dashboard error" })
  }
}

/** GET /admin/users */
export async function listUsers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit
    const q = String(req.query.q || req.query.search || "").trim()
    const role = req.query.role ? normalizeRole(req.query.role) : null
    const status = req.query.status || null

    const filter = {}
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ]
    }
    if (role && role !== ROLES.GUEST) filter.role = role
    if (status === "active" || status === "suspended") filter.status = status

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-password").lean(),
    ])

    res.json({
      success: true,
      data: {
        users: users.map(publicUser),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "List users failed" })
  }
}

/** GET /admin/users/:id */
export async function getUser(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-password")
    if (!user) return res.status(404).json({ success: false, message: "User not found" })
    res.json({ success: true, data: { user: publicUser(user) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** PATCH /admin/users/:id — name/email/status (not role) */
export async function updateUser(req, res) {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const before = { name: user.name, email: user.email, status: user.status }
    if (typeof req.body.name === "string" && req.body.name.trim()) user.name = req.body.name.trim()
    if (typeof req.body.email === "string" && req.body.email.trim()) {
      user.email = req.body.email.trim().toLowerCase()
    }
    if (req.body.status === "active" || req.body.status === "suspended") {
      user.status = req.body.status
    }
    user.updatedBy = req.user._id
    await user.save()

    await writeAudit({
      action: AuditActions.USER_UPDATE,
      actor: req.user,
      targetType: "User",
      targetId: user._id,
      metadata: { before, after: { name: user.name, email: user.email, status: user.status } },
      req,
    })

    res.json({ success: true, data: { user: publicUser(user) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Update failed" })
  }
}

/** PATCH /admin/users/:id/role */
export async function changeUserRole(req, res) {
  try {
    const nextRole = normalizeRole(req.body.role)
    if (!ASSIGNABLE_ROLES.includes(nextRole)) {
      return res.status(400).json({ success: false, message: "Invalid role" })
    }

    const actorPrincipal = { role: effectiveRoleForUser(req.user), permissions: req.auth?.permissions }
    if (!canAssignRole(actorPrincipal, nextRole)) {
      return res.status(403).json({
        success: false,
        message: "Privilege escalation denied — you cannot assign this role",
      })
    }

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const targetCurrent = effectiveRoleForUser(user)
    // Cannot modify equal/higher ranked accounts unless super_admin
    if (
      ROLE_RANK[targetCurrent] >= ROLE_RANK[actorPrincipal.role] &&
      actorPrincipal.role !== ROLES.SUPER_ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Cannot modify a user with equal or higher privilege",
      })
    }

    const previousRole = user.role
    user.role = nextRole
    if (Array.isArray(req.body.permissions)) {
      user.permissions = req.body.permissions.map(String)
    }
    user.updatedBy = req.user._id
    await user.save()

    await writeAudit({
      action: AuditActions.ROLE_CHANGE,
      actor: req.user,
      targetType: "User",
      targetId: user._id,
      metadata: { previousRole, nextRole, permissions: user.permissions },
      req,
    })

    const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
    publishAsync(
      DOMAIN_EVENTS.ROLE_CHANGED,
      {
        userId: String(user._id),
        email: user.email,
        previousRole,
        nextRole,
        actor: req.user,
        auditAlreadyWritten: true,
        targetId: String(user._id),
      },
      { source: "adminController.changeRole", userId: String(user._id), dedupeKey: `role:${user._id}:${nextRole}` },
    )

    res.json({ success: true, data: { user: publicUser(user) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Role change failed" })
  }
}

/** POST /admin/users/:id/suspend */
export async function suspendUser(req, res) {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "Cannot suspend yourself" })
    }
    user.status = "suspended"
    user.updatedBy = req.user._id
    await user.save()
    await writeAudit({
      action: AuditActions.USER_SUSPEND,
      actor: req.user,
      targetType: "User",
      targetId: user._id,
      req,
    })
    res.json({ success: true, data: { user: publicUser(user) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** POST /admin/users/:id/activate */
export async function activateUser(req, res) {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })
    user.status = "active"
    user.updatedBy = req.user._id
    await user.save()
    await writeAudit({
      action: AuditActions.USER_ACTIVATE,
      actor: req.user,
      targetType: "User",
      targetId: user._id,
      req,
    })
    res.json({ success: true, data: { user: publicUser(user) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** DELETE /admin/users/:id */
export async function deleteUser(req, res) {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "Cannot delete yourself" })
    }
    const actorRole = effectiveRoleForUser(req.user)
    const targetRole = effectiveRoleForUser(user)
    if (ROLE_RANK[targetRole] >= ROLE_RANK[actorRole] && actorRole !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ success: false, message: "Cannot delete equal or higher privilege user" })
    }
    const id = user._id
    const email = user.email
    await user.deleteOne()
    await writeAudit({
      action: AuditActions.USER_DELETE,
      actor: req.user,
      targetType: "User",
      targetId: id,
      metadata: { email },
      req,
    })
    res.json({ success: true, message: "User deleted" })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** POST /admin/users/:id/reset-password */
export async function adminResetPassword(req, res) {
  try {
    const user = await User.findById(req.params.id).select("+password")
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const tempPassword =
      typeof req.body.password === "string" && req.body.password.length >= 6
        ? req.body.password
        : crypto.randomBytes(9).toString("base64url")

    user.password = tempPassword
    user.updatedBy = req.user._id
    await user.save()

    await writeAudit({
      action: AuditActions.PASSWORD_RESET_ADMIN,
      actor: req.user,
      targetType: "User",
      targetId: user._id,
      metadata: { generated: !req.body.password },
      req,
    })

    res.json({
      success: true,
      message: "Password reset",
      data: { temporaryPassword: tempPassword },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/trips */
export async function listTrips(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit
    const q = String(req.query.q || "").trim()
    const filter = {}
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { destination: { $regex: q, $options: "i" } },
      ]
    }
    const [total, trips] = await Promise.all([
      Itinerary.countDocuments(filter),
      Itinerary.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ])
    res.json({
      success: true,
      data: { trips, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/bookings */
export async function listBookingsAdmin(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit
    const [total, bookings] = await Promise.all([
      Booking.countDocuments(),
      Booking.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ])
    res.json({
      success: true,
      data: { bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/documents */
export async function listDocumentsAdmin(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit
    const [total, documents] = await Promise.all([
      TravelDocument.countDocuments(),
      TravelDocument.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ])
    res.json({
      success: true,
      data: { documents, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/analytics */
export async function getAdminAnalytics(req, res) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [newUsers, newTrips, newBookings, roleBreakdown] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Itinerary.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }).catch(() => 0),
      Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }).catch(() => 0),
      getUserCountByRole(),
    ])
    res.json({
      success: true,
      data: {
        last30Days: { newUsers, newTrips, newBookings },
        usersByRole: roleBreakdown,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/notifications/overview — count only (notifications belong to users) */
export async function getNotificationsOverview(req, res) {
  try {
    let Notification
    try {
      Notification = (await import("../models/Notification.js")).default
    } catch {
      return res.json({ success: true, data: { total: 0, unread: 0 } })
    }
    const [total, unread] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ status: "UNREAD" }),
    ])
    res.json({ success: true, data: { total, unread } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/roles */
export async function listRoles(req, res) {
  const roles = Object.keys(ROLE_PERMISSIONS)
    .filter((r) => r !== ROLES.GUEST)
    .map((role) => ({
      role,
      rank: ROLE_RANK[role],
      permissions: permissionsForRole(role),
      assignable: ASSIGNABLE_ROLES.includes(role),
    }))
  res.json({ success: true, data: { roles, permissionsCatalog: Object.values(PERMISSIONS) } })
}

/** GET /admin/audit */
export async function listAuditLogs(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30))
    const skip = (page - 1) * limit
    const filter = {}
    if (req.query.action) filter.action = req.query.action
    if (req.query.actorId) filter.actorId = req.query.actorId

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ])
    res.json({
      success: true,
      data: { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const SETTINGS_KEY = "system"

/** GET /admin/settings */
export async function getSettings(req, res) {
  try {
    const doc = await SystemSettings.findOne({ key: SETTINGS_KEY })
    res.json({
      success: true,
      data: {
        settings: doc?.value || {
          maintenanceMode: false,
          allowSignups: true,
          aiEnabled: true,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** PUT /admin/settings */
export async function updateSettings(req, res) {
  try {
    const value = req.body?.settings || req.body || {}
    const doc = await SystemSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { value, updatedBy: req.user._id },
      { upsert: true, new: true },
    )
    await writeAudit({
      action: AuditActions.SETTINGS_UPDATE,
      actor: req.user,
      targetType: "SystemSettings",
      targetId: SETTINGS_KEY,
      metadata: { value: doc.value },
      req,
    })
    res.json({ success: true, data: { settings: doc.value } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/api-keys — metadata only (never expose raw secrets) */
export async function getApiKeysMeta(req, res) {
  const mask = (envName) => ({
    name: envName,
    configured: Boolean(process.env[envName]),
  })
  res.json({
    success: true,
    data: {
      keys: [
        mask("OPENAI_API_KEY"),
        mask("AWS_ACCESS_KEY_ID"),
        mask("JWT_SECRET"),
        mask("REDIS_URL"),
      ],
    },
  })
}

/** GET /admin/events — domain event bus monitoring */
export async function getEventsMonitoring(req, res) {
  try {
    const { eventMetrics } = await import("../events/metrics.js")
    const { listSubscribers } = await import("../events/EventBus.js")
    const { DOMAIN_EVENTS } = await import("../events/catalog.js")
    res.json({
      success: true,
      data: {
        ...eventMetrics.getSnapshot(),
        catalog: Object.values(DOMAIN_EVENTS),
        subscribers: listSubscribers(),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/queues — BullMQ dashboard */
export async function getQueuesDashboard(req, res) {
  try {
    const { getQueueDashboard } = await import("../queues/dashboard.js")
    const data = await getQueueDashboard()
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** POST /admin/queues/:queueName/jobs/:jobId/retry */
export async function retryQueueJob(req, res) {
  try {
    const { retryFailedJob } = await import("../queues/dashboard.js")
    const data = await retryFailedJob(req.params.queueName, req.params.jobId)
    res.json({ success: true, data })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

/** POST /admin/queues/dead-letter/:jobId/requeue */
export async function requeueDeadLetterJob(req, res) {
  try {
    const { requeueFromDeadLetter } = await import("../queues/dashboard.js")
    const data = await requeueFromDeadLetter(req.params.jobId)
    res.json({ success: true, data })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

export { publicUser }

