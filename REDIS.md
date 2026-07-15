# Redis Integration — TravelPlan

Redis is a **core production infrastructure layer** for caching, rate limiting, Socket.IO scale-out, notifications buffers, and BullMQ background jobs. The application remains fully operational when Redis is unavailable (fail-open to MongoDB and third-party APIs).

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Express API │────▶│  cacheService    │────▶│   Redis     │
│  Controllers │     │  (cache-aside)   │     │  (ioredis)  │
└──────┬───────┘     └──────────────────┘     └──────┬──────┘
       │                                              │
       │  miss / Redis down                           │
       ▼                                              │
┌─────────────┐                                       │
│ Mongo / APIs │◀─────────────────────────────────────┘
└─────────────┘

Also: rateLimiter middleware · Socket.IO Redis adapter · BullMQ workers
```

### Core modules

| File | Role |
|------|------|
| `config/redis.js` | Singleton ioredis client, reconnect, health, graceful shutdown |
| `services/redisKeys.js` | Key naming + TTL policy |
| `services/cacheService.js` | Cache-aside get/set/del, gzip for large AI payloads |
| `utils/cacheHelpers.js` | Domain helpers + invalidation |
| `middlewares/cache.js` | Optional HTTP GET response cache |
| `middlewares/rateLimiter.js` | Redis fixed-window rate limits |
| `queues/index.js` | BullMQ queues + workers |
| `services/notifications/notificationRedis.js` | Unread / recent / socket buffer / queue |

## Cache strategy (Cache-Aside)

1. Request arrives  
2. Look up Redis key  
3. **Hit** → return cached value (log + metrics)  
4. **Miss** → call MongoDB / external API  
5. Store result in Redis with TTL  
6. Return response  

If Redis is down at any step, the fetch path runs normally — **no user-facing errors**.

## Key naming

```
travelplan:{domain}:{entity}:{id|hash}[:field]
```

Examples:

- `travelplan:ai:llm:{sha256}` — AI LLM JSON (prompt-hashed)
- `travelplan:weather:forecast:{hash}` — forecast
- `travelplan:maps:geocode:{hash}` — geocoding
- `travelplan:places:nearby:{hash}` — places
- `travelplan:flight:status:{hash}` — live flight
- `travelplan:booking:hotels:{hash}` — hotel search
- `travelplan:trip:dashboard:{userId}:{tripId}` — booking dashboard
- `travelplan:analytics:dashboard:{userId}`
- `travelplan:expense:summary:{userId}:{tripId}`
- `travelplan:search:autocomplete:{hash}`
- `travelplan:notif:unread:{userId}`
- `travelplan:rl:login:{email}` — rate limit counters

**Never cached:** passwords, JWT tokens, reset tokens, private documents / file bytes, raw secrets.

## TTL policy

| Domain | TTL |
|--------|-----|
| AI (itinerary, packing, summary, risk, budget, copilot) | 24 hours |
| Weather (current / forecast) | 10 minutes |
| Google Maps (geocode / reverse / directions / distance) | 24 hours |
| Google Places (hotels, restaurants, nearby, attractions, hospitals, cafes) | 24 hours |
| Flight status / gates / airport | 5 minutes |
| Booking search (hotels, flights, bus, train) | 5 minutes |
| Trip dashboard | 5 minutes |
| Analytics | 15 minutes |
| Expense summaries | 10 minutes |
| Search / autocomplete | 1 hour |
| Notification unread/recent | 2 minutes |

AI prompts are **SHA-256 hashed** before use as cache keys. Large AI JSON may be **gzip**-compressed in Redis.

## Rate limiting

| Endpoint group | Limit |
|----------------|-------|
| Login | 10 / minute |
| Signup | 10 / minute |
| Forgot password | 5 / minute |
| OTP | 5 / minute |
| AI (`/api/ai/*`) | 20 / hour |
| Public APIs (e.g. weather) | 60 / minute |

Fail-open: if Redis is down, requests are **not** blocked.

## Cache invalidation

Automatic invalidation when:

| Event | Action |
|-------|--------|
| Trip updated | `invalidateTripCaches(userId, tripId)` |
| Expense CUD | `invalidateExpenseCaches` |
| Booking CUD | `invalidateBookingCaches` (+ flight keys if applicable) |
| Flight refresh / update | `invalidateFlightCaches` |
| Analytics recalculate | delete analytics keys for user |
| AI regenerates (new prompt hash) | new key; optional `invalidateAiCaches` |
| Weather refresh job | `invalidateWeatherCaches` |
| Notifications change | clear unread/recent keys |
| User profile | `invalidateUserProfileCaches` |

## BullMQ queues

| Queue | Purpose |
|-------|---------|
| `email` | Notification emails (Nodemailer) |
| `flight-status-refresh` | Refresh tracked flights |
| `weather-refresh` | Invalidate + warm weather cache |
| `document-expiry-reminder` | Expiry reminders |
| `notification-delivery` | Deferred notification create |
| `analytics-refresh` | Rebuild travel analytics |

Workers start from `server.js` when `REDIS_URL` is set. Repeatable jobs schedule flight (5m), weather (10m), and document expiry (1h) refreshes.

## Socket.IO scaling

`@socket.io/redis-adapter` attaches dedicated pub/sub ioredis clients so multiple API instances share rooms (`user:<id>`). Without Redis, Socket.IO runs single-node.

## Monitoring

`/api/health` and Admin **System Monitoring** show:

- Redis status / PING  
- Memory usage  
- Connected clients  
- Key count / evictions  
- Server keyspace hit ratio  
- App-level cache hits, misses, hit ratio  
- Rate-limited count  

Winston domain logs: `redis` — connected, disconnected, hit, miss, invalidated, rate limited, queue created/processed.

## Performance notes

- One shared ioredis connection for app cache (+ dedicated adapter / BullMQ connections)  
- Gzip for large AI payloads  
- Pipeline multi-get available (`cacheGetMany`)  
- Avoid duplicate writes: set only after successful fetch; skip `null`  
- In-memory L1 still used in places (geocode, nearby) with Redis as L2  

## Failover

| Component | Without Redis |
|-----------|----------------|
| Cache | Direct Mongo / APIs |
| Rate limit | Allow all |
| Socket adapter | Single process |
| BullMQ | Jobs skipped; email falls back to inline send |

## Local setup

```bash
# Docker Compose (recommended)
docker compose up -d redis

# backend/.env
REDIS_URL=redis://127.0.0.1:6379
```

## Testing

See `backend/scripts/redisSmokeTest.js`:

```bash
cd backend
node scripts/redisSmokeTest.js
```

Checklist:

1. **Cache miss then hit** — call weather twice; second faster / `X-Cache` or logs show hit  
2. **TTL** — set short TTL in test; wait; miss again  
3. **Rate limit** — spam login; expect 429  
4. **Disconnect** — stop Redis; API still returns weather from OpenWeather  
5. **Reconnect** — start Redis; caching resumes  
6. **Socket adapter** — log line `Redis adapter enabled`  
7. **BullMQ** — logs `Queue created` / `Queue processed`  
8. **Invalidation** — update expense; summary key gone  
9. **Monitoring** — Redis card green with memory/clients/hits  
