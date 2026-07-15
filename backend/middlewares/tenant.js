/**
 * Tenant resolution + plan limit middleware.
 */
import AppError, { ErrorCodes } from "../utils/AppError.js"
import { ROLES, effectiveRoleForUser } from "../constants/rbac.js"
import { TENANT_STATUSES } from "../constants/plans.js"
import {
  resolveTenantFromRequest,
  ensureUserTenant,
  checkPlanLimit,
  incrementTenantUsage,
} from "../services/tenantService.js"
import { enterTenantContext } from "../utils/tenantScope.js"

function deny(next, message, status = 403) {
  return next(new AppError(message, status, ErrorCodes.AUTHORIZATION_ERROR))
}

/**
 * Resolve tenant from subdomain / X-Tenant-ID / user.tenantId.
 * Must run after protect (when authenticated) or after optionalProtect.
 * Wraps the rest of the request in AsyncLocalStorage for mongoose plugins.
 */
export async function resolveTenant(req, res, next) {
  try {
    const platformRole = req.user ? effectiveRoleForUser(req.user) : null
    const isSuper = platformRole === ROLES.SUPER_ADMIN

    // Lazy-provision personal tenant for legacy accounts
    if (req.user && !req.user.tenantId && !isSuper) {
      await ensureUserTenant(req.user)
    }

    let tenant = await resolveTenantFromRequest(req)

    // Authenticated non-super users may only use their own tenant
    if (req.user && tenant && !isSuper) {
      if (String(req.user.tenantId) !== String(tenant._id)) {
        return deny(next, "Cross-tenant access denied")
      }
    }

    if (req.user && !tenant && req.user.tenantId) {
      const Tenant = (await import("../models/Tenant.js")).default
      tenant = await Tenant.findById(req.user.tenantId)
    }

    if (tenant?.status === TENANT_STATUSES.SUSPENDED && !isSuper) {
      return deny(next, "Tenant suspended", 403)
    }

    req.tenant = tenant || null
    req.tenantId = tenant?._id ? String(tenant._id) : req.user?.tenantId ? String(req.user.tenantId) : null
    req.tenantRole = req.user?.tenantRole || null
    req.tenantBypass = Boolean(isSuper)

    const ctx = {
      tenantId: req.tenantBypass ? null : req.tenantId,
      bypass: req.tenantBypass,
      tenantRole: req.tenantRole,
    }

    // Track API usage for the resolved tenant
    if (req.tenantId && !req.tenantBypass) {
      incrementTenantUsage(req.tenantId, { apiRequests: 1 }).catch(() => {})
    }

    enterTenantContext(ctx)
    next()
  } catch (err) {
    next(err)
  }
}

/** Require an authenticated tenant context (non-super). */
export function requireTenant(req, res, next) {
  if (req.tenantBypass) return next()
  if (!req.tenantId) return deny(next, "Tenant context required", 400)
  next()
}

/**
 * Enforce plan limits: requirePlanLimit("trips" | "users" | "aiRequests" | "documents" | "storageBytes")
 */
export function requirePlanLimit(resource) {
  return (req, res, next) => {
    if (req.tenantBypass) return next()
    if (!req.tenant) return next()
    const result = checkPlanLimit(req.tenant, resource)
    if (!result.ok) {
      return res.status(402).json({
        success: false,
        code: "PLAN_LIMIT_EXCEEDED",
        message: result.message,
        data: result,
      })
    }
    next()
  }
}

/** Mark AI usage after successful AI responses (call from controllers optionally). */
export function trackAiUsage(req) {
  if (req.tenantId && !req.tenantBypass) {
    incrementTenantUsage(req.tenantId, { aiRequests: 1 }).catch(() => {})
  }
}

/** Express middleware: bump aiRequests when response succeeds (2xx). */
export function trackAiUsageOnSuccess(req, res, next) {
  const end = res.end
  res.end = function patchedEnd(...args) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      trackAiUsage(req)
    }
    return end.apply(this, args)
  }
  next()
}

/**
 * Require one of the given tenant roles (owner | admin | member | guest).
 * Super admins bypass. Unauthenticated requests fail.
 */
export function requireTenantRole(...roles) {
  const allowed = new Set(roles.flat().map((r) => String(r).toLowerCase()))
  return (req, res, next) => {
    if (req.tenantBypass) return next()
    const role = String(req.tenantRole || req.user?.tenantRole || "").toLowerCase()
    if (!role || !allowed.has(role)) {
      return deny(next, "Insufficient tenant role")
    }
    next()
  }
}

export default {
  resolveTenant,
  requireTenant,
  requirePlanLimit,
  trackAiUsage,
  trackAiUsageOnSuccess,
  requireTenantRole,
}
