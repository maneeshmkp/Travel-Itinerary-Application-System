# TravelPlan — Architecture Diagrams

Mermaid diagrams for the TravelPlan platform. They render natively on GitHub (and most Markdown previewers that support Mermaid).

> Tip: If a preview client fails to render, open this file on github.com — Mermaid is built into GitHub Markdown.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
  subgraph Clients
    WEB[React SPA<br/>Vite PWA]
    ADMIN[Admin Portal]
    SUPER[Super Admin Portal]
  end

  subgraph Edge
    CDN[CDN / Vercel / Nginx]
  end

  subgraph API
    EXPRESS[Express API<br/>/api/v1]
    SOCKET[Socket.IO Hub]
  end

  subgraph Data
    MONGO[(MongoDB Atlas)]
    REDIS[(Redis)]
    S3[(AWS S3)]
  end

  subgraph Async
    BULL[BullMQ Workers]
  end

  subgraph External
    AI[OpenAI / Gemini]
    WX[OpenWeather]
    MAPS[Google Maps / Geocoding]
    SERP[SerpAPI / Railkit]
    SMTP[SMTP Email]
  end

  WEB --> CDN
  ADMIN --> CDN
  SUPER --> CDN
  CDN --> EXPRESS
  WEB <--> SOCKET
  EXPRESS --> MONGO
  EXPRESS --> REDIS
  EXPRESS --> S3
  EXPRESS --> AI
  EXPRESS --> WX
  EXPRESS --> MAPS
  EXPRESS --> SERP
  EXPRESS --> SMTP
  EXPRESS --> BULL
  BULL --> REDIS
  BULL --> MONGO
  BULL --> SMTP
  SOCKET --> REDIS
```

---

## 2. Backend Architecture

```mermaid
flowchart TB
  REQ[HTTP Request] --> APP[app.js<br/>Helmet CORS RateLimit]
  APP --> ROUTER[apiRouter<br/>/api and /api/v1]
  ROUTER --> AUTHMW[protect / optionalProtect]
  AUTHMW --> TENANT[resolveTenant]
  TENANT --> RBAC[RBAC authorize]
  RBAC --> CTRL[Controllers]
  CTRL --> SVC[Services]
  SVC --> MODELS[Mongoose Models]
  SVC --> CACHE[cacheService / Redis]
  SVC --> EXT[External APIs]
  SVC --> STOR[Storage Providers]
  CTRL --> EB[EventBus.publish]
  EB --> HAND[Event Handlers]
  HAND --> QUEUE[BullMQ enqueue]
  HAND --> SOCK[Socket emit]
  HAND --> AUDIT[AuditLog]
  QUEUE --> WORK[Workers]
  WORK --> SVC
```

---

## 3. Authentication Flow

```mermaid
sequenceDiagram
  participant U as User Browser
  participant FE as React SPA
  participant API as Express Auth
  participant DB as MongoDB
  participant R as Redis

  U->>FE: Login credentials
  FE->>API: POST /auth/login
  API->>R: Rate limit check
  API->>DB: Find user + verify password
  API->>DB: Create Session device binding
  API->>DB: Store refreshTokenHash
  API-->>FE: accessToken + refreshToken + user
  FE->>FE: sessionStorage persist

  Note over FE,API: Short-lived access JWT

  FE->>API: API call Bearer accessToken
  API->>DB: Verify JWT + active session sid
  API-->>FE: 200 OK

  FE->>API: Access expired 401
  FE->>API: POST /auth/refresh
  API->>DB: Rotate refresh hash
  alt Refresh reuse detected
    API->>DB: Revoke session family
    API-->>FE: 401 re-login
  else Valid rotation
    API-->>FE: New access + refresh tokens
  end

  FE->>API: POST /auth/logout-all
  API->>DB: Revoke all user sessions
  API-->>FE: Logged out everywhere
```

---

## 4. AI Request Flow

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as AI / Chat Routes
  participant RL as Redis Rate Limit
  participant PLAN as Plan Limit
  participant AI as aiService
  participant LLM as OpenAI or Gemini
  participant EB as EventBus
  participant DB as MongoDB

  U->>FE: Generate itinerary / Copilot prompt
  FE->>API: POST /api/ai/... or /api/chat
  API->>RL: ai bucket 20/hour
  alt Rate limited
    API-->>FE: 429 RATE_LIMITED
  else Allowed
    API->>PLAN: requirePlanLimit aiRequests
    alt Plan exceeded
      API-->>FE: 402 PLAN_LIMIT_EXCEEDED
    else Within plan
      API->>AI: Build prompt + tools context
      AI->>LLM: Completion / stream
      LLM-->>AI: Model response
      AI->>DB: Persist itinerary or chat session
      AI->>EB: AIItineraryGenerated
      EB-->>EB: usage + notify + cache
      API-->>FE: JSON or SSE stream
    end
  end
```

---

## 5. Redis Cache Flow

```mermaid
flowchart LR
  subgraph WritePath
    MUT[Domain mutation<br/>trip booking doc]
    EB[EventBus]
    INV[cacheHandler]
    DEL[Invalidate keys]
  end

  subgraph ReadPath
    REQ[HTTP GET]
    MW[cache middleware<br/>or service]
    HIT{Cache hit?}
    RES[Return cached JSON]
    DB[(MongoDB)]
    SET[SETEX Redis key]
  end

  REDIS[(Redis)]

  MUT --> EB --> INV --> DEL --> REDIS
  REQ --> MW --> HIT
  HIT -->|yes| RES
  HIT -->|no| DB
  DB --> SET --> REDIS
  SET --> RES
```

