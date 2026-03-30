# TECHNICAL DOCUMENTATION — 01: MIGRATION NOTES

This document describes the overall approach to migrating from the legacy `policy-forge-chat (BackUp)` codebase to the new `Cleaned` architecture.  It records the key decisions, constraints, and principles that guide the migration.

---

## 1.1  Migration Approach

The migration follows an **analyse → plan → rebuild** approach:

1. **Analyse** — Read and understand every file in the legacy codebase.  Map what it does, which domain it belongs to, and which shared services it should use.
2. **Plan** — Document the migration plan for each domain, workflow, and shared service.  Identify what needs to be rewritten, what can be migrated, and what can be deleted.
3. **Rebuild** — Implement each piece in the new architecture following the three-artifact rule (requirements → tests → code).

**No code is generated until:**
- The analysis is confirmed as accurate
- The mapping is agreed
- The requirements are written and approved
- The tests are written

---

## 1.2  What "Migration" Means

For each legacy file or feature, the migration falls into one of these categories:

| Category | Description |
|----------|-------------|
| **Rewrite** | The logic needs to be rebuilt to fit the new architecture (domain-isolated, event-driven, multi-tenant-aware) |
| **Migrate** | The logic is structurally sound but needs to be moved to the correct folder and given its three artifacts |
| **Extract** | The file contains logic belonging to multiple places — it must be split before migrating |
| **Delete** | The file is dead code, a stub, or covered by a better replacement |
| **Preserve** | The file is correct as-is and can be copied to the new structure without changes |

---

## 1.3  Migration Constraints

| Constraint | Reason |
|------------|--------|
| No domain-to-domain imports in new code | Core architectural rule |
| Every API route must enforce tenant scoping | Critical security gap in legacy |
| Every feature needs requirements before code | Three-artifact rule |
| React Context providers are not the right pattern for domain state | They create invisible coupling — replaced by domain functions and API calls |
| Calculations must live in domain logic, not inside components | Components must be domain-agnostic |

---

## 1.4  What Changes vs. What Stays the Same

### Changes

| Legacy pattern | New pattern |
|----------------|-------------|
| React Context for domain state | Domain logic + API calls + event bus |
| Calculations in utility files with no clear owner | Calculations in their owning domain |
| Permission checks as JSX conditionals | Centralised `permissions` shared service |
| Direct `fetch()` calls in pages | `api-client` shared service |
| No `org_code` filtering on API routes | Tenant middleware on every backend route |
| Hardcoded hex colours in components | Design tokens from `shared/design-tokens/` |
| No event-driven communication | Event bus with typed events |

### Stays the Same

| Legacy element | Disposition |
|----------------|-------------|
| PostgreSQL database schema (overall) | Preserved — may evolve during migration |
| Brand colour token values | Preserved in new location |
| Core business logic (quote pricing, premiums, deductions) | Preserved, moved to domain files |
| Reusable UI component behaviour (modals, grids, tabs) | Preserved, moved to components/ |
| PDF generation logic | Preserved, moved to shared service |

---

## 1.5  Migration Phases (High Level)

| Phase | Focus |
|-------|-------|
| **Phase 0 (Current)** | Analysis, documentation, planning — no code |
| **Phase 1** | Shared services foundation (event bus, permissions, api-client, design tokens) |
| **Phase 2** | Auth domain, homepage, application shell |
| **Phase 3** | Submissions domain and workflows |
| **Phase 4** | Quotes domain |
| **Phase 5** | Policies domain |
| **Phase 6** | Remaining domains (BA, Claims, Parties, Finance) |
| **Phase 7** | Reporting and Settings domains |
| **Phase 8** | Full E2E testing and multi-tenant validation |

The detailed step-by-step plan is in `Technical Documentation/10-Step-by-Step-Migration-Plan.md`.

---

## 1.6  What Is Not Being Migrated (Yet)

The following capabilities are intentionally out of scope for the initial migration:

| Capability | Reason |
|------------|--------|
| Cross-tenant data sharing workflows | Architecture not yet defined — see OQ-009 |
| Full permission matrix implementation | Permission rules not yet specified — see OQ-008 |
| Locations schedule / rating engine | Complex, needs dedicated analysis — see OQ-005 |
| AI email extraction service | Backend-only, can run alongside new architecture |

---

## 1.7  Risk Summary

The top five migration risks are:

1. **No tenant enforcement in legacy** — Rebuilding without implementing tenant middleware could silently preserve a critical security gap
2. **Context coupling** — Legacy code shares state through React Context in ways that are not immediately visible.  Removing contexts without understanding all consumers will break features.  
3. **Calculations scattered across utils** — Premium, financial view, and tax calculations exist in utils files that are imported by many components.  Migrating these requires careful dependency analysis.
4. **Hardcoded test data in seed files** — The legacy backend has many seed scripts.  Migrating data seeding to the new structure needs care.
5. **Missing requirements** — If any business rule has no documentation, it could be silently lost during the rewrite.

The full risk register is in `Technical Documentation/09-Risk-Register.md`.
