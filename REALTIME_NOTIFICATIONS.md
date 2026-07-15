# Real-Time Notifications (Socket.IO)

This platform upgrades the existing REST notification system with **Socket.IO** for live delivery. Existing HTTP APIs, the Notification MongoDB model, schedulers, email, and domain triggers are **unchanged** — sockets are an additional push channel.

---

## Socket architecture

```
┌─────────────┐   JWT handshake    ┌──────────────────┐
│  React App  │ ─────────────────► │  Socket.IO server│
│  (client)   │ ◄── notification:* │  (backend)       │
└─────────────┘                    └────────┬─────────┘
                                            │
                                   join room user:<id>
                                            │
┌─────────────┐  createNotification()      ▼
│ Controllers │ ─────────────────► emitToUser(userId, …)
│ / Scheduler │                    only that user's sockets
└─────────────┘
```

- **HTTP API** — create, list, mark read, delete, settings (source of truth).
- **Socket.IO** — push `notification:new|update|read|delete` to authenticated clients.
- **Fallback** — if the socket is disconnected, the client polls unread count every 2 minutes (with backoff).

---

## Room management

On successful connect, each socket joins a **private room**:

```text
user:<MongoUserId>
```

All emits use `io.to(userRoom(userId)).emit(...)`. Users never receive another user's events, even if they guess the event name.

Multiple tabs for the same user join the **same room**, so every tab receives the same events (badge + toast stay in sync).

---

## JWT authentication

Handshake accepts the token from (in order):

1. `socket.handshake.auth.token`
2. `Authorization: Bearer <token>` header
3. `?token=` query (fallback)

Token is verified with the same `JWT_SECRET` as HTTP `protect` middleware. Payload uses `id` or `userId`. Invalid/expired tokens are rejected before `connection`.

Client (`notificationSocket.js`) sends:

```js
io(url, { auth: { token: localStorage token } })
```

Reconnection is automatic (`reconnection: true`, infinite attempts).

---

## Notification flow

1. Domain code calls `createNotification(...)` (bookings, flights, weather, budget, etc.).
2. Service writes MongoDB (with **dedup** via `metadata.dedupKey` within 24h).
3. On success, service emits:
   - `notification:new` → `{ notification, unreadCount }`
4. Client:
   - Prepends to the shared list (deduped by `id`)
   - Updates unread badge
   - Shows a live toast (✈ 🌧 📄 💰 …)
   - Optionally plays a short beep if `soundEnabled`

Mark read / delete similarly emit `notification:read` / `notification:delete` so other tabs update without refresh.

---

## Client socket events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `connect` / `disconnect` | built-in | Connection state (green “Live” indicator) |
| `notification:new` | server → client | New notification |
| `notification:update` | server → client | Updated (e.g. archived) |
| `notification:read` | server → client | One, many, or all marked read |
| `notification:delete` | server → client | Removed |

---

## REST API (preserved + alias)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/notifications` | Paginated list; filters: `unread`, `category`, `search`, `status` |
| `GET` | `/api/notifications/unread-count` | Badge |
| `PATCH` | `/api/notifications/read` | **New.** Body `{ ids?: string[] }` — omit to mark all |
| `POST` | `/api/notifications/read/:id` | Legacy mark one |
| `POST` | `/api/notifications/read-all` | Legacy mark all |
| `DELETE` | `/api/notifications/:id` | Delete |
| `GET/PUT` | `/api/notifications/settings` | Preferences including Email, Push, In-app, **Sound** |

Serialized notifications include both `status` (`UNREAD|READ|ARCHIVED`) and boolean `read`.

Filters: **All · Unread · Warnings · Travel · Finance · AI**

---

## Preferences

Stored on `NotificationSettings` (not User):

- `emailEnabled`, `inAppEnabled`, `pushEnabled`, `soundEnabled`
- Category toggles: budget, weather, booking, collaboration, activity, flight, hotel, AI

`inAppEnabled` (and category flags) gate whether `createNotification` persists/emits.

---

## How to test (multiple tabs / users)

### Same user, two tabs

1. Start backend (`cd backend && npm run dev`) and frontend (`cd frontend && npm run dev`).
2. Log in on **Tab A** and **Tab B** (same account).
3. Confirm the bell shows a small **green live** dot.
4. In Tab A open **Notifications → Load samples** (dev).
5. Tab B should instantly show toasts + badge bump **without refresh**.
6. Mark all read in Tab A — Tab B badge goes to **0**.

### Two users

1. Log in as User A (Chrome) and User B (Edge / private window).
2. Seed or trigger a notification for User A only (e.g. booking as A).
3. User B must **not** receive A’s toast.
4. Optionally open DevTools → Network → WS and inspect frames per user.

### Reconnect

1. Stop the backend briefly; Live badge becomes “Syncing”.
2. Restart backend; client reconnects automatically.
3. New seeds appear live again.

### Dedup

Creating two notifications with the same `metadata.dedupKey` within 24h: second create returns `null` and does not emit.

---

## Dev / production notes

- Dev socket URL defaults to `http://127.0.0.1:5000` (avoids Vite proxy WS issues). Override with `VITE_SOCKET_URL`.
- CORS allows `http://localhost:3000` and `http://127.0.0.1:3000`.
- Production: set `FRONTEND_URL` and ensure the reverse proxy supports WebSocket upgrade for `/socket.io`.

---

## Modified / added files

### Backend

| File | Change |
|------|--------|
| `backend/socket/index.js` | **New** — Socket.IO init, JWT middleware, user rooms, emit helpers |
| `backend/server.js` | `http.createServer(app)` + `initSocket(httpServer)` |
| `backend/services/notifications/notificationService.js` | Emit on create / read / delete / archive; `read` field; `markNotificationsRead`; finance/warnings filters; `soundEnabled` in settings |
| `backend/controllers/notifications/notificationController.js` | `PATCH /read` handler; richer seed samples |
| `backend/routes/notifications.js` | `PATCH /read` |
| `backend/models/NotificationSettings.js` | `soundEnabled`, promote `pushEnabled` |
| `backend/services/flightTracking/flightNotificationService.js` | Fix missing `createNotification` import |
| `backend/package.json` | Dependency `socket.io` |

### Frontend

| File | Change |
|------|--------|
| `frontend/src/services/notificationSocket.js` | **New** — Socket.IO client singleton |
| `frontend/src/context/NotificationRealtimeContext.jsx` | **New** — Shared state, live events, toasts, fallback poll |
| `frontend/src/components/notifications/NotificationLiveToasts.jsx` | **New** — Live toast UI |
| `frontend/src/hooks/useNotifications.js` | Thin wrapper over realtime context |
| `frontend/src/components/notifications/NotificationBell.jsx` | Live indicator + shared unread |
| `frontend/src/components/notifications/NotificationDropdown.jsx` | Filters + infinite scroll |
| `frontend/src/pages/NotificationCenter.jsx` | Live badge, preferences (Email/Push/In-app/Sound), infinite scroll |
| `frontend/src/constants/notificationTypes.js` | Filter labels: Warnings / Finance / AI |
| `frontend/src/services/api.js` | `markReadBatch` → `PATCH /notifications/read` |
| `frontend/src/App.jsx` | Wrap with `NotificationRealtimeProvider` + toast host |
| `frontend/package.json` | Dependency `socket.io-client` |
| `REALTIME_NOTIFICATIONS.md` | This document |
