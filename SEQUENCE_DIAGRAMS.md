# TravelPlan — Sequence Diagrams

Professional **Mermaid `sequenceDiagram`** flows for the TravelPlan AI Travel Management Platform.

These diagrams are documentation-only. They describe production request paths across React, Express, MongoDB, Redis, BullMQ, Socket.IO, AWS S3, and external APIs.

> Open this file on **GitHub** to render Mermaid natively. Avoid reserved participant IDs such as `end`.

---

## Table of Contents

1. [User Authentication Flow](#1-user-authentication-flow)
2. [AI Itinerary Generation](#2-ai-itinerary-generation)
3. [Expense Tracker Flow](#3-expense-tracker-flow)
4. [Booking Management Flow](#4-booking-management-flow)
5. [Weather Request Flow](#5-weather-request-flow)
6. [Google Maps Flow](#6-google-maps-flow)
7. [Document Upload Flow](#7-document-upload-flow)
8. [Notification Flow](#8-notification-flow)
9. [Event-Driven Architecture](#9-event-driven-architecture)
10. [Admin Dashboard Flow](#10-admin-dashboard-flow)
11. [Travel Copilot Chat Flow](#11-travel-copilot-chat-flow)
12. [Flight Tracking Flow](#12-flight-tracking-flow)

---

## 1. User Authentication Flow

Login validates credentials against MongoDB, issues a JWT access token (and refresh session in production), and unlocks the authenticated dashboard.

**Actors:** User · Frontend · Backend · JWT · MongoDB

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant JWT as JWT
  participant DB as MongoDB

  U->>FE: Enter email and password
  FE->>BE: POST /auth/login
  BE->>DB: Find user by email
  DB-->>BE: User record or empty
  alt Invalid credentials
    BE-->>FE: 401 Unauthorized
    FE-->>U: Show error
  else Valid credentials
    BE->>DB: Verify password hash
    BE->>JWT: Sign access token claims
    JWT-->>BE: accessToken
    BE->>DB: Persist device session hash
    BE-->>FE: token + user profile
    FE->>FE: Store session tokens
    FE->>BE: GET dashboard with Bearer token
    BE->>JWT: Verify access token
    JWT-->>BE: Claims valid
    BE->>DB: Load dashboard data
    DB-->>BE: Metrics and trips
    BE-->>FE: Authenticated payload
    FE-->>U: Authenticated dashboard
  end
```

---

## 2. AI Itinerary Generation

Trip preferences are checked against Redis first. On a miss, Gemini/OpenAI generates the plan; the result is cached, saved to MongoDB, and returned to the client.

**Actors:** User · Frontend · Backend · Redis · Gemini/OpenAI · MongoDB

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant RD as Redis
  participant AI as GeminiOpenAI
  participant DB as MongoDB

  U->>FE: Submit trip details
  FE->>BE: POST /ai/itinerary
  BE->>RD: Lookup cache key for preferences
  alt Cache hit
    RD-->>BE: Cached itinerary JSON
    BE-->>FE: Return cached response
    FE-->>U: Show itinerary
  else Cache miss
    RD-->>BE: Key not found
    BE->>AI: Generate personalized itinerary
    AI-->>BE: Model response
    BE->>RD: Store response with TTL
    BE->>DB: Save itinerary document
    DB-->>BE: Saved itinerary id
    BE-->>FE: Return itinerary
    FE-->>U: Show itinerary
  end
```

---

## 3. Expense Tracker Flow

Adding an expense persists to MongoDB, invalidates related Redis cache entries, refreshes analytics aggregates, and returns an updated expense/budget dashboard.

**Actors:** User · Frontend · Backend · MongoDB · Redis

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant DB as MongoDB
  participant RD as Redis

  U->>FE: Add expense form
  FE->>BE: POST itinerary expenses
  BE->>DB: Insert TripExpense
  DB-->>BE: Expense saved
  BE->>RD: Invalidate expense and analytics keys
  RD-->>BE: Cache cleared
  BE->>DB: Recalculate budget analytics
  DB-->>BE: Updated totals
  BE-->>FE: Updated dashboard payload
  FE-->>U: Refresh expense dashboard
```

---

## 4. Booking Management Flow

Booking/availability search consults Redis, calls the flight (or availability) API on miss, stores results in Redis and MongoDB, then returns booking data to the user.

**Actors:** User · Frontend · Backend · Redis · MongoDB · Flight API

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant RD as Redis
  participant DB as MongoDB
  participant FA as FlightAPI

  U->>FE: Search booking options
  FE->>BE: GET or POST availability search
  BE->>RD: Lookup search cache
  alt Cache hit
    RD-->>BE: Cached results
    BE-->>FE: Return booking options
  else Cache miss
    RD-->>BE: Miss
    BE->>FA: Query flights
    FA-->>BE: Flight offers
    BE->>RD: Store results TTL
    BE->>DB: Persist booking or search snapshot
    DB-->>BE: Acknowledged
    BE-->>FE: Return booking
  end
  FE-->>U: Show booking results
```

---

## 5. Weather Request Flow

Weather requests are served from Redis when possible; otherwise OpenWeather is called, the response is cached, and weather is returned to the UI.

**Actors:** User · Frontend · Backend · Redis · OpenWeather

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant RD as Redis
  participant OW as OpenWeather

  U->>FE: Open trip weather
  FE->>BE: GET /weather
  BE->>RD: Redis lookup by place
  alt Cache hit
    RD-->>BE: Cached forecast
    BE-->>FE: Return weather
  else Cache miss
    RD-->>BE: Miss
    BE->>OW: Fetch forecast
    OW-->>BE: Weather JSON
    BE->>RD: Store cache TTL
    BE-->>FE: Return weather
  end
  FE-->>U: Render forecast cards
```

---

## 6. Google Maps Flow

Location search may be backed by Redis geocode/map caches; misses call Google Maps / Geocoding APIs, then cache and return map-ready coordinates to the frontend.

**Actors:** User · Frontend · Backend · Redis · Google Maps API

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant RD as Redis
  participant GM as GoogleMapsAPI

  U->>FE: Location search on map
  FE->>BE: Geocode or places request
  BE->>RD: Redis lookup
  alt Cache hit
    RD-->>BE: Cached coordinates
    BE-->>FE: Return location payload
  else Cache miss
    RD-->>BE: Miss
    BE->>GM: Geocoding or Places API
    GM-->>BE: Lat lng and metadata
    BE->>RD: Cache result
    BE-->>FE: Return map data
  end
  FE->>FE: Render Google or Leaflet map
  FE-->>U: Interactive map view
```

---

## 7. Document Upload Flow

Uploads are validated, stored in AWS S3, metadata is written to MongoDB, and success is returned to the Document Vault UI.

**Actors:** User · Frontend · Backend · AWS S3 · MongoDB

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant S3 as AWSS3
  participant DB as MongoDB

  U->>FE: Choose travel document file
  FE->>BE: POST /documents multipart
  BE->>BE: Validate MIME size threats
  alt Validation failed
    BE-->>FE: 400 Upload blocked
    FE-->>U: Show error
  else Validation passed
    BE->>S3: PutObject under prefix
    S3-->>BE: Object key
    BE->>DB: Store TravelDocument metadata
    DB-->>BE: Document id
    BE-->>FE: Success payload
    FE-->>U: Document Vault updated
  end
```

---

## 8. Notification Flow

Domain or scheduled events enqueue work through BullMQ, use Redis as the broker, and Socket.IO pushes realtime notifications to the browser.

**Actors:** Backend · BullMQ · Redis · Socket.IO · Frontend

```mermaid
sequenceDiagram
  participant BE as Backend
  participant Q as BullMQ
  participant RD as Redis
  participant SO as SocketIO
  participant FE as Frontend

  BE->>BE: Event created
  BE->>Q: Enqueue notification job
  Q->>RD: Persist job in Redis
  RD-->>Q: Job ready
  Q->>BE: Worker processes job
  BE->>BE: Create Notification record
  BE->>SO: Emit to user room
  SO->>RD: Redis adapter fanout
  SO-->>FE: Realtime notification
  FE-->>FE: Toast and notification center
```

---

## 9. Event-Driven Architecture

Creating a trip publishes a domain event; notification, analytics, audit, Redis cache, and BullMQ subscribers run independently.

**Actors:** Trip Service · Event Bus · Notification Service · Analytics · Audit Logs · Redis · BullMQ

```mermaid
sequenceDiagram
  participant TS as TripService
  participant BUS as EventBus
  participant NS as NotificationSvc
  participant AN as Analytics
  participant AU as AuditLogs
  participant RD as Redis
  participant Q as BullMQ

  TS->>TS: Trip created
  TS->>BUS: Publish TripCreated
  par Independent subscribers
    BUS->>NS: Handle notification
    NS-->>BUS: Done
  and
    BUS->>AN: Update analytics
    AN-->>BUS: Done
  and
    BUS->>AU: Write audit entry
    AU-->>BUS: Done
  and
    BUS->>RD: Invalidate related keys
    RD-->>BUS: Done
  and
    BUS->>Q: Enqueue follow-up jobs
    Q-->>BUS: Job accepted
  end
```

---

## 10. Admin Dashboard Flow

After admin authentication, the portal fetches metrics via the backend, prefers Redis where hot, consults monitoring services, and renders the dashboard.

**Actors:** Admin · Frontend · Backend · MongoDB · Redis · Monitoring

```mermaid
sequenceDiagram
  participant AD as Admin
  participant FE as Frontend
  participant BE as Backend
  participant DB as MongoDB
  participant RD as Redis
  participant MON as Monitoring

  AD->>FE: Open /admin dashboard
  FE->>BE: Login or reuse admin JWT
  BE-->>FE: Authenticated session
  FE->>BE: GET /admin/dashboard
  BE->>RD: Lookup cached metrics
  alt Cache hit
    RD-->>BE: Cached snapshot
  else Cache miss
    RD-->>BE: Miss
    BE->>DB: Aggregate users trips bookings
    DB-->>BE: Counts and audit samples
    BE->>MON: Collect health and metrics
    MON-->>BE: Monitoring snapshot
    BE->>RD: Cache dashboard brief TTL
  end
  BE-->>FE: Dashboard JSON
  FE-->>AD: Display admin dashboard
```

---

## 11. Travel Copilot Chat Flow

Copilot questions check Redis for similar/cached answers, call Gemini/OpenAI on miss, cache the reply, persist the conversation in MongoDB, and stream or return the answer.

**Actors:** User · Frontend · Backend · Redis · Gemini/OpenAI · MongoDB

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant RD as Redis
  participant AI as GeminiOpenAI
  participant DB as MongoDB

  U->>FE: Ask Copilot question
  FE->>BE: POST /chat or /chat/stream
  BE->>RD: Lookup response cache
  alt Cache hit
    RD-->>BE: Cached answer
    BE-->>FE: Return answer
  else Cache miss
    RD-->>BE: Miss
    BE->>DB: Load chat session context
    DB-->>BE: Prior messages
    BE->>AI: Tool-aware completion
    AI-->>BE: Model answer
    BE->>RD: Store cache TTL
    BE->>DB: Save conversation turn
    DB-->>BE: Session updated
    BE-->>FE: Return answer or SSE tokens
  end
  FE-->>U: Show Copilot reply
```

---

## 12. Flight Tracking Flow

Tracking a flight uses Redis for the latest status, calls the flight API on miss, stores cache, schedules BullMQ background refresh, and returns status to the UI.

**Actors:** User · Frontend · Backend · Redis · Flight API · BullMQ

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant RD as Redis
  participant FA as FlightAPI
  participant Q as BullMQ

  U->>FE: Track flight for trip
  FE->>BE: POST /flights/track
  BE->>RD: Lookup flight status cache
  alt Cache hit
    RD-->>BE: Cached status
  else Cache miss
    RD-->>BE: Miss
    BE->>FA: Fetch live status
    FA-->>BE: Status payload
    BE->>RD: Store cache TTL
  end
  BE->>Q: Schedule background refresh
  Q-->>BE: Repeatable job registered
  BE-->>FE: Return flight status
  FE-->>U: Show tracking card

  Note over Q,FA: Later worker refresh
  Q->>BE: Run flightStatusJob
  BE->>FA: Refresh status
  FA-->>BE: Updated status
  BE->>RD: Update cache
```

---

## How these diagrams help

### Documentation

- Give newcomers a **shared visual language** for cross-cutting flows without reading every controller.
- Complement `README.md` and `ARCHITECTURE.md` with **request-level** detail (who calls whom, and in what order).
- Make onboarding, handoffs, and RFCs faster: each diagram maps cleanly to routes such as `/auth`, `/ai`, `/documents`, and `/chat`.

### Interviews and system design discussions

- Demonstrate that TravelPlan is a **real production architecture** (JWT, Redis cache/aside, S3, queues, websockets, event bus)—not a CRUD toy.
- Help you narrate **trade-offs**: cache hit vs miss, async notification vs sync REST, background flight refresh vs user wait time.
- Support whiteboard practice: you can redraw any of these on a sequence-diagram frame during architecture interviews.

### Team communication

- Align frontend and backend on **contracts** (payloads after auth, after AI generation, after upload).
- Clarify **failure paths** (401, validation blocked, rate limits omitted here but easy to extend).
- Serve as living docs: update a diagram when a flow changes instead of burying behavior in chat history.

---

## Related docs

| Document | Content |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | High-level Mermaid flowcharts |
| [README.md](./README.md) | Product overview and setup |
| [SECURITY.md](./SECURITY.md) | Auth, headers, rate limits |
| [EVENTS.md](./EVENTS.md) | Domain Event Bus catalogue |
| [JOBS.md](./JOBS.md) | BullMQ queues and workers |
