# Policy Forge — AI Agent Shared Baseline

## What This Project Is

Multi-tenant insurance management platform for the London Market. Full lifecycle: `SUBMISSION → QUOTE → POLICY → CLAIM`

Three deployable applications live in this workspace:

| App | Tech | Domain |
|---|---|---|
| `frontend/` | React + Vite + TypeScript + Tailwind | SPA — app.thepolicyforge.com |
| `backend/nest/` | NestJS + TypeORM + PostgreSQL | REST API — api.thepolicyforge.com |
| `website/` | Next.js 14 App Router + Tailwind | Marketing — www.thepolicyforge.com |

## The Three Artifact Rule (Non-Negotiable)

Every feature must follow this sequence. No step may be skipped. No code without both preceding artifacts.

```
REQUIREMENTS (.requirements.md with REQ IDs) → TESTS (failing, @req tags on every it()) → CODE
```

## Checkpoint Protocol

After every major stage, stop and wait for explicit user confirmation. All unresolved questions go to `docs/Technical Documentation/08-Open-Questions.md`.

## Response Brevity Default

- Keep default chat responses under 200 characters.
- Expand beyond 200 characters only when the user explicitly requests more detail, full code, or a full report.

## Multi-Tenant Rule

- Every tenant-scoped entity must have a `tenant_id` column (FK to `organizations`)
- Every DB query on tenant-scoped data must filter by `tenant_id`
- Data must never leak across tenant boundaries. Full rules: `docs/AI Guidelines/05-Multi-Tenant-Rules.md`

## Domain List

| Domain | Owns |
|---|---|
| `submissions` | Submission lifecycle, AI extraction results |
| `quotes` | Sections, coverages, pricing, deductions |
| `policies` | Policy binding, endorsements, audit trail |
| `binding-authorities` | BA contracts, sections, transactions, bordereaux |
| `claims` | Claim records, transactions, reserves, financials |
| `parties` | Organisations, brokers, insureds, coverholders, insurers |
| `finance` | Cash allocation, aged debt, payments (consumes invoices — does not create them) |
| `reporting` | Reports, dashboards, widgets |
| `settings` | Rating rules, products, field metadata, org config |
| `auth` | Login, logout, session management, token handling |

No domain may import from another domain. Events are the only cross-domain integration mechanism. Full rules: `docs/AI Guidelines/04-Architectural-Boundaries.md`

## Folder Structure

Authoritative map: `docs/AI Guidelines/12-Folder-Structure.md`. Key rules:
- `.requirements.md` files live inside the module folder they describe
- Test files live in `__tests__/` beside the module they test
- All frontend HTTP calls go through `@/shared/lib/api-client/api-client` — never direct `fetch()` or `axios`
- NestJS module pattern: `[module].module.ts` / `[module].controller.ts` / `[module].service.ts`
- All entity files in `backend/nest/src/entities/` — no raw SQL schema files

## Change Verification Protocol

1. **Delivery Plan first:** Orchestrator presents which agents, new files, files to modify, and checkpoints — waits for sponsor approval before any agent begins.
2. **Show Before Modify:** Before editing any existing file, state the path, quote the current text, show the replacement, state the reason, and wait for approval. New file creation does not require pre-approval.
3. **Decision Log:** Every agent checkpoint must record assumptions made and alternatives rejected.
4. **Existing Work Protection:** Never modify existing passing tests, working UI, or API contracts unless explicitly in the approved `.requirements.md` and Delivery Plan. Raise an open question and stop rather than modify to unblock.
5. **Baseline Register Hard Stop:** Before any pipeline on existing functionality, check `docs/Project Documentation/10-Approved-Baseline-Register.md`. A baselined feature requires an approved Change Request (CR-[NNN]) before work begins.

## Key Prohibited Actions

- Code without approved requirements and tests
- Cross-domain imports — use events only
- Direct `fetch()` or `axios` in the frontend
- Hardcoded hex colours — use Tailwind brand classes (`07-Brand-Colour-Standards.md`)
- Files outside `12-Folder-Structure.md` without an open question
- `git push` without the push checkpoint (`01-AI-Behaviour-Rules.md §1.4`)
- Raw SQL schema files — TypeORM entities only
- Bulk file operations (3+ files) without §1.3 challenge format and confirmation
- Skip checkpoints to move faster

## Natural Language Delivery Triggers

| Phrase | Pipeline | Agents |
|---|---|---|
| **"Use Feature Delivery"** | BA → SA → TA → DBA → Dev → QG | All agents |
| **"Use Bug Fix"** | Dev → TA → QG | Developer, Test Analyst, Quality Guardian |
| **"Use Architecture Review"** | SA → BA → DBA → Dev → QG | SA-led |
| **"Use Requirements Review"** | BA → SA → QG | Business Analyst, Solution Architect, Quality Guardian |
| **"Use DB Change"** | DBA → Dev → QG | Database Architect, Developer, Quality Guardian |
| **"Use Resume Delivery"** | From last approved gate → QG | Depends on resume point |
| **"Use Retrospective"** | QG retrospective only | Quality Guardian |
| **"Use Discovery"** | Explore → BA → SA → Sponsor approval | Documents and baselines existing implementation |

Invoke the **Orchestrator** agent for any trigger. Do not default to the full pipeline for a trigger that maps to a shorter mode.

## Agent Collaboration

Specialist agents, delivery modes, handoff contracts, tool restrictions, and checkpoint gate protocol are all defined in `docs/AI Guidelines/17-Agent-Collaboration-Standards.md`.
