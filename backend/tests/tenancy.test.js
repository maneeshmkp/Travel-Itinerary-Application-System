import { describe, it } from "node:test"
import assert from "node:assert/strict"
import mongoose from "mongoose"
import {
  PLANS,
  PLAN_LIMITS,
  TENANT_ROLES,
  TENANT_ROLE_RANK,
  getPlanLimits,
  isWithinLimit,
} from "../constants/plans.js"
import { checkPlanLimit } from "../services/tenantService.js"
import { withTenant, runWithTenantContext, getTenantContext } from "../utils/tenantScope.js"
import { requirePlanLimit, requireTenantRole } from "../middlewares/tenant.js"
import { ROLES, toAuthPrincipal, PERMISSIONS, hasPermission } from "../constants/rbac.js"

describe("Plans & limits", () => {
  it("defines Free, Pro, Enterprise with expected limits", () => {
    assert.ok(PLAN_LIMITS[PLANS.FREE].trips > 0)
    assert.ok(PLAN_LIMITS[PLANS.PRO].aiRequests > PLAN_LIMITS[PLANS.FREE].aiRequests)
    assert.equal(PLAN_LIMITS[PLANS.ENTERPRISE].trips, -1)
  })

  it("isWithinLimit treats -1 as unlimited", () => {
    assert.equal(isWithinLimit(999999, -1), true)
    assert.equal(isWithinLimit(10, 10), false)
    assert.equal(isWithinLimit(9, 10), true)
  })

  it("checkPlanLimit blocks when trips exceeded", () => {
    const tenant = {
      plan: PLANS.FREE,
      usage: { trips: PLAN_LIMITS.free.trips },
    }
    const result = checkPlanLimit(tenant, "trips")
    assert.equal(result.ok, false)
    assert.equal(result.resource, "trips")
  })

  it("checkPlanLimit allows under limit", () => {
    const tenant = { plan: PLANS.FREE, usage: { trips: 0 } }
    assert.equal(checkPlanLimit(tenant, "trips").ok, true)
  })
})

describe("Tenant roles", () => {
  it("ranks owner > admin > member > guest", () => {
    assert.ok(TENANT_ROLE_RANK[TENANT_ROLES.OWNER] > TENANT_ROLE_RANK[TENANT_ROLES.ADMIN])
    assert.ok(TENANT_ROLE_RANK[TENANT_ROLES.ADMIN] > TENANT_ROLE_RANK[TENANT_ROLES.MEMBER])
    assert.ok(TENANT_ROLE_RANK[TENANT_ROLES.MEMBER] > TENANT_ROLE_RANK[TENANT_ROLES.GUEST])
  })
})

describe("Data isolation helpers", () => {
  it("withTenant injects tenantId into filters", () => {
    const tid = new mongoose.Types.ObjectId()
    runWithTenantContext({ tenantId: String(tid), bypass: false }, () => {
      const filter = withTenant({ ownerId: "u1" })
      assert.equal(String(filter.tenantId), String(tid))
      assert.equal(filter.ownerId, "u1")
    })
  })

  it("withTenant skips when bypass is set", () => {
    runWithTenantContext({ tenantId: "x", bypass: true }, () => {
      assert.deepEqual(withTenant({ a: 1 }), { a: 1 })
    })
  })

  it("ALS context is request-local", () => {
    assert.equal(getTenantContext(), null)
    runWithTenantContext({ tenantId: "t1" }, () => {
      assert.equal(getTenantContext().tenantId, "t1")
    })
    assert.equal(getTenantContext(), null)
  })
})

describe("Cross-tenant security middleware", () => {
  function run(mw, req) {
    return new Promise((resolve) => {
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code
          return this
        },
        json(body) {
          this.body = body
          resolve({ err: null, res: this })
          return this
        },
      }
      mw(req, res, (err) => resolve({ err: err || null, res }))
    })
  }

  it("requirePlanLimit returns 402 when exceeded", async () => {
    const mw = requirePlanLimit("trips")
    const { res } = await run(mw, {
      tenantBypass: false,
      tenant: {
        plan: PLANS.FREE,
        usage: { trips: getPlanLimits(PLANS.FREE).trips },
      },
    })
    assert.equal(res.statusCode, 402)
    assert.equal(res.body?.code, "PLAN_LIMIT_EXCEEDED")
  })

  it("requirePlanLimit allows super admin bypass", async () => {
    const mw = requirePlanLimit("trips")
    const { err } = await run(mw, {
      tenantBypass: true,
      tenant: { plan: PLANS.FREE, usage: { trips: 9999 } },
    })
    assert.equal(err, null)
  })

  it("requireTenantRole denies guest for admin-only action", async () => {
    const mw = requireTenantRole(TENANT_ROLES.OWNER, TENANT_ROLES.ADMIN)
    const { err } = await run(mw, {
      tenantBypass: false,
      tenantRole: TENANT_ROLES.GUEST,
      user: { tenantRole: TENANT_ROLES.GUEST },
    })
    assert.ok(err)
    assert.equal(err.statusCode || err.status, 403)
  })

  it("requireTenantRole allows owner", async () => {
    const mw = requireTenantRole(TENANT_ROLES.OWNER, TENANT_ROLES.ADMIN)
    const { err } = await run(mw, {
      tenantBypass: false,
      tenantRole: TENANT_ROLES.OWNER,
      user: { tenantRole: TENANT_ROLES.OWNER },
    })
    assert.equal(err, null)
  })
})

describe("JWT tenant claims", () => {
  it("toAuthPrincipal embeds tenantId and tenantRole", () => {
    const tid = new mongoose.Types.ObjectId()
    const principal = toAuthPrincipal({
      _id: new mongoose.Types.ObjectId(),
      role: ROLES.USER,
      email: "a@b.com",
      tenantId: tid,
      tenantRole: TENANT_ROLES.MEMBER,
    })
    assert.equal(principal.tenantId, String(tid))
    assert.equal(principal.tenantRole, TENANT_ROLES.MEMBER)
  })

  it("super admin has super:tenants permission", () => {
    assert.ok(hasPermission({ role: ROLES.SUPER_ADMIN }, PERMISSIONS.SUPER_TENANTS))
    assert.ok(!hasPermission({ role: ROLES.ADMIN }, PERMISSIONS.SUPER_TENANTS))
  })
})
