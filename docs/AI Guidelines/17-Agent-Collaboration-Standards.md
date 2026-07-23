# AI GUIDELINES — SECTION 17: AGENT COLLABORATION STANDARDS

This document defines the multi-agent delivery system for Policy Forge.  It governs how specialist AI agents are organised, how they interact, and what rules apply to each.

When a session involves more than one agent, this document is the authority.  All agents inherit the rules in this document in addition to the shared baseline in `.github/copilot-instructions.md`.

---

## 17.1  Why Agents Exist

A single AI assistant operating across all roles — analyst, architect, tester, developer, reviewer — accumulates too much responsibility and too little discipline per role.  Specialist agents fix this:

- Each agent is focused on one responsibility
- Each agent has appropriate tool access (no more than needed)
- Each agent produces a defined artifact that the next agent consumes
- The Three Artifact Rule (§1.2) is enforced structurally, not by instruction alone

---

## 17.2  Agent Roster

| Agent | Role | Primary Guideline Sections | Tool Access |
|---|---|---|---|
| **Orchestrator** | Routes delivery modes; enforces Three Artifact Rule gate; coordinates pipeline | §17 (this document), §1.2, §1.4 | read, search, agent |
| **Business Analyst** | Writes SMART requirements; owns `.requirements.md` files; produces Impact Analysis | §13, §03, §09 §2 | read, search, edit |
| **Test Analyst** | Converts requirements to test specs; enforces traceability; verifies test layer coverage | §06, §03 | read, search, edit |
| **Solution Architect** | Reviews domain boundaries, event design, architectural fit; gate before schema changes | §04, §08, Project Docs §01, §02 | read, search |
| **Database Architect** | Designs entity changes, migrations, seed data; enforces multi-tenant isolation | §15, §05 | read, search, edit |
| **Developer** | Implements full-stack features; enforces folder structure, API contracts, boundary rules | §09, §04, §12, §10 | read, search, edit, execute |
| **Quality Guardian** | Exit gate reviewer; checks against all AI Guidelines and Definition of Done | All sections | read, search |

---

## 17.3  Delivery Modes

Not every task requires all agents.  Use the minimum pipeline that covers the risk of the change.

| Mode | Trigger | Pipeline |
|---|---|---|
| **New Feature** | A new domain module, workflow, or end-to-end capability | BA → SA → TA → DBA → Dev → QG |
| **Bug Fix** | Incorrect behaviour in existing code with requirements already in place | Dev → TA → QG |
| **Architecture Change** | Domain boundary change, new cross-domain event, new shared module | SA → BA → DBA → Dev → QG |
| **Database-Only Change** | Entity, migration, or seed change with no UI or workflow impact | DBA → Dev → QG |
| **Requirements Review** | Reviewing or updating an existing `.requirements.md` file | BA → SA → QG |
| **Test Coverage Gap** | Missing or incomplete tests for an existing feature | TA → QG |
| **Resume Delivery** | Picking up an interrupted delivery at the last approved gate | From last gate → QG |
| **Post-Delivery Retrospective** | After Gate 4 — efficiency review, documentation health, code organisation, loose ends | QG only |
| **Discovery** | Code exists but was built without the agent pipeline — document, review, and baseline it | Explore → BA → SA → Sponsor approval |

**Threshold rule:** Invoke the Orchestrator for any change that crosses more than one layer (UI, API, DB).  For single-layer changes (e.g. fixing a UI label, adding a DB index), invoke the relevant specialist directly.

**Mode selection:** If the mode is ambiguous, the Orchestrator asks one clarifying question before routing.  It does not guess.

---

## 17.4  Handoff Artifact Contracts

Each agent produces a specific artifact.  The next agent in the pipeline consumes that artifact.  Do not proceed to the next stage without the upstream artifact.

---

### Business Analyst → Test Analyst

**BA produces:** A completed `.requirements.md` file containing:
- `REQ-{DOMAIN}-{TYPE}-{NNN}` IDs for every requirement
- At least one measurable acceptance criterion per requirement
- A complete Impact Analysis section (UI / API / DB subsections all populated)
- An `## Open Questions` section (populated or "None")
- One or more sponsor review entries added to `docs/Project Documentation/09-Sponsor-Review-Checklist.md` (status: `Draft`), covering the primary happy path and at least one validation scenario in plain business language

**TA gate:** If any requirement has no acceptance criterion, or the Impact Analysis is incomplete, the Test Analyst must return to BA rather than proceeding.

---

### Test Analyst → Developer

