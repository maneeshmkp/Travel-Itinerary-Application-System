import { describe, it } from "node:test"
import assert from "node:assert/strict"
import jwt from "jsonwebtoken"
import {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  canAssignRole,
  effectiveRoleForUser,
  hasPermission,
  hasRole,
  normalizeRole,
  permissionsForRole,
  resolvePermissions,
  toAuthPrincipal,
  canAccessAdminPortal,
} from "../constants/rbac.js"
import { authorize, requireRole, requirePermission, isAdminUser } from "../middlewares/rbac.js"

describe("RBAC roles & permissions", () => {
  it("normalizes legacy and alias roles", () => {
    assert.equal(normalizeRole("super-admin"), ROLES.SUPER_ADMIN)
    assert.equal(normalizeRole("admin"), ROLES.ADMIN)
    assert.equal(normalizeRole("unknown"), ROLES.USER)
  })

  it("maps every non-guest role to a permission set", () => {
    for (const role of Object.values(ROLES)) {
      if (role === ROLES.GUEST) {
        assert.deepEqual(permissionsForRole(role), [])
        continue
      }
      assert.ok(ROLE_PERMISSIONS[role].length > 0, `${role} should have permissions`)
    }
  })

  it("gives users trip/AI permissions and admins monitoring", () => {
    assert.ok(hasPermission({ role: ROLES.USER }, PERMISSIONS.TRIPS_CREATE))
    assert.ok(hasPermission({ role: ROLES.USER }, PERMISSIONS.AI_USE))
    assert.ok(!hasPermission({ role: ROLES.USER }, PERMISSIONS.ADMIN_USERS))
    assert.ok(hasPermission({ role: ROLES.ADMIN }, PERMISSIONS.ADMIN_MONITORING))
    assert.ok(hasPermission({ role: ROLES.SUPER_ADMIN }, PERMISSIONS.SUPER_API_KEYS))
  })

  it("merges custom permissions onto role defaults", () => {
    const perms = resolvePermissions({
      role: ROLES.USER,
      permissions: [PERMISSIONS.ADMIN_ANALYTICS],
    })
    assert.ok(perms.includes(PERMISSIONS.TRIPS_CREATE))
    assert.ok(perms.includes(PERMISSIONS.ADMIN_ANALYTICS))
  })

  it("blocks privilege escalation for role assignment", () => {
    assert.equal(canAssignRole({ role: ROLES.ADMIN }, ROLES.SUPER_ADMIN), false)
    assert.equal(canAssignRole({ role: ROLES.ADMIN }, ROLES.ADMIN), false)
    assert.equal(canAssignRole({ role: ROLES.ADMIN }, ROLES.MODERATOR), true)
    assert.equal(canAssignRole({ role: ROLES.SUPER_ADMIN }, ROLES.SUPER_ADMIN), true)
    assert.equal(canAssignRole({ role: ROLES.SUPPORT }, ROLES.ADMIN), false)
  })

  it("elevates ADMIN_EMAILS to admin without mutating stored role", () => {
    process.env.ADMIN_EMAILS = "boss@example.com"
    const role = effectiveRoleForUser({ role: "user", email: "boss@example.com" })
    assert.equal(role, ROLES.ADMIN)
    assert.ok(isAdminUser({ role: "user", email: "boss@example.com" }))
    assert.ok(canAccessAdminPortal({ role: ROLES.SUPPORT }))
  })
})

describe("JWT RBAC payload", () => {
  it("embeds role and permissions via toAuthPrincipal", () => {
    const principal = toAuthPrincipal({
      _id: "507f1f77bcf86cd799439011",
      role: ROLES.MODERATOR,
      email: "mod@example.com",
    })
    assert.equal(principal.role, ROLES.MODERATOR)
    assert.ok(Array.isArray(principal.permissions))
    assert.ok(principal.permissions.includes(PERMISSIONS.MOD_REVIEWS))

    const token = jwt.sign(principal, "test-secret", { expiresIn: "1h" })
    const decoded = jwt.verify(token, "test-secret")
    assert.equal(decoded.role, ROLES.MODERATOR)
    assert.ok(decoded.permissions.includes(PERMISSIONS.MOD_REVIEWS))
  })
})

describe("authorize middleware", () => {
  function run(mw, req) {
    return new Promise((resolve) => {
      mw(req, {}, (err) => resolve(err || null))
    })
  }

  it("allows matching role", async () => {
    const err = await run(requireRole(ROLES.ADMIN), {
      user: { role: ROLES.ADMIN, status: "active" },
      auth: { role: ROLES.ADMIN, permissions: permissionsForRole(ROLES.ADMIN) },
    })
    assert.equal(err, null)
  })

  it("denies unauthorized role", async () => {
    const err = await run(requireRole(ROLES.ADMIN), {
      user: { role: ROLES.USER, status: "active" },
      auth: { role: ROLES.USER, permissions: permissionsForRole(ROLES.USER) },
    })
    assert.ok(err)
    assert.equal(err.statusCode, 403)
  })

  it("allows permission grant", async () => {
    const err = await run(requirePermission(PERMISSIONS.ADMIN_MONITORING), {
      user: { role: ROLES.ADMIN, status: "active" },
      auth: { role: ROLES.ADMIN, permissions: permissionsForRole(ROLES.ADMIN) },
    })
    assert.equal(err, null)
  })

  it("denies missing permission", async () => {
    const err = await run(requirePermission(PERMISSIONS.SUPER_SETTINGS), {
      user: { role: ROLES.USER, status: "active" },
      auth: { role: ROLES.USER, permissions: permissionsForRole(ROLES.USER) },
    })
    assert.ok(err)
    assert.equal(err.statusCode, 403)
  })

  it("denies suspended accounts", async () => {
    const err = await run(authorize({ roles: [ROLES.USER] }), {
      user: { role: ROLES.USER, status: "suspended" },
      auth: { role: ROLES.USER, permissions: [] },
    })
    assert.ok(err)
    assert.equal(err.statusCode, 403)
  })

  it("hasRole helper works for staff", () => {
    assert.ok(hasRole({ role: ROLES.SUPPORT }, [ROLES.SUPPORT, ROLES.ADMIN]))
    assert.ok(!hasRole({ role: ROLES.USER }, [ROLES.ADMIN]))
  })
})
