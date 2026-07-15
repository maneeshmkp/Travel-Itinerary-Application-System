# Background Jobs & Scheduler

## Queue architecture

TravelPlan uses **BullMQ + Redis** as the centralized background job system.

```
server.js
   ├─ startQueueWorkers()     → workers/
   └─ startScheduler()        → scheduler/ (repeatable jobs)

producers (HTTP, events, admin)
   └─ jobs.* / enqueue()
         └─ queues/factory.js
               └─ Redis list per QUEUE_NAMES.*
                     └─ workers process via jobs/* processors
                           └─ on permanent failure → dead-letter queue
```

### Folders

| Path | Role |
|------|------|
| `backend/queues/` | Definitions, factory, metrics, dashboard, public API |
| `backend/jobs/` | One processor per queue (business call wrappers) |
| `backend/workers/` | BullMQ `Worker` lifecycle + DLQ routing |
| `backend/scheduler/` | Registers all repeatable schedules |

### Queues

| Queue | Purpose |
|-------|---------|
| `email` | Transactional / notification emails |
| `flight-status-refresh` | Live flight refresh |
| `weather-refresh` | Weather cache invalidate / warm |
| `document-expiry-reminder` | Expiring travel documents |
| `notification-delivery` | Async notification create |
| `analytics-refresh` | Per-user or aggregate analytics |
| `ai-recommendation-refresh` | Warm recommendation engine |
| `budget-recalculation` | Budget threshold checks |
| `notification-schedule` | Full reminder suite (replaces node-cron) |
| `cleanup-redis-keys` | Pattern sweep safety net |
| `cleanup-old-logs` | Rotate/delete aged log files |
| `cleanup-temp-uploads` | Remove temp upload artifacts |
| `dead-letter` | Permanently failed jobs (no consumer) |

## Worker architecture

- `workers/index.js` starts one worker per processable queue.
- Concurrency: email=3, notification=2, others=1.
- Each processor lives under `jobs/` and **calls existing services** (no rewritten domain logic).
- Metrics: enqueue / complete / fail / retry / DLQ in `queues/metrics.js`.

## Retry policy

Default job options (`queues/definitions.js`):

- **attempts:** 5  
- **backoff:** exponential, base delay 2000ms  
- **removeOnComplete / removeOnFail:** capped counts + age  

On each failed attempt the worker records a **retry**. When `attemptsMade >= attempts`, the job is copied to the **dead-letter** queue.

## Dead-letter queues

- Queue name: `dead-letter`
- **No worker** consumes it — jobs remain for inspection.
- Admin can **requeue** a DLQ item back to its `originalQueue`.
- Failed jobs on normal queues can also be **retried** in place via BullMQ `job.retry()`.

## Scheduler flow

`scheduler/registerRepeatableJobs()` enrolls every entry in `REPEAT_SCHEDULES` with a **stable `jobId`** so restarts do not duplicate repeats.

| Cadence | Job |
|---------|-----|
| 5m | Flight status |
| 10m | Weather refresh |
| 15m | Notification schedule (`runAllScheduledChecks`) |
| 30m | AI recommendations, budget recalc |
| 1h | Document expiry, analytics aggregate |
| 6h | Redis cleanup |
| 12h | Temp uploads cleanup |
| 24h | Old logs cleanup |

When Redis is configured, **node-cron** and the **flight setInterval poller** are **not** started (unless `LEGACY_POLLERS=true`). Without Redis, those legacy schedulers still run so reminders continue in local/dev.

## Admin UI

- **Page:** `/admin/queues`
- **API:**  
  - `GET /api/admin/queues`  
  - `POST /api/admin/queues/:queueName/jobs/:jobId/retry`  
  - `POST /api/admin/queues/dead-letter/:jobId/requeue`

Shows running / completed / failed jobs, queue sizes, worker status, execution time, throughput, retries, DLQ.

## Testing

```bash
cd backend && npm test
```

`tests/jobs.test.js` asserts every queue + processor, retry policy, schedules, cleanup processors, metrics, and `jobs.*` API surface.

## How to add a job

1. Add a name to `queues/definitions.js` (`QUEUE_NAMES` + optionally `REPEAT_SCHEDULES`).
2. Create `jobs/yourJob.js` with `processYourJob(job)`.
3. Register it in `jobs/index.js` `PROCESSORS`.
4. Expose `jobs.yourJob` in `queues/index.js` if needed.
5. Document it here.

## Modified / added files

### New

- `backend/queues/definitions.js`, `factory.js`, `metrics.js`, `dashboard.js`
- `backend/jobs/*` (all processors + `index.js`)
- `backend/workers/index.js`
- `backend/scheduler/index.js`
- `backend/tests/jobs.test.js`
- `frontend/src/pages/admin/AdminQueues.jsx`
- `JOBS.md`

### Updated

- `backend/queues/index.js` — thin public facade (`jobs`, `startQueueWorkers`, `closeQueues`, `startScheduler`)
- `backend/server.js` — workers + scheduler; legacy pollers only if no Redis / `LEGACY_POLLERS`
- `backend/controllers/adminController.js` — queue dashboard + retry/requeue
- `backend/routes/adminRoutes.js` — `/admin/queues*`
- `frontend/src/App.jsx`, `AdminLayout.jsx`, `services/api.js` — Queues nav + API

Existing reminder/flight/analytics services are unchanged; jobs only invoke them.
