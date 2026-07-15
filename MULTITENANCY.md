# Multi-Tenancy

Multi-tenant SaaS layer for the Travel Management Platform. Organizations (**tenants**) share one application deployment with **hard data isolation**, **plan limits**, and **Super Admin** controls.

Business logic for trips, bookings, expenses, documents, AI, and notifications is unchanged — tenancy is enforced via models, middleware, and event handlers.

---

## Architecture

```
Request
  → auth (JWT) → resolveTenant (subdomain | X-Tenant-ID | user.tenantId)
  → AsyncLocalStorage tenant context
  → mongoose tenantScopePlugin (auto-filter + stamp tenantId)
  → route handlers / services (unchanged queries)
  → EventBus (tenantId injected) → TenantUsage + Audit handlers
```

| Layer | Responsibility |
|--------|----------------|
| `Tenant` model | Org identity, plan, status, logo, owner, settings, usage counters |
| `User.tenantId` / `User.tenantRole` | Membership (owner \| admin \| member \| guest) |
| `resolveTenant` middleware | Resolve + cross-tenant denial + ALS context |
| `tenantScopePlugin` | Every query / save on scoped models is tenant-bound |
| Plans (`constants/plans.js`) | Free / Pro / Enterprise soft limits |
| Super Admin APIs / UI | Manage tenants, plans, usage, storage |

Scoped models: **Itinerary**, **Booking**, **TripExpense**, **TravelDocument**, **Notification**, **TravelAnalytics**.

---

## Tenant Resolution

Order of resolution (`tenantService.resolveTenantFromRequest`):

1. **`X-Tenant-ID`** (or `X-Tenant`) — valid Mongo ObjectId of an active tenant  
2. **Subdomain** — first host label as `tenant.slug` (skipped for `localhost`, `www`, `api`, `127`)  
3. **Authenticated user** — `user.tenantId`

Rules:

- Non–super-admin users may **only** access their own tenant (header/subdomain mismatch → **403 Cross-tenant access denied**).
- Suspended tenants → **403** for normal users.
- Legacy accounts without `tenantId` get a personal workspace via `ensureUserTenant` (with row backfill).
- Super Admin sets `req.tenantBypass = true` so platform queries are unscoped.

---

## Data Isolation

- Request context: `enterTenantContext({ tenantId, bypass })` (AsyncLocalStorage).
- Plugin prepends `{ tenantId }` on `find` / `count` / `update` / `delete` unless `bypass` or filter already has `tenantId`.
- On `save`, stamps `tenantId` when missing.
- Helper: `withTenant(filter)` for aggregations / raw queries.
- Users cannot read or mutate another org’s trips, bookings, expenses, documents, notifications, or analytics through the API.

---

## Plan Enforcement

Plans: **free**, **pro**, **enterprise**.

| Resource | Free | Pro | Enterprise |
|----------|------|-----|------------|
| Users | 3 | 25 | unlimited |
| Trips | 10 | 200 | unlimited |
| AI requests | 50 | 2000 | unlimited |
| Storage | 100MB | 5GB | unlimited |
| Documents | 25 | 1000 | unlimited |

Middleware:

- `requirePlanLimit("trips" | "documents" | "aiRequests" | …)` → **402** `PLAN_LIMIT_EXCEEDED`
- Wired on itinerary create, document upload, AI / chat routes
- `trackAiUsageOnSuccess` increments AI usage after 2xx responses
- Usage also updates via EventBus (`TenantUsage` handler) and API request counters in `resolveTenant`

---

## Tenant Roles

Within a tenant (`User.tenantRole`):

| Role | Intent |
|------|--------|
| `owner` | Billing / org ownership |
| `admin` | Manage members & settings |
| `member` | Full product use |
| `guest` | Restricted |

Platform RBAC (User / Admin / Super Admin) is unchanged. Middleware `requireTenantRole(...)` gates tenant-scoped privileges; Super Admin bypasses.

---

## Security

1. Every authenticated API runs `resolveTenant` after JWT protect.  
2. Cross-tenant header spoofing blocked for non–super-admins.  
3. Mongoose plugin enforces isolation even if a handler forgets `tenantId` in the filter.  
4. Super Admin is the only role with `super:tenants` and global bypass.  
5. Audit rows include `tenantId` in metadata for domain events.

