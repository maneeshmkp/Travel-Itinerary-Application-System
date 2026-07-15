import User from "../models/User.js"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { sendPasswordResetEmail, sendWelcomeEmail } from "../utils/mailService.js"
import { toAuthPrincipal } from "../constants/rbac.js"
import { logAuth } from "../logger/index.js"
import { AuditActions, writeAudit } from "../services/auditService.js"
import { publishAsync, DOMAIN_EVENTS } from "../events/index.js"
import { createPersonalTenantForUser, ensureUserTenant } from "../services/tenantService.js"
import { TENANT_ROLES } from "../constants/plans.js"
import {
  createSessionForUser,
  rotateRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  listUserSessions,
  signAccessToken,
} from "../services/sessionService.js"
import { setRefreshCookie, clearRefreshCookie } from "../middlewares/security.js"
import { recordSecurityEvent } from "../services/security/securityMetrics.js"

function toPublicUser(user, tenant = null) {
  const principal = toAuthPrincipal(user)
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: principal.role,
    permissions: principal.permissions,
    status: user.status || "active",
    tenantId: principal.tenantId,
    tenantRole: principal.tenantRole || user.tenantRole || null,
    tenant: tenant
      ? {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          status: tenant.status,
        }
      : null,
  }
}

function authResponse(res, { user, tenant, accessToken, refreshToken, session, message }) {
  setRefreshCookie(res, refreshToken)
  return res.json({
    success: true,
    message,
    token: accessToken,
    accessToken,
    refreshToken,
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m",
    session,
    user: toPublicUser(user, tenant),
  })
}

function readRefreshToken(req) {
  return (
    req.body?.refreshToken ||
    req.cookies?.refresh_token ||
    req.headers["x-refresh-token"] ||
    ""
  )
}

// @desc    Register user
// @route   POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      })
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "user",
      status: "active",
      tenantRole: TENANT_ROLES.OWNER,
    })

    const tenant = await createPersonalTenantForUser(user)
    const { accessToken, refreshToken, session } = await createSessionForUser(user, req)

    await sendWelcomeEmail(user.email, user.name)
    await writeAudit({
      action: AuditActions.SIGNUP,
      actor: user,
      targetType: "User",
      targetId: user._id,
      metadata: { deviceId: session?.deviceId },
      req,
    })

    publishAsync(
      DOMAIN_EVENTS.USER_REGISTERED,
      {
        userId: String(user._id),
        email: user.email,
        name: user.name,
        tenantId: tenant?._id ? String(tenant._id) : null,
        auditAlreadyWritten: true,
        skipEventEmail: true,
      },
      { source: "authController.signup", userId: String(user._id), dedupeKey: `signup:${user._id}` },
    )

    return authResponse(res.status(201), {
      user,
      tenant,
      accessToken,
      refreshToken,
      session,
      message: "Account created successfully",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error creating account",
    })
  }
}

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      })
    }

    const user = await User.findOne({ email }).select("+password")
    if (!user) {
      recordSecurityEvent("failed_login", { email, ip: req.ip })
      await writeAudit({
        action: AuditActions.LOGIN_FAILED,
        metadata: { email },
        success: false,
        req,
      })
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    const isPasswordMatch = await user.matchPassword(password)
    if (!isPasswordMatch) {
      recordSecurityEvent("failed_login", { email, userId: String(user._id), ip: req.ip })
      await writeAudit({
        action: AuditActions.LOGIN_FAILED,
        actor: user,
        success: false,
        req,
      })
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Account suspended",
      })
    }

    const tenant = await ensureUserTenant(user)
    const { accessToken, refreshToken, session } = await createSessionForUser(user, req)
    logAuth.info("User login success", { userId: String(user._id), email: user.email })
    await writeAudit({
      action: AuditActions.LOGIN,
      actor: user,
      targetType: "User",
      targetId: user._id,
      metadata: { deviceId: session?.deviceId, sessionId: session?.id },
      req,
    })

    publishAsync(
      DOMAIN_EVENTS.USER_LOGGED_IN,
      {
        userId: String(user._id),
        email: user.email,
        auditAlreadyWritten: true,
        tenantId: String(tenant._id),
      },
      { source: "authController.login", userId: String(user._id) },
    )

    return authResponse(res, {
      user,
      tenant,
      accessToken,
      refreshToken,
      session,
      message: "Login successful",
    })
  } catch (error) {
    logAuth.error("User login failed", { message: error.message })
    res.status(500).json({
      success: false,
      message: error.message || "Error logging in",
    })
  }
}

