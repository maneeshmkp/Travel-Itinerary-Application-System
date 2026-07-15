# Domain Event Architecture (EDA)

## Overview

TravelPlan uses an **in-process Domain Event Bus** so business modules communicate through events instead of hard-wired cross-service calls.

Publishers emit domain events after successful business actions. Subscribers (handlers) react independently. **One failed subscriber never blocks the others.**

```
Business action succeeds
        │
        ▼
  publish / publishAsync
        │
        ▼
     EventBus
        │
        ├── NotificationService
        ├── AnalyticsService (BullMQ analytics refresh)
        ├── AuditLogs
        ├── EmailService (BullMQ email jobs)
        ├── RedisCacheInvalidation
        ├── BullMQJobs
        └── SocketIONotifications (domain:event)
```

## Event lifecycle

1. **Publish** — `publish(eventName, payload, meta)` or fire-and-forget `publishAsync(...)`.
2. **Dedupe** — optional `meta.dedupeKey` skips repeats within 60s.
3. **Log** — Winston `domain:events` logs `Event Published`.
4. **Dispatch** — all subscribers for that event run via `Promise.all` (isolated try/catch each).
5. **Log** — `Event Processed` (per handler) or `Subscriber Error`.
6. **Metrics** — `events/metrics.js` records published / processed / failures / EPM / recent list.

## Publisher / subscriber model

| API | File | Purpose |
|-----|------|---------|
| `DOMAIN_EVENTS` | `events/catalog.js` | Canonical event name constants |
| `on(event, handler, { name })` | `events/EventBus.js` | Subscribe |
| `publish` / `publishAsync` | `events/EventBus.js` | Publish |
| `bootstrapDomainEvents()` | `events/index.js` | Register all handlers once at boot |
| `eventMetrics.getSnapshot()` | `events/metrics.js` | Admin monitoring |

Bootstrap is called from `server.js` on startup.

### Publisher meta

```js
publishAsync(DOMAIN_EVENTS.TRIP_CREATED, payload, {
  source: "itineraryController.create",
  userId: "...",
  dedupeKey: "trip:create:<id>",   // optional
  correlationId: "...",            // optional
})
```

### Payload conventions

- Prefer `userId`, `tripId` / `itineraryId`, `id`
- `skipEventNotification: true` — notification handler no-ops (when legacy notify* already ran)
- `auditAlreadyWritten: true` — audit handler skips (when controller already wrote audit)
- `skipEventEmail: true` / `skipSocket: true` — suppress email/socket fans

## Current domain events

| Event | Typical publisher |
|-------|-------------------|
| `UserRegistered` | `authController.signup` |
| `UserLoggedIn` | `authController.login` |
| `TripCreated` / `TripUpdated` / `TripDeleted` | `itineraryController` |
| `BookingCreated` / `BookingCancelled` | `bookingService` |
| `ExpenseAdded` / `ExpenseUpdated` / `ExpenseDeleted` | `expenseService` |
| `DocumentUploaded` / `DocumentDeleted` | `documentService` |
| `NotificationCreated` | `notificationService.createNotification` |
| `WeatherUpdated` | `weatherController.getWeather` |
| `FlightStatusChanged` | `flightTrackingService.refresh` |
| `AIItineraryGenerated` | `aiController.generatePersonalizedItinerary` |
| `BudgetExceeded` | `expenseController` when warningLevel=`over` |
| `RoleChanged` | `adminController.changeUserRole` |

## Subscribers (`events/handlers/`)

| Handler | Name | Behavior |
|---------|------|----------|
| `notificationHandler.js` | NotificationService | Welcome / role / budget / flight / AI gaps |
| `analyticsHandler.js` | AnalyticsService | Enqueues analytics refresh on trip/spend events |
| `auditHandler.js` | AuditLogs | Writes `event.*` audit rows |
| `emailHandler.js` | EmailService | Queues transactional emails selectively |
| `cacheHandler.js` | RedisCacheInvalidation | Calls existing `invalidate*Caches` helpers |
| `queueHandler.js` | BullMQJobs | Document expiry / refresh / analytics jobs |
| `socketHandler.js` | SocketIONotifications | Emits `domain:event` to the user room |

## Admin monitoring

- **API:** `GET /api/admin/events` (permission `admin:monitoring` or `admin:audit`)
- **UI:** `/admin/events` — recent events, events/min, failures, top types

## How to add a new event

1. Add a constant to `backend/events/catalog.js`.
2. Publish after the business success path (do **not** replace business logic):

```js
import { publishAsync, DOMAIN_EVENTS } from "../events/index.js"
publishAsync(DOMAIN_EVENTS.YOUR_EVENT, { userId, id }, { source: "module.action" })
```

3. Optionally subscribe in a new or existing handler via `on(DOMAIN_EVENTS.YOUR_EVENT, ...)`.
4. Register the handler in `events/handlers/index.js` if new.
5. Document it in this file’s table.
6. Add a unit assertion in `tests/eventBus.test.js` if behavior is critical.

## Testing

```bash
cd backend && npm test
```

`tests/eventBus.test.js` covers emit → subscriber execution, failure isolation, and duplicate prevention.

## Modified / added files

### New

| Path | Role |
|------|------|
| `backend/events/EventBus.js` | Core bus |
| `backend/events/catalog.js` | Event name catalog |
| `backend/events/index.js` | Public API + bootstrap |
| `backend/events/metrics.js` | Monitoring snapshots |
| `backend/events/handlers/*` | Subscribers |
| `backend/tests/eventBus.test.js` | Unit tests |
| `frontend/src/pages/admin/AdminEvents.jsx` | Admin Events page |
| `EVENTS.md` | This doc |

### Updated (publish hooks / wiring only)

| Path | Change |
|------|--------|
| `backend/server.js` | `bootstrapDomainEvents()` |
| `backend/controllers/authController.js` | UserRegistered / UserLoggedIn |
| `backend/controllers/itineraryController.js` | TripCreated / Updated / Deleted |
| `backend/services/bookings/bookingService.js` | BookingCreated / Cancelled |
| `backend/services/expenseService.js` | Expense* |
| `backend/controllers/expenseController.js` | BudgetExceeded |
| `backend/services/documents/documentService.js` | Document* |
| `backend/services/notifications/notificationService.js` | NotificationCreated |
| `backend/controllers/adminController.js` | RoleChanged + getEventsMonitoring |
| `backend/controllers/aiController.js` | AIItineraryGenerated |
| `backend/controllers/weatherController.js` | WeatherUpdated |
| `backend/services/flightTracking/flightTrackingService.js` | FlightStatusChanged |
| `backend/routes/adminRoutes.js` | `GET /events` |
| `frontend/src/App.jsx` | `/admin/events` route |
| `frontend/src/pages/admin/AdminLayout.jsx` | Nav link |
| `frontend/src/services/api.js` | `adminAPI.events` |

Existing trip/booking/notification trigger helpers remain in place so current behavior is preserved; event handlers use `skipEventNotification` where needed to avoid double notifications.
