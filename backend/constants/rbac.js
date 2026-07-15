/**
 * Enterprise RBAC — roles, permissions, hierarchy.
 * Legacy `user` / `admin` remain valid; ADMIN_EMAILS maps to admin powers.
 */

export const ROLES = Object.freeze({
  GUEST: "guest",
  USER: "user",
  PREMIUM: "premium",
  SUPPORT: "support",
  MODERATOR: "moderator",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
})

/** Higher number = more privilege (used to block escalation). */
export const ROLE_RANK = Object.freeze({
  [ROLES.GUEST]: 0,
  [ROLES.USER]: 1,
  [ROLES.PREMIUM]: 2,
  [ROLES.SUPPORT]: 3,
  [ROLES.MODERATOR]: 4,
  [ROLES.ADMIN]: 5,
  [ROLES.SUPER_ADMIN]: 6,
})

export const PERMISSIONS = Object.freeze({
  // User capabilities
  TRIPS_CREATE: "trips:create",
  TRIPS_MANAGE: "trips:manage",
  BOOKINGS_MANAGE: "bookings:manage",
  EXPENSES_MANAGE: "expenses:manage",
  DOCUMENTS_UPLOAD: "documents:upload",
  AI_USE: "ai:use",

  // Support
  SUPPORT_VIEW_REPORTS: "support:reports:view",
  SUPPORT_ASSIST: "support:assist",

  // Moderator
  MOD_REVIEW_ITINERARIES: "moderation:itineraries",
  MOD_REVIEWS: "moderation:reviews",
  MOD_REPORTS: "moderation:reports",

  // Admin
  ADMIN_USERS: "admin:users",
  ADMIN_ANALYTICS: "admin:analytics",
  ADMIN_BOOKINGS: "admin:bookings",
  ADMIN_BLOGS: "admin:blogs",
  ADMIN_AI_CONFIG: "admin:ai:config",
  ADMIN_DESTINATIONS: "admin:destinations",
  ADMIN_MONITORING: "admin:monitoring",
  ADMIN_NOTIFICATIONS: "admin:notifications",
  ADMIN_TRIPS: "admin:trips",
  ADMIN_DOCUMENTS: "admin:documents",
  ADMIN_AUDIT: "admin:audit",

  // Super admin
  SUPER_ROLES: "super:roles",
  SUPER_ADMINS: "super:admins",
  SUPER_SETTINGS: "super:settings",
  SUPER_API_KEYS: "super:api_keys",
  SUPER_TENANTS: "super:tenants",
})

const P = PERMISSIONS

const USER_PERMS = [
  P.TRIPS_CREATE,
  P.TRIPS_MANAGE,
  P.BOOKINGS_MANAGE,
  P.EXPENSES_MANAGE,
  P.DOCUMENTS_UPLOAD,
  P.AI_USE,
]

const PREMIUM_PERMS = [...USER_PERMS]

const SUPPORT_PERMS = [
  ...USER_PERMS,
  P.SUPPORT_VIEW_REPORTS,
  P.SUPPORT_ASSIST,
]

const MODERATOR_PERMS = [
  ...USER_PERMS,
  P.MOD_REVIEW_ITINERARIES,
  P.MOD_REVIEWS,
  P.MOD_REPORTS,
]

const ADMIN_PERMS = [
  ...MODERATOR_PERMS,
  ...SUPPORT_PERMS.filter((x) => !MODERATOR_PERMS.includes(x)),
  P.ADMIN_USERS,
  P.ADMIN_ANALYTICS,
  P.ADMIN_BOOKINGS,
  P.ADMIN_BLOGS,
  P.ADMIN_AI_CONFIG,
  P.ADMIN_DESTINATIONS,
  P.ADMIN_MONITORING,
  P.ADMIN_NOTIFICATIONS,
  P.ADMIN_TRIPS,
  P.ADMIN_DOCUMENTS,
  P.ADMIN_AUDIT,
]

const SUPER_PERMS = [
  ...ADMIN_PERMS,
  P.SUPER_ROLES,
  P.SUPER_ADMINS,
  P.SUPER_SETTINGS,
  P.SUPER_API_KEYS,
  P.SUPER_TENANTS,
]

