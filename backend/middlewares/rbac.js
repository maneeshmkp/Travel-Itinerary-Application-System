/**
 * RBAC middleware — authorize / requireRole / requirePermission.
 * Requires `protect` (or optionalProtect with user) first where auth is needed.
 */
import AppError, { ErrorCodes } from "../utils/AppError.js"
import {
  canAccessAdminPortal,
  effectiveRoleForUser,
  hasAnyPermission,
  hasPermission,
  hasRole,
  normalizeRole,
  resolvePermissions,
  ROLES,
} from "../constants/rbac.js"
import { writeAudit, AuditActions } from "../services/auditService.js"
import { recordSecurityEvent } from "../services/security/securityMetrics.js"

function deny(next, message = "Forbidden", status = 403, req = null) {
  if (req) {
    recordSecurityEvent("permission_denied", {
      message,
      path: req.originalUrl,
      userId: req.user?._id ? String(req.user._id) : null,
      ip: req.ip,
    })
    writeAudit({
      action: AuditActions.PERMISSION_DENIED,
      actor: req.user,
      metadata: { message, path: req.originalUrl },
      success: false,
      req,
    }).catch(() => {})
  }
  return next(new AppError(message, status, ErrorCodes.AUTHORIZATION_ERROR))
}

function principalFromReq(req) {
  if (!req.user) return null
  const role = effectiveRoleForUser(req.user)
  const permissions =
    Array.isArray(req.auth?.permissions) && req.auth.permissions.length
      ? req.auth.permissions
      : resolvePermissions({ ...req.user.toObject?.() || req.user, role })
  return { user: req.user, role, permissions }
}

/** Attach req.auth = { role, permissions } after protect. */
export function attachAuthContext(req, _res, next) {
  if (req.user) {
    const role = effectiveRoleForUser(req.user)
    req.auth = {
      role,
      permissions: resolvePermissions({ ...(req.user.toObject?.() || req.user), role }),
    }
    // Keep mongoose doc role in sync for ADMIN_EMAILS bootstrap without writing DB
    req.user._effectiveRole = role
  } else {
    req.auth = { role: ROLES.GUEST, permissions: [] }
  }
  next()
}

/**
 * Generic gate: roles and/or permissions (OR within each list, AND across groups if both set).
 * @param {{ roles?: string[], permissions?: string[], requireAllPermissions?: boolean }} opts
 */
export function authorize(opts = {}) {
  const {
    roles = [],
    permissions = [],
    requireAllPermissions = false,
    allowGuest = false,
  } = opts

  return (req, res, next) => {
    const principal = principalFromReq(req)
    if (!principal) {
      if (allowGuest) return next()
      return deny(next, "Authentication required", 401, req)
    }

    if (principal.user.status === "suspended") {
      return deny(next, "Account suspended", 403, req)
    }

    let ok = true
    if (roles.length) {
      ok = hasRole({ role: principal.role }, roles)
    }
    if (ok && permissions.length) {
      ok = requireAllPermissions
        ? permissions.every((p) => hasPermission({ role: principal.role, permissions: principal.permissions }, p))
        : hasAnyPermission({ role: principal.role, permissions: principal.permissions }, permissions)
    }
    if (!roles.length && !permissions.length) {
      ok = true // authenticated only
    }

    if (!ok) return deny(next, "Insufficient permissions", 403, req)
    next()
  }
}

export function requireRole(...roles) {
  const list = roles.flat()
  return authorize({ roles: list })
}

export function requirePermission(...permissions) {
  const list = permissions.flat()
  return authorize({ permissions: list })
}

export function requireAllPermissions(...permissions) {
  return authorize({ permissions: permissions.flat(), requireAllPermissions: true })
}

/** Staff / admin portal gate */
export function requireStaff(req, res, next) {
  const principal = principalFromReq(req)
  if (!principal) return deny(next, "Authentication required", 401, req)
  if (!canAccessAdminPortal({ role: principal.role, permissions: principal.permissions })) {
    return deny(next, "Admin portal access required", 403, req)
  }
  next()
}

/**
 * Backward-compatible admin check (monitoring + legacy AdminRoute).
 * Allows role admin | super_admin, ADMIN_EMAILS, or admin:monitoring permission.
 */
export function requireAdmin(req, res, next) {
  const principal = principalFromReq(req)
  if (!principal) return deny(next, "Authentication required", 401, req)
  const ok =
    hasRole({ role: principal.role }, [ROLES.ADMIN, ROLES.SUPER_ADMIN]) ||
    hasPermission({ role: principal.role, permissions: principal.permissions }, "admin:monitoring")
  if (!ok) return deny(next, "Admin access required", 403, req)
  next()
}

export function isAdminUser(user) {
  if (!user) return false
  const role = effectiveRoleForUser(user)
  return hasRole({ role }, [ROLES.ADMIN, ROLES.SUPER_ADMIN])
}

export default {
  authorize,
  requireRole,
  requirePermission,
  requireAllPermissions,
  requireStaff,
  requireAdmin,
  attachAuthContext,
  isAdminUser,
}