**TA produces:** Test spec file(s) containing:
- One `describe` block per `REQ-{DOMAIN}-{TYPE}-{NNN}` ID
- A `// @req REQ-{DOMAIN}-{TYPE}-{NNN}` traceability tag on every `it()` block
- Tests written RED (failing) — implementation has not started
- All three test layers planned (frontend unit, backend integration, E2E where required)

**Dev gate:** Every REQ ID from the BA artifact must be covered by at least one test.  If any REQ ID is untested, Developer must return to TA.

---

### Solution Architect → DBA / Developer

**SA produces:** A structured architecture review note containing:
- Confirmed domain ownership for every entity and operation
- Event design (which domains publish / subscribe)
- Any boundary violations found and their proposed resolution
- Explicit Go / No-Go for each layer (UI, API, DB)

**DBA / Dev gate:** Explicit GO on the relevant layer is required before work starts.  A "No-Go" or "Deferred" on any layer is a stop — raise an open question.

---

### Database Architect → Developer

**DBA produces:** Updated entity file(s) and/or seed scripts containing:
- TypeORM entity changes in `backend/nest/src/entities/` (no raw SQL schema files)
- `tenant_id` column present on every new tenant-scoped entity
- Updated seed data in `db/seeds/` if reference data changed
- Instruction to run `npm run db:sync` before implementation begins

**Dev gate:** Entity files must be complete and `db:sync` must have been run.  Developer does not begin implementation until confirmed.

---

### Developer → Quality Guardian

**Dev produces:** Implementation with:
- `npm run test:all` green (all three layers)
- No TypeScript errors
- `docs/Technical Documentation/11-Gap-Analysis.md` reviewed and updated
- `docs/Project Documentation/reconstruction-gap-analysis.md` checked
- `docs/Project Documentation/09-Sponsor-Review-Checklist.md` updated — BA’s draft steps confirmed against the running implementation, status set to `Confirmed`
- No open questions in `docs/Technical Documentation/08-Open-Questions.md` blocking this feature

**QG gate:** If any test layer is not green, QG rejects immediately and returns to Developer without reviewing further.

---

## 17.5  Open Questions Ownership

When any agent raises an open question it must be written to `docs/Technical Documentation/08-Open-Questions.md` in the format defined in `docs/AI Guidelines/02-Checkpoints-and-Open-Questions.md`.

| Question Type | Owning Agent | Authority to Close |
|---|---|---|
| Requirements ambiguity | Business Analyst | BA + stakeholder confirmation |
| Architectural boundary or domain ownership | Solution Architect | SA + team review |
| Schema or entity design | Database Architect | DBA |
| Test coverage gap | Test Analyst | TA |
| Implementation approach | Developer | Dev (+ SA if architectural impact) |
| AI guideline violation | Quality Guardian | QG + guideline update |

No agent may close an open question outside its ownership area without explicit confirmation.

---

## 17.6  Gap Analysis Obligation

After every delivery cycle, the Developer and Quality Guardian must jointly verify:

1. `docs/Technical Documentation/11-Gap-Analysis.md` — check if the completed feature closes any tracked gap and update the entry
2. `docs/Project Documentation/reconstruction-gap-analysis.md` — update if any planned feature was implemented

Neither agent may declare "done" without completing this check.  If a gap is closed, the entry must be updated with the date and branch name in the same commit as the feature.

---

## 17.7  Tool Restriction Policy

Tool access is intentionally limited per agent.  This prevents agents from taking actions outside their role.

| Agent | Allowed Tools | Explicitly Prohibited |
|---|---|---|
| Orchestrator | read, search, agent | edit, execute |
| Business Analyst | read, search, edit (`.requirements.md` files only) | execute |
| Test Analyst | read, search, edit (test files only) | execute |
| Solution Architect | read, search | edit, execute |
| Database Architect | read, search, edit (entities, seeds, `db/` only) | execute |
| Developer | read, search, edit, execute | — |
| Quality Guardian | read, search | edit, execute |

**The Orchestrator never edits files.**  It coordinates, routes, and delegates only.

**The Solution Architect and Quality Guardian never edit files.**  They review and report only.  The Quality Guardian reports violations; it does not fix them.

---

## 17.8  Checkpoint Gate Protocol

Every agent must apply the checkpoint protocol from `docs/AI Guidelines/02-Checkpoints-and-Open-Questions.md` at the end of its stage before handing off.

The checkpoint format for agent handoffs is:

```
CHECKPOINT — [Agent Name] stage complete

Delivery mode:         [mode from §17.3]
Artifact produced:     [file path(s) of output]
Requirements covered:  [list of REQ IDs, or N/A]
Open questions raised: [list, or none]
Assumptions made:      [list, or none]
Gate condition:        [what the next agent must verify before starting]

---
Ready to hand off to [Next Agent].  Confirm to proceed.
I will not hand off until confirmed.
```

