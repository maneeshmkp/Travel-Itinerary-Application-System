# 02 — Local Development

**Parent:** [Engineering Handbook](./ENGINEERING.md)

---

## Prerequisites

| Tool | Notes |
|------|--------|
| Node.js **≥ 20** | Match CI |
| npm | Workspaces via root scripts |
| Docker Desktop | Recommended for Redis / full stack |
| Git | Feature-branch workflow |
| Optional | MongoDB Atlas URI (common for local API against cloud DB) |

---

## 1. Installation

```bash
git clone <repository-url>
cd travel-itinerary-system

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Optional root scripts
npm install
```

Copy environment templates:

```bash
# Backend secrets (never commit real .env)
cp backend/.env.example backend/.env   # if present; else create from README §7

# Docker Compose env
cp .env.docker.example .env.docker
```

Configure at minimum:

- `MONGO_URI` / `MONGODB_URI`  
- `JWT_SECRET` (long random string)  
- `REDIS_URL=redis://127.0.0.1:6379` (when Redis is local)  
- Frontend: `VITE_API_URL=http://localhost:5000/api`

See root [`README.md`](../../README.md) Environment Variables and [`backend/SETUP.md`](../../backend/SETUP.md).

---

## 2. Running Redis

BullMQ, caching, rate limits, and Socket.IO horizontal scaling expect Redis.

```bash
# Preferred: compose service only
docker compose up -d redis

# Or start an existing named container
docker start travelplan-redis-1

# Verify
docker exec travelplan-redis-1 redis-cli ping   # → PONG
```

If Redis is down but `REDIS_URL` is set, workers may be deferred and legacy in-process pollers used. Prefer keeping Redis healthy for a production-like local stack. Details: [`REDIS.md`](../../REDIS.md).

Smoke:

```bash
cd backend && npm run redis:smoke
```

---

## 3. Running MongoDB

Options:

1. **MongoDB Atlas** — set `MONGO_URI` in `backend/.env`  
2. **Docker** — `docker compose up -d mongo` (host port `27017` by default)

Confirm API logs: `MongoDB connected`.

---

## 4. Running the backend

```bash
cd backend
npm run dev      # nodemon
# or
npm start        # node server.js
```

Default: **http://localhost:5000**

Useful URLs:

| Path | Purpose |
|------|---------|
| `/` | API hello |
| `/docs` | Swagger UI |
| `/api/health` | Full dependency health |
| `/api/health/live` | Lightweight liveness |
| `/api/v1/...` | Preferred API prefix |

---

## 5. Running the frontend

```bash
cd frontend
npm run dev
```

Default Vite: **http://localhost:3000**  
Ensure `VITE_API_URL` points at the backend API base (including `/api` if your client expects it).

---

## 6. Running both from root

```bash
npm run dev              # concurrent backend + frontend (if configured)
npm run dev:backend
npm run dev:frontend
```

---

## 7. Docker Compose (full stack)

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
# or
npm run docker:up
```

| Service | Default host port |
|---------|-------------------|
| `frontend` | 3000 |
| `backend` | 5000 |
| `mongo` | 27017 |
| `redis` | 6379 |

```bash
npm run docker:logs
npm run docker:down
```

---

## 8. BullMQ

When Redis is configured and reachable:

- Workers start with the API process  
- Scheduler registers repeatable jobs (flights, weather, cleanups, …)  

Docs: [`JOBS.md`](../../JOBS.md)  
Admin UI: `/admin/queues` (or Super Admin)

Local checks:

```bash
# Health / Redis cards
curl http://localhost:5000/api/health

# Load / explain tools (optional)
cd backend && npm run perf:explain
```

---

## 9. Seed data (optional)

```bash
cd backend
npm run seed
npm run seed:blogs
npm run seed:bookings
# etc. — see backend/package.json scripts
```

---

## 10. Common local pitfalls

| Symptom | Check |
|---------|--------|
| Port 5000 in use | Stop other Node processes; restart API |
| `ECONNREFUSED 6379` | Start Redis container |
| CORS errors | `FRONTEND_URL` / allowed origins |
| Empty trip catalog | Tenant scoping — see troubleshooting & Multitenancy docs |
| 401 loops | Refresh token / session storage; clock skew |

Continue: [03 Coding Standards](./03-coding-standards.md) · [10 Troubleshooting](./10-troubleshooting.md)
