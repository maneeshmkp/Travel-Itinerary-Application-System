# 04 — Git Workflow

**Parent:** [Engineering Handbook](./ENGINEERING.md)

---

## 1. Branching model (Git Flow lite)

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready; protected |
| `develop` (optional) | Integration branch if team uses it |
| `feature/<ticket>-short-name` | New capability |
| `fix/<ticket>-short-name` | Bugfix |
| `chore/<topic>` | Tooling, deps, docs |
| `hotfix/<topic>` | Urgent production fix from `main` |

Default for TravelPlan day-to-day: branch from `main` (or `develop` if your fork uses it), open PR back to the default branch.

---

## 2. Branch naming

```text
feature/tp-142-document-expiry-reminders
fix/tp-210-redis-worker-spam
chore/engineering-handbook
docs/update-security-guide
```

Rules:

- Lowercase, kebab-case  
- Include ticket id when available  
- No personal names in branch names  

---

## 3. Commit message format

Prefer **Conventional Commits**:

```text
<type>(optional-scope): <imperative summary>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`, `security`

Examples:

```text
feat(bookings): exclude attachments from list payload
fix(redis): probe before starting BullMQ workers
docs(engineering): add internal developer handbook
perf(itineraries): add compound indexes for owner lists
```

Guidelines:

- Subject ≤ ~72 characters; imperative mood (“add”, not “added”)  
- Explain **why** in the body when non-obvious  
- Never commit secrets  

---

## 4. Pull requests

### PR title

Same as conventional commit subject, or clear human summary.

### PR body (required sections)

```markdown
## Summary
- What changed and why

## Test plan
- [ ] Backend tests / manual API checks
- [ ] Frontend smoke on affected routes
- [ ] Playwright critical (if auth/booking/trips touched)

## Risk & rollback
- Risk level: low|medium|high
- Rollback: revert PR / previous deploy
```

### Expectations

- Small, reviewable diffs preferred over mega-PRs  
- Update deep-dive docs when behavior changes  
- CI green (`.github/workflows/ci.yml`) before merge  
- For deploy path, see [12 Release Process](./12-release-process.md)

---

## 5. Code review standards

Reviewers check:

1. Correctness & edge cases (tenancy, authZ, empty Redis)  
2. Security (injection, IDOR, secret leakage)  
3. Performance (N+1, unbounded queries, missing indexes)  
4. API compatibility (response shape, status codes)  
5. Test evidence  

Authors:

- Respond to all comments (fix or discuss)  
- Do not force-push `main`  
- Avoid `--no-verify` unless explicitly approved  

---

## 6. Protected branch policy (recommended)

| Rule | `main` |
|------|--------|
| Require PR | Yes |
| Require CI | Yes |
| Require review | ≥ 1 |
| Dismiss stale reviews | Yes |
| Block force push | Yes |

Continue: [05 API Guidelines](./05-api-guidelines.md) · [13 Contributing](./13-contributing.md)
