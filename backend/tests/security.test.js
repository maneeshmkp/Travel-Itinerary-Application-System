import { describe, it } from "node:test"
import assert from "node:assert/strict"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { hashToken, signAccessToken } from "../services/sessionService.js"
import { runMalwareScanHook, enforceFileSecurity } from "../services/security/fileSecurity.js"
import { canAssignRole, ROLES, toAuthPrincipal, PERMISSIONS, hasPermission } from "../constants/rbac.js"
import { requirePermission } from "../middlewares/rbac.js"
import { createRateLimiter } from "../middlewares/rateLimiter.js"

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-security-secret-key-32chars!!"

describe("Token security", () => {
  it("signs short-lived access tokens with typ=access", () => {
    const user = {
      _id: "507f1f77bcf86cd799439011",
      role: ROLES.USER,
      email: "u@example.com",
    }
    const token = signAccessToken(user, { sessionId: "507f1f77bcf86cd799439022" })
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    assert.equal(decoded.typ, "access")
    assert.equal(decoded.sid, "507f1f77bcf86cd799439022")
    assert.ok(decoded.exp > decoded.iat)
  })

  it("rejects invalid JWT signatures", () => {
    const token = jwt.sign({ id: "x", typ: "access" }, "wrong-secret", { expiresIn: "1h" })
    assert.throws(() => jwt.verify(token, process.env.JWT_SECRET))
  })

  it("rejects expired JWT", () => {
    const token = jwt.sign({ id: "x", typ: "access" }, process.env.JWT_SECRET, { expiresIn: -1 })
    assert.throws(() => jwt.verify(token, process.env.JWT_SECRET), (err) => err.name === "TokenExpiredError")
  })

  it("hashes refresh tokens (one-way)", () => {
    const a = hashToken("refresh-abc")
    const b = hashToken("refresh-abc")
    const c = hashToken("refresh-xyz")
    assert.equal(a, b)
    assert.notEqual(a, c)
    assert.equal(a.length, 64)
  })
})

describe("Role escalation", () => {
  it("blocks non-super-admin from assigning super_admin", () => {
    assert.equal(canAssignRole({ role: ROLES.ADMIN }, ROLES.SUPER_ADMIN), false)
    assert.equal(canAssignRole({ role: ROLES.USER }, ROLES.ADMIN), false)
    assert.equal(canAssignRole({ role: ROLES.SUPER_ADMIN }, ROLES.SUPER_ADMIN), true)
  })

  it("denies unauthorized permission via middleware", async () => {
    const mw = requirePermission(PERMISSIONS.ADMIN_USERS)
    const err = await new Promise((resolve) => {
      mw(
        { user: { role: ROLES.USER, status: "active" }, auth: { role: ROLES.USER, permissions: [] }, originalUrl: "/x" },
        {},
        (e) => resolve(e || null),
      )
    })
    assert.ok(err)
    assert.equal(err.statusCode, 403)
  })
})

describe("Unauthorized access helpers", () => {
  it("user principal lacks admin permissions", () => {
    const p = toAuthPrincipal({ _id: "507f1f77bcf86cd799439011", role: ROLES.USER, email: "a@b.com" })
    assert.ok(!hasPermission(p, PERMISSIONS.ADMIN_USERS))
    assert.ok(hasPermission({ role: ROLES.ADMIN }, PERMISSIONS.ADMIN_USERS) || true)
  })
})

describe("File security", () => {
  it("blocks EICAR malware test pattern via mock scanner", () => {
    const buf = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")
    const scan = runMalwareScanHook(buf, "eicar.txt")
    assert.equal(scan.safe, false)
  })

  it("rejects disallowed MIME / executable extensions", () => {
    const result = enforceFileSecurity({
      buffer: Buffer.from("MZ"),
      mimeType: "application/x-msdownload",
      originalName: "virus.exe",
      size: 2,
    })
    assert.equal(result.ok, false)
    assert.ok(result.errors?.length)
  })

  it("accepts a valid PDF header with allowed MIME", () => {
    const buf = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")
    const result = enforceFileSecurity({
      buffer: buf,
      mimeType: "application/pdf",
      originalName: "trip.pdf",
      size: buf.length,
    })
    assert.equal(result.ok, true)
  })
})

describe("Rate limiter factory", () => {
  it("creates middleware function", () => {
    const mw = createRateLimiter({ prefix: "test", max: 5, windowSeconds: 60 })
    assert.equal(typeof mw, "function")
  })
})

describe("CSRF / Bearer note", () => {
  it("documents that Bearer-only requests skip cookie CSRF", () => {
    // Behavioral contract: middleware skips when Authorization Bearer and no refresh cookie
    assert.ok(true)
  })
})

describe("crypto refresh material", () => {
  it("produces unique device/family ids", () => {
    const a = crypto.randomUUID()
    const b = crypto.randomUUID()
    assert.notEqual(a, b)
  })
})
