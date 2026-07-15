# 06 — Security

**Parent:** [Engineering Handbook](./ENGINEERING.md)

**Deep dive:** [`SECURITY.md`](../../SECURITY.md) · [`RBAC.md`](../../RBAC.md) · [`MULTITENANCY.md`](../../MULTITENANCY.md)

---

## 1. Authentication (JWT)

| Token | Role |
|-------|------|
| **Access JWT** | Short-lived; sent as Bearer on API calls |
| **Refresh token** | Rotated; bound to device session; hashed at rest |

Capabilities:

- Login / signup / password reset  
- Refresh with reuse detection  
- Logout / logout-all  
- Frontend silent refresh on 401  

Sessions model tracks device id, family id, expiry, revocation.

---

## 2. RBAC

Roles (low → high privilege):

`guest` → `user` → `premium` → `support` → `moderator` → `admin` → `super_admin`

- Permissions are checked via middleware (`requirePermission`)  
- Only Super Admin assigns Super Admin (privilege escalation guard)  
- Admin portal ≠ Super Admin portal (`/admin` vs `/super-admin`)  

Always authorize **server-side**; UI hiding is not security.

---

## 3. Multi-tenancy

- Users belong to a `tenantId` with a tenant role  
- Mongoose tenant scope plugin isolates tenant-owned collections  
- Cross-tenant access is denied for non–super-admin  
- Browse/catalog may intentionally include shared System seeds—see Multitenancy + itinerary visibility docs  

Never “fix” tenancy by removing filters without an ADR-level decision.

---

## 4. Redis & rate limiting

- Rate limits on auth, AI, public, and global API surfaces  
- Prefer Redis-backed windows; fail-open carefully if Redis is down  
- Do not log rate-limit keys with PII  

---

## 5. AWS S3 & files

- MIME/magic validation, size limits, malware heuristic hooks  
- Prefer private buckets + signed URLs  
- `STORAGE_PROVIDER=s3` in production when configured  
- Never commit AWS keys; rotate via IAM  

Details: [`DOCUMENTS.md`](../../DOCUMENTS.md), [`SECURITY.md`](../../SECURITY.md)

---

## 6. Secrets management

| Location | Use |
|----------|-----|
| `backend/.env` | Local only (gitignored) |
| GitHub Actions secrets | CI/CD — see [`.github/SECRETS.md`](../../.github/SECRETS.md) |
| Render / Vercel env | Runtime cloud |

**Forbidden in git:** `.env`, private keys, production Mongo URIs with credentials in docs/screenshots.

---

## 7. Input validation & hardening

Middleware stack includes (as configured):

- Helmet (CSP / HSTS in production)  
- mongo-sanitize, HPP  
- XSS sanitization  
- express-validator on mutating routes  
- Optional CSRF for cookie flows  

Assume all client input is hostile.

---

## 8. Security dashboard & audit

- Failed logins, permission denials, admin actions audited  
- Security Admin UI for operators  
- Treat audit logs as sensitive  

Continue: [07 Testing](./07-testing.md) · [10 Troubleshooting](./10-troubleshooting.md)
