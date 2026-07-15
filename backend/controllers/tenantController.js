/**
 * Super Admin — tenant / plan / usage management.
 */
import Tenant from "../models/Tenant.js"
import User from "../models/User.js"
import Itinerary from "../models/Itinerary.js"
import Booking from "../models/Booking.js"
import TravelDocument from "../models/TravelDocument.js"
import TripExpense from "../models/TripExpense.js"
import {
  PLANS,
  PLAN_LIMITS,
  TENANT_STATUSES,
  getPlanLimits,
} from "../constants/plans.js"
import { createTenant, refreshTenantUsage, auditTenantAction } from "../services/tenantService.js"
import { runWithTenantContext } from "../utils/tenantScope.js"
import { writeAudit, AuditActions } from "../services/auditService.js"

function publicTenant(t) {
  if (!t) return null
  const o = t.toObject?.() || t
  return {
    id: o._id,
    name: o.name,
    slug: o.slug,
    plan: o.plan,
    status: o.status,
    logo: o.logo || "",
    owner: o.owner,
    settings: o.settings || {},
    usage: o.usage || {},
    limits: getPlanLimits(o.plan),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

/** GET /admin/tenants */
export async function listTenants(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit
    const q = String(req.query.q || "").trim()
    const filter = {}
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
      ]
    }
    if (req.query.plan) filter.plan = req.query.plan
    if (req.query.status) filter.status = req.query.status

    const [total, rows] = await Promise.all([
      Tenant.countDocuments(filter),
      Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ])

    res.json({
      success: true,
      data: {
        tenants: rows.map(publicTenant),
        plans: PLAN_LIMITS,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** POST /admin/tenants */
export async function createTenantAdmin(req, res) {
  try {
    const { name, slug, plan, ownerEmail, logo } = req.body || {}
    if (!name) return res.status(400).json({ success: false, message: "name required" })

    let ownerId = null
    if (ownerEmail) {
      const owner = await User.findOne({ email: String(ownerEmail).toLowerCase() })
      if (!owner) return res.status(404).json({ success: false, message: "Owner user not found" })
      ownerId = owner._id
    }

    const tenant = await createTenant({
      name,
      slug,
      plan: plan || PLANS.FREE,
      ownerId,
      logo: logo || "",
    })

    if (ownerId) {
      await User.updateOne(
        { _id: ownerId },
        { $set: { tenantId: tenant._id, tenantRole: "owner" } },
      )
    }

    await writeAudit({
      action: AuditActions.ADMIN_ACTION,
      actor: req.user,
      targetType: "Tenant",
      targetId: tenant._id,
      metadata: { action: "tenant.create", name, plan: tenant.plan },
      req,
    })

    res.status(201).json({ success: true, data: { tenant: publicTenant(tenant) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/tenants/:id */
export async function getTenantAdmin(req, res) {
  try {
    const tenant = await refreshTenantUsage(req.params.id)
    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found" })
    const activeUsers = await User.countDocuments({ tenantId: tenant._id, status: "active" })
    res.json({
      success: true,
      data: {
        tenant: publicTenant(tenant),
        activeUsers,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** PATCH /admin/tenants/:id */
export async function updateTenantAdmin(req, res) {
  try {
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found" })

    const before = { plan: tenant.plan, status: tenant.status, name: tenant.name }
    if (typeof req.body.name === "string") tenant.name = req.body.name.trim()
    if (typeof req.body.logo === "string") tenant.logo = req.body.logo
    if (req.body.plan && PLAN_LIMITS[req.body.plan]) tenant.plan = req.body.plan
    if (req.body.status && Object.values(TENANT_STATUSES).includes(req.body.status)) {
      tenant.status = req.body.status
    }
    if (req.body.settings && typeof req.body.settings === "object") {
      tenant.settings = { ...(tenant.settings?.toObject?.() || tenant.settings || {}), ...req.body.settings }
    }
    await tenant.save()

    await writeAudit({
      action: AuditActions.ADMIN_ACTION,
      actor: req.user,
      targetType: "Tenant",
      targetId: tenant._id,
      metadata: { action: "tenant.update", before, after: { plan: tenant.plan, status: tenant.status, name: tenant.name } },
      req,
    })

    res.json({ success: true, data: { tenant: publicTenant(tenant) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/tenants/:id/usage */
export async function getTenantUsage(req, res) {
  try {
    const tenant = await refreshTenantUsage(req.params.id)
    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found" })

    const oid = tenant._id
    const metrics = await runWithTenantContext({ bypass: true }, async () => {
      const [trips, bookings, documents, expenses, users] = await Promise.all([
        Itinerary.countDocuments({ tenantId: oid }),
        Booking.countDocuments({ tenantId: oid }),
        TravelDocument.countDocuments({ tenantId: oid }),
        TripExpense.countDocuments({ tenantId: oid }),
        User.countDocuments({ tenantId: oid }),
      ])
      return { trips, bookings, documents, expenses, users }
    })

    res.json({
      success: true,
      data: {
        tenant: publicTenant(tenant),
        usage: {
          ...tenant.usage?.toObject?.() || tenant.usage || {},
          ...metrics,
        },
        limits: getPlanLimits(tenant.plan),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/tenants/metrics — platform-wide per-tenant monitoring snapshot */
export async function getTenantsMetrics(_req, res) {
  try {
    const tenants = await Tenant.find({})
      .select("name slug plan status usage createdAt")
      .sort({ "usage.apiRequests": -1 })
      .limit(200)
      .lean()

    const rows = tenants.map((t) => ({
      id: t._id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      usage: t.usage || {},
      limits: getPlanLimits(t.plan),
      createdAt: t.createdAt,
    }))

    const totals = rows.reduce(
      (acc, r) => {
        const u = r.usage || {}
        acc.aiRequests += u.aiRequests || 0
        acc.apiRequests += u.apiRequests || 0
        acc.storageBytes += u.storageBytes || 0
        acc.trips += u.trips || 0
        acc.documents += u.documents || 0
        acc.expenses += u.expenses || 0
        acc.users += u.users || 0
        return acc
      },
      {
        tenants: rows.length,
        aiRequests: 0,
        apiRequests: 0,
        storageBytes: 0,
        trips: 0,
        documents: 0,
        expenses: 0,
        users: 0,
      },
    )

    res.json({ success: true, data: { tenants: rows, totals, plans: PLAN_LIMITS } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /admin/tenants/plans — catalog */
export async function listPlans(_req, res) {
  res.json({ success: true, data: { plans: PLAN_LIMITS } })
}

/** GET /admin/usage/me — current tenant usage for portal users */
export async function getMyTenantUsage(req, res) {
  try {
    if (!req.tenantId && !req.tenant) {
      return res.status(400).json({ success: false, message: "No tenant context" })
    }
    const id = req.tenantId || req.tenant._id
    const tenant = await refreshTenantUsage(id)
    res.json({
      success: true,
      data: {
        tenant: publicTenant(tenant),
        usage: tenant.usage,
        limits: getPlanLimits(tenant.plan),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export { publicTenant, auditTenantAction }
