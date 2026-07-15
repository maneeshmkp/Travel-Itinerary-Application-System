# Enterprise RBAC & Admin Portal

## Architecture

TravelPlan uses **role-based access control with permission grants**:

1. Each user has a **role** (`user` | `premium` | `support` | `moderator` | `admin` | `super_admin`).
2. Roles resolve to a fixed **permission set** (`backend/constants/rbac.js` → `ROLE_PERMISSIONS`).
3. Optional per-user `permissions[]` are merged on top of role defaults.
4. JWT carries `{ id, role, permissions }` so APIs and the SPA can authorize without extra round trips.
5. Middleware (`authorize` / `requireRole` / `requirePermission`) enforces gates on every protected route.
6. Privileged actions write **audit logs** (`AuditLog` model).

Guest is not stored; unauthenticated requests are treated as `guest` with an empty permission set.

```
Client ──Bearer JWT──► protect() ──► attachAuthContext() ──► requireRole / requirePermission ──► handler
                            │
                            ▼
                     User (Mongo) = source of truth for role/status
                     JWT claims = fast permission hints (refreshed from DB on each request)
```

## Roles

| Role | Intent |
|------|--------|
| Guest | Public / unauthenticated |
| User | Default traveler |
| Premium User (`premium`) | Same core capabilities; ready for tier features |
| Support | View/assist users in admin portal (limited) |
| Moderator | Content moderation permissions |
| Admin | Operations: users, trips, bookings, analytics, monitoring, notifications |
| Super Admin | Full system: roles, admins, settings, API key metadata |

Legacy `role: "admin"` continues to work. Emails listed in `ADMIN_EMAILS` are treated as **admin** at runtime without rewriting the database row.

## Permission model

Permissions are string constants (`trips:create`, `admin:users`, `super:settings`, …).  
Effective permissions = `ROLE_PERMISSIONS[role] ∪ user.permissions`.

Key groups:

- **User:** trips, bookings, expenses, documents, AI
- **Support:** `support:reports:view`, `support:assist`
- **Moderator:** itinerary/review/report moderation
- **Admin:** `admin:*` portal capabilities
- **Super Admin:** `super:roles`, `super:admins`, `super:settings`, `super:api_keys`

### Privilege escalation

`canAssignRole(actor, targetRole)` enforces:

- Actor may only assign roles **strictly below** their rank.
- Only **super_admin** may assign `super_admin`.
- Assigning `admin` requires super_admin (or `super:admins`).
- Cannot suspend/delete users of equal or higher rank (except as super_admin).

## JWT flow

1. Login / signup / password reset call `generateToken(user)`.
2. Token payload: `{ id, role, permissions }` (7d expiry).
3. `protect` verifies JWT, loads User from DB, rejects `status: suspended`, builds `req.auth`.
4. Public user payload (`/auth/me`, login response) includes `role`, `permissions`, `status`.

Existing clients that only used `role === "admin"` still work for admins; staff roles use `canAccessAdminPortal()` on the frontend.

## Admin dashboard

**UI:** `/admin` (nested layout)

| Page | Path | Gate |
|------|------|------|
| Dashboard | `/admin` | Staff |
| Users | `/admin/users` | `admin:users` (support can view) |
| Trips | `/admin/trips` | `admin:trips` |
| Bookings | `/admin/bookings` | `admin:bookings` |
| Documents | `/admin/documents` | `admin:documents` |
| Analytics | `/admin/analytics` | `admin:analytics` |
| Monitoring | `/admin/monitoring` | `admin:monitoring` |
| Notifications | `/admin/notifications` | `admin:notifications` |
| Roles | `/admin/roles` | `super:roles` or `admin:users` |
| System Settings | `/admin/settings` | `super:settings` |

**API:** `/api/admin/*` and `/api/v1/admin/*`

User management supports search, filter (role/status), suspend, activate, delete, reset password, and change role.

## Audit logs

`services/auditService.js` records:

- `auth.login` / `auth.login_failed` / `auth.signup`
- `user.role_change`, `user.update`, `user.delete`, `user.suspend`, `user.activate`
- `user.password_reset_admin`
- `system.settings_update`

