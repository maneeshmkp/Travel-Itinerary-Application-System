# Deployment Guide — TravelPlan

This document covers local development, Docker Compose, GitHub Actions CI/CD, cloud deployment (Vercel + Render + MongoDB Atlas + Redis + AWS S3), and rollback.

Secrets must never be committed. Use GitHub Secrets, Render env vars, and Vercel project settings.

---

## 1. Local setup (without Docker)

```bash
# Backend
cp env/backend.development.example.env backend/.env
# Edit MONGO_URI, JWT_SECRET, etc.
cd backend && npm ci && npm run dev

# Frontend (new terminal)
cp env/frontend.development.example.env frontend/.env
cd frontend && npm ci && npm run dev
```

Open http://localhost:3000 — Vite proxies `/api` to `:5000`.

Quality commands:

```bash
npm ci                         # root (prettier)
npm run lint                   # backend + frontend
npm test                       # backend node:test + frontend vitest
npm run build                  # frontend production build
npm run format:check           # prettier on infra files
```

---

## 2. Docker setup (one command)

```bash
cp .env.docker.example .env.docker
# Set JWT_SECRET (required) and optional API keys

docker compose --env-file .env.docker up --build
# or: npm run docker:up
```

| Service   | URL / port                         |
|-----------|-------------------------------------|
| Frontend  | http://localhost:3000 (nginx)      |
| Backend   | http://localhost:5000/api/health   |
| MongoDB   | localhost:27017                    |
| Redis     | localhost:6379                     |

Architecture:

```
Browser → frontend (nginx:80)
              ├─ static SPA
              ├─ /api/*      → backend:5000
              └─ /socket.io/* → backend:5000
         backend → mongo, redis, (external S3/AI/Weather)
```

Stop:

```bash
npm run docker:down
# or: docker compose --env-file .env.docker down
```

Data persists in named volumes: `mongo_data`, `redis_data`, `backend_uploads`, `backend_logs`.

---

## 3. Environment management

| Environment | Backend template | Frontend template |
|-------------|------------------|-------------------|
| Development | `env/backend.development.example.env` | `env/frontend.development.example.env` |
| Staging     | `env/backend.staging.example.env` | `env/frontend.staging.example.env` |
| Production  | `env/backend.production.example.env` | `env/frontend.production.example.env` |
| Docker local| `.env.docker.example` | baked via compose build-args |

**Production backends** (Render) use Atlas `MONGO_URI`, managed Redis `REDIS_URL`, and `STORAGE_PROVIDER=s3`.

**Production frontends** (Vercel) must set:

- `VITE_API_URL` → `https://<render-host>/api`
- `VITE_SOCKET_URL` → `https://<render-host>`

`FRONTEND_URL` / `FRONTEND_URLS` on the API must match the Vercel domain for CORS + Socket.IO.

---

## 4. GitHub Actions

### CI — `.github/workflows/ci.yml`

Triggers: PR + push to `main` / `master` / `develop`

1. Install dependencies  
2. Prettier (infra)  
3. Lint backend + frontend  
4. Run tests (fail stops pipeline)  
5. Build frontend artifact  
6. Build Docker images (no push)

### Deploy — `.github/workflows/deploy.yml`

Triggers: push to `main`/`master` or manual `workflow_dispatch`

1. Same quality gate (tests must pass)  
2. Push images to **GHCR** (`ghcr.io/<owner>/travelplan-backend|frontend`)  
3. Trigger **Render** deploy hook  
4. Deploy **Vercel** production  

If a secret is missing, that deploy step is skipped (safe for partial setup). Quality failures **block** deploy.

Secrets list: see `.github/SECRETS.md`.

---

## 5. Cloud deployment process

### MongoDB Atlas

1. Create cluster + database user  
2. Network access: allow Render outbound IPs (or `0.0.0.0/0` carefully)  
3. Copy connection string → Render `MONGO_URI`

### Redis

Use Render Redis, Upstash, or Redis Cloud → set `REDIS_URL`.  
If unset, health reports `not_configured` (yellow), app still runs.

### AWS S3

