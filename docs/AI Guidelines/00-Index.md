# AI GUIDELINES — SECTION 00: INDEX AND READING ORDER

This is the entry point for the Policy Forge AI guidelines.  
When a prompt says "follow AI guidelines", "follow the guidelines", or similar, the AI must treat all three documentation folders as part of a single unified ruleset and read them in the order defined below.

---

## 00.1  The Three Documentation Folders

All documentation lives under `docs/` at the project root:

| Folder | Purpose | Priority |
|--------|---------|----------|
| `docs/AI Guidelines/` | How the AI must behave, what rules it must enforce, and how the project is structured.  **Non-negotiable rules.** | Highest |
| `docs/Project Documentation/` | Architecture decisions, domain definitions, workflow definitions, shared service catalogue.  **Design intent.** | High |
| `docs/Technical Documentation/` | Migration notes, rebuild plans, open questions, risk register.  **Working context.** | High |

**When a prompt references "AI guidelines", all three folders are in scope.**  
The AI must not assume that reading `AI Guidelines/` alone is sufficient.

---

## 00.2  Reading Order

When starting a new session or responding to a request that references the guidelines, read in this order:

1. **`AI Guidelines/00-Index.md`** — this file — establishes scope and reading order
2. **`AI Guidelines/01-AI-Behaviour-Rules.md`** — how the AI must behave at all times
3. **`AI Guidelines/03-Three-Artifact-Rule.md`** — requirements → tests → code
4. **`AI Guidelines/04-Architectural-Boundaries.md`** — domain, workflow, db, and component rules
5. **`AI Guidelines/12-Folder-Structure.md`** — where every file lives (mandatory reference before creating any file)
6. **`AI Guidelines/13-Requirements-Standards.md`** — how requirements must be written (mandatory before writing or reviewing any `.requirements.md` file)
7. **`Project Documentation/01-Architectural-Overview.md`** — system design intent
7. **`Project Documentation/02-Domain-Definitions.md`** — what each domain owns
8. **Other AI Guideline sections** — as relevant to the specific task (auth, testing, branding, etc.)
9. **Technical Documentation** — as relevant (open questions, migration notes, rebuild plan)

---

## 00.3  AI Guidelines File List

| File | Covers |
|------|--------|
| `00-Index.md` | This file — reading order and scope |
| `01-AI-Behaviour-Rules.md` | AI role, checkpoint behaviour, how to challenge ambiguity, **§1.8 Guideline Amendment Protocol**, **§1.9 Plain English Change Declaration**, **§1.10 Session-End Checklist**, **§1.18 AI Model Selection Guidance** |
| `02-Checkpoints-and-Open-Questions.md` | When to stop and ask; how to log open questions |
| `03-Three-Artifact-Rule.md` | Requirements → Tests → Code sequence |
| `04-Architectural-Boundaries.md` | Domains, workflows, lib/, components, db/, app shell rules, **NestJS backend module rules (§4.2a)** |
| `05-Multi-Tenant-Rules.md` | Tenant isolation, org-scoped data |
| `06-Testing-Standards.md` | Test structure, coverage expectations, what must be tested, **NestJS `*.spec.ts` unit test patterns** |
| `07-Brand-Colour-Standards.md` | Colour palette, Tailwind classes, brand enforcement |
| `08-Event-Driven-Communication.md` | Cross-domain event rules and naming conventions |
| `09-Full-Stack-Development.md` | FE/BE planning order, API contracts, local dev setup, **Definition of Done**, **Stub Route Rules**, **Gap Analysis maintenance obligation**, **separate-app local dev setup** |
| `10-Debug-And-Build-Standards.md` | Debugging approach, build pipeline rules, **NestJS environment config (§10.10)**, **FE vs BE env separation** |
| `11-Conversation-Log-Standards.md` | How to persist session summaries |
| `12-Folder-Structure.md` | Authoritative folder map — where every file belongs, **NestJS backend module layout (§12.6)**, **Module/Controller/Service pattern and no barrel files (§12.7)** |
| `13-Requirements-Standards.md` | Requirements writing standard: SMART, `REQ-{DOMAIN}-{TYPE}-{NNN}` IDs, Actor+shall+Action format |
| `14-UI-Component-Standards.md` | Page layout rules: standard padding (`p-6`), Card component usage, sidebar section requirements, common violations |
| `15-Database-Standards.md` | Migration rules (schema only, idempotent, numbered), one-seed-file rule, npm script requirements, adding a new table checklist |
| `conversation-log.md` | Live log of all sessions (append only) |

---

## 00.5  Target Architecture (Three-App)

The project is migrating from a single monolith to three separate applications:

| App | Tech | Domain | Status |
|-----|------|--------|--------|
| `backend/` | NestJS + TypeScript | API — api.policyforge.com | Phase 1 — complete |
| `frontend/` | React + Vite + Tailwind | SPA — app.policyforge.com | Phase 2 — complete |
| `website/` | Next.js 14 + Tailwind | Marketing — www.policyforge.com | Phase 3 — complete |

Migration is tracked in `Technical Documentation/13-Three-App-Migration-Plan.md`.  
Do not delete that file until all phases are complete and verified.

---

## 00.4  Critical Rules That Apply to Every Session

Regardless of the specific task, the following rules are always active:

1. **Three-Artifact Rule** — requirements before tests, tests before code.  No exceptions.
2. **Folder Structure** — every new file must be placed in the location defined in `12-Folder-Structure.md`.  If the location is unclear, raise an open question before creating the file.
3. **Boundary Rules** — no cross-domain imports, no schema changes outside `db/migrations/`, no direct fetch calls outside `frontend/src/shared/lib/api-client`.
4. **Conversation Log** — every qualifying session ends with an entry appended to `conversation-log.md`.
5. **Checkpoint Behaviour** — stop and confirm after every major section of work.  Never assume intent.
