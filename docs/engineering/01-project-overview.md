# 01 — Project Overview

**Parent:** [Engineering Handbook](./ENGINEERING.md)

---

## 1. Business problem

Travelers and travel teams fragment work across chat apps, spreadsheets, booking sites, PDF tickets, and weather tabs. That fragmentation causes:

- Lost itineraries and duplicate bookings  
- Budget overruns discovered too late  
- Weak collaboration between co-travelers  
- No operational visibility (flights, documents, alerts)  
- Difficult admin oversight for agencies and SaaS orgs  

**TravelPlan** consolidates trip lifecycle management into one AI-assisted platform: plan → book → spend → collaborate → operate → analyze—with enterprise controls (auth, RBAC, tenancy, jobs, monitoring).

---

## 2. Product goals

| Goal | How TravelPlan addresses it |
|------|-----------------------------|
| Plan faster | AI itineraries, recommendations, Copilot tools |
| Stay in budget | Expenses, thresholds, budget optimizer |
| Operate trips | Weather, maps, flights, packing, risk, documents |
| Collaborate | Shared trips, notifications, Socket.IO |
| Scale as SaaS | Multi-tenant isolation, Admin / Super Admin portals |
| Ship safely | CI/CD, OpenAPI, Playwright, observability |

Non-goals for the core platform: becoming a full GDS; owning payment settlement end-to-end (integrations provide availability; booking records are platform-managed).

---

## 3. Architecture

### Style

- **Modular monolith API** (Node.js / Express) with clear `controllers → services → models` boundaries  
- **SPA frontend** (React + Vite)  
- **Cache & messaging** via Redis (cache-aside, rate limits, Socket.IO adapter, BullMQ)  
- **In-process Event Bus** for domain side effects ([`EVENTS.md`](../../EVENTS.md))  
- **Background workers** for retries and schedules ([`JOBS.md`](../../JOBS.md))

### Logical view

```text
┌─────────────┐     ┌──────────────────────┐     ┌──────────┐
│ React SPA   │────►│ Express API (/api/v1) │────►│ MongoDB  │
│ Admin UI    │◄────│ JWT · RBAC · Tenancy  │     └──────────┘
└──────┬──────┘     │ Event Bus · Metrics   │
       │            └──────────┬───────────┘
       │ Socket.IO             │
       ▼                       ▼
   Clients              Redis + BullMQ
                              │
                    S3 · AI · Weather · Maps
```

See [`ARCHITECTURE.md`](../../ARCHITECTURE.md) and [`SEQUENCE_DIAGRAMS.md`](../../SEQUENCE_DIAGRAMS.md) for Mermaid diagrams.

### Key runtime concerns

| Concern | Mechanism |
|---------|-----------|
| AuthN | Access JWT + refresh rotation + device sessions |
| AuthZ | RBAC permissions (`guest` → `super_admin`) |
| Tenancy | `tenantId` scope plugin + middleware |
| Resilience | Redis fail-open for cache/limits; DLQ for jobs |
| Docs | OpenAPI 3 + Swagger UI at `/docs` |

---

## 4. Folder structure

```text
travel-itinerary-system/
├── backend/                 # Express API, workers, OpenAPI
│   ├── config/              # DB, Redis, Swagger
│   ├── constants/           # RBAC, plans, enums
│   ├── controllers/         # HTTP adapters
│   ├── services/            # Domain & integrations
│   ├── models/              # Mongoose schemas
│   ├── middlewares/         # Auth, security, rate limit, tenancy
│   ├── routes/              # Mounted routers
│   ├── events/              # Domain event bus
│   ├── queues/ · workers/ · jobs/ · scheduler/
│   ├── socket/              # Socket.IO
│   ├── tests/               # Node test runner
│   └── docs/                # OpenAPI sources
├── frontend/                # React + Vite SPA / PWA
│   └── src/
│       ├── pages/ · components/ · context/
│       ├── services/        # API clients
│       └── offline/         # IndexedDB / sync
├── packages/travelplan-sdk/ # Generated / maintained client SDK
├── tests/e2e/               # Playwright
├── docs/engineering/        # ← This handbook
├── .github/workflows/       # CI, E2E, Deploy
├── docker-compose.yml
├── render.yaml · vercel.json
└── *.md                     # Feature & ops deep dives
```

---

## 5. Personas & portals

| Persona | Surface |
|---------|---------|
| Traveler / member | SPA: trips, bookings, copilot, analytics |
| Org admin | `/admin` — users, trips, queues, monitoring, security |
| Super admin | `/super-admin` — tenants, roles, platform settings |

---

## 6. Success metrics (engineering)

- API P95 latency and error rate (Monitoring → Performance)  
- Redis cache hit ratio  
- Job success / DLQ rate  
- E2E critical suite green on main  
- Zero secrets in git; rotated credentials documented in `.github/SECRETS.md`
