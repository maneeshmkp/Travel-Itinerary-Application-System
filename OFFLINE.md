# Offline-First Architecture

TravelPlan uses a **Progressive Web App (PWA)** with **IndexedDB**, **Workbox**, and an **offline mutation queue** so travelers can keep planning without connectivity.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React UI       │────▶│  Axios + Bridge  │────▶│  API / Cache    │
│  OfflineContext │     │  offlineApiBridge│     │  IndexedDB      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │                        │
         │                        ▼                        │
         │               ┌──────────────────┐              │
         └──────────────▶│  syncManager     │◀─────────────┘
                         │  offlineQueue    │
                         └──────────────────┘
                                  │
                         ┌────────▼────────┐
                         │ Service Worker  │
                         │ (Workbox)       │
                         └─────────────────┘
```

## Service Worker Flow

1. **`registerServiceWorker.js`** registers the SW via `vite-plugin-pwa` (`injectManifest`).
2. **`service-worker.js`** precaches build assets and applies runtime routes:
   - **Cache First** — images, fonts
   - **Network First** — `/api/*` (with Background Sync plugin)
   - **Stale While Revalidate** — blogs, nearby recommendations
3. Navigation failures serve **`/offline.html`**.
4. On `sync` event, the SW notifies open tabs to run `syncPendingChanges()`.

## IndexedDB Schema (`travelplan-offline` v1)

| Store | Key | Contents |
|-------|-----|----------|
| `trips` | `id` | Downloaded itinerary payloads |
| `expenses` | `id` | Expense rows + `report-{tripId}` summaries |
| `notifications` | `id` | Cached notification list |
| `weather` | `tripId` | Forecast + `cachedAt` |
| `blogs` | `slug` | Article HTML/JSON |
| `maps` | `tripId` | Markers, center, destination |
| `nearby` | `key` | Nearby place results |
| `queue` | `id` | Pending mutations (encrypted body) |
| `settings` | `key` | Offline preferences |
| `meta` | `key` | Generic API cache entries |
| `savedTrips` | `id` | Saved itinerary list |
| `aiQueue` | `id` | Pending AI prompts |

**Security:** JWT remains in `localStorage` / `sessionStorage` only. Queue payloads are encrypted with a per-session device key (`crypto.js`).

## Sync Algorithm

1. **Offline mutation** → `offlineQueue.enqueueMutation()` with `idempotencyKey` + `clientId`.
2. Axios adapter returns **202 Accepted** with optimistic data (expenses update local cache immediately).
3. On **`online`** event → `syncPendingChanges()`:
   - Decrypt queue body
   - `POST/PUT/DELETE` with headers `X-Idempotency-Key`, `X-Client-Request-Id`
   - On success → remove queue item, refresh caches
   - On **409 conflict** → Last Write Wins (drop queue item)
   - On failure → increment `retries`, mark `error` after 3 attempts
4. Banner shows: *"3 offline changes synced successfully."*

## Caching Strategy

| Resource | Strategy |
|----------|----------|
| JS/CSS/HTML | Precache (build) |
| Images/fonts | Cache First |
| API | Network First + offline IndexedDB fallback |
| Blogs/nearby | Stale While Revalidate |
| Weather | IndexedDB, 24h TTL |

## Download Trip for Offline

On itinerary detail, **Download for offline** stores:

- Full itinerary JSON
- Expense report
- Map markers/coordinates
- Weather (if available)

## Backend Idempotency

- `middlewares/idempotency.js` — caches responses by `X-Idempotency-Key`
- `TripExpense.clientRequestId` — unique per user/trip, prevents duplicate expenses on sync

## How to Test Offline Mode

### Fix `ECONNREFUSED` first
Ensure backend is running:
```bash
cd backend && npm run dev
```
Frontend proxies `/api` → `http://localhost:5000`.

### Test flow
1. Log in and open a trip.
2. Enable **Auto-download trips** at `/offline-settings` (optional — trips auto-cache on create/save when enabled).
3. Click **Download for offline** (or create a new trip with auto-download on).
4. Chrome DevTools → **Network** → **Offline**.
5. Reload — trip detail, expenses, and map markers load from IndexedDB.
6. Add an expense offline — it appears immediately (optimistic).
7. Go **Online** — banner shows sync success; expense persists on server with no duplicate.
8. Tap the **sync badge** in the mobile header (or visit `/offline-settings`) for queue and storage stats.

### API idempotency test (no browser)
```bash
node scripts/test-offline-sync-api.mjs
```
Verifies duplicate expense requests with the same idempotency key do not create duplicates.

### PWA install
Production build + HTTPS (or localhost):
```bash
cd frontend && npm run build && npm run preview
```
Use browser **Install app** prompt.

## Files

| Path | Role |
|------|------|
| `frontend/src/offline/db.js` | IndexedDB schema |
| `frontend/src/offline/cacheService.js` | Read/write caches |
| `frontend/src/offline/offlineQueue.js` | Mutation queue |
| `frontend/src/offline/syncManager.js` | Online/sync state machine |
| `frontend/src/offline/offlineApiBridge.js` | Axios interceptors |
| `frontend/src/service-worker.js` | Workbox SW |
| `frontend/src/registerServiceWorker.js` | SW registration |
| `frontend/public/manifest.json` | PWA manifest |