/** POST /auth/refresh — rotate refresh token */
export const refresh = async (req, res) => {
  try {
    const raw = readRefreshToken(req)
    if (!raw) {
      return res.status(401).json({ success: false, message: "Refresh token required" })
    }
    const result = await rotateRefreshToken(raw, req)
    if (!result.ok) {
      clearRefreshCookie(res)
      return res.status(result.status || 401).json({ success: false, message: result.message })
    }

    let tenant = null
    try {
      tenant = await ensureUserTenant(result.user)
    } catch {
      /* optional */
    }

    await writeAudit({
      action: AuditActions.REFRESH,
      actor: result.user,
      targetType: "Session",
      targetId: result.session?.id,
      req,
    })

    return authResponse(res, {
      user: result.user,
      tenant,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      session: result.session,
      message: "Token refreshed",
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Refresh failed" })
  }
}

/** POST /auth/logout — revoke current device session */
export const logout = async (req, res) => {
  try {
    const sid = req.user?._jwtClaims?.sid || req.body?.sessionId
    if (sid) await revokeSession(sid, "logout")
    clearRefreshCookie(res)
    await writeAudit({
      action: AuditActions.LOGOUT,
      actor: req.user,
      targetType: "Session",
      targetId: sid || "",
      req,
    })
    res.json({ success: true, message: "Logged out" })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** POST /auth/logout-all — revoke every device */
export const logoutAll = async (req, res) => {
  try {
    const count = await revokeAllUserSessions(req.user._id, "logout_all")
    clearRefreshCookie(res)
    await writeAudit({
      action: AuditActions.LOGOUT_ALL,
      actor: req.user,
      targetType: "User",
      targetId: req.user._id,
      metadata: { sessionsRevoked: count },
      req,
    })
    res.json({ success: true, message: "Logged out from all devices", data: { sessionsRevoked: count } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /auth/sessions */
export const listSessions = async (req, res) => {
  try {
    const currentSid = req.user?._jwtClaims?.sid || null
    const sessions = await listUserSessions(req.user._id, currentSid)
    res.json({ success: true, data: { sessions } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** DELETE /auth/sessions/:id */
export const revokeOneSession = async (req, res) => {
  try {
    const Session = (await import("../models/Session.js")).default
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id })
    if (!session) return res.status(404).json({ success: false, message: "Session not found" })
    await revokeSession(session._id, "user_revoke")
    await writeAudit({
      action: AuditActions.SESSION_REVOKE,
      actor: req.user,
      targetType: "Session",
      targetId: session._id,
      req,
    })
    res.json({ success: true, message: "Session revoked" })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email",
      })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      })
    }

    const resetToken = user.getResetToken()
    await user.save({ validateBeforeSave: false })

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}`
    const emailResult = await sendPasswordResetEmail(user.email, resetToken, resetUrl)

    if (emailResult.success) {
      return res.status(200).json({
        success: true,
        message: "Password reset link sent to your email",
      })
    }

    const isDev = process.env.NODE_ENV !== "production"
    if (isDev) {
      logAuth.warn("Password reset email failed; returning reset URL for development", {
        email: user.email,
        code: emailResult.code,
        message: emailResult.message,
        resetUrl,
      })
      return res.status(200).json({
        success: true,
        message:
          "Email could not be sent (SMTP auth failed). Use the reset link below — development only.",
        resetUrl,
        emailDeliveryFailed: true,
      })
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send email. Please try again later.",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error processing forgot password",
    })
  }
}

// @desc    Reset password
export const resetPassword = async (req, res) => {
  try {
    const { resetToken } = req.params
    const { password, confirmPassword } = req.body

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide password and confirm password",
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      })
    }

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      })
    }

    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    // Invalidate all prior sessions after password change
    await revokeAllUserSessions(user._id, "password_change")
    const { accessToken, refreshToken, session } = await createSessionForUser(user, req)

    await writeAudit({
      action: AuditActions.PASSWORD_CHANGE,
      actor: user,
      targetType: "User",
      targetId: user._id,
      req,
    })

    return authResponse(res, {
      user,
      tenant: null,
      accessToken,
      refreshToken,
      session,
      message: "Password reset successful",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error resetting password",
    })
  }
}

export const getCurrentUser = async (req, res) => {
  let tenant = null
  try {
    if (req.tenant) tenant = req.tenant
    else if (req.user?.tenantId) {
      const Tenant = (await import("../models/Tenant.js")).default
      tenant = await Tenant.findById(req.user.tenantId)
    }
  } catch {
    /* optional */
  }
  res.status(200).json({
    success: true,
    user: toPublicUser(req.user, tenant),
  })
}

/** @deprecated kept for internal tooling — prefer session tokens */
export function generateToken(user) {
  return signAccessToken(user)
}
