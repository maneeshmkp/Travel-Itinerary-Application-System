# Security

Enterprise security hardening for the Travel Management Platform. Existing business logic is unchanged — security is applied as middleware, session services, and audit/monitoring layers.

---

## Authentication flow

```
Login / Signup / Password reset
  → create device Session (MongoDB)
  → short-lived Access JWT (default 15m, typ=access, sid=sessionId)
  → Refresh JWT (default 7d, typ=refresh) — stored hashed on Session
  → Client sends Authorization: Bearer <access>
  → On 401 TOKEN_EXPIRED → POST /auth/refresh (rotation)
```

| Endpoint | Purpose |
|----------|---------|
| `POST /auth/login` | Issue access + refresh; audit login |
| `POST /auth/signup` | Same + personal tenant |
| `POST /auth/refresh` | Rotate refresh; reuse detection revokes family |
| `POST /auth/logout` | Revoke current session |
| `POST /auth/logout-all` | Revoke every device |
| `GET /auth/sessions` | List active devices |
| `DELETE /auth/sessions/:id` | Revoke one device |

### Token lifecycle

1. **Access token** — JWT signed with `JWT_SECRET`, claims: `id`, `role`, `permissions`, `tenantId`, `tenantRole`, `sid`, `typ=access`. Env: `ACCESS_TOKEN_EXPIRES` (default `15m`).
2. **Refresh token** — JWT signed with `REFRESH_TOKEN_SECRET` (fallback `JWT_SECRET`), stored as **SHA-256 hash** only. Env: `REFRESH_TOKEN_DAYS` (default `7`).
3. **Rotation** — each refresh replaces `refreshTokenHash`. Presenting a stolen old refresh triggers **family revoke**.
4. **Revocation** — `protect` rejects access tokens whose `sid` session is revoked/expired.
5. **Password change** — resets invalidate all sessions, then issue a fresh pair.

Optional httpOnly cookie: set `AUTH_REFRESH_COOKIE=true` (cookie name `refresh_token`, path `/api/auth`).

Device binding: clients send `deviceId` / `X-Device-Id` and optional `deviceName`.

---

## Security headers

Via **Helmet** (`middlewares/security.js`):

