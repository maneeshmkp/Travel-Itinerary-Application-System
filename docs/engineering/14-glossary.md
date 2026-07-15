# 14 — Glossary

**Parent:** [Engineering Handbook](./ENGINEERING.md)

Shared vocabulary for TravelPlan engineers.

| Term | Meaning |
|------|---------|
| **Access token** | Short-lived JWT authorizing API calls |
| **Refresh token** | Longer-lived credential rotated per session; hashed in DB |
| **Session / device session** | Server record binding refresh family to a device id |
| **RBAC** | Role-Based Access Control (permissions per role) |
| **Super Admin** | Highest role; tenant & platform operations |
| **Tenant** | Organization / workspace isolation boundary (`tenantId`) |
| **ALS / tenant scope** | AsyncLocalStorage + mongoose plugin for automatic tenant filters |
| **Itinerary / Trip** | Multi-day plan (days, activities, hotels, transfers) |
| **Browse catalog** | Shared System-seeded itineraries visible across tenants for discovery |
| **BullMQ** | Redis-backed job queue library |
| **Worker** | Process consuming a BullMQ queue |
| **DLQ** | Dead-letter queue for permanently failed jobs |
| **Event Bus** | In-process pub/sub for domain events |
| **Domain event** | Immutable fact (`TripCreated`, `UserLoggedIn`, …) |
| **Cache-aside** | App reads cache; on miss loads DB/API then sets TTL |
| **Fail-open** | Prefer availability when Redis rate-limit/cache is down |
| **Socket.IO adapter** | Redis pub/sub enabling multi-instance realtime |
| **OpenAPI / Swagger** | Machine-readable API contract + interactive UI |
| **Copilot** | Chat assistant with tool calling |
| **Document Vault** | Encrypted metadata + S3/local file storage for travel docs |
| **P95 / P99** | Latency percentiles (95th / 99th) |
| **Liveness** | “Process is up” probe (`/health/live`) |
| **Readiness** | “Safe to send traffic” (deps healthy) |
| **Idempotency key** | Client key preventing duplicate creates on retry |
| **Signed URL** | Time-limited S3 URL without making objects public |
| **Playwright** | Browser E2E test framework |
| **Vitest** | Frontend unit test runner |
| **GHCR** | GitHub Container Registry |
| **Render** | Backend hosting platform used by this project |
| **Vercel** | Frontend hosting platform used by this project |
| **Atlas** | MongoDB Atlas managed database |

---

## Acronyms

| Acronym | Expansion |
|---------|-----------|
| MERN | MongoDB, Express, React, Node.js |
| JWT | JSON Web Token |
| CORS | Cross-Origin Resource Sharing |
| CSP | Content Security Policy |
| HPP | HTTP Parameter Pollution |
| CI/CD | Continuous Integration / Delivery |
| SLA / SLO | Service Level Agreement / Objective |
| PII | Personally Identifiable Information |

---

**Handbook home:** [ENGINEERING.md](./ENGINEERING.md)
