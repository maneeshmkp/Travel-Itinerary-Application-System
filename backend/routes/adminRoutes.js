import { Router } from "express"
import { protect } from "../middlewares/authMiddleware.js"
import {
  attachAuthContext,
  requirePermission,
  requireRole,
  requireStaff,
} from "../middlewares/rbac.js"
import { PERMISSIONS, ROLES } from "../constants/rbac.js"
import {
  activateUser,
  adminResetPassword,
  changeUserRole,
  deleteUser,
  getAdminAnalytics,
  getApiKeysMeta,
  getDashboard,
  getNotificationsOverview,
  getSettings,
  getUser,
  listAuditLogs,
  listBookingsAdmin,
  listDocumentsAdmin,
  listRoles,
  listTrips,
  listUsers,
  suspendUser,
  updateSettings,
  updateUser,
  getEventsMonitoring,
  getQueuesDashboard,
  retryQueueJob,
  requeueDeadLetterJob,
} from "../controllers/adminController.js"
import {
  listTenants,
  createTenantAdmin,
  getTenantAdmin,
  updateTenantAdmin,
  getTenantUsage,
  listPlans,
  getMyTenantUsage,
  getTenantsMetrics,
} from "../controllers/tenantController.js"
import {
  getSecurityDashboard,
  listActiveSessionsAdmin,
} from "../controllers/securityController.js"

const router = Router()

router.use(protect, attachAuthContext, requireStaff)

router.get("/dashboard", getDashboard)

router.get("/users", requirePermission(PERMISSIONS.ADMIN_USERS, PERMISSIONS.SUPPORT_ASSIST), listUsers)
router.get("/users/:id", requirePermission(PERMISSIONS.ADMIN_USERS, PERMISSIONS.SUPPORT_ASSIST), getUser)
router.patch("/users/:id", requirePermission(PERMISSIONS.ADMIN_USERS), updateUser)
router.patch("/users/:id/role", requirePermission(PERMISSIONS.ADMIN_USERS), changeUserRole)
router.post("/users/:id/suspend", requirePermission(PERMISSIONS.ADMIN_USERS), suspendUser)
router.post("/users/:id/activate", requirePermission(PERMISSIONS.ADMIN_USERS), activateUser)
router.delete("/users/:id", requirePermission(PERMISSIONS.ADMIN_USERS), deleteUser)
router.post("/users/:id/reset-password", requirePermission(PERMISSIONS.ADMIN_USERS), adminResetPassword)

router.get("/trips", requirePermission(PERMISSIONS.ADMIN_TRIPS), listTrips)
router.get("/bookings", requirePermission(PERMISSIONS.ADMIN_BOOKINGS), listBookingsAdmin)
router.get("/documents", requirePermission(PERMISSIONS.ADMIN_DOCUMENTS), listDocumentsAdmin)
router.get("/analytics", requirePermission(PERMISSIONS.ADMIN_ANALYTICS), getAdminAnalytics)
router.get("/notifications/overview", requirePermission(PERMISSIONS.ADMIN_NOTIFICATIONS), getNotificationsOverview)

router.get("/roles", requirePermission(PERMISSIONS.SUPER_ROLES, PERMISSIONS.ADMIN_USERS), listRoles)
router.get("/audit", requirePermission(PERMISSIONS.ADMIN_AUDIT), listAuditLogs)
router.get("/events", requirePermission(PERMISSIONS.ADMIN_MONITORING, PERMISSIONS.ADMIN_AUDIT), getEventsMonitoring)
router.get("/queues", requirePermission(PERMISSIONS.ADMIN_MONITORING), getQueuesDashboard)
router.post("/queues/:queueName/jobs/:jobId/retry", requirePermission(PERMISSIONS.ADMIN_MONITORING), retryQueueJob)
router.post("/queues/dead-letter/:jobId/requeue", requirePermission(PERMISSIONS.ADMIN_MONITORING), requeueDeadLetterJob)

router.get("/security", requirePermission(PERMISSIONS.ADMIN_MONITORING, PERMISSIONS.ADMIN_AUDIT), getSecurityDashboard)
router.get("/security/sessions", requirePermission(PERMISSIONS.ADMIN_MONITORING, PERMISSIONS.ADMIN_USERS), listActiveSessionsAdmin)

router.get("/tenants/plans", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_TENANTS, PERMISSIONS.SUPER_SETTINGS), listPlans)
router.get("/tenants/metrics", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_TENANTS, PERMISSIONS.SUPER_SETTINGS, PERMISSIONS.ADMIN_MONITORING), getTenantsMetrics)
router.get("/tenants", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_TENANTS, PERMISSIONS.SUPER_SETTINGS), listTenants)
router.post("/tenants", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_TENANTS, PERMISSIONS.SUPER_SETTINGS), createTenantAdmin)
router.get("/tenants/:id", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_TENANTS, PERMISSIONS.SUPER_SETTINGS), getTenantAdmin)
router.patch("/tenants/:id", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_TENANTS, PERMISSIONS.SUPER_SETTINGS), updateTenantAdmin)
router.get("/tenants/:id/usage", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_TENANTS, PERMISSIONS.SUPER_SETTINGS), getTenantUsage)
router.get("/usage/me", getMyTenantUsage)

router.get("/settings", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_SETTINGS), getSettings)
router.put("/settings", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_SETTINGS), updateSettings)
router.get("/api-keys", requireRole(ROLES.SUPER_ADMIN), requirePermission(PERMISSIONS.SUPER_API_KEYS), getApiKeysMeta)

export default router
