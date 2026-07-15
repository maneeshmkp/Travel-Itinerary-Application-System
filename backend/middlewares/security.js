/**
 * Helmet, CSP, HSTS, sanitize, NoSQL injection protection, HPP.
 * CSRF helpers for cookie-authenticated flows (Bearer SPA is CSRF-safe).
 */
import helmet from "helmet"
import mongoSanitize from "express-mongo-sanitize"
import hpp from "hpp"
import xss from "xss"
import crypto from "crypto"
import { recordSecurityEvent } from "../services/security/securityMetrics.js"

const isProd = () => process.env.NODE_ENV === "production"

/**
 * Compose security middleware stack for Express.
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https:", "wss:", "ws:"],
        fontSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        ...(isProd() ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: isProd()
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    xssFilter: true,
    noSniff: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
  })
}

/** Strip Mongo operator injection from body/query/params. */
export function noSqlSanitize() {
  return mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ req, key }) => {
      recordSecurityEvent("suspicious", {
        reason: "nosql_sanitize",
        key: String(key).slice(0, 80),
        path: req.originalUrl,
        ip: req.ip,
      })
    },
  })
}

/** Prevent HTTP parameter pollution. */
export function hardenParams() {
  return hpp({
    whitelist: ["tags", "sort", "fields", "page", "limit", "q", "status", "plan", "role"],
  })
}

function sanitizeValue(value) {
  if (typeof value === "string") {
    return xss(value, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "style"],
    })
  }
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === "object") {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith("$")) continue
      out[k] = sanitizeValue(v)
    }
    return out
  }
  return value
}

/** XSS sanitize mutable request bodies (not multipart / buffers). */
export function sanitizeInputs(req, _res, next) {
  try {
    if (req.body && typeof req.body === "object" && !(req.body instanceof Buffer)) {
      req.body = sanitizeValue(req.body)
    }
    if (req.query && typeof req.query === "object") {
      req.query = sanitizeValue(req.query)
    }
    if (req.params && typeof req.params === "object") {
      req.params = sanitizeValue(req.params)
    }
  } catch {
    /* ignore sanitize errors */
  }
  next()
}

/**
 * Double-submit CSRF for cookie-based mutations.
 * Skips safe methods and Bearer-only API clients without cookies.
 * Enable with CSRF_PROTECTION=true.
 */
export function csrfProtection(req, res, next) {
  if (process.env.CSRF_PROTECTION !== "true") return next()

  const method = req.method.toUpperCase()
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    // Issue token cookie for SPA if missing
    if (!req.cookies?.csrf_token) {
      const token = crypto.randomBytes(24).toString("hex")
      res.cookie("csrf_token", token, {
        httpOnly: false,
        sameSite: "strict",
        secure: isProd(),
        maxAge: 24 * 60 * 60 * 1000,
      })
    }
    return next()
  }

  // Bearer Authorization without session cookie → SPA JWT (CSRF not applicable)
  const auth = req.headers.authorization || ""
  if (auth.startsWith("Bearer ") && !req.cookies?.refresh_token) {
    return next()
  }

  const cookieToken = req.cookies?.csrf_token
  const headerToken = req.headers["x-csrf-token"] || req.headers["x-xsrf-token"]
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    recordSecurityEvent("blocked", { reason: "csrf", path: req.originalUrl, ip: req.ip })
    return res.status(403).json({
      success: false,
      code: "CSRF_REJECTED",
      message: "Invalid CSRF token",
    })
  }
  next()
}

/** Set optional refresh token cookie (httpOnly). */
export function setRefreshCookie(res, refreshToken) {
  if (process.env.AUTH_REFRESH_COOKIE !== "true") return
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "strict",
    maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 7) * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  })
}

export function clearRefreshCookie(res) {
  res.clearCookie("refresh_token", { path: "/api/auth" })
}

export default {
  securityHeaders,
  noSqlSanitize,
  hardenParams,
  sanitizeInputs,
  csrfProtection,
  setRefreshCookie,
  clearRefreshCookie,
}