- CSP (default restrictive; Swagger-friendly img/connect)
- HSTS in production (`maxAge` 1y, includeSubDomains, preload)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` / frameguard
- Referrer-Policy: `strict-origin-when-cross-origin`
- XSS filter / hide `X-Powered-By`

Also:

- **express-mongo-sanitize** — strips `$` operators (NoSQL injection)
- **hpp** — HTTP parameter pollution whitelist
- **xss** sanitizer on body/query/params strings
- **CSRF** — optional (`CSRF_PROTECTION=true`); double-submit cookie. **Bearer-only SPA requests without refresh cookie are exempt** (CSRF not applicable to Authorization header APIs).

---

## Rate limiting (Redis)

Fail-open if Redis is down. Metrics + security events on limit.

| Bucket | Limit | Routes |
|--------|-------|--------|
| login | 10/min | `POST /auth/login` |
| signup | 10/min | `POST /auth/signup` |
| forgot | 5/min | `POST /auth/forgot-password` |
| reset | 10/min | `POST /auth/reset-password/:token` |
| refresh | 30/min | `POST /auth/refresh` |
| ai | 20/hour | `/ai/*`, `/chat` messages |
| public | 60/min | weather, blogs, recommendations, availability |
| global | 300/min/IP | all `/api` (env `GLOBAL_RATE_LIMIT_MAX`) |

---

## S3 / file security

Document Vault pipeline (`services/security/fileSecurity.js`):

1. MIME allowlist + magic-byte check (`documentValidator`)
2. Size limit (20MB)
3. Blocked executable extensions
4. Heuristic threat scan (PE, script tags)
5. **Malware scan hook** (mock engine; `MALWARE_SCAN_PROVIDER=mock|disabled`) — replace with ClamAV later
6. App **HMAC signed download tokens** (`DOCUMENT_SIGNING_SECRET`, ~15 min)
7. S3 **presigned GET** URLs (~900s) via `getS3SignedUrl`
8. Audit `security.file_upload` on successful upload

---

## Audit

Additional / relevant actions:

| Action | When |
|--------|------|
| `auth.login` / `auth.login_failed` | Login |
| `auth.logout` / `auth.logout_all` | Session end |
| `auth.refresh` | Token rotation |
| `auth.password_change` | Reset password |
| `security.permission_denied` | RBAC deny |
| `security.file_upload` | Document upload |
| `security.session_revoke` | Device revoke |
| Admin user/settings actions | Existing admin audits |

---

## Security dashboard

- API: `GET /admin/security`, `GET /admin/security/sessions`
- UI: `/admin/security` and `/super-admin/security`
- Shows failed logins, permission denied, rate limits, suspicious events, active sessions

---

## Best practices

1. Keep `JWT_SECRET` and `REFRESH_TOKEN_SECRET` long and distinct in production.
2. Prefer HTTPS + `AUTH_REFRESH_COOKIE=true` + `TRUST_PROXY=true` behind a load balancer.
3. Rotate secrets with a planned token invalidation window.
4. Monitor `/admin/security` for refresh reuse / spike in failed logins.
5. Wire a real AV provider for `MALWARE_SCAN_PROVIDER` before public document share links.
6. Do not put refresh tokens in localStorage; this app uses **sessionStorage** (tab-scoped).

---

## Testing

```bash
cd backend && npm test -- tests/security.test.js
```

Coverage: invalid/expired JWT, refresh hash, role escalation, permission deny, file/malware blocks, rate limiter factory.

---

## Modified / added files

### Added

| File | Purpose |
|------|---------|
| `backend/models/Session.js` | Device sessions |
| `backend/services/sessionService.js` | Access/refresh issue, rotate, revoke |
| `backend/services/security/securityMetrics.js` | Live security counters |
| `backend/services/security/fileSecurity.js` | MIME/malware/signed URL helpers |
| `backend/middlewares/security.js` | Helmet, sanitize, CSRF, cookies |
| `backend/controllers/securityController.js` | Security dashboard APIs |
| `backend/tests/security.test.js` | Security unit tests |
| `frontend/src/pages/admin/AdminSecurity.jsx` | Security UI |
| `SECURITY.md` | This document |

### Modified

| File | Change |
|------|--------|
| `backend/package.json` | helmet, cookie-parser, express-mongo-sanitize, hpp, xss |
| `backend/app.js` | Security stack + global rate limit + cookies |
| `backend/controllers/authController.js` | Sessions, refresh, logout(all), password revoke-all |
| `backend/routes/authRoutes.js` | New auth session routes + reset rate limit |
| `backend/middlewares/authMiddleware.js` | Session check, reject refresh-as-access, expired codes |
| `backend/middlewares/rateLimiter.js` | reset/refresh/global limiters + security events |
| `backend/middlewares/rbac.js` | Audit + metrics on permission denied |
| `backend/services/auditService.js` | New audit action constants |
| `backend/services/documents/documentService.js` | File security + upload audit |
| `backend/controllers/document/documentController.js` | Pass `req` into create |
| `backend/routes/adminRoutes.js` | `/security` endpoints |
| `backend/routes/blogRoutes.js` | Public rate limit |
| `backend/routes/recommendationRoutes.js` | Public rate limit |
| `backend/routes/availabilityRoutes.js` | Public rate limit |
| `frontend/src/utils/authStorage.js` | Refresh token + device id |
| `frontend/src/services/api.js` | Silent refresh interceptor; auth/security APIs |
| `frontend/src/context/AuthContext.jsx` | Persist refresh; logoutAll |
| `frontend/src/pages/admin/AdminLayout.jsx` | Security nav |
| `frontend/src/App.jsx` | Security routes |

### Env (optional)

```
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_DAYS=7
REFRESH_TOKEN_SECRET=...
AUTH_REFRESH_COOKIE=false
CSRF_PROTECTION=false
MALWARE_SCAN_PROVIDER=mock
GLOBAL_RATE_LIMIT_MAX=300
TRUST_PROXY=true
```
