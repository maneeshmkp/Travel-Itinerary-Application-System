# 12 — Release Process

**Parent:** [Engineering Handbook](./ENGINEERING.md)

---

## 1. Release checklist

### Product / eng

- [ ] Scope agreed; tickets linked  
- [ ] Feature flags / env toggles documented if used  
- [ ] OpenAPI updated for public API changes  
- [ ] Deep-dive docs updated when behavior changes  
- [ ] Migration / index notes written (if schema changed)  
- [ ] Security review for authZ, tenancy, file upload changes  

### Quality

- [ ] `backend` tests pass locally  
- [ ] `frontend` build passes  
- [ ] Playwright critical suite considered (required if auth/payments-adjacent)  
- [ ] Manual smoke on staging  

### Versioning

- [ ] Tag (optional): `vX.Y.Z`  
- [ ] Changelog / release notes for stakeholders  

---

## 2. Deployment checklist

- [ ] Merge to protected default branch  
- [ ] CI workflow green on the SHA  
- [ ] Deploy workflow succeeded (or manual Render/Vercel promote)  
- [ ] Runtime env vars verified (Render, Vercel, Redis, Atlas, S3)  
- [ ] `TRUST_PROXY` set on Render  
- [ ] `VITE_API_URL` points to production API  
- [ ] Post-deploy smoke:

```text
GET /api/health/live → 200
GET /api/health → healthy|degraded (investigate unhealthy)
Login → access + refresh
Open one trip / booking
Admin monitoring loads (ops)
```

- [ ] Watch error rate / P95 for 15–30 minutes  

---

## 3. Rollback checklist

### Decide quickly

| Signal | Action |
|--------|--------|
| 5xx spike / login broken | Rollback immediately |
| Partial feature bug | Fix-forward if safe; else rollback |
| Bad migration | Stop traffic; restore data plan |

### Application rollback

1. Re-deploy previous known-good Render deploy / Vercel promotion  
2. Or revert git commit and re-run Deploy workflow  
3. Confirm `/api/health/live` and login  

### Data rollback

1. Prefer expandable migrations (add fields, don’t rename/drop cold)  
2. If destructive migration shipped: restore Atlas PITR / backup per runbook  
3. Invalidate Redis keys if stale schemas cached  

### Communicate

- [ ] Status note to team  
- [ ] Incident timeline (what, when, impact, fix)  
- [ ] Follow-up ticket for regression test  

---

## 4. Hotfix policy

- Branch `hotfix/...` from `main`  
- Expedited review (still required)  
- Same smoke + shorter bake time  
- Retro within 48h for Sev-1/2  

Continue: [09 Deployment](./09-deployment.md) · [13 Contributing](./13-contributing.md)
