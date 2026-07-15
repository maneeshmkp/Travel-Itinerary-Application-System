# 10 — Troubleshooting

**Parent:** [Engineering Handbook](./ENGINEERING.md)

---

## Quick triage

| Symptom | First check |
|---------|-------------|
| API won’t start | Port 5000 free? `.env` present? |
| Endless Redis errors | Is Redis up on `6379`? |
| Login fails | JWT_SECRET set? Mongo reachable? |
| Empty trip list | Tenant filter / catalog visibility |
| Frontend blank API | `VITE_API_URL` |
| Jobs not running | Redis + worker start logs |

---

## Redis

**`connect ECONNREFUSED 127.0.0.1:6379`**

```bash
docker compose up -d redis
# or
docker start travelplan-redis-1
docker exec travelplan-redis-1 redis-cli ping
```

Ensure `REDIS_URL` matches host/port. If Redis is intentionally unused, remove `REDIS_URL` so the API uses legacy in-process pollers instead of storming reconnects.

**Low cache hit ratio:** Cold start, aggressive invalidation, or TTLs too short — see [`REDIS.md`](../../REDIS.md).

---

## MongoDB

**`Database connection failed`:** validate `MONGO_URI`, IP allowlist (Atlas), credentials.

**Slow query warnings:** network RTT to Atlas often ≥100–300ms; raise `MONGO_SLOW_MS` only if noise is unbearable; add indexes via explain (`npm run perf:explain`).

**Missing documents after tenancy:** rows with `tenantId: null` are hidden from tenant-scoped queries. Catalog browse should include System seeds; private data must be backfilled to the user tenant (`ensureUserTenant` / Multitenancy docs).

---

## BullMQ

**Workers skipped / not processing:** Redis probe failed at boot — fix Redis, restart API.

**Jobs stuck / DLQ growth:** inspect Admin → Queues; check processor errors in logs; verify external API keys for AI/weather/flights.

**Duplicate work:** `LEGACY_POLLERS=true` while BullMQ scheduler also runs — disable one path.

---

## Socket.IO

**Notifications not realtime:** Redis adapter not ready; CORS/origin mismatch; auth handshake failed (expired access token). Check `Socket connected` logs and Monitoring socket count.

---

## Docker

**Port already allocated:** stop conflicting containers/process.

**Compose health failing:** `docker compose logs mongo redis backend`.

**Rebuild needed after Dockerfile change:**

```bash
docker compose build --no-cache backend
```

---

## AWS S3

**Uploads fail:** `STORAGE_PROVIDER`, bucket, region, keys; bucket policy; server clock skew.

**Health yellow/red for S3:** HeadBucket permission or misconfigured credentials — documents may fall back depending on provider.

---

## API keys & third parties

| Integration | Env (typical) | Failure mode |
|-------------|---------------|--------------|
| OpenWeather | `OPENWEATHER_API_KEY` | Weather degraded |
| Maps / Geocoding | `GOOGLE_*` keys | Leaflet fallback / missing coords |
| SerpAPI | `SERPAPI_KEY` | No live flight/hotel rates |
| OpenAI / Gemini | `OPENAI_API_KEY` / `GEMINI_API_KEY` | AI routes fail or local fallbacks |
| SMTP | Nodemailer vars | Password reset email fails |

Health cards and startup logs call out unconfigured providers.

---

## Auth / frontend session

**401 loops:** refresh token revoked; multiple tabs; cleared sessionStorage.

**CORS:** add SPA origin to backend CORS allowlist / `FRONTEND_URL`.

---

## Useful commands

```bash
curl -s http://localhost:5000/api/health/live
curl -s http://localhost:5000/api/health | head
cd backend && npm run redis:smoke
cd backend && npm run perf:load -- --paths /api/health/live --users 20 --duration 5000
```

Continue: [08 Monitoring](./08-monitoring.md) · [11 Onboarding](./11-onboarding.md)
