# 11 — Onboarding

**Parent:** [Engineering Handbook](./ENGINEERING.md)

**Goal:** A new engineer ships a safe, small change within **one working day**.

---

## Day-one timeline (≈ 8 hours)

### Hour 0–1 — Access & context

- [ ] Clone repo; join chat / issue tracker  
- [ ] Read [01 Project Overview](./01-project-overview.md)  
- [ ] Skim [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (10 minutes)  
- [ ] Receive secrets via approved channel (never Slack paste of prod URIs long-term)

### Hour 1–3 — Local stack up

- [ ] Follow [02 Local Development](./02-local-development.md)  
- [ ] Redis `PONG`, Mongo connected, API `/api/health/live`  
- [ ] Frontend loads; sign up or use provided test user  
- [ ] Open Swagger `/docs`  

### Hour 3–4 — Security & tenancy awareness

- [ ] Read [06 Security](./06-security.md) (roles, JWT, tenants)  
- [ ] Confirm you understand Admin vs Super Admin portals  

### Hour 4–5 — Make a guided tour of the code

Pick **one** vertical and read end-to-end:

| Track | Paths |
|-------|--------|
| Trips | `itineraryRoutes` → `itineraryController` → `Itinerary` model |
| Auth | `authRoutes` → session service → `Session` model |
| Jobs | `JOBS.md` → `queues/` → one worker processor |

### Hour 5–7 — First contribution (docs or tiny fix)

- [ ] Read [04 Git Workflow](./04-git-workflow.md) & [13 Contributing](./13-contributing.md)  
- [ ] Branch `chore/...` or `docs/...`  
- [ ] Land a PR: handbook typo, OpenAPI comment, or low-risk bugfix with tests  

### Hour 7–8 — Observe production-like signals

- [ ] Visit Monitoring (if admin)  
- [ ] Read [08 Monitoring](./08-monitoring.md)  
- [ ] Bookmark [10 Troubleshooting](./10-troubleshooting.md)  

---

## Buddy checklist (mentor)

- [ ] Pair on first Redis-down failure mode  
- [ ] Review first PR within 24h  
- [ ] Share staging URLs and which secrets are which  

---

## Definition of “productive”

You can:

1. Run the stack without help  
2. Find the controller/service for a user-facing feature  
3. Add a validated API field with a test or manual checklist  
4. Avoid tenant/RBAC footguns  
5. Know where to look when CI fails  

Continue: [12 Release Process](./12-release-process.md)