No agent may proceed to the next stage without the user explicitly confirming the checkpoint.

---

## 17.9  Multi-Agent Conversation Log Format

When a session involves more than one agent, the conversation log entry (per `docs/AI Guidelines/11-Conversation-Log-Standards.md`) must include additional fields:

```markdown
---

### [YYYY-MM-DD] [HH:MM] — <Short Title>

**Delivery Mode:** <New Feature | Bug Fix | Architecture Change | DB-Only Change | Requirements Review | Test Coverage Gap>
**Agents Invoked:** <comma-separated list in invocation order>

**Request:**
<One to three sentences summarising what the user asked for.>

**Outcome:**
<One to three sentences summarising what was done, decided, or deferred.>

**Artifacts Produced:**
- `path/to/requirements.md` — BA artifact
- `path/to/test-spec.ts` — TA artifact
- (or "none" if no artifacts produced)

**Files Changed:**
- `path/to/file.ext` — brief description of change (or "none")

**Open Questions / Deferred:**
- <Any unresolved questions raised during the session, or "none">

---
```

Single-agent sessions continue to use the standard format from `11-Conversation-Log-Standards.md §11.3`.

---

## 17.10  Agent File Locations

All agent and prompt files live under `.github/` at the root of the `Cleaned` workspace:

```
Cleaned/
  .github/
    copilot-instructions.md          ← Shared baseline inherited by all agents
    agents/
      orchestrator.agent.md          ← Routes delivery modes; enforces Three Artifact Rule
      business-analyst.agent.md      ← Requirements and Impact Analysis
      test-analyst.agent.md          ← Test specs and traceability
      solution-architect.agent.md    ← Architecture review and gate
      database-architect.agent.md    ← Entity design and seed data
      developer.agent.md             ← Full-stack implementation
      quality-guardian.agent.md      ← Exit gate review
    prompts/
      feature-delivery.prompt.md     ← Full pipeline entry point (New Feature)
      bug-fix.prompt.md              ← Dev → TA → QG pipeline
      architecture-review.prompt.md  ← SA-led pipeline
      requirements-review.prompt.md  ← BA → SA → QG pipeline
      db-change.prompt.md            ← DBA → Dev → QG pipeline
```

These files are committed to the repository and shared by all contributors.

---

## 17.11  Change Verification Protocol

All agents must follow the verification rules defined in `.github/copilot-instructions.md` under **Change Verification Protocol**.  This section is the authority for:

- The Delivery Plan requirement (Orchestrator produces before any agent starts)
- The Show Before Modify rule (all agents, all existing file edits)
- The Decision Log requirement (included in every handoff checkpoint)
- The Existing Work Protection rule (no modification to passing tests, working UI, or live API contracts without an explicit requirement and user approval)

These rules apply in addition to the checkpoint gate protocol in §17.8.  They are not a substitute for checkpoints — both sets of rules apply simultaneously.

---

## 17.13  Post-Delivery Retrospective

After Gate 4 is approved and before any `git push`, a Post-Delivery Retrospective may be run using the `/post-delivery-retrospective` prompt.  The Quality Guardian leads the retrospective.

The retrospective covers four sections:

| Section | Purpose |
|---|---|
| **1. Efficiency Review** | Was the pipeline proportionate to the change? Plain-English verdict only. |
| **2. Documentation Health** | Are requirements, gap analysis, open questions log, and conversation log all complete and accurate? |
| **3. Code Organisation** | Are all files in the correct location? Are names consistent? Is there dead code, orphaned files, or missing traceability tags? |
| **4. Loose Ends** | Are all TODOs, stubs, known limitations, and deferred items recorded in the appropriate log? |

The retrospective produces one of two outcomes:
- **READY TO PUSH** — proceed to the push checkpoint in `01-AI-Behaviour-Rules.md §1.4`
- **RESOLVE BEFORE PUSHING** — a minimum action list is provided; retrospective re-runs after actions are complete

The retrospective is strongly recommended after every New Feature or Architecture Change delivery.  It is optional but available after Bug Fix and DB-Only Change deliveries.

Full prompt: `.github/prompts/post-delivery-retrospective.prompt.md`

---

## 17.14  Resume Delivery

When a delivery is interrupted mid-pipeline, use the `/resume-delivery` prompt to pick up from the last approved Project Sponsor Gate without restarting from BA.

The resume prompt:
1. Reads the conversation log to establish context
2. Verifies existing artifacts are still valid and consistent
3. Determines the correct resume point based on the last approved gate
4. Presents a Resume Plan for Project Sponsor approval before invoking any agent