---

## 6. BullMQ Queue Flow

```mermaid
flowchart TB
  subgraph Producers
    API[API / Event Handler]
    CRON[Scheduler repeatables]
  end

  subgraph RedisBroker
    Q[BullMQ Queues<br/>email weather flight<br/>analytics cleanup ...]
    DLQ[Dead Letter Queue]
  end

  subgraph Consumers
    W[Worker processes]
    JOB[Job processors]
  end

  API --> Q
  CRON --> Q
  Q --> W
  W --> JOB
  JOB -->|success| DONE[Complete + metrics]
  JOB -->|retry exhausted| DLQ
  DLQ --> ADMIN[Admin Queue Dashboard<br/>retry / requeue]
  ADMIN -->|requeue| Q
```

---

## 7. AWS S3 Upload Flow

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Documents UI
  participant API as Documents API
  participant SEC as fileSecurity
  participant SVC as documentService
  participant S3 as AWS S3
  participant DB as MongoDB

  U->>FE: Select file multipart
  FE->>API: POST /api/documents
  API->>SEC: MIME magic size malware hook
  alt Validation failed
    SEC-->>API: reject
    API-->>FE: 400 blocked
  else Safe file
    API->>SVC: createDocument
    SVC->>S3: PutObject under AWS_S3_PREFIX
    S3-->>SVC: object key
    SVC->>SVC: Optional thumbnail
    SVC->>DB: TravelDocument metadata
    SVC->>DB: Audit file_upload
    SVC-->>API: serialized document
    API-->>FE: 201 Created
  end

  Note over FE,S3: Download later via HMAC token or S3 presigned URL
  FE->>API: GET file with signed token
  API->>S3: GetObject or redirect presign
  S3-->>FE: File bytes
```

---

## 8. Socket.IO Notification Flow

```mermaid
sequenceDiagram
  participant FE as React Client
  participant SO as Socket.IO Server
  participant RED as Redis Adapter
  participant API as REST / Event Handler
  participant DB as MongoDB

  FE->>SO: Connect with JWT
  SO->>SO: Verify token join user room
  SO-->>FE: connected

  Note over API,DB: Domain event or notification create
  API->>DB: Save Notification
  API->>SO: Emit to user room
  SO->>RED: Multi-instance fanout
  RED-->>SO: Cross-node deliver
  SO-->>FE: notification event
  FE->>FE: Toast + Notification Center
```

---

## 9. Event-Driven Architecture

```mermaid
flowchart TB
  subgraph Publishers
    P1[authController]
    P2[itineraryController]
    P3[documentService]
    P4[expenseController]
    P5[aiController]
  end

  BUS[EventBus<br/>publish / publishAsync]

  subgraph Subscribers
    H1[NotificationHandler]
    H2[AuditHandler]
    H3[EmailHandler]
    H4[CacheHandler]
    H5[QueueHandler]
    H6[SocketHandler]
    H7[TenantUsageHandler]
    H8[AnalyticsHandler]
  end

  P1 --> BUS
  P2 --> BUS
  P3 --> BUS
  P4 --> BUS
  P5 --> BUS

  BUS --> H1
  BUS --> H2
  BUS --> H3
  BUS --> H4
  BUS --> H5
  BUS --> H6
  BUS --> H7
  BUS --> H8

  H5 --> BULL[BullMQ]
  H6 --> SOCK[Socket.IO]
  H2 --> AUD[(AuditLog)]
  H7 --> TEN[(Tenant.usage)]
```

---

## 10. Deployment Architecture

```mermaid
flowchart TB
  subgraph Users
    BROWSER[Browsers / PWA]
  end

  subgraph Vercel
    FE[Frontend static build<br/>React Vite]
  end

  subgraph Render
    BE[Backend Node service<br/>Express + Workers]
  end

  subgraph Atlas
    MONGO[(MongoDB Atlas)]
  end

  subgraph CacheLayer
    REDIS[(Managed Redis)]
  end

  subgraph AWS
    S3[(S3 Document Bucket)]
  end

  subgraph OptionalDocker
    DC[Docker Compose<br/>FE + BE + Mongo + Redis]
  end

  BROWSER --> FE
  BROWSER --> BE
  FE -->|HTTPS API / Socket| BE
  BE --> MONGO
  BE --> REDIS
  BE --> S3

  DC -. local alt .-> BROWSER
```

---

## Embedding in README

Link from the main README:

```markdown
See [ARCHITECTURE.md](./ARCHITECTURE.md) for Mermaid system diagrams.
```

Or paste any ` ```mermaid ` block directly into GitHub-flavored Markdown files or PR descriptions.

---

## GitHub Mermaid tips used here

- Prefer `flowchart` / `sequenceDiagram` (widely supported)
- Quote labels that contain special characters via `<br/>` line breaks inside node text
- Avoid reserved node IDs such as `end`
- Keep subgraph titles simple
- No HTML entity hacks that break the Mermaid parser
