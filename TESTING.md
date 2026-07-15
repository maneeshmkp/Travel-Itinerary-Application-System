# End-to-End Testing (Playwright)

Automated UI tests for the TravelPlan MERN platform covering authentication, trips, AI, bookings, expenses, documents, notifications, and dashboards.

**Rule:** E2E tests never modify application business logic. Gaps in product UI (e.g. missing delete buttons) are covered via authenticated API helpers for setup/teardown only.

## Architecture

```
playwright.config.mjs
tests/e2e/
  pages/          # Page Object Model (POM)
  helpers/        # test data + API bootstrap
  fixtures/       # Playwright fixtures (authed user, trip)
  *.critical.spec.js   # Gate suite (auth + trips)
  *.spec.js            # Full suite
```

- **Page Object Model** — UI interactions live in `tests/e2e/pages/*`
- **Fixtures** — `account`, `authedPage`, `tripPage` bootstrap unique users/trips
- **Retries** — failed tests retry once (`retries: 1`)
- **Artifacts** — screenshot + video on failure; HTML report in `playwright-report/`
- **CI** — Chromium headless; deployment waits on critical E2E success when Mongo secrets exist

## Folder structure

| Path | Purpose |
|------|---------|
| `playwright.config.mjs` | Projects, reporters, webServer, timeouts |
| `tests/e2e/pages/` | Login, Signup, CreateItinerary, Bookings, etc. |
| `tests/e2e/helpers/api.js` | Signup/login/delete via REST for seed/cleanup |
| `tests/e2e/helpers/testData.js` | Unique emails, titles, API base URL |
| `tests/e2e/fixtures/testFixtures.js` | Shared `test` / `expect` with auth fixtures |
| `tests/e2e/*.critical.spec.js` | Auth + trips (CI deploy gate) |
| `tests/e2e/*.spec.js` | AI, bookings, expenses, docs, notifications, dashboard |
| `tests/e2e/.env.example` | Optional E2E env vars |

## Coverage

| Area | Specs | Notes |
|------|-------|-------|
| Auth | Signup, Login, Logout, Forgot password | Critical |
| Trips | Create, edit (collaboration), save, share, delete | Delete via API + list assertion (no delete UI) |
| AI | Generate itinerary, Copilot, Packing, Budget optimizer | Longer timeouts; demo mode OK |
| Bookings | Flight, hotel, activity + hub | Trip Bookings tab |
| Expenses | Add, edit, delete | Finance `#expenses` |
| Documents | Upload, download, delete | Delete via API when vault has no delete button |
| Notifications | Receive after trip create, mark read | |
| Dashboard | Analytics, trip Overview, Finance | |

## How to run locally

### 1. Prerequisites

- Backend + Mongo running (`backend/.env` with `MONGO_URI` / `JWT_SECRET`)
- Frontend on port 3000 (Vite proxies `/api` → `:5000`)
- Redis optional for app features (not required for smoke E2E)

```bash
# Terminal A/B — or use root concurrently
npm run dev
```

Install browsers once:

```bash
npx playwright install chromium
```

### 2. Run tests (apps already up)

```bash
# Skip auto-starting servers
set E2E_SKIP_WEBSERVER=1   # Windows PowerShell: $env:E2E_SKIP_WEBSERVER=1
npm run test:e2e:critical  # gate suite
npm run test:e2e           # full suite
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:report    # open last HTML report
```

### 3. Let Playwright start apps

Without `E2E_SKIP_WEBSERVER`, config starts:

- `npm run start --prefix backend` (expects `backend/.env`)
- `npm run dev --prefix frontend`

```bash
npm run test:e2e:critical
```

### Environment variables

| Variable | Default | Meaning |
|----------|---------|---------|
| `E2E_BASE_URL` | `http://localhost:3000` | Frontend |
| `E2E_API_URL` | `http://localhost:5000/api` | Backend API |
| `E2E_SKIP_WEBSERVER` | unset | `1` if apps already running |
| `E2E_PASSWORD` | `TestPass123!` | Password for created users |
| `CI` | unset | Forces headless; used in Actions |

## CI integration

| Workflow | Role |
|----------|------|
| `.github/workflows/ci.yml` | After quality job → **e2e-critical**; Docker build runs only if E2E **success** or **skipped** (no secrets) |
| `.github/workflows/deploy.yml` | Same critical gate before Docker publish |
| `.github/workflows/e2e.yml` | Dedicated E2E workflow; full suite on `main` / manual dispatch |

**Required GitHub secrets (for the gate to run):**

- `E2E_MONGO_URI` (preferred) or `MONGO_URI` / `MONGODB_URI`
- `JWT_SECRET` (optional; CI has a fallback)

If Mongo secrets are missing, the E2E job is **skipped** so forks still build. Set secrets in production repos so **failed critical E2E blocks deploy**.

Artifacts uploaded: `playwright-report/` + `test-results/` (screenshots/videos).

## Quality defaults

- Retry failed tests **once**
- Screenshot **only on failure**
- HTML reporter always
- Headless when `CI=true`
- Single worker (stable against shared backends)

## Adding a new test

1. Add/extend a Page Object under `tests/e2e/pages/`
2. Write a spec using `import { test, expect } from "./fixtures/testFixtures.js"`
3. Prefer `authedPage` / `tripPage` fixtures
4. Tag deploy-critical flows as `*.critical.spec.js`
