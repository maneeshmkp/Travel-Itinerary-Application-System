import AuditLog from "../models/AuditLog.js"
import { effectiveRoleForUser } from "../constants/rbac.js"
import { logAuth } from "../logger/index.js"

/**
 * Persist an audit event. Never throws to callers — logging must not break request flow.
 */
export async function writeAudit({
  action,
  actor = null,
  targetType = "",
  targetId = "",
  metadata = {},
  req = null,
  success = true,
}) {
  try {
    const actorId = actor?._id || actor?.id || null
    await AuditLog.create({
      action,
      actorId,
      actorEmail: actor?.email || "",
      actorRole: actor ? effectiveRoleForUser(actor) : "",
      targetType,
      targetId: targetId ? String(targetId) : "",
      metadata,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || "",
      userAgent: req?.headers?.["user-agent"] || "",
      success,
    })
  } catch (err) {
    logAuth.warn("Audit write failed", { action, message: err.message })
  }
}

export const AuditActions = Object.freeze({
  LOGIN: "auth.login",
  LOGIN_FAILED: "auth.login_failed",
  LOGOUT: "auth.logout",
  LOGOUT_ALL: "auth.logout_all",
  REFRESH: "auth.refresh",
  SIGNUP: "auth.signup",
  PASSWORD_CHANGE: "auth.password_change",
  ROLE_CHANGE: "user.role_change",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  USER_SUSPEND: "user.suspend",
  USER_ACTIVATE: "user.activate",
  PASSWORD_RESET_ADMIN: "user.password_reset_admin",
  ADMIN_ACTION: "admin.action",
  SETTINGS_UPDATE: "system.settings_update",
  PERMISSION_DENIED: "security.permission_denied",
  FILE_UPLOAD: "security.file_upload",
  SESSION_REVOKE: "security.session_revoke",
})

export default { writeAudit, AuditActions }
