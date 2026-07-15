# 05 — API Guidelines

**Parent:** [Engineering Handbook](./ENGINEERING.md)

**Canonical catalogue:** [`API.md`](../../API.md) · Swagger `/docs` · OpenAPI `backend/docs/`

---

## 1. Versioning

| Prefix | Status |
|--------|--------|
| `/api/v1/*` | **Preferred** |
| `/api/*` | Legacy alias (same router) |

Responses include `X-API-Version: 1`.

Breaking changes require a new major version plan—not silent contract breaks on `/api/v1`.

---

## 2. REST conventions

| Method | Use |
|--------|-----|
| `GET` | Read; safe; cacheable where designated |
| `POST` | Create or non-idempotent actions |
| `PUT` / `PATCH` | Update (prefer documented semantics per resource) |
| `DELETE` | Remove / soft-remove as documented |

- Plural resource nouns: `/itineraries`, `/bookings`  
- Nested only when ownership is clear: `/itineraries/:id/expenses`  
- Actions as sub-resources when needed: `/itineraries/:id/optimize`  

Authentication: `Authorization: Bearer <accessToken>` unless route is public.

---

## 3. Status codes

| Code | Meaning |
|------|---------|
| `200` | Success with body |
| `201` | Created |
| `204` | Success, no body (rare) |
| `400` | Validation / bad input |
| `401` | Unauthenticated |
| `403` | Authenticated but forbidden (RBAC / tenancy) |
| `404` | Not found (or hidden by tenancy) |
| `409` | Conflict (duplicates, idempotency) |
| `429` | Rate limited |
| `500` | Unexpected server error |
| `503` | Dependency unhealthy (e.g. health overall) |

---

## 4. Response shape

Success (typical):

```json
{
  "success": true,
  "data": { },
  "count": 1
}
```

Error (typical):

```json
{
  "success": false,
  "message": "Human-readable summary",
  "code": "VALIDATION_ERROR",
  "error": "Optional detail"
}
```

Keep field names stable; document deprecations in OpenAPI.

---

## 5. Pagination

Standard query params:

| Param | Default guidance |
|-------|------------------|
| `page` | 1-based |
| `limit` | Cap server-side (e.g. ≤ 50–100) |

Response includes:

```json
{
  "pagination": {
    "page": 1,
    "limit": 12,
    "pages": 3,
    "total": 28
  }
}
```

Prefer `skip/limit` with indexes on sort fields (`createdAt`).

---

## 6. Filtering & search

- Use query string filters: `?destination=Goa&nights=3&tags=beach`  
- Free text: `?search=` or `?q=` as documented per endpoint  
- Debounce search on the client (Browse uses ~500ms)  
- Escape regex input server-side  

Do not accept arbitrary Mongo operators from clients.

---

## 7. Error handling

- Validate with `express-validator` (or equivalent) before business logic  
- Map domain errors to stable `code` values  
- Log server errors with correlation/request context; never leak stack traces to clients in production  
- Idempotency middleware on selected POSTs (bookings, expenses, reviews)  

---

## 8. Health endpoints

| Endpoint | Use |
|----------|-----|
| `GET /api/health/live` | K8s/ALB **liveness** (no heavy probes) |
| `GET /api/health` | **Readiness**/diagnostics (deps; may be cached briefly) |

Do not use full health as a high-frequency load probe without caching.

---

## 9. OpenAPI discipline

When adding/changing routes:

1. Update OpenAPI sources under `backend/docs/`  
2. Run `cd backend && npm run docs:validate` (and related `docs:*` scripts)  
3. Confirm Swagger `/docs` reflects the change  

Continue: [06 Security](./06-security.md)
