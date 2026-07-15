# 13 — Contributing

**Parent:** [Engineering Handbook](./ENGINEERING.md)

Thank you for contributing to TravelPlan. This guide standardizes collaboration for staff, contractors, and open contributors.

---

## 1. Before you start

1. Read [01 Project Overview](./01-project-overview.md) and [03 Coding Standards](./03-coding-standards.md)  
2. Search existing issues / PRs  
3. For large changes, open a short design note or issue first  

---

## 2. Development process

1. Fork or create a branch from the default branch ([04 Git Workflow](./04-git-workflow.md))  
2. Implement with tests and docs as needed  
3. Run lint + relevant tests  
4. Open a Pull Request with Summary + Test plan  
5. Address review feedback  

---

## 3. What makes a good PR

- Single purpose  
- Clear user-visible or operational benefit  
- No unrelated reformatting  
- Secrets never included  
- OpenAPI / handbook / deep-dive updates when contracts change  

---

## 4. Areas that need extra care

| Area | Extra requirement |
|------|-------------------|
| Auth / sessions | Security tests + review |
| RBAC / Super Admin | Explicit permission matrix check |
| Tenancy | Cross-tenant denial proof |
| Payments / PII / documents | Security + least-privilege storage |
| Background jobs | Idempotency & DLQ behavior |

---

## 5. Code of conduct (engineering)

- Be respectful in reviews  
- Assume positive intent; argue about code, not people  
- Prefer teaching comments over cryptic LGTMs  

---

## 6. Licensing

Contributions are provided under the repository license (see root `LICENSE`, MIT unless otherwise stated).

Continue: [14 Glossary](./14-glossary.md) · [Engineering Handbook home](./ENGINEERING.md)