If any artifact has changed since it was last approved at a gate, the relevant gate is re-presented before the pipeline continues.  Silent continuation past an invalidated gate is not permitted.

Full prompt: `.github/prompts/resume-delivery.prompt.md`

---

## 17.12  Project Sponsor Gates

At four points in every delivery pipeline, the work must pause and the **Project Sponsor** (the user) must actively review and approve before any agent continues.  These are not technical checkpoints — they are business decision points.  The format is different: the agent presents a plain-English summary aimed at a business reviewer, not a developer.

No pipeline stage may proceed past a Project Sponsor Gate without an explicit written approval from the user.

---

### Gate 1 — Requirements Sign-Off (after Business Analyst)

**Triggered by:** BA completing the `.requirements.md` file
**Purpose:** Confirm the requirements correctly capture what the Project Sponsor wants to build
**What the BA presents:**
```
PROJECT SPONSOR GATE 1 — Requirements Sign-Off

Feature: [name]

What this feature will do (plain English):
  [2–3 sentence summary a non-technical stakeholder can read]

Requirements to approve:
  REQ-[ID]: [one-line plain English description of what it does]
  REQ-[ID]: [one-line plain English description]
  ...

What is explicitly OUT OF SCOPE:
  [list, or none]

Impact summary:
  UI changes:  [brief description]
  API changes: [brief description]
  DB changes:  [brief description]

Open questions requiring your decision:
  [list, or none]

---
Do these requirements correctly describe what you want to build?
Reply 'approved' to proceed to architecture review, or describe any changes.
```
**Hard rule:** The Solution Architect, Test Analyst, Database Architect, and Developer may not begin until Gate 1 is approved.

---

### Gate 2 — Architecture Approval (after Solution Architect)

**Triggered by:** SA completing the architecture review note
**Purpose:** Confirm the design decisions make sense for the business before any code is written
**What the SA presents:**
```
PROJECT SPONSOR GATE 2 — Architecture Approval

Feature: [name]

Key design decisions made:
  1. [Decision] — [plain English reason]
  2. [Decision] — [plain English reason]

Trade-offs or alternatives considered:
  [Any option that was rejected and why, in plain English]

Risks or constraints to be aware of:
  [Any concern the sponsor should know about]

Go / No-Go summary:
  UI layer:  [GO / concern]
  API layer: [GO / concern]
  DB layer:  [GO / concern]

---
Do you approve these design decisions?
Reply 'approved' to proceed to test planning, or raise any concerns.
```
**Hard rule:** The Test Analyst, Database Architect, and Developer may not begin until Gate 2 is approved.

---

### Gate 3 — Test Plan Approval (after Test Analyst)

**Triggered by:** TA completing test specs
**Purpose:** Confirm the tests will prove the right things before implementation begins
**What the TA presents:**
```
PROJECT SPONSOR GATE 3 — Test Plan Approval

Feature: [name]

What will be proved by these tests (plain English):
  ✓ [REQ-ID] — [one sentence: what user outcome this test verifies]
  ✓ [REQ-ID] — [one sentence]
  ...

Test layers covered:
  Frontend (UI behaviour):  [yes / no]
  Backend (API + database): [yes / no]
  End-to-end (full flow):   [yes / no]

Anything NOT tested and why:
  [list, or none]

---
Do these tests cover what you need to verify?
Reply 'approved' to proceed to implementation, or describe any gaps.
```
**Hard rule:** The Database Architect and Developer may not begin until Gate 3 is approved.

---

### Gate 4 — Delivery Sign-Off (after Quality Guardian)

**Triggered by:** QG approving the implementation
**Purpose:** Final business sign-off before the branch is merged or pushed
**What the QG presents:**
```
PROJECT SPONSOR GATE 4 — Delivery Sign-Off

Feature: [name]

Delivery status: READY / NOT READY

All requirements met:
  REQ-[ID]: ✓ verified
  REQ-[ID]: ✓ verified

All tests passing: [yes / no]

Sponsor review checklist entries (for your manual walkthrough):
  See docs/Project Documentation/09-Sponsor-Review-Checklist.md
  Entries for this feature: [list entry IDs and one-line descriptions]
  Status: Confirmed (ready for your validation)

Anything deferred to a future delivery:
  [list with OQ reference, or none]

Recommended next step:
  [merge to development / raise PR / resolve open question first]

---
Do you approve this feature for merge?
Reply 'approved' to proceed to the push checkpoint, or raise any concerns.
```
**Hard rule:** No `git push` or merge may occur until Gate 4 is approved.  Gate 4 approval then triggers the push checkpoint in `01-AI-Behaviour-Rules.md §1.4`.
