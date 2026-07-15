# 08 — Monitoring

**Parent:** [Engineering Handbook](./ENGINEERING.md)

**Deep dive:** [`MONITORING.md`](../../MONITORING.md) · [`PERFORMANCE.md`](../../PERFORMANCE.md)

---

## 1. Logging

- Structured logging via Winston-based logger (`backend/logger`)  
- Domains: `http`, `redis`, `database`, `auth`, `socket`, `events`, …  
- Prefer `info` for lifecycle, `warn` for degraded, `error` for failures  
- Never log passwords, refresh tokens, or raw cards/PII beyond necessity  

---

## 2. Metrics

In-process `metricsStore` tracks:

- Request volume, error rate, RPM series  
- Average / **P50 / P95 / P99** latency  
- Slow endpoints  
- Redis cache hits/misses/hit ratio  
- Socket connection counts  
- Domain counters (AI, weather, maps, S3, …)  
- Mongo query timings (instrumented)  
- Process samples (heap, RSS, CPU approx, event-loop delay)  

Admin API (permission `admin:monitoring`):

- `GET /api/monitoring/overview`  
- `GET /api/monitoring/metrics`  
- `GET /api/monitoring/alerts`  
- `GET /api/monitoring/services`  

---

## 3. Health checks

| Endpoint | Intent |
|----------|--------|
| `/api/health/live` | Process alive |
| `/api/health` | Aggregated dependency health |
| `/health` · `/health/live` | Root aliases |

UI: **Admin / Super Admin → Monitoring** (Overview + **Performance** tabs).

---

## 4. Alerts

`buildAlerts(health)` emits conditions such as:

- High memory / CPU  
- Mongo / Redis / S3 / AI / weather / maps / socket unhealthy  

Wire external paging (PagerDuty, etc.) by scraping these APIs or exporting later—handbook recommendation for ops maturity.

---

## 5. On-call triage order

1. `/api/health/live` — is the process up?  
2. `/api/health` — which dependency failed?  
3. Monitoring overview — error rate / P95 spike?  
4. Redis / BullMQ admin — queue backlog / DLQ?  
5. Application logs — correlation by userId / route  

Continue: [09 Deployment](./09-deployment.md) · [10 Troubleshooting](./10-troubleshooting.md)
