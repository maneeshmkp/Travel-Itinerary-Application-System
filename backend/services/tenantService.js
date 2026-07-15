import mongoose from "mongoose"
import Tenant from "../models/Tenant.js"
import User from "../models/User.js"
import Itinerary from "../models/Itinerary.js"
import Booking from "../models/Booking.js"
import TripExpense from "../models/TripExpense.js"
import TravelDocument from "../models/TravelDocument.js"
import Notification from "../models/Notification.js"
import {
  PLANS,
  PLAN_LIMITS,
  TENANT_ROLES,
  TENANT_STATUSES,
  getPlanLimits,
  isWithinLimit,
} from "../constants/plans.js"
import { writeAudit, AuditActions } from "./auditService.js"
import { runWithTenantContext } from "../utils/tenantScope.js"

function slugify(input) {
  return String(input || "org")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "org"
}

async function uniqueSlug(base) {
  let slug = slugify(base)
  let i = 0
  while (await Tenant.exists({ slug })) {
    i += 1
    slug = `${slugify(base)}-${i}`
  }
  return slug
}

export async function createTenant({
  name,
  slug,
  plan = PLANS.FREE,
  ownerId = null,
  logo = "",
  settings = {},
}) {
  const tenant = await Tenant.create({
    name: name || "Personal Workspace",
    slug: slug || (await uniqueSlug(name || "workspace")),
    plan,
    status: TENANT_STATUSES.ACTIVE,
    owner: ownerId,
    logo,
    settings,
    usage: { users: ownerId ? 1 : 0 },
  })
  return tenant
}

/** Create a personal tenant for a brand-new user (signup). */
export async function createPersonalTenantForUser(user) {
  const tenant = await createTenant({
    name: `${user.name}'s Workspace`,
    slug: await uniqueSlug(user.email?.split("@")[0] || user.name),
    plan: PLANS.FREE,
    ownerId: user._id,
  })
  user.tenantId = tenant._id
  user.tenantRole = TENANT_ROLES.OWNER
  await user.save({ validateBeforeSave: false })
  return tenant
}

/**
 * Ensure user has a tenant (existing accounts) and optionally backfill their rows.
 */
export async function ensureUserTenant(user) {
  if (user.tenantId) {
    const t = await Tenant.findById(user.tenantId)
    if (t) return t
  }
  const tenant = await createPersonalTenantForUser(user)
  await backfillUserTenantData(user._id, tenant._id)
  return tenant
}

async function backfillUserTenantData(userId, tenantId) {
  await Promise.all([
    Itinerary.updateMany(
      { ownerId: userId, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
      { $set: { tenantId } },
    ),
    Booking.updateMany(
      { userId, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
      { $set: { tenantId } },
    ),
    TripExpense.updateMany(
      { userId, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
      { $set: { tenantId } },
    ),
    TravelDocument.updateMany(
      { userId, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
      { $set: { tenantId } },
    ),
    Notification.updateMany(
      { user: userId, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
      { $set: { tenantId } },
    ),
  ])
}

export async function resolveTenantFromRequest(req) {
  const headerId = req.headers["x-tenant-id"] || req.headers["x-tenant"]
  const host = req.headers["x-forwarded-host"] || req.headers.host || ""
  const subdomain = String(host).split(":")[0].split(".")[0]

  // 1) Explicit header (members switching / API clients)
  if (headerId && mongoose.isValidObjectId(headerId)) {
    const t = await Tenant.findById(headerId)
    if (t && t.status !== TENANT_STATUSES.SUSPENDED) return t
  }

  // 2) Subdomain slug (skip localhost / www / api)
  if (subdomain && !["localhost", "www", "api", "127"].includes(subdomain)) {
    const t = await Tenant.findOne({ slug: subdomain.toLowerCase() })
    if (t && t.status !== TENANT_STATUSES.SUSPENDED) return t
  }

  // 3) Authenticated user's tenant
  if (req.user?.tenantId) {
    const t = await Tenant.findById(req.user.tenantId)
    if (t) return t
  }

  return null
}

export async function refreshTenantUsage(tenantId) {
  if (!tenantId) return null
  return runWithTenantContext({ bypass: true }, async () => {
    const oid = new mongoose.Types.ObjectId(String(tenantId))
    const [users, trips, documents, expenses, storageAgg] = await Promise.all([
      User.countDocuments({ tenantId }),
      Itinerary.countDocuments({ tenantId }),
      TravelDocument.countDocuments({ tenantId }),
      TripExpense.countDocuments({ tenantId }),
      TravelDocument.aggregate([{ $match: { tenantId: oid } }, { $group: { _id: null, bytes: { $sum: "$fileSize" } } }]),
    ])
    const storageBytes = storageAgg[0]?.bytes || 0
    await Tenant.updateOne(
      { _id: tenantId },
      {
        $set: {
          "usage.users": users,
          "usage.trips": trips,
          "usage.documents": documents,
          "usage.expenses": expenses,
          "usage.storageBytes": storageBytes,
          "usage.updatedAt": new Date(),
        },
      },
    )
    return Tenant.findById(tenantId)
  })
}

export async function incrementTenantUsage(tenantId, fields = {}) {
  if (!tenantId) return
  const inc = {}
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "number" && v !== 0) inc[`usage.${k}`] = v
  }
  if (!Object.keys(inc).length) return
  await Tenant.updateOne({ _id: tenantId }, { $inc: inc, $set: { "usage.updatedAt": new Date() } })
}

export function checkPlanLimit(tenant, resource) {
  if (!tenant) return { ok: true, bypass: true }
  const limits = getPlanLimits(tenant.plan)
  const usage = tenant.usage || {}
  const map = {
    users: usage.users,
    trips: usage.trips,
    aiRequests: usage.aiRequests,
    storageBytes: usage.storageBytes,
    documents: usage.documents,
  }
  const limit = limits[resource]
  const used = map[resource] ?? 0
  const ok = isWithinLimit(used, limit)
  return {
    ok,
    resource,
    used,
    limit,
    plan: tenant.plan,
    message: ok
      ? null
      : `Plan limit reached for ${resource} (${limits.label || tenant.plan}: ${used}/${limit})`,
  }
}

export { PLANS, PLAN_LIMITS, TENANT_ROLES, getPlanLimits }

export async function auditTenantAction(req, action, metadata = {}) {
  await writeAudit({
    action: action || AuditActions.ADMIN_ACTION,
    actor: req.user,
    targetType: "Tenant",
    targetId: req.tenant?._id || req.tenantId,
    metadata: { ...metadata, tenantId: String(req.tenantId || "") },
    req,
  })
}
