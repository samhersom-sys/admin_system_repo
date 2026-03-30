# TECHNICAL DOCUMENTATION — 10: STEP-BY-STEP MIGRATION PLAN

This is the ordered, detailed migration plan.  It groups work by phase.  No phase may begin until the previous phase's checkpoints are passed.

**No code is generated until explicitly approved.**  This document is a plan only.

---

## How to Use This Plan

Each step includes:
- What needs to change
- Why it matters
- Dependencies (what must be done first)
- Questions that must be answered
- A checkpoint before proceeding

---

## Phase 0: Analysis and Documentation (CURRENT PHASE)

**Goal:** Understand the legacy codebase completely, map every file to the new architecture, and produce all planning documentation before writing any code.

### Steps

| Step | What | Why | Status |
|------|------|-----|--------|
| 0.1 | Read and analyse all legacy source files | Cannot plan migration without understanding what exists | ✅ Complete (initial pass) |
| 0.2 | Write AI Guidelines for Cleaned folder | AI must know how to behave before working | ✅ Complete |
| 0.3 | Write Project Documentation | Architecture must be documented before building | ✅ Complete |
| 0.4 | Write Technical Documentation | Migration plan must exist before executing | ✅ Complete |
| 0.5 | Resolve open questions from the initial analysis | Many architecture decisions depend on these answers | ⏳ In progress (awaiting confirmation) |
| 0.6 | Confirm the entire analysis and mapping is correct | Do not proceed to Phase 1 until mapping is confirmed | ⏳ Checkpoint pending |

**Phase 0 Checkpoint:**
- [ ] Is the domain boundary analysis correct?
- [ ] Is the workflow classification accurate?
- [ ] Are the shared services correctly identified?
- [ ] Are the open questions correctly captured?
- [ ] Is there anything missing from the mapping?

---

## Phase 1: Shared Services Foundation

**Goal:** Build the core shared services that all domains will depend on.  No domain migration can begin until these exist.

**Dependencies:** Phase 0 complete and confirmed.

### Steps

| Step | What | Why | Questions to answer first |
|------|------|-----|--------------------------|
| 1.1 | Write requirements for `event-bus` | Three-artifact rule | OQ-007 (async or sync?) |
| 1.2 | Write tests for `event-bus` | Before code | |
| 1.3 | Build `event-bus` | Foundation for decoupling | |
| 1.4 | Write requirements for `api-client` | All domains use this for HTTP | |
| 1.5 | Write tests for `api-client` | Before code | |
| 1.6 | Build `api-client` | Replaces raw `fetch()` across codebase | |
| 1.7 | Migrate `design-tokens` | Fix colour bug before UI work begins | R-006 (Priority 1 fix first) |
| 1.8 | Fix competing `:root` blocks | Active colour bug — Priority 1 | |
| 1.9 | Write requirements for `formatters` | Replaces scattered utils | |
| 1.10 | Build `formatters` | Consolidates dateFormat, money, textCase, reference, address | |
| 1.11 | Migrate `lookups` data files | Reference data → shared service | |
| 1.12 | Write requirements for `notifications` | Used by all domains | OQ-005 clarify tenant scoping |
| 1.13 | Fix tenant scoping bug in notifications | R-005 | |
| 1.14 | Build `notifications` shared service | | |

**Phase 1 Checkpoint:**
- [ ] Does the event bus publish and subscribe correctly?
- [ ] Does the api-client handle auth tokens and 401 errors correctly?
- [ ] Are competing `:root` blocks removed?
- [ ] Do all shared service tests pass?

---

## Phase 2: Auth Domain and Application Shell

**Goal:** Establish secure authentication and the application shell.

**Dependencies:** Phase 1 complete.

### Steps

