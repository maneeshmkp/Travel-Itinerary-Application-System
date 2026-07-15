# TravelPlan Public API

Enterprise API documentation for the TravelPlan MERN platform.

## Quick links

| Resource | URL |
|----------|-----|
| Swagger UI | [http://localhost:5000/docs](http://localhost:5000/docs) |
| OpenAPI JSON | `/docs/openapi.json` |
| OpenAPI YAML | `/docs/openapi.yaml` |
| Preferred base | `/api/v1` |
| Legacy base | `/api` (identical handlers) |

---

## Versioning

TravelPlan exposes **API v1** under `/api/v1`.

```
/api/v1/auth/login
/api/v1/itineraries
/api/v1/bookings
...
```

### Backward compatibility

Existing `/api/*` routes remain mounted on the **same router**. Responses include:

```
X-API-Version: 1
```

**New clients must use `/api/v1`.** Legacy `/api` is kept so the React app and existing integrations do not break.

| Client type | Use |
|-------------|-----|
| New mobile / partner integrations | `/api/v1` |
| Current React frontend | `/api` (works) or migrate gradually to `/api/v1` |
| Health probes | `/health` or `/api/v1/health` |

---

## Authentication

1. `POST /api/v1/auth/signup` or `POST /api/v1/auth/login`
2. Read `token` from the JSON response
3. Send on subsequent calls:

```http
Authorization: Bearer <jwt>
```

| Endpoint | Auth |
|----------|------|
| Signup / login / forgot / reset | Public (rate limited) |
| Most trip/booking/expense/AI routes | JWT required |
| Monitoring (`/api/v1/monitoring/*`) | JWT + **admin** role |

Open Swagger → **Authorize** → paste the JWT to Try it out.

---

## Rate limits

Documented in the OpenAPI `info` block and enforced by Redis (fail-open if Redis is down):

- Login: **10 / minute**
- Signup: **10 / minute**
- AI: **20 / hour**
- Public weather: **60 / minute**

HTTP **429** + `X-RateLimit-*` headers when exceeded.

---

## Swagger / OpenAPI

Source of truth: `backend/docs/openapi/buildSpec.js` → written to `backend/docs/openapi.yaml`.

```bash
cd backend
npm run docs:validate   # validate OpenAPI 3.1 + write YAML
```

Swagger UI loads at **`/docs`** on server start.

Schemas include reusable models: **User, Trip, Booking, Expense, Notification, Document, Weather, Analytics, AIResponse**.

---

## Postman

Generated files:

- `docs/TravelPlan.postman_environment.json`
- `docs/TravelPlan.postman_collection.json`
- (copies under `backend/docs/postman/`)

```bash
cd backend
npm run docs:postman
```

Import both into Postman. Set `jwt` after login (or add a test script to store it). Collection lists **v1 paths only**.

---

## TypeScript SDK

```bash
cd backend
npm run docs:sdk
```

Output: `packages/travelplan-sdk`

- Full client via **OpenAPI Generator** (`typescript-fetch`) when Java is installed
- Otherwise a minimal typed stub is written (still usable for login / health / trips)

```ts
import { TravelPlanClient } from "@travelplan/sdk"

const api = new TravelPlanClient({ baseUrl: "http://localhost:5000" })
const login = await api.login("you@example.com", "Secret123!")
```

---

## Domain map (v1)

| Domain | Prefix |
|--------|--------|
| Auth | `/api/v1/auth` |
| Trips | `/api/v1/itineraries` |
| Bookings | `/api/v1/bookings`, `/api/v1/trips/:id/bookings` |
| Expenses | `/api/v1/itineraries/:id/expenses` |
| Documents | `/api/v1/documents` |
| Notifications | `/api/v1/notifications` |
| Weather | `/api/v1/weather` |
| Maps / nearby | `/api/v1/recommendations/nearby` |
| Analytics | `/api/v1/analytics` |
| AI | `/api/v1/ai` |
| Copilot | `/api/v1/chat` |
| Flights | `/api/v1/flights` |
| Calendar | `/api/v1/calendar` |
| Packing / Risk / Budget | `/api/v1/packing`, `/risk`, `/budget` |
| Availability search | `/api/v1/hotels`, `/flights`, `/trains`, `/buses`, `/activities` |
| Monitoring (admin) | `/api/v1/monitoring` |

---

## Rebuild all artifacts

```bash
cd backend
npm run docs:build
```

Runs validate → Postman → SDK.

---

## Security notes (documented, not changed)

- Never send passwords/JWTs in query strings
- Document file bytes are not part of list schemas
- Admin APIs gated by role / `ADMIN_EMAILS`
- Prefer HTTPS in production servers list