1. Create bucket + IAM user with `s3:PutObject|GetObject|DeleteObject|HeadBucket`  
2. Render: `STORAGE_PROVIDER=s3`, `AWS_S3_BUCKET`, `AWS_REGION`, keys  

### Backend — Render

1. New Web Service from repo, root `backend`, or use `render.yaml`  
2. Build: `npm ci --omit=dev` · Start: `node server.js`  
3. Health check: `/api/health`  
4. Copy **Deploy Hook** URL → GitHub secret `RENDER_DEPLOY_HOOK`  
5. Set env from `env/backend.production.example.env`

### Frontend — Vercel

1. Import repo; set Root Directory to `frontend` **or** use root `vercel.json`  
2. Env: `VITE_API_URL`, `VITE_SOCKET_URL`, maps key  
3. Create Vercel token + project/org IDs → GitHub secrets  
4. Pipeline runs `vercel pull/build/deploy --prod`

### Manual fallback

```bash
# Frontend
cd frontend && npm ci && npm run build
# Deploy dist/ or `vercel --prod`

# Backend on Render: git push → auto build, or curl deploy hook
```

---

## 6. Rollback strategy

| Layer | Rollback |
|-------|----------|
| Git | Revert / redeploy previous commit on `main` |
| GHCR images | Tag deploy previous SHA: `ghcr.io/.../travelplan-backend:<sha>` |
| Render | Dashboard → Deploys → **Rollback** to prior deploy |
| Vercel | Deployments → Promote previous production deployment |
| Mongo | Point-in-time restore via Atlas (enable backups in prod) |
| Compose | `docker compose down` then pull prior image tags / restore volumes |

Deployment rule: **never** merge to `main` if CI quality job is red.

---

## 7. Every new file

| Path | Purpose |
|------|---------|
| `backend/Dockerfile` | Multi-stage Node 20 API image |
| `backend/.dockerignore` | Slim image context |
| `frontend/Dockerfile` | Vite build + nginx runtime |
| `frontend/nginx.conf` | SPA + `/api` + `/socket.io` proxy |
| `frontend/.dockerignore` | Slim image context |
| `docker-compose.yml` | Frontend, backend, Mongo, Redis |
| `.env.docker.example` | Compose env template |
| `env/*.example.env` | Dev / staging / prod templates |
| `.github/workflows/ci.yml` | PR/push quality + docker build |
| `.github/workflows/deploy.yml` | Prod gate, GHCR, Render, Vercel |
| `.github/SECRETS.md` | Required secrets checklist |
| `render.yaml` | Optional Render blueprint |
| `vercel.json` | Vercel build / SPA rewrites |
| `.prettierrc.json` / `.prettierignore` | Format config |
| `backend/tests/smoke.test.js` | Node smoke tests |
| `frontend/src/apiBaseUrl.helper.js` | Testable URL helper |
| `frontend/src/apiBaseUrl.helper.test.js` | Vitest coverage |
| `DEPLOYMENT.md` | This guide |

### Light touch updates (not feature rewrites)

- `backend/app.js` — multi-origin CORS via `FRONTEND_URLS`  
- `backend/socket/index.js` — same for Socket.IO  
- `backend/package.json` / `frontend/package.json` / root `package.json` — lint/test/docker scripts  
- `frontend/vite.config.js` — vitest config  
- `.gitignore` — `.env.docker`  

---

## 8. Docker architecture (summary)

Four services on `travelplan_net`: **mongo**, **redis**, **backend**, **frontend**.  
Backend waits for healthy mongo/redis. Frontend nginx reverse-proxies API/WS so the browser can use same-origin `/api`.

---

## 9. CI/CD workflow (summary)

`PR → CI (lint/test/build/docker build) → merge main → Deploy (retag/push GHCR + Render hook + Vercel prod)`.  
Failed tests abort the workflow before deploy jobs run (`needs: quality`).

---

## 10. Checklist before first production deploy

- [ ] Atlas DB + Redis + S3 ready  
- [ ] Render service healthy at `/api/health`  
- [ ] Vercel site loads and calls API  
- [ ] `FRONTEND_URL` matches Vercel domain  
- [ ] GitHub Secrets filled  
- [ ] CI green on a test PR  
- [ ] Admin `ADMIN_EMAILS` set for monitoring UI  
