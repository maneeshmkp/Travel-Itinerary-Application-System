/**
 * Device session + refresh-token rotation service.
 */
import crypto from "crypto"
import jwt from "jsonwebtoken"
import Session from "../models/Session.js"
import User from "../models/User.js"
import { toAuthPrincipal } from "../constants/rbac.js"
import { recordSecurityEvent } from "../services/security/securityMetrics.js"

const ACCESS_TTL = process.env.ACCESS_TOKEN_EXPIRES || "15m"
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7)

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not configured")
  return secret
}

function getRefreshSecret() {
  return process.env.REFRESH_TOKEN_SECRET || getJwtSecret()
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex")
}

export function newDeviceId() {
  return crypto.randomUUID()
}

export function newFamilyId() {
  return crypto.randomUUID()
}

export function signAccessToken(user, { sessionId = null } = {}) {
  const principal = toAuthPrincipal(user)
  return jwt.sign(
    {
      id: principal.id,
      role: principal.role,
      permissions: principal.permissions,
      tenantId: principal.tenantId,
      tenantRole: principal.tenantRole,
      sid: sessionId ? String(sessionId) : undefined,
      typ: "access",
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TTL },
  )
}

function signRefreshToken({ userId, sessionId, familyId, deviceId }) {
  return jwt.sign(
    {
      uid: String(userId),
      sid: String(sessionId),
      fid: familyId,
      did: deviceId,
      typ: "refresh",
    },
    getRefreshSecret(),
    { expiresIn: `${REFRESH_DAYS}d` },
  )
}

function clientMeta(req) {
  return {
    ip: req?.ip || req?.headers?.["x-forwarded-for"] || "",
    userAgent: String(req?.headers?.["user-agent"] || "").slice(0, 512),
    deviceName: String(req?.body?.deviceName || req?.headers?.["x-device-name"] || "").slice(0, 120),
    deviceId:
      String(req?.body?.deviceId || req?.headers?.["x-device-id"] || "").trim() || newDeviceId(),
  }
}

/**
 * Create a new device session + token pair after successful auth.
 */
export async function createSessionForUser(user, req) {
  const meta = clientMeta(req)
  const familyId = newFamilyId()
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)

  const session = await Session.create({
    userId: user._id,
    refreshTokenHash: "pending",
    deviceId: meta.deviceId,
    deviceName: meta.deviceName || guessDeviceName(meta.userAgent),
    userAgent: meta.userAgent,
    ip: String(meta.ip).split(",")[0].trim(),
    familyId,
    expiresAt,
  })

  const refreshToken = signRefreshToken({
    userId: user._id,
    sessionId: session._id,
    familyId,
    deviceId: meta.deviceId,
  })
  session.refreshTokenHash = hashToken(refreshToken)
  await session.save()

  const accessToken = signAccessToken(user, { sessionId: session._id })

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TTL,
    session: publicSession(session),
  }
}

function guessDeviceName(ua) {
  const s = String(ua || "")
  if (/Edg\//i.test(s)) return "Edge"
  if (/Chrome\//i.test(s)) return "Chrome"
  if (/Firefox\//i.test(s)) return "Firefox"
  if (/Safari\//i.test(s)) return "Safari"
  return "Web Browser"
}

export function publicSession(s) {
  if (!s) return null
  const o = s.toObject?.() || s
  return {
    id: o._id,
    deviceId: o.deviceId,
    deviceName: o.deviceName,
    ip: o.ip,
    userAgent: o.userAgent,
    lastUsedAt: o.lastUsedAt,
    createdAt: o.createdAt,
    expiresAt: o.expiresAt,
    current: false,
  }
}

/**
 * Rotate refresh token. Detects reuse of revoked tokens (theft) and revokes family.
 */
export async function rotateRefreshToken(rawRefreshToken, req) {
  let payload
  try {
    payload = jwt.verify(rawRefreshToken, getRefreshSecret())
  } catch {
    recordSecurityEvent("invalid_refresh")
    return { ok: false, status: 401, message: "Invalid or expired refresh token" }
  }

  if (payload.typ !== "refresh") {
    return { ok: false, status: 401, message: "Invalid token type" }
  }

  const hash = hashToken(rawRefreshToken)
  const session = await Session.findById(payload.sid)
  if (!session) {
    recordSecurityEvent("invalid_refresh")
    return { ok: false, status: 401, message: "Session not found" }
  }

  // Reuse detection: presented token hash != current AND session was rotated
  if (session.revokedAt) {
    await revokeFamily(session.familyId, "refresh_reuse_after_revoke")
    recordSecurityEvent("refresh_reuse", { userId: String(session.userId) })
    return { ok: false, status: 401, message: "Session revoked — please sign in again" }
  }

  if (session.refreshTokenHash !== hash) {
    // Possible stolen token reuse
    await revokeFamily(session.familyId, "refresh_token_reuse")
    recordSecurityEvent("refresh_reuse", { userId: String(session.userId) })
    return { ok: false, status: 401, message: "Refresh token reuse detected — all sessions in family revoked" }
  }

  if (session.expiresAt.getTime() < Date.now()) {
    session.revokedAt = new Date()
    session.revokeReason = "expired"
    await session.save()
    return { ok: false, status: 401, message: "Session expired" }
  }

  const user = await User.findById(session.userId)
  if (!user || user.status === "suspended") {
    await revokeSession(session._id, "user_inactive")
    return { ok: false, status: 401, message: "User unavailable" }
  }

  const meta = clientMeta(req)
  const newRefresh = signRefreshToken({
    userId: user._id,
    sessionId: session._id,
    familyId: session.familyId,
    deviceId: session.deviceId,
  })
  session.refreshTokenHash = hashToken(newRefresh)
  session.lastUsedAt = new Date()
  if (meta.ip) session.ip = String(meta.ip).split(",")[0].trim()
  await session.save()

  const accessToken = signAccessToken(user, { sessionId: session._id })
  return {
    ok: true,
    accessToken,
    refreshToken: newRefresh,
    expiresIn: ACCESS_TTL,
    user,
    session: publicSession(session),
  }
}

export async function revokeSession(sessionId, reason = "logout") {
  await Session.updateOne(
    { _id: sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason: reason } },
  )
}

export async function revokeFamily(familyId, reason = "family_revoke") {
  await Session.updateMany(
    { familyId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason: reason } },
  )
}

export async function revokeAllUserSessions(userId, reason = "logout_all") {
  const result = await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason: reason } },
  )
  return result.modifiedCount || 0
}

export async function listUserSessions(userId, currentSessionId = null) {
  const rows = await Session.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastUsedAt: -1 })
    .lean()
  return rows.map((s) => ({
    ...publicSession(s),
    current: currentSessionId && String(s._id) === String(currentSessionId),
  }))
}

export async function findActiveSession(sessionId) {
  if (!sessionId) return null
  return Session.findOne({
    _id: sessionId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
}

export { ACCESS_TTL, REFRESH_DAYS }