Queryable via `GET /admin/audit` (permission `admin:audit`).

## Protecting APIs

Middleware exports (also re-exported from legacy `requireAdmin.js`):

- `authorize({ roles, permissions })`
- `requireRole(...roles)`
- `requirePermission(...permissions)` — **OR** semantics
- `requireStaff` — admin portal
- `requireAdmin` — backward compatible admin check

Wired onto existing routers (handlers unchanged):

- AI & chat → `ai:use`
- Trips / itineraries → `trips:create|manage`
- Expenses → `expenses:manage`
- Bookings → `bookings:manage`
- Documents → `documents:upload`
- Monitoring → `admin:monitoring`
- Admin portal → `/admin/*`

## Modified / added files

### Backend (new)

| File | Purpose |
|------|---------|
| `backend/constants/rbac.js` | Roles, ranks, permissions, helpers |
| `backend/middlewares/rbac.js` | `authorize`, `requireRole`, `requirePermission`, `requireStaff`, `requireAdmin` |
| `backend/models/AuditLog.js` | Audit collection |
| `backend/models/SystemSettings.js` | Super-admin settings document |
| `backend/services/auditService.js` | Write audit events |
| `backend/controllers/adminController.js` | Admin portal API |
| `backend/routes/adminRoutes.js` | `/admin` routes |
| `backend/tests/rbac.test.js` | Unit tests for RBAC/JWT/middleware |

### Backend (updated)

| File | Change |
|------|--------|
| `backend/models/User.js` | Expanded roles, `permissions`, `status`, `createdBy`, `updatedBy` |
| `backend/middlewares/authMiddleware.js` | JWT claims, suspended check, `req.auth` |
| `backend/middlewares/requireAdmin.js` | Re-exports from `rbac.js` |
| `backend/controllers/authController.js` | JWT role/permissions; audit on login/signup |
| `backend/routes/apiRouter.js` | Mounts `/admin` |
| `backend/routes/aiRoutes.js` | `ai:use` |
| `backend/routes/chatRoutes.js` | `ai:use` / `expenses:manage` |
| `backend/routes/itineraryRoutes.js` | trip/expense permissions; delete requires auth |
| `backend/routes/bookings.js` | `bookings:manage` |
| `backend/routes/documents.js` | `documents:upload` |
| `backend/routes/tripRoutes.js` | trip/booking/doc permissions |
| `backend/routes/monitoring.js` | `admin:monitoring` |

### Frontend (new)

| File | Purpose |
|------|---------|
| `frontend/src/utils/rbac.js` | Client role helpers |
| `frontend/src/pages/admin/AdminLayout.jsx` | Sidebar shell |
| `frontend/src/pages/admin/AdminDashboard.jsx` | Dashboard |
| `frontend/src/pages/admin/AdminUsers.jsx` | User management |
| `frontend/src/pages/admin/AdminResources.jsx` | Trips / bookings / documents tables |
| `frontend/src/pages/admin/AdminMisc.jsx` | Analytics, notifications, roles, settings |

### Frontend (updated)

| File | Change |
|------|--------|
| `frontend/src/components/AdminRoute.jsx` | Staff + permission gates |
| `frontend/src/App.jsx` | Nested `/admin/*` routes |
| `frontend/src/services/api.js` | `adminAPI` |
| `frontend/src/components/nav/navConfig.js` | Admin Portal link |
| `frontend/src/components/nav/ProfileMenuPanel.jsx` | `canAccessAdminPortal` |

### Docs

| File | Purpose |
|------|---------|
| `RBAC.md` | This document |

## Testing

```bash
cd backend && npm test
```

Covers every role permission matrix helpers, JWT payload shape, unauthorized 403s, suspended users, and escalation rules.

## Bootstrap tip

Set an operator to admin in MongoDB or via env:

```
ADMIN_EMAILS=you@company.com
```

Or update the user document:

```js
db.users.updateOne({ email: "you@company.com" }, { $set: { role: "super_admin" } })
```

Then open `/admin`.
