# TravelPlan

**Production-grade AI Travel Management Platform**

[![CI](https://github.com/OWNER/travel-itinerary-system/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/travel-itinerary-system/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%7C%207-green)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/docker-compose-ready-blue)](./docker-compose.yml)

TravelPlan is an enterprise MERN application for planning, booking, and operating travel—from AI-generated itineraries and live availability to expenses, documents, flight status, and multi-tenant administration.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Technology Stack](#3-technology-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [Folder Structure](#5-folder-structure)
6. [Installation](#6-installation)
7. [Environment Variables](#7-environment-variables)
8. [Screenshots](#8-screenshots)
9. [API Documentation](#9-api-documentation)
10. [Deployment](#10-deployment)
11. [Performance Optimizations](#11-performance-optimizations)
12. [Security](#12-security)
13. [Testing](#13-testing)
14. [CI/CD](#14-cicd)
15. [Future Improvements](#15-future-improvements)
16. [Contributors](#16-contributors)
17. [License](#17-license)

---

## 1. Project Overview

**TravelPlan** is a production-oriented AI travel management platform that brings trip planning, spend control, collaboration, and operations into one product. Travelers build day-by-day itineraries, generate AI-personalized plans, track expenses against budgets, discover nearby places, and keep passports and tickets in a secure Document Vault—while organizations manage tenants, usage, and staff through dedicated Admin and Super Admin portals.

The system is built on a **MERN** foundation (**MongoDB**, **Express**, **React**, **Node.js**) with Redis caching and rate limiting, **BullMQ** background jobs, **Socket.IO** realtime notifications, and **AWS S3** for document storage. External providers power weather, maps/geocoding, flights and hotels (SerpAPI), trains, and optional OpenAI / Google Gemini AI.

Beyond core consumer workflows, TravelPlan includes enterprise layers: **JWT authentication** with refresh-token rotation and device sessions, **RBAC** (Guest → Super Admin), **multi-tenant SaaS** isolation, an in-process **Event Bus**, OpenAPI / Swagger documentation, Playwright end-to-end tests, and GitHub Actions for CI/CD. The result is a codebase suitable for demos, student portfolios, and serious product evolution toward commercial SaaS.

Whether you run it locally with Docker Compose, deploy the API to Render, the SPA to Vercel, data to MongoDB Atlas, and files to S3, TravelPlan is designed as a coherent, observable, and securable travel stack rather than a thin tutorial scaffold.

---

## 2. Features

### Authentication

- Signup, login, and password reset (email via Nodemailer)
- Short-lived **access JWT** + **refresh token rotation**
- Device-based sessions, logout, and **logout from all devices**
- Tab-scoped frontend session storage; silent refresh on token expiry

### AI

- Personalized itinerary generation (OpenAI / Gemini)
- Enrich descriptions, suggest day / highlights, trip summaries
- Contextual **Ask AI** dialog across the app
- Domain AI routes for bookings, documents, risk, flights, and budget

### Trips

- Create and edit multi-day itineraries (hotels, activities, transfers)
- Budget insight, route optimization, skip/restore schedule reflow
- Cover images, PDF export, collaboration invites, reviews & ratings
- Browse, search, filter, save / unsave trips

### Bookings

- Trip-linked bookings (flights, hotels, trains, buses, activities)
- Status lifecycle, enrichment, and booking hub UI
- Availability integrations (SerpAPI, Railkit, SeatSeller, optional Amadeus)

### Expense Tracker

- Categorized trip expenses with currencies and payment methods
- Budget thresholds and overspend awareness
- CSV / PDF expense exports
- Copilot tools for logging spend and summarizing budget

### Weather

- Destination and activity weather via OpenWeather
- Forecasts used by packing, risk, and Copilot tools
- Refreshable weather with cache-aware background jobs

### Maps

- Google Maps (preferred) with Leaflet / OpenStreetMap fallback
- Day/activity markers, geocoding, and map demo surfaces
- Map actions from Copilot (zoom, highlight)

### Nearby Recommendations

- Nearby places (restaurants, ATMs, hospitals, and more)
- Advanced recommendation engine and destinations discovery
- Client IP geolocation helpers for “near me” flows

### Travel Copilot

- Streaming chat assistant with tool-calling
- Session management (create, rename, delete, resume)
- Tools for weather, availability, nearby places, itinerary edits, budget, maps
- Voice input on supported browsers; rich response cards

### Analytics

- Travel analytics dashboards (Recharts)
- Booking click tracking and recalculation APIs
- Admin analytics overview for platform operators

### Notifications

- In-app notification center and preferences
- Realtime delivery via **Socket.IO** (Redis adapter when available)
- Scheduled reminder jobs (document expiry, trip-related alerts)

### Document Vault

- Secure upload of travel documents (MIME + size + threat heuristics)
- OCR hooks, favorites, timeline, missing-document checks
- **AWS S3** storage with signed / expiring download URLs
- Audit of uploads; malware scan provider hook (mock → ClamAV-ready)

### Flight Tracking

- Track flights against trips
- Status refresh jobs and change notifications
- Copilot / AI flight query support

### Admin Portal

- Staff portal at `/admin` (Admin / Support / Moderator)
- Super Admin portal at `/super-admin` (tenants, roles, system settings)
- Users, trips, bookings, documents, queues, events, security
- Multi-tenant SaaS: plans (Free / Pro / Enterprise), usage, isolation

### Monitoring

- Public and admin health endpoints
- Metrics, alerts, and service status cards
- Queue dashboard (BullMQ throughput, retries, dead-letter)
- Security dashboard (failed logins, blocks, active sessions)

### Security

- Helmet (CSP, HSTS in production), sanitization, NoSQL injection guards
- Redis rate limiting (auth, AI, public APIs, global)
- RBAC permission denials audited; privilege escalation blocked
- Optional CSRF for cookie modes; JWT validation and session revocation

---

## 3. Technology Stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | React 18, Vite, React Router, Tailwind CSS, Lucide, Recharts, Leaflet / Google Maps JS, Socket.IO Client, PWA (Workbox) |
| **Backend** | Node.js, Express 4, Mongoose 8, Winston, Socket.IO, Event Bus |
| **Database** | MongoDB (Atlas or Docker `mongo:7`) |
| **Caching** | Redis 7 (ioredis) — cache, rate limits, Socket.IO adapter, BullMQ |
| **Cloud** | AWS S3 (+ optional Azure Blob / local storage providers) |
| **DevOps** | Docker Compose, GitHub Actions, Render (`render.yaml`), Vercel (`vercel.json`) |
| **AI** | OpenAI API, Google Gemini |
| **Maps** | Google Maps JavaScript API, Google Geocoding, Nominatim / OSM |
| **Testing** | Node.js test runner, Vitest, Playwright, OpenAPI validation scripts |

Supporting integrations: OpenWeather, SerpAPI, Railkit, SeatSeller, Nodemailer, Google / Microsoft Calendar OAuth.

---

## 4. Architecture Overview

See the Architecture section of this README and the live Swagger UI at `/docs` on the API for system structure.

```text
┌─────────────────┐     HTTPS / WS      ┌──────────────────────────┐
│  React (Vite)   │ ◄──────────────────► │  Express API (/api/v1)   │
│  Admin / Super  │   JWT + refresh      │  RBAC · Tenant · Helmet  │
└────────┬────────┘                      └────────────┬─────────────┘
         │ Socket.IO                                   │
         ▼                                             ▼
┌─────────────────┐                      ┌──────────────────────────┐
│  Socket.IO Hub  │◄── Redis adapter ───►│  Redis                   │
└─────────────────┘                      │  cache · rate · queues   │
                                         └────────────┬─────────────┘
                                                      │ BullMQ
                                                      ▼
                                         ┌──────────────────────────┐
                                         │  Workers + Scheduler     │
                                         │  email · weather · DLQ   │
                                         └──────────────────────────┘

Express also talks to:
  • MongoDB — users, trips, bookings, expenses, docs, tenants, sessions, audits
  • AWS S3 — document objects (+ HMAC / presigned URLs)
  • Event Bus — domain events → notify / audit / cache / queue / socket
  • External APIs — OpenWeather, SerpAPI, Gemini/OpenAI, Geocoding, etc.
```

**Request path (typical):** browser → Vite/nginx → Express → auth + tenant middleware → controllers/services → MongoDB / Redis / S3 / third-party APIs. Background work is enqueued on BullMQ; realtime UI updates flow through Socket.IO. Domain events keep notifications, analytics, and usage counters consistent without bloating controllers.

---

## 5. Folder Structure

```text
travel-itinerary-system/
├── .github/workflows/          # CI, E2E, deploy workflows
├── backend/
│   ├── config/                 # DB, Redis, Swagger
│   ├── constants/              # RBAC, plans, document types, …
│   ├── controllers/            # HTTP handlers (auth, AI, admin, …)
│   ├── docs/                   # OpenAPI + Postman artifacts
│   ├── events/                 # Event Bus + handlers
│   ├── jobs/ · queues/ · workers/ · scheduler/
│   ├── middlewares/            # auth, RBAC, tenant, security, rate limit
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # Express routers
│   ├── services/               # Domain + integrations (S3, AI, bookings, …)
│   ├── socket/                 # Socket.IO bootstrap
│   ├── tests/                  # Node test runner suites
│   ├── utils/                  # Helpers, validators, mail, signed URLs
│   ├── app.js · server.js
│   └── Dockerfile
├── frontend/
│   ├── public/                 # PWA assets, offline shell
│   ├── src/
│   │   ├── components/ · pages/ · context/ · services/
│   │   ├── offline/ · hooks/ · utils/
│   │   └── App.jsx · main.jsx
│   ├── Dockerfile · nginx.conf
│   └── vite.config.js
├── docs/                       # Shared Postman collections
├── env/                        # Env templates (dev / staging / prod)
├── packages/travelplan-sdk/    # Generated / companion SDK
├── tests/e2e/                  # Playwright specs
├── docker-compose.yml
├── playwright.config.mjs
├── render.yaml · vercel.json
├── SECURITY.md · RBAC.md · MULTITENANCY.md · JOBS.md · …
└── README.md
```

---

## 6. Installation

### Prerequisites

- Node.js **20+**
- npm **9+**
- MongoDB (local, Atlas, or Docker)
- Redis (recommended; rate limits / queues / realtime degrade gracefully if absent)
- Optional: Docker Desktop for full Compose stack

### Backend

```bash
cd backend
cp .env.example .env          # or use env/backend.development.example.env
# Edit MONGO_URI, JWT_SECRET, REDIS_URL, and provider keys
npm install
npm run dev                   # default http://localhost:5000
```

Health check: `GET http://localhost:5000/health`  
API docs: `http://localhost:5000/docs`

### Frontend

```bash
cd frontend
cp .env.example .env          # optional maps / API overrides
npm install
npm run dev                   # Vite → http://localhost:3000 (proxies /api)
```

From the repo root you can also run both processes:

```bash
npm install
npm run dev
```

### Docker

```bash
cp .env.docker.example .env.docker
# Set JWT_SECRET and any API keys you need
docker compose --env-file .env.docker up --build
```

| Service  | Default host port |
|----------|-------------------|
| Frontend | `http://localhost:3000` |
| Backend  | `http://localhost:5000` |
| MongoDB  | `27017` |
| Redis    | `6379` |

```bash
npm run docker:down    # stop
npm run docker:logs    # follow logs
```

---

## 7. Environment Variables

> **Never commit real secrets.** Use `backend/.env.example`, `frontend/.env.example`, `env/*`, and `.env.docker.example` as templates.

### Backend — core

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `5000`) |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `MONGO_URI` / `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing secret for access JWTs (**required**, strong & unique) |
| `FRONTEND_URL` | Primary CORS origin (e.g. `http://localhost:3000`) |
| `FRONTEND_URLS` | Optional comma-separated extra CORS origins |
| `ADMIN_EMAILS` | Comma-separated emails elevated to **admin** (not super_admin) |
| `REDIS_URL` | Redis connection (cache, rate limits, Socket.IO, BullMQ) |
| `LOG_LEVEL` | Winston level (`info`, `debug`, …) |
| `BACKEND_URL` | Public API base URL (callbacks, signed download links) |
| `TRUST_PROXY` | Set `true` behind reverse proxies / load balancers |

### Backend — authentication & security

| Variable | Description |
|----------|-------------|
| `ACCESS_TOKEN_EXPIRES` | Access JWT TTL (default `15m`) |
| `REFRESH_TOKEN_DAYS` | Refresh session lifetime in days (default `7`) |
| `REFRESH_TOKEN_SECRET` | Refresh JWT secret (falls back to `JWT_SECRET`) |
| `AUTH_REFRESH_COOKIE` | `true` to also set httpOnly `refresh_token` cookie |
| `CSRF_PROTECTION` | `true` to enforce double-submit CSRF (Bearer SPA exempt) |
| `GLOBAL_RATE_LIMIT_MAX` | Global requests/minute/IP (default `300`) |
| `MALWARE_SCAN_PROVIDER` | `mock` \| `disabled` (document upload scan hook) |
| `DOCUMENT_SIGNING_SECRET` | HMAC secret for app download tokens |

### Backend — email

| Variable | Description |
|----------|-------------|
| `EMAIL_HOST` / `EMAIL_PORT` | SMTP host and port |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` / `EMAIL_PASSWORD` | SMTP password / app password |

### Backend — AI & content

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `UNSPLASH_ACCESS_KEY` | Trip cover images |
| `UNSPLASH_APPLICATION_NAME` | Unsplash app name |

### Backend — maps, weather, availability

| Variable | Description |
|----------|-------------|
| `OPENWEATHER_API_KEY` | Weather forecasts |
| `GOOGLE_GEOCODING_API_KEY` | Server-side geocoding |
| `SERPAPI_KEY` | Live flights / hotels search |
| `AVAILABILITY_ORIGIN_AIRPORT` | Default IATA origin (e.g. `DEL`) |
| `RAILKIT_API_KEY` / `IRCTC_API_KEY` | Train search |
| `SEATSELLER_*` | redBus SeatSeller credentials |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` | Optional Amadeus |
| `NOMINATIM_USER_AGENT` | OSM Nominatim User-Agent |

### Backend — calendar OAuth

| Variable | Description |
|----------|-------------|
| `GOOGLE_CALENDAR_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | Google Calendar |
| `MICROSOFT_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | Outlook Calendar |
| `CALENDAR_TOKEN_SECRET` | Encrypt stored OAuth tokens (else `JWT_SECRET`) |

### Backend — storage (Document Vault)

| Variable | Description |
|----------|-------------|
| `STORAGE_PROVIDER` | `local` \| `s3` \| `azure` \| `cloudinary` |
| `AWS_S3_BUCKET` / `AWS_REGION` | S3 bucket and region |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM credentials |
| `AWS_S3_PREFIX` | Key prefix (e.g. `travel-documents`) |
| `DOCUMENT_UPLOAD_DIR` | Local upload directory when `STORAGE_PROVIDER=local` |
| `AZURE_STORAGE_*` | Azure Blob options when using Azure |

### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base (`/api` in Docker/nginx; absolute URL in prod if needed) |
| `VITE_SOCKET_URL` | Optional Socket.IO origin override |
| `VITE_GOOGLE_MAPS_API_KEY` | Maps JavaScript API key |
| `VITE_MAP_PROVIDER` | `auto` (default) \| `leaflet` (force OSM) |
| `VITE_DEV_API_TARGET` | Vite proxy target (default `http://127.0.0.1:5000`) |

---

## 8. Screenshots

Replace placeholders with real captures under `docs/screenshots/` when available.

| Surface | Placeholder |
|---------|-------------|
| **Dashboard** | ![Dashboard](docs/screenshots/dashboard.png) |
| **AI Planner** | ![AI Planner](docs/screenshots/ai-planner.png) |
| **Expense Tracker** | ![Expense Tracker](docs/screenshots/expenses.png) |
| **Bookings** | ![Bookings](docs/screenshots/bookings.png) |
| **Analytics** | ![Analytics](docs/screenshots/analytics.png) |
| **Admin Portal** | ![Admin Portal](docs/screenshots/admin.png) |
| **Monitoring** | ![Monitoring](docs/screenshots/monitoring.png) |

Suggested captions: traveler home and trip workspace; AI personalized itinerary wizard; trip expense and budget view; bookings hub; analytics charts; `/admin` or `/super-admin`; system / queue / security monitoring.

---

## 9. API Documentation

TravelPlan ships an **OpenAPI 3.1** specification and interactive **Swagger UI**.

| Resource | URL (local) |
|----------|-------------|
| Swagger UI | `http://localhost:5000/docs` |
| OpenAPI JSON | `http://localhost:5000/docs/openapi.json` |
| Spec sources | `backend/docs/openapi.yaml`, `backend/docs/openapi/` |
| Postman | `docs/TravelPlan.postman_collection.json` |

**Versioning:** prefer **`/api/v1/*`**. Legacy **`/api/*`** mounts the same router and stamps `X-API-Version: 1`.

Validate and regenerate docs from the backend:

```bash
cd backend
npm run docs:validate
npm run docs:build      # validate + Postman + SDK helpers
```

Authenticate protected operations with:

```http
Authorization: Bearer <access_token>
```

Optional multi-tenant header: `X-Tenant-ID: <tenantObjectId>`.

---

## 10. Deployment

### Docker Compose

One-command local/staging stack (frontend nginx, backend, MongoDB, Redis). See [Installation → Docker](#docker).

### Frontend — Vercel

- Prefer **Root Directory = `frontend`** in the Vercel project, *or* leave root empty and use the repo-root `vercel.json`
- Set Environment Variables (Production):
  - `VITE_API_URL` = `https://<your-render-service>.onrender.com/api`
  - `VITE_SOCKET_URL` = `https://<your-render-service>.onrender.com`
  - optional: `VITE_GOOGLE_MAPS_API_KEY`
- Redeploy after changing Vite env vars (they are baked at build time)
- Restrict Google Maps HTTP referrers to your production domain

### Backend — Render

- Root Directory: `backend`
- Build: `npm ci` · Start: `node server.js`
- Health check path: **`/api/health/live`** (do not use `/api/health` — it returns 503 when Mongo is down)
- Required env: `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL` (your Vercel URL), `TRUST_PROXY=true`
- Optional: `REDIS_URL`, `STORAGE_PROVIDER=s3` + AWS keys, AI / weather keys
- Attach Redis when you need queues / shared rate limits at scale

### Database — MongoDB Atlas

- Create a cluster and database user
- Whitelist Render egress IPs (or `0.0.0.0/0` only for controlled demos)
- Set `MONGO_URI` to the Atlas SRV connection string

### Documents — AWS S3

1. Create a private bucket in your region  
2. IAM user/role with least-privilege `s3:PutObject` / `GetObject` / `DeleteObject` on the prefix  
3. Set `STORAGE_PROVIDER=s3` and AWS credentials  
4. Keep `DOCUMENT_SIGNING_SECRET` strong for app-level download tokens  

Copy env templates from `env/*.example.env` locally. Never commit real `.env` files.

---

## 11. Performance Optimizations

Full engineering report (indexes, load tests, Lighthouse, before/after) is maintained locally under `PERFORMANCE.md` (not published to GitHub).

| Technique | How TravelPlan uses it |
|-----------|-------------------------|
| **Redis** | Response/domain caching, Socket.IO adapter, BullMQ backing store; cache writes require TTL |
| **Caching** | Cache helpers + event-driven invalidation (trips, docs, weather, …) |
| **BullMQ** | Async email, weather refresh, flight status, analytics, cleanups, DLQ |
| **Pagination** | Admin lists and large collections use `page` / `limit` |
| **Indexes** | Compound indexes on itineraries, bookings, users, audit, notifications, tenants |
| **Lean lists** | Itinerary/booking list endpoints return summary fields without deep graphs / attachments |
| **Lazy loading** | Route-level `React.lazy` for admin, analytics, maps, chat, bookings |
| **Health** | `/api/health/live` for liveness; full health cached ~5s (`HEALTH_CACHE_MS`) to resist probe storms |
| **Monitoring** | Admin Monitoring → **Performance** tab (P95/P99, Redis hit %, Mongo ms, heap/CPU) |
| **Fail-open limits** | Rate limiter continues if Redis is briefly unavailable (availability over hard fail) |

```bash
cd backend && npm run perf:explain && npm run perf:load
```

---

## 12. Security

| Control | Implementation |
|---------|----------------|
| **JWT** | Access + refresh rotation, session `sid`, revocation on logout / password change |
| **RBAC** | Role & permission matrix; Super Admin-only tenant ops; escalation guards |
| **Helmet** | CSP, HSTS (production), frameguard, nosniff, referrer policy |
| **Rate limiting** | Redis windows on login, signup, reset, refresh, AI, public, global |
| **Validation** | `express-validator`, mongo sanitize, XSS sanitize, HPP |
| **Files** | MIME/magic checks, size limits, threat heuristics, signed URLs |
| **Tenancy** | Tenant resolution + mongoose scope plugin (isolation) |
| **Audit** | Failed logins, permission denials, admin actions, uploads |

Deep dive docs (`SECURITY.md`, `RBAC.md`, `MULTITENANCY.md`) are kept local and are not pushed to GitHub.

---

## 13. Testing

### Playwright (E2E)

```bash
npm run test:e2e
npm run test:e2e:critical
npm run test:e2e:ui
```

Specs live under `tests/e2e/` (auth, trips, bookings, expenses, documents, AI, notifications, dashboard).

### Backend tests

```bash
cd backend && npm test
```

Suites cover smoke, RBAC, tenancy, Event Bus, jobs, and security (JWT, escalation, file hooks, rate limiter factory).

### Frontend unit

```bash
cd frontend && npm test
```

### Swagger / OpenAPI validation

```bash
cd backend && npm run docs:validate
```

Playwright: `npm run test:e2e` from the repo root (see `playwright.config.mjs`).

---

## 14. CI/CD

GitHub Actions under `.github/workflows/`:

| Workflow | Purpose |
|----------|---------|
| `ci.yml` | Install, Prettier, lint, backend/frontend tests, build on push/PR |
| `e2e.yml` | Playwright end-to-end |
| `deploy.yml` | Deployment pipeline hooks (set Vercel/Render secrets in GitHub Actions) |

Typical quality gate: **format → lint → unit tests → build → (optional) E2E**.

---

## 15. Future Improvements

- Native mobile clients (React Native / Flutter) on the same `/api/v1` contract  
- Real antivirus pipeline (`MALWARE_SCAN_PROVIDER`) for Document Vault  
- Stripe / billing webhooks wired to tenant plan upgrades  
- Fine-grained SSO (SAML / OIDC) for Enterprise tenants  
- Read replicas and horizontal worker fleets for BullMQ  
- Expanded OpenAPI coverage and official typed SDKs for every route  
- Stronger observability (OpenTelemetry traces + log shipping)  

---

## 16. Contributors

Contributions that keep business logic intact and improve security, docs, tests, or DX are welcome.

1. Fork the repository  
2. Create a feature branch (`git checkout -b feature/your-topic`)  
3. Ensure `npm run lint` and relevant tests pass  
4. Open a pull request with a clear summary and test plan  

Please do not commit `.env` files or production secrets. Prefer templates under `env/` and `*.example`.

---

## 17. License

This project is intended for use under the **MIT License**.

```text
MIT License — free to use, modify, and distribute, with attribution and no warranty.
```

If a `LICENSE` file is not yet present in the repository root, add the standard MIT text before publishing publicly so GitHub can detect the license automatically.

---

**TravelPlan** — plan smarter, travel safer, operate at scale.
