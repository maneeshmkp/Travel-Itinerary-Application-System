import jwt from "jsonwebtoken"
import User from "../models/User.js"
import { attachAuthContext } from "./rbac.js"
import { resolveTenant } from "./tenant.js"
import { effectiveRoleForUser, resolvePermissions } from "../constants/rbac.js"
import { findActiveSession } from "../services/sessionService.js"
import { recordSecurityEvent } from "../services/security/securityMetrics.js"

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }
  return secret
}

async function loadUserFromToken(token) {
  const decoded = jwt.verify(token, getJwtSecret())
  if (decoded.typ === "refresh") {
    const err = new Error("Refresh token cannot be used as access token")
    err.code = "INVALID_TOKEN_TYPE"
    throw err
  }

  const userId = decoded.id ?? decoded.userId
  if (!userId) return null

  // Session revocation check (new tokens carry sid)
  if (decoded.sid) {
    const session = await findActiveSession(decoded.sid)
    if (!session) {
      const err = new Error("Session revoked or expired")
      err.code = "SESSION_REVOKED"
      throw err
    }
  }

  const user = await User.findById(userId).select("-password")
  if (!user) return null

  user._jwtClaims = {
    role: decoded.role || effectiveRoleForUser(user),
    permissions: Array.isArray(decoded.permissions)
      ? decoded.permissions
      : resolvePermissions({ ...user.toObject(), role: effectiveRoleForUser(user) }),
    tenantId: decoded.tenantId || (user.tenantId ? String(user.tenantId) : null),
    sid: decoded.sid || null,
  }
  return user
}

function rejectSuspended(user, res) {
  if (user?.status === "suspended") {
    res.status(403).json({
      success: false,
      message: "Account suspended",
    })
    return true
  }
  return false
}

/** Sets req.user when a valid Bearer token is present; otherwise continues anonymously. */
const optionalProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) {
      return next()
    }

    const token = authHeader.split(" ")[1]
    if (!token) return next()

    const user = await loadUserFromToken(token)
    if (user && user.status !== "suspended") {
      req.user = user
      attachAuthContext(req, res, () => {})
      return resolveTenant(req, res, next)
    }
  } catch {
    /* anonymous */
  }
  next()
}

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authentication token found",
      })
    }

    const token = authHeader.split(" ")[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token found",
      })
    }

    let user
    try {
      user = await loadUserFromToken(token)
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          code: "TOKEN_EXPIRED",
          message: "Access token expired",
        })
      }
      recordSecurityEvent("invalid_jwt", { reason: err.code || err.name, ip: req.ip })
      return res.status(401).json({
        success: false,
        code: err.code || "INVALID_JWT",
        message: err.message || "Invalid or expired token",
      })
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      })
    }

    if (rejectSuspended(user, res)) return

    req.user = user
    attachAuthContext(req, res, () => {})
    return resolveTenant(req, res, next)
  } catch (error) {
    recordSecurityEvent("invalid_jwt", { reason: error.name, ip: req.ip })
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    })
  }
}

export default protect
export { protect, optionalProtect }
