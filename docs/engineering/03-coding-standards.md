# 03 — Coding Standards

**Parent:** [Engineering Handbook](./ENGINEERING.md)

---

## 1. Language & runtime

| Layer | Standard |
|-------|----------|
| Backend | JavaScript (ES modules `"type": "module"`), Node ≥ 20 |
| Frontend | React 18 + JSX, Vite |
| Tests | `node:test` (backend), Vitest (frontend), Playwright (E2E) |

Prefer readability and consistency over cleverness. Match surrounding file style.

---

## 2. Naming conventions

| Kind | Convention | Examples |
|------|------------|----------|
| Files (backend services) | camelCase | `flightTrackingService.js` |
| Files (React components) | PascalCase | `ItineraryCard.jsx` |
| React hooks | `use` prefix | `useDebouncedValue.js` |
| Constants / enums | SCREAMING_SNAKE or exported maps | `ROLES`, `QUEUE_NAMES` |
| Mongoose models | PascalCase singular | `Itinerary`, `Booking` |
| Env vars | SCREAMING_SNAKE | `REDIS_URL`, `JWT_SECRET` |
| Routes | plural nouns, kebab for multi-word | `/api/v1/flight-tracking` |
| Events | Past-tense domain | `UserLoggedIn`, `TripCreated` |

---

## 3. Folder conventions

### Backend

| Folder | Responsibility |
|--------|----------------|
| `controllers/` | Parse req/res, call services, map errors |
| `services/` | Business rules & integrations |
| `models/` | Persistence schemas & indexes |
| `middlewares/` | Cross-cutting HTTP concerns |
| `routes/` | Wire paths → controllers |
| `events/` | Publish/subscribe domain events |
| `queues/` · `workers/` · `jobs/` | Async work |
| `constants/` | Shared enums / config tables |

**Do not** put third-party HTTP calls or Mongo queries into route files.

### Frontend

| Folder | Responsibility |
|--------|----------------|
| `pages/` | Route-level screens |
| `components/` | Reusable UI |
| `context/` | Auth, offline, Ask AI, notifications |
| `services/` | Axios/API wrappers |
| `hooks/` | Shared stateful logic |

Prefer **route-level lazy loading** for heavy pages (admin, maps, analytics).

---

## 4. Code style

- Use `async/await`; avoid nested callbacks.  
- Prefer early returns over deep nesting.  
- Keep controllers thin; extract helpers once reused ≥ 2 times.  
- Do not log secrets, tokens, or full S3 URLs with credentials.  
- Fail soft for optional infrastructure (Redis cache miss → source of truth).  
- When changing list endpoints, preserve JSON response shape clients rely on.  

Run before PR:

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

---

## 5. SOLID (as applied here)

| Principle | Practice in TravelPlan |
|-----------|------------------------|
| **S**ingle responsibility | One service per domain (bookings ≠ weather) |
| **O**pen/closed | Extend via events/jobs; avoid editing unrelated handlers |
| **L**iskov | Storage providers behind `getStorageProvider()` |
| **I**nterface segregation | Controllers only get the services they need |
| **D**ependency inversion | Integrations behind service modules / clients |

---

## 6. Clean architecture (pragmatic)

```text
HTTP (routes/controllers)
        ↓
Application services (domain rules)
        ↓
Adapters (Mongo models, Redis, S3, OpenAI, SerpAPI)
```

- Domain rules should not import Express `req`/`res`.  
- Infrastructure failures should surface as typed/HTTP errors or logged fallbacks—not silent corruption.  
- Tenancy and RBAC are cross-cutting; use middlewares + plugins, not one-off checks scattered randomly.

---

## 7. Do / Don't

| Do | Don't |
|----|--------|
| Add indexes with query evidence | Add speculative indexes blindly |
| Document new env vars in README / SECRETS | Commit `.env` |
| Update OpenAPI when routes change | Ship undocumented breaking APIs |
| Use BullMQ for retries / schedules | Block request thread on long AI calls when a job exists |
| Write tests for security-sensitive paths | Rely only on manual clicks for authZ |

Continue: [04 Git Workflow](./04-git-workflow.md)