---

## Super Admin

UI: **`/admin/tenants`** (permission `super:tenants`).

APIs:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/tenants` | List / search |
| POST | `/api/admin/tenants` | Create |
| GET | `/api/admin/tenants/:id` | Detail + refresh usage |
| PATCH | `/api/admin/tenants/:id` | Plan, status, name, settings |
| GET | `/api/admin/tenants/:id/usage` | Usage dashboard |
| GET | `/api/admin/tenants/metrics` | Per-tenant monitoring totals |
| GET | `/api/admin/tenants/plans` | Plan catalog |
| GET | `/api/admin/usage/me` | Current user’s tenant usage |

---

## Usage Dashboard

Shows AI usage, storage, API requests, documents, expenses, trips, users — against plan limits (progress bars in admin UI).

---

## Audit & Monitoring

- Domain events → `AuditLogs` handler with `metadata.tenantId`.
- Super Admin tenant create/update → `admin.action` audit entries.
- `/admin/tenants/metrics` aggregates usage across tenants for monitoring.

---

## Testing

```bash
cd backend && npm test -- tests/tenancy.test.js
```

Covers plan limits, isolation helpers, cross-tenant role gates, JWT tenant claims, and `super:tenants` permission.

---

## Modified / added files

### Added

| File | Purpose |
|------|---------|
| `backend/models/Tenant.js` | Tenant schema |
| `backend/constants/plans.js` | Plans, limits, tenant roles |
| `backend/utils/tenantScope.js` | ALS + mongoose plugin |
| `backend/services/tenantService.js` | Create/ensure/resolve/usage/limits |
| `backend/middlewares/tenant.js` | resolveTenant, plan limits, AI track, tenant roles |
| `backend/controllers/tenantController.js` | Super Admin tenant APIs |
| `backend/events/handlers/tenantUsageHandler.js` | Usage counters from domain events |
| `backend/tests/tenancy.test.js` | Isolation / limits / roles tests |
| `frontend/src/pages/admin/AdminTenants.jsx` | Super Admin tenants UI |
| `MULTITENANCY.md` | This document |

### Modified

| File | Change |
|------|--------|
| `backend/models/User.js` | `tenantId`, `tenantRole` |
| `backend/models/Itinerary.js` | `tenantScopePlugin` |
| `backend/models/Booking.js` | `tenantScopePlugin` |
| `backend/models/TripExpense.js` | `tenantScopePlugin` |
| `backend/models/TravelDocument.js` | `tenantScopePlugin` |
| `backend/models/Notification.js` | `tenantScopePlugin` |
| `backend/models/TravelAnalytics.js` | `tenantScopePlugin` |
| `backend/middlewares/authMiddleware.js` | Calls `resolveTenant` after auth |
| `backend/controllers/authController.js` | Personal tenant on signup; JWT/public user tenant fields |
| `backend/constants/rbac.js` | `SUPER_TENANTS`; JWT `tenantId` / `tenantRole` |
| `backend/routes/adminRoutes.js` | Tenant management routes |
| `backend/routes/itineraryRoutes.js` | Trip plan limit on create |
| `backend/routes/documents.js` | Document plan limit on upload |
| `backend/routes/aiRoutes.js` | AI plan limit + usage tracking |
| `backend/routes/chatRoutes.js` | AI plan limit + usage tracking |
| `backend/events/EventBus.js` | Auto-inject `tenantId` into events |
| `backend/events/handlers/index.js` | Register usage handlers |
| `backend/events/handlers/auditHandler.js` | Persist `tenantId` in audit metadata |
| `backend/controllers/expenseController.js` | Publish expense added/deleted for usage |
| `backend/services/documents/documentService.js` | Publish `fileSize` / `tenantId` on upload |
| `frontend/src/services/api.js` | `adminAPI` tenant methods |
| `frontend/src/pages/admin/AdminLayout.jsx` | Tenants nav item |
| `frontend/src/App.jsx` | `/admin/tenants` route |

---

## Headers / examples

```http
Authorization: Bearer <jwt>
X-Tenant-ID: 6655f0a1b2c3d4e5f6789012
```

Subdomain example: `acme.travelplan.example` → tenant slug `acme`.