| Step | What | Why | Questions to answer first |
|------|------|-----|--------------------------|
| 2.1 | Scan all `useUser()` consumers — document every field | Must know before removing userContext | OQ-021 |
| 2.2 | Write requirements for `auth` domain and `auth-session` service | Three-artifact rule | |
| 2.3 | Build `auth-session` shared service (replaces userContext) | Centralised session management | |
| 2.4 | Add tenant middleware to backend | Critical security gap | R-001 |
| 2.5 | Add permission middleware to backend | Critical security gap | R-002, OQ-008 |
| 2.6 | Migrate login page | Public route | |
| 2.7 | Build `RequireAuth` using auth-session | Replaces legacy RequireAuth | |
| 2.8 | Build AppLayout and PublicLayout shells | Navigation structure | |
| 2.9 | Build Sidebar and Navbar | Remove colour bugs | |

**Phase 2 Checkpoint:**
- [ ] Does authentication work end-to-end?
- [ ] Does backend middleware correctly scope data to the authenticated user's `org_code`?
- [ ] Is permission middleware in place?
- [ ] Do existing tests still pass?

---

## Phase 3: Homepage Dashboard

**Goal:** Build the new application homepage in `/app/pages/home/`.

**Dependencies:** Phase 2 complete.

### Steps

| Step | What | Why | Questions to answer first |
|------|------|-----|--------------------------|
| 3.1 | Confirm homepage widget visibility matrix | Requirements cannot be written without this | OQ-020 |
| 3.2 | Write `home.requirements.md` | Three-artifact rule | |
| 3.3 | Write `home.test.tsx` | Before code | |
| 3.4 | Build `HomeDashboard.jsx` and index | Main dashboard assembly | |
| 3.5 | Build `KpiWidget.jsx` | Replaces KpiCards.jsx; fix colour debt | |
| 3.6 | Build `RecentActivityWidget.jsx` | Replaces RecentRecords.jsx; scope to tenant | |
| 3.7 | Build `NotificationsWidget.jsx` | New widget | |
| 3.8 | Build `TasksWidget.jsx` | New widget | OQ-023 |
| 3.9 | Build `QuickActionsWidget.jsx` | New widget; permission-driven | |
| 3.10 | Build `GwpChartWidget.jsx` and `CumulativeGwpWidget.jsx` | Replaces legacy chart components; use brandColors.chart | |

**Phase 3 Checkpoint:**
- [ ] Does the homepage render correctly for each role?
- [ ] Are all widgets tenant-scoped?
- [ ] Do permissions correctly show/hide widgets?
- [ ] Do all homepage tests pass?

---

## Phase 4: UI Primitives

**Goal:** Extract all domain-agnostic UI components into `components/`.

**Dependencies:** Phase 1 complete (design-tokens must exist first).

### Steps

| Step | What | Why |
|------|------|-----|
| 4.1 | Analyse ambiguous components (OQ-011–OQ-016) | Must classify before migrating |
| 4.2 | Extract clean primitives (Modal, TabsNav, SearchableSelect, etc.) | See `07-Component-Refactor-Notes.md` section 7.3 |
| 4.3 | Write requirements + tests for each primitive | Three-artifact rule |
| 4.4 | Consolidate duplicates (ProtectedRoute/RequireAuth, etc.) | See `07-Component-Refactor-Notes.md` section 7.4 |

**Phase 4 Checkpoint:**
- [ ] Are all primitives domain-agnostic?
- [ ] Do all primitive tests pass?
- [ ] Are duplicates eliminated?

---

## Phase 5: Submissions Domain

**Goal:** Build the `submissions` domain as the first complete domain vertical slice.

**Dependencies:** Phase 1, Phase 2, Phase 4 complete.

### Steps

| Step | What | Why | Questions to answer first |
|------|------|-----|--------------------------|
| 5.1 | Confirm clearance boundary | OQ-001 | |
| 5.2 | Write `submissions.requirements.md` | Three-artifact rule | |
| 5.3 | Write `submissions.test.ts` | Before code | |
| 5.4 | Build `submissions.ts` domain logic | Replaces submissionsContext | |
| 5.5 | Add `org_code` filtering to all submission routes | R-001 | |
| 5.6 | Migrate SubmissionPage to new architecture | | |
| 5.7 | Rebuild WorkflowPage (assignment) | Fix colour debt | |
| 5.8 | Rebuild ClearanceWorkflowPage | Pending OQ-001; fix colour debt | |
| 5.9 | Wire `submission.created` event | Enable downstream workflows | |

