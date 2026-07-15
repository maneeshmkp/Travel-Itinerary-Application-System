/** Frontend RBAC helpers — mirrors backend role ranks for UI gates. */

export const ROLES = {
  GUEST: "guest",
  USER: "user",
  PREMIUM: "premium",
  SUPPORT: "support",
  MODERATOR: "moderator",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
}

export const STAFF_ROLES = [ROLES.SUPPORT, ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN]

export function hasPermission(user, permission) {
  if (!user || !permission) return false
  const perms = Array.isArray(user.permissions) ? user.permissions : []
  return perms.includes(permission)
}

export function hasAnyPermission(user, list = []) {
  return list.some((p) => hasPermission(user, p))
}

export function canAccessAdminPortal(user) {
  if (!user) return false
  // Super Admins use /super-admin — still "staff" for nav checks elsewhere
  if (STAFF_ROLES.includes(user.role)) return true
  return hasPermission(user, "admin:monitoring")
}

export function isSuperAdmin(user) {
  return user?.role === ROLES.SUPER_ADMIN
}

/** Staff who should land on /admin (not Super Admin). */
export function canAccessStaffAdminPortal(user) {
  if (!user || isSuperAdmin(user)) return false
  return canAccessAdminPortal(user)
}

export function portalHomeForUser(user) {
  if (isSuperAdmin(user)) return "/super-admin"
  if (canAccessAdminPortal(user)) return "/admin"
  return "/"
}

export function isAdminLike(user) {
  return user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN
}

export function roleLabel(role) {
  const map = {
    user: "User",
    premium: "Premium User",
    support: "Support",
    moderator: "Moderator",
    admin: "Admin",
    super_admin: "Super Admin",
    guest: "Guest",
  }
  return map[role] || role
}
