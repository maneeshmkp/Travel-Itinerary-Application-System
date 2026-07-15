# TravelPlan Engineering Handbook

**Audience:** Software engineers, SREs, tech leads, and new joiners  
**Product:** TravelPlan — AI Travel Management Platform  
**Classification:** Internal engineering documentation  
**Last updated:** 2026-07-15

---

## Purpose

This handbook is the **canonical internal developer portal** for TravelPlan. It captures how we design, build, test, secure, observe, and ship the platform—so every engineer can become productive quickly and maintain the system safely over years.

It does **not** replace deep-dive feature docs. Instead it **indexes** them and standardizes day-to-day engineering practice.

---

## Handbook map

| # | Document | Focus |
|---|----------|--------|
| 01 | [Project Overview](./01-project-overview.md) | Business problem, architecture, goals, folders |
| 02 | [Local Development](./02-local-development.md) | Install, run backend/frontend, Docker, Redis, Mongo, BullMQ |
| 03 | [Coding Standards](./03-coding-standards.md) | Naming, structure, style, SOLID, clean architecture |
| 04 | [Git Workflow](./04-git-workflow.md) | Branches, commits, PRs, reviews |
| 05 | [API Guidelines](./05-api-guidelines.md) | REST, errors, pagination, versioning |
| 06 | [Security](./06-security.md) | JWT, RBAC, Redis, S3, secrets, validation |
| 07 | [Testing](./07-testing.md) | Unit, integration, Playwright, coverage |
| 08 | [Monitoring](./08-monitoring.md) | Logs, metrics, health, alerts |
| 09 | [Deployment](./09-deployment.md) | Docker, GitHub Actions, Render, Vercel, AWS |
| 10 | [Troubleshooting](./10-troubleshooting.md) | Common failures and remediations |
| 11 | [Onboarding](./11-onboarding.md) | Day-one productivity path |
| 12 | [Release Process](./12-release-process.md) | Release, deploy, rollback checklists |
| 13 | [Contributing](./13-contributing.md) | Contribution guide |
| 14 | [Glossary](./14-glossary.md) | Shared terminology |

---

## Related deep dives (repository root)

| Topic | Document |
|-------|----------|
| Architecture diagrams | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) |
| Sequence diagrams | [`SEQUENCE_DIAGRAMS.md`](../../SEQUENCE_DIAGRAMS.md) |
| Security detail | [`SECURITY.md`](../../SECURITY.md) |
| RBAC matrix | [`RBAC.md`](../../RBAC.md) |
| Multi-tenancy | [`MULTITENANCY.md`](../../MULTITENANCY.md) |
| Redis | [`REDIS.md`](../../REDIS.md) |
| Background jobs | [`JOBS.md`](../../JOBS.md) |
| Domain events | [`EVENTS.md`](../../EVENTS.md) |
| Monitoring | [`MONITORING.md`](../../MONITORING.md) |
| Deployment | [`DEPLOYMENT.md`](../../DEPLOYMENT.md) |
| Testing (E2E) | [`TESTING.md`](../../TESTING.md) |
| Performance | [`PERFORMANCE.md`](../../PERFORMANCE.md) |
| Public API index | [`API.md`](../../API.md) |
| CI secrets | [`.github/SECRETS.md`](../../.github/SECRETS.md) |

OpenAPI lives at runtime: `/docs` and `/docs/openapi.json` (source under `backend/docs/`).

---

## Engineering principles

1. **Production mindset** — Prefer observable, fail-open caches, and reversible changes.
2. **Security by default** — JWT sessions, RBAC, sanitization, least privilege.
3. **Clear boundaries** — Controllers thin; services own domain; models persist.
4. **Async where needed** — BullMQ for slow / retryable work; events for side effects.
5. **Document decisions** — Handbook + deep dives; update docs with behavior changes.
6. **Measure before rewriting** — Use Monitoring / Performance tab and explain plans.

---

## Stack at a glance

```text
React (Vite) ──HTTP/JWT──► Express API ──► MongoDB
     │                         │
     └── Socket.IO ◄── Redis ◄─┼── BullMQ workers
                               ├── AWS S3
                               └── AI / Weather / Maps / SerpAPI
```

---

## How to use this portal

- **New joiners:** Start with [11-onboarding](./11-onboarding.md), then 01 → 02 → 06 → 07.  
- **Feature work:** 03 + 05 + relevant deep dive + 04.  
- **Incidents:** 10 + 08.  
- **Releases:** 12 + 09.

Questions that are not covered here should become a PR updating this handbook—treat docs as a first-class deliverable.