/** Default permissions granted by role (db overrides merge on top). */
export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.GUEST]: [],
  [ROLES.USER]: USER_PERMS,
  [ROLES.PREMIUM]: PREMIUM_PERMS,
  [ROLES.SUPPORT]: [...new Set(SUPPORT_PERMS)],
  [ROLES.MODERATOR]: [...new Set(MODERATOR_PERMS)],
  [ROLES.ADMIN]: [...new Set(ADMIN_PERMS)],
  [ROLES.SUPER_ADMIN]: [...new Set(SUPER_PERMS)],
})

export const STAFF_ROLES = [ROLES.SUPPORT, ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN]
export const ADMIN_PORTAL_ROLES = STAFF_ROLES

export const ASSIGNABLE_ROLES = [
  ROLES.USER,
  ROLES.PREMIUM,
  ROLES.SUPPORT,
  ROLES.MODERATOR,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]

export function normalizeRole(role) {
  const r = String(role || ROLES.USER).toLowerCase().trim()
  if (r === "superadmin" || r === "super-admin") return ROLES.SUPER_ADMIN
  if (Object.values(ROLES).includes(r)) return r
  return ROLES.USER
}

export function roleRank(role) {
  return ROLE_RANK[normalizeRole(role)] ?? 0
}

export function permissionsForRole(role) {
  return [...(ROLE_PERMISSIONS[normalizeRole(role)] || [])]
}

/**
 * Effective permissions = role defaults ∪ user.permissions overrides.
 */
export function resolvePermissions(userLike = {}) {
  const role = normalizeRole(userLike.role)
  const fromRole = permissionsForRole(role)
  const extras = Array.isArray(userLike.permissions) ? userLike.permissions.map(String) : []
  return [...new Set([...fromRole, ...extras])]
}

export function hasPermission(userLike, permission) {
  if (!permission) return true
  const perms = resolvePermissions(userLike)
  return perms.includes(permission)
}

export function hasAnyPermission(userLike, list = []) {
  if (!list.length) return true
  return list.some((p) => hasPermission(userLike, p))
}

export function hasRole(userLike, roles = []) {
  const role = normalizeRole(userLike?.role)
  const wanted = (Array.isArray(roles) ? roles : [roles]).map(normalizeRole)
  return wanted.includes(role)
}

export function canAccessAdminPortal(userLike) {
  return hasRole(userLike, ADMIN_PORTAL_ROLES) || hasPermission(userLike, P.ADMIN_MONITORING)
}

/**
 * Actor may only assign a role strictly below their own rank
 * (super_admin may assign any including admin; only super_admin may assign super_admin).
 */
export function canAssignRole(actor, targetRole) {
  const actorRole = normalizeRole(actor?.role)
  const next = normalizeRole(targetRole)
  if (!ASSIGNABLE_ROLES.includes(next)) return false
  if (next === ROLES.SUPER_ADMIN) return actorRole === ROLES.SUPER_ADMIN
  if (next === ROLES.ADMIN) {
    return actorRole === ROLES.SUPER_ADMIN || hasPermission(actor, P.SUPER_ADMINS)
  }
  return roleRank(actorRole) > roleRank(next)
}

export function adminEmailsFromEnv() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Bootstrap elevate: ADMIN_EMAILS → admin (not super_admin). */
export function effectiveRoleForUser(user) {
  if (!user) return ROLES.GUEST
  const role = normalizeRole(user.role)
  if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) return role
  const email = String(user.email || "").toLowerCase()
  if (email && adminEmailsFromEnv().includes(email)) return ROLES.ADMIN
  return role
}

export function toAuthPrincipal(user) {
  const role = effectiveRoleForUser(user)
  const permissions = resolvePermissions({ ...user?.toObject?.() || user, role })
  return {
    id: String(user._id || user.id),
    role,
    permissions,
    tenantId: user.tenantId ? String(user.tenantId) : null,
    tenantRole: user.tenantRole || null,
  }
}
