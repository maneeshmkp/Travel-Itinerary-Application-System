# 07 — Testing

**Parent:** [Engineering Handbook](./ENGINEERING.md)

**Deep dive:** [`TESTING.md`](../../TESTING.md)

---

## 1. Test pyramid

```text
        ╱ E2E (Playwright) ╲
       ╱  Integration / API  ╲
      ╱    Unit (fast)         ╲
```

Prefer many fast unit/integration tests; keep a **critical** E2E suite green on CI.

---

## 2. Backend unit / integration

```bash
cd backend
npm test
# node --test tests/**/*.test.js
```

Examples of areas covered historically: smoke metrics, security, tenancy, event bus.

Guidelines:

- No real paid AI calls in unit tests (mock or skip)  
- Prefer deterministic fixtures  
- Clean up Redis/DB side effects or use isolated keys  

---

## 3. Frontend unit tests

```bash
cd frontend
npm test          # vitest run
npm run test:watch
```

Test pure helpers and critical UI logic; avoid brittle full-app mounts unless necessary.

---

## 4. Playwright E2E

From repository root:

```bash
npm run test:e2e
npm run test:e2e:critical
npm run test:e2e:ui
npm run test:e2e:report
```

Specs live under `tests/e2e/`.

Needs:

- Running or ephemeral backend + Mongo (see workflows)  
- Test credentials / secrets as documented in CI  

---

## 5. CI coverage

| Workflow | Tests |
|----------|-------|
| `ci.yml` | Lint, backend/frontend tests, build; optional critical E2E; Docker build |
| `e2e.yml` | Playwright critical path |
| `deploy.yml` | Quality + E2E before deploy jobs |

---

## 6. Coverage expectations

TravelPlan does not require a vanity 100% number. Focus coverage on:

- Auth session rotation & revocation  
- RBAC denial paths  
- Tenant isolation  
- Money / expense math  
- Idempotent create paths  

Add regression tests when fixing production bugs.

---

## 7. Manual test checklist (feature PRs)

- [ ] Happy path on UI  
- [ ] 401/403 behavior  
- [ ] Empty / large list pagination  
- [ ] Redis down still serves core reads (fail-open)  
- [ ] No console/network secret leakage  

Continue: [08 Monitoring](./08-monitoring.md)
