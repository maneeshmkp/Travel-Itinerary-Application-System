# 09 — Deployment

**Parent:** [Engineering Handbook](./ENGINEERING.md)

**Deep dive:** [`DEPLOYMENT.md`](../../DEPLOYMENT.md) · [`.github/SECRETS.md`](../../.github/SECRETS.md)

---

## 1. Environments

| Env | Typical hosting |
|-----|-----------------|
| Local | Docker Compose / npm |
| Staging | Render + Vercel preview + Atlas |
| Production | Render (API) + Vercel (SPA) + Atlas + Redis + S3 |

---

## 2. Docker

```bash
docker compose --env-file .env.docker up --build
```

Images/services: `mongo`, `redis`, `backend`, `frontend` (nginx).

CI also validates Docker build (see `ci.yml`).

---

## 3. GitHub Actions

| Workflow | File | Role |
|----------|------|------|
| CI | `.github/workflows/ci.yml` | Lint, test, build, optional E2E, Docker build |
| E2E | `.github/workflows/e2e.yml` | Playwright critical |
| Deploy | `.github/workflows/deploy.yml` | Gate → GHCR → Render hook → Vercel |

Secrets catalog: [`.github/SECRETS.md`](../../.github/SECRETS.md).

---

## 4. Backend → Render

- Blueprint: `render.yaml`  
- Set `TRUST_PROXY=true` behind Render proxy  
- Attach Redis add-on or external Redis (`REDIS_URL`)  
- MongoDB Atlas URI  
- Health check path: prefer `/health/live` or `/api/health/live` for liveness  

---

## 5. Frontend → Vercel

- Config: `vercel.json`  
- Build: Vite production build  
- Env: `VITE_API_URL` pointing at the public API base  

---

## 6. AWS S3

- Bucket for document vault when `STORAGE_PROVIDER=s3`  
- IAM user/role with least privilege  
- Region + prefix vars as in README  

---

## 7. Deployment checklist (summary)

See full lists in [12 Release Process](./12-release-process.md).

Minimum:

- [ ] CI green on the commit  
- [ ] Env vars present in target platform  
- [ ] Migrations/indexes applied (Mongoose sync / explain)  
- [ ] Redis reachable from API  
- [ ] Smoke: `/api/health/live`, login, one trip read  

Continue: [12 Release Process](./12-release-process.md)
