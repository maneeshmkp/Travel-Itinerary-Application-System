# Observability: Logging, Health Checks & System Monitoring

Production-grade monitoring layered on top of the existing MERN platform. **No travel features were rewritten** — this adds Winston/Morgan logging, metrics, health probes, and an admin dashboard.

---

## Architecture overview

```
Requests ──► metricsMiddleware + Morgan ──► route handlers
                    │
                    ▼
              metricsStore (in-memory ring buffers)
                    │
Health probes ◄─────┴────► Winston logs (logs/combined.log, logs/error.log)
                    │
           GET /api/health (public)
           GET /api/monitoring/* (admin only)
                    │
                    ▼
        System Monitoring UI (/admin/monitoring)
```

---

## Logging architecture

| Piece | Role |
|-------|------|
| `backend/logger/index.js` | Winston logger: JSON files + colored console in dev |
| Domain children | `logAuth`, `logDb`, `logS3`, `logAi`, `logWeather`, `logMaps`, `logSocket`, `logBooking`, `logExpense`, `logHttp` |
| Morgan | HTTP access lines streamed into Winston (`requestLogger`) |
| Files | `backend/logs/combined.log`, `backend/logs/error.log` (gitignored) |

**What gets logged**

- App startup (`server.js`, `app.js`)
- Incoming requests (method, path, status, latency, user id)
- Auth login success/failure
- Mongo connect/fail
- S3 uploads
- AI provider success/fail
- Weather / Maps (geocode) calls
- Socket connect/disconnect
- Booking + expense creates
- Centralized errors via `errorHandler` (typed codes)

Secrets (API keys, passwords, AWS credentials) are **never** written to logs.

---

## Error handling

`middlewares/errorHandler.js` classifies:

| Code | Typical HTTP |
|------|----------------|
| `VALIDATION_ERROR` | 400 |
| `AUTHENTICATION_ERROR` | 401 |
| `AUTHORIZATION_ERROR` | 403 |
| `NOT_FOUND` | 404 |
| `DATABASE_ERROR` | 503 |
| `THIRD_PARTY_API_ERROR` | 502 |
| `SERVER_ERROR` | 500 |

Response shape:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "error": "…",
  "message": "…"
}
```

Use `utils/AppError.js` for operational errors in new code.

---

## Health check flow

**Endpoints**

- `GET /health`
- `GET /api/health` (same handler)

**Steps**

1. Parallel probes: Mongo readyState, Redis TCP (if `REDIS_URL`), S3 `HeadBucket`, AI key presence, Weather key, Maps/Geocoding config, Socket.IO `getIO()`.
2. Collect OS memory + CPU load proxy.
3. Attach lightweight live metrics (request count, latency, sockets).
4. Return overall `healthy | degraded | unhealthy` with card colors `green | yellow | red`.
5. **No secrets** in the payload (bucket “reachable”, not credential values).

Redis/S3/AI/Weather/Maps report `not_configured` (yellow) when env vars are missing — **not** a critical red unless configured and failing.

HTTP status: `200` unless overall `unhealthy` → `503`.

---

## Metrics collection

`services/monitoring/metricsStore.js` keeps a **60-minute sliding window** in process memory:

- Request count, latency, error rate
- Requests-per-minute time series
- Slow endpoints, most-used API prefixes
- Top error codes
- Approximate active users (ids seen)
- Socket connection counts
- Domain counters (ai, weather, maps, s3, booking, expense)

Fallback poll is unnecessary for the admin UI: it calls `/api/monitoring/overview` every **10 seconds**.

---

## Admin security

Monitoring routes require:

1. Valid JWT (`protect`)
2. `requireAdmin` — `User.role === "admin"` **or** email listed in `ADMIN_EMAILS`

Bootstrap without DB migration:

```env
ADMIN_EMAILS=you@example.com
```

Login again so `/api/auth/me` returns `role: "admin"`. Profile menu then shows **System Monitoring**.

Optional permanent role:

```js
// Mongo shell / Compass
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

---

## Admin dashboard UI

Route: `/admin/monitoring` (`AdminRoute`)

- Service cards: Server, MongoDB, Redis, S3, AI, Weather, Maps, Socket.IO
- Alerts (memory/CPU > 80%, disconnected deps)
- RPM chart (lazy-loaded Recharts)
- Most-used APIs, slow endpoints, top errors
- Auto-refresh 10s

---

## How to test

| Scenario | How |
|----------|-----|
| Health endpoint | `curl http://localhost:5000/api/health` |
| Mongo disconnect | Stop Mongo → health `mongodb.status=unhealthy`, overall red/503 |
| Redis | Unset `REDIS_URL` → yellow `not_configured`; set invalid host → red if configured |
| S3 failure | Misconfigure bucket keys with `STORAGE_PROVIDER=s3` → unhealthy |
| Logs | Hit APIs → check `backend/logs/combined.log` |
| Admin auth | Call `/api/monitoring/overview` without token → 401; non-admin → 403 |
| UI | Set `ADMIN_EMAILS`, login, open Profile → System Monitoring |

---

## Modified / added files

### Backend (new)

| File | Purpose |
|------|---------|
| `logger/index.js` | Winston + domain loggers |
| `services/monitoring/metricsStore.js` | In-memory metrics |
| `services/monitoring/healthService.js` | Health probes + alerts |
| `controllers/monitoringController.js` | Health + admin APIs |
| `routes/monitoring.js` | Admin routes |
| `middlewares/requestMetrics.js` | Morgan + metrics middleware |
| `middlewares/requireAdmin.js` | Admin gate |
| `utils/AppError.js` | Typed operational errors |

### Backend (updated)

| File | Change |
|------|--------|
| `app.js` | Logging, metrics, `/health`, `/api/monitoring` |
| `server.js` | Structured startup logs |
| `config/db.js` | Winston on connect |
| `middlewares/errorHandler.js` | Taxonomy + JSON codes |
| `models/User.js` | `role` field |
| `controllers/authController.js` | Return `role` via `ADMIN_EMAILS` / DB |
| `socket/index.js` | Socket metrics + winston |
| `services/storage/s3StorageProvider.js` | Upload logs + health client export |
| `services/aiService.js` | AI call logs |
| `services/weatherService.js` | Weather API logs |
| `services/geocodingService.js` | Maps logs |
| `services/bookings/bookingService.js` | Booking event log |
| `services/expenseService.js` | Expense event log |
| `package.json` | `winston`, `morgan` |
| `.env.example` | `ADMIN_EMAILS`, `REDIS_URL`, `LOG_LEVEL` |

### Frontend

| File | Change |
|------|--------|
| `pages/SystemMonitoring.jsx` | Admin dashboard |
| `components/monitoring/RpmChart.jsx` | Lazy chart |
| `components/AdminRoute.jsx` | Admin guard |
| `services/api.js` | `monitoringAPI` |
| `App.jsx` | `/admin/monitoring` route |
| `nav/navConfig.js` + `ProfileMenuPanel.jsx` | Admin menu item |

### Docs / repo

| File | Change |
|------|--------|
| `MONITORING.md` | This document |
| `.gitignore` | `backend/logs/` |