**Phase 5 Checkpoint:**
- [ ] Does the submission lifecycle work end-to-end?
- [ ] Is tenant scoping enforced?
- [ ] Are workflow events publishing correctly?
- [ ] Do all submission tests pass?

---

## Phase 6: Quotes Domain

**Dependencies:** Phase 5 complete.

### Steps

| Step | What | Why | Questions to answer first |
|------|------|-----|--------------------------|
| 6.1 | Confirm calculations ownership | OQ-003 | |
| 6.2 | Write `quote.requirements.md` | Three-artifact rule | |
| 6.3 | Extract premium / financial view calculations into domain | R-004 | |
| 6.4 | Build `quote.ts` domain logic | | |
| 6.5 | Migrate all quote pages | | |
| 6.6 | Migrate SectionDeductions and Participations | Extract any domain logic first | OQ-011/OQ-014 |
| 6.7 | Wire `quote.accepted` event | Enable quote-to-policy workflow | |

**Phase 6 Checkpoint:**
- [ ] Does the full quote lifecycle work?
- [ ] Is premium calculation correct?
- [ ] Do all quote tests pass?

---

## Phase 7: Policies Domain

**Dependencies:** Phase 6 complete.

### Steps

| Step | What | Why | Questions to answer first |
|------|------|-----|--------------------------|
| 7.1 | Confirm invoice ownership | OQ-002 | |
| 7.2 | Write `policy.requirements.md` | Three-artifact rule | |
| 7.3 | Analyse Movement.jsx | OQ-012 | |
| 7.4 | Build `policy.ts` domain logic | | |
| 7.5 | Migrate policy view and section pages | | |
| 7.6 | Rebuild endorsement workflow | | |
| 7.7 | Wire `policy.bound` event | Enable finance workflow | |

---

## Phase 8: Remaining Domains

The following domains follow the same pattern — requirements → tests → code:

| Domain | Phase |
|--------|-------|
| `binding-authorities` | 8a |
| `claims` | 8b |
| `parties` | 8c |
| `finance` | 8d |
| `reporting` | 8e |
| `settings` | 8f |

Each requires its own checkpoint before proceeding to the next.

---

## Phase 9: Full System Validation

**Goal:** Verify the entire system works correctly with multi-tenant enforcement.

### Steps

- 9.1 Run full test suite
- 9.2 Run Playwright E2E tests for core workflows (submission → quote → policy)
- 9.3 Verify tenant isolation (test with two different org codes — neither can see the other's data)
- 9.4 Verify permission enforcement (test each role can only perform its allowed actions)
- 9.5 Verify all colour tokens are correct (no hardcoded hex in JSX)
- 9.6 Generate traceability report (`tools/generate-test-report.js` equivalent)

**Phase 9 Checkpoint (Final):**
- [ ] All tests pass
- [ ] All E2E workflows pass
- [ ] Tenant isolation is verified
- [ ] Permission enforcement is verified
- [ ] No hardcoded hex violations remain
- [ ] Traceability matrix is complete

---

## Migration Plan Summary

| Phase | Focus | Prerequisite |
|-------|-------|-------------|
| 0 | Analysis and documentation | None — CURRENT |
| 1 | Shared services foundation | Phase 0 confirmed |
| 2 | Auth and application shell | Phase 1 |
| 3 | Homepage dashboard | Phase 2 |
| 4 | UI primitives | Phase 1 |
| 5 | Submissions domain | Phases 1, 2, 4 |
| 6 | Quotes domain | Phase 5 |
| 7 | Policies domain | Phase 6 |
| 8 | Remaining domains | Phase 7 |
| 9 | Full system validation | Phase 8 |
