# AI GUIDELINES — SECTION 6: TESTING STANDARDS

This document defines where tests live, how they are named, which configuration runs them, and when to create new files versus extending existing ones.  Follow these rules strictly to keep the test suite cohesive.

> **Note:** This is the updated testing standard for the new `Cleaned` architecture.  It supersedes the legacy testing standard from `policy-forge-chat (BackUp)/AI Guidelines/06-Testing-Standards.md`.  The core principles are preserved and the file locations, conventions, and folder references have been updated to match the new folder structure.

---

## 6.1  Guiding Principles

1. **Three Mandatory Test Layers** — Every feature that touches a database or backend endpoint MUST have tests at all three layers before it is considered done:
   - **Layer 1 — Frontend unit tests** (Jest + React Testing Library): prove the UI handles data correctly. These mock the api-client. They are fast and numerous.
   - **Layer 2 — Backend integration tests** (Supertest + real test DB): prove routes return correct HTTP status and response shapes against a real database. These are REQUIRED, not optional. A feature whose backend has not been tested against a real DB is not done.
   - **Layer 3 — E2E smoke tests** (Playwright): prove the critical user flows work end-to-end in a browser with a real backend. Required for auth, core workflows (submission → quote → policy), and every new feature that changes a critical path.
2. **Frontend tests passing does NOT mean the feature works.** Frontend tests mock the API. They can pass even when every backend endpoint returns 500. They certify UI behaviour only. Never treat a green frontend test run as production readiness evidence.
3. **Test Behaviour, Not Implementation** — Assert on user-visible outcomes and domain rules, not internal implementation details.
4. **Arrange → Act → Assert** — Every test follows this structure without exception.
5. **Tests Are Production Code** — Same quality bar as the features they cover.
6. **Requirements First** — No test may be written without a corresponding requirements file.  See `03-Three-Artifact-Rule.md`.
7. **One test file per unit** — Each domain, workflow, shared service, and component has exactly one test file at its level.
8. **No soft-failure tests** — A test that accepts an error status as a valid outcome (`expect([200, 500]).toContain(res.status)`) is NOT a test. It is a known-bug acknowledgment. Known bugs must be tracked in the risk register and the endpoint test must be a hard `expect(200)` that fails until the bug is fixed. Using `.skip` is permitted only when a feature is explicitly deferred and the deferral is documented; skipping must not be used to hide a broken implementation.
9. **Stub-to-functional promotion is a replacement, not an addition** — When a previously stubbed pane, page section, or widget becomes functional, the same change must remove or rewrite the placeholder assertions. Do not leave legacy “coming soon” tests in place beside the new behaviour tests.
10. **Requirement-driven UI contracts need positive and negative assertions** — When requirements define a visible control set such as sidebar actions, tab labels, buttons, menu items, or field availability, the tests must assert both the items that should exist and the items that must not exist.

---

## 6.2  Test File Locations

```
frontend/src/
  [domain-name]/
    [domain].service.ts              ← domain business logic
    __tests__/
      [domain].service.test.ts       ← Domain service unit tests
      [PageName].test.tsx            ← Page component behaviour tests

  shared/
    lib/
      [service-name]/
        [service].test.ts            ← Shared service tests (framework-agnostic TS utilities)
    components/
      [ComponentName]/
        __tests__/
          test.tsx                   ← Reusable UI primitive tests

  home/
    __tests__/
      home.test.tsx                  ← Home page integration tests

  __tests__/
    codebase-scan.test.js            ← Frontend architectural scan (patterns, no hex, no cross-domain)

backend/
  __tests__/
    schema-validation.test.js   ← Layer 2: DB schema — verifies every table and column referenced
                                     in route handlers exists in the live database. MUST pass before deploy.
    api-smoke.test.js            ← Layer 2: Smoke — every registered route returns a non-500 HTTP
                                     status when called with a valid auth token. MUST pass before deploy.
    requirements/
      S[NN]-[topic].test.js      ← Layer 2: Requirements regression tests per backend feature section

backend/nest/src/
  [module-name]/
    [module].spec.ts             ← NestJS unit tests using `TestingModule` — mock `DatabaseService`,
                                     test service business logic in isolation. Follow `*.spec.ts` naming
                                     so `nest test` picks them up via `jest.scan.config.js`.

playwright/
  auth.spec.js                  ← Layer 3: E2E login / logout
  submission-flow.spec.js        ← Layer 3: E2E submission → quote → policy
  [critical-flow].spec.js        ← Layer 3: One spec per critical user path
```

> **ENFORCEMENT:** `npm run test:all` must run all three layers in sequence. CI is not green unless all three layers pass. The frontend layer passing alone does not satisfy CI.

---

## 6.3  Test Naming and Traceability

### Test ID Convention

Every requirements-linked test uses the format:

```
T-[domain]-[feature]-R[requirement-number]
```

Examples:
- `T-submissions-assignment-R01` — Submissions domain, assignment feature, requirement 01
- `T-quotes-sections-R03` — Quotes domain, sections feature, requirement 03
- `T-lib-permissions-R02` — `lib/permissions` service, requirement 02

### `describe` / `it` naming

```ts
describe('Submissions Domain — Workflow Assignment', () => {
  it('T-submissions-assignment-R01: assigns submission to an underwriter by manager', () => { ... });
  it('T-submissions-assignment-R02: prevents assignment by non-manager role', () => { ... });
});
```

Non-requirements tests (code scans, utility units) use plain descriptive names:

```ts
describe('safeJson()', () => {
  it('resolves to JSON on a 200 response', () => { ... });
});
```

**Files exempt from the `T-` naming convention** (plain `it()`/`test()` names are acceptable):

| File | Reason |
|------|--------|
| `frontend/src/__tests__/codebase-scan.test.js` | Architectural scan — no requirements, tests patterns not features |
| `frontend/src/shared/lib/api-client/api-client.test.ts` | Low-level HTTP utility — tests transport mechanics, not business requirements |
| `frontend/src/shared/lib/auth-session/auth-session.test.ts` | Storage utility — tests localStorage mechanics |
| `frontend/src/shared/lib/formatters/formatters.test.ts` | Pure formatting functions — no business requirements |
| `frontend/src/shared/lib/design-tokens/design-tokens.test.ts` | Token shape assertions — structural, not behavioural |
| `frontend/src/shared/lib/logger/logger.test.ts` | Environment gating utility |
| `frontend/src/shared/lib/notifications/notifications.test.ts` | API wrapper — tests HTTP call structure |
| `frontend/src/shared/lib/permissions/permissions.test.ts` | Permission matrix assertions — uses plain names because the matrix itself is the spec |
| Stub page tests (`binding-authorities.test.tsx`, `finance.test.tsx`, etc.) | Placeholder tests for not-yet-built pages — single render assertion, no traceable requirement yet |
| `frontend/src/shell/NotificationDock.test.tsx` | Dock behaviour tests written before requirements were formalised — will migrate to `T-` naming when the requirements file is completed |

All new test files written against agreed requirements **must** use the `T-` naming convention.

---

## 6.4  When to Create a New Test File vs. Extend an Existing One

**Create a new file when:**

- Adding a new domain, workflow, shared service, or component (each gets one test file)
- Adding a new backend requirements section (`S[NN]-[topic].test.js`)

**Add to an existing file when:**

- Adding a new requirement within an existing domain or service
- Extending a codebase scan with a new pattern check
- Adding a new workflow step to an existing workflow test
- Adding a new widget, sub-component, or child component test to a page-level test file (see Page-Level Aggregated Tests below)

**Page-Level Aggregated Tests (permitted pattern):**

A page-level test file (e.g. `home.test.tsx`) may cover the page component and all of its direct child widgets/sub-components in a single file, organised with one `describe` block per child.  This is the approved pattern when:

- The child components only make sense in the context of the page (they are not reused elsewhere)
- The page test file is the authoritative test location for those children
- Each child's tests are still traceable to requirements via the `T-` naming convention

```
// home.test.tsx — one file covering the whole page
describe('HomeDashboard', () => { ... })        // T-HOME-DASHBOARD-R*
describe('KpiWidget', () => { ... })            // T-HOME-KPI-R*
describe('RecentActivityWidget', () => { ... }) // T-HOME-RECENT-R*
```

Do **not** create separate `KpiWidget.test.tsx`, `RecentActivityWidget.test.tsx`, etc. when those components are already fully covered by the page test file.  That would be duplication.

**Never:**

- Create one-off throwaway test files — ad-hoc scripts must not be committed
- Duplicate scan logic across files — extend the existing scan test instead
- Write a test without a corresponding requirements entry
- Keep placeholder render tests after the feature is no longer a placeholder — replace them in the same change with assertions for the real controls, empty states, and failure states.
- Stop at presence-only assertions for a requirement-defined control surface — the same test area must also prove forbidden or retired controls are absent.

---

## 6.4A  Promoting a Stub to a Real Feature

When a previously deferred UI surface becomes active, the required test update is:

1. Remove or rewrite the old placeholder test block in the existing test file.
2. Add assertions that prove the placeholder copy is gone.
3. Add assertions for the first real interactive path, plus the empty state and error state if the pane fetches data.

Minimum regression rule:

```ts
expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
```

If the feature remains partially deferred, the test must distinguish the still-deferred parts explicitly rather than leaving a generic placeholder assertion behind.

---

## 6.4B  Expected And Forbidden Item Coverage

For any requirement that defines a fixed visible control set, tests must include both:

1. Expected-item assertions — controls that must be present.
2. Forbidden-item assertions — controls that must be absent because they are retired, out of scope, locked by state, or not permitted on that page.

Examples that require this rule:

- Sidebar sections for record pages
- Tab strips and pane labels
- Status-dependent action menus
- Create menus and contextual sub-items
- Locked vs editable field sets

Minimum pattern:

```ts
expect(labels).toContain('Save')
expect(labels).toContain('Decline Quote')
expect(labels).not.toContain('All Quotes')
expect(labels).not.toContain('Bind Quote')
```

If the requirement changes, the forbidden-item assertions must be updated in the same change so the old contract cannot regress silently.

---

## 6.5  Jest Configuration Rules

The new architecture will use a clean set of Jest configurations.  A new Jest setup must be designed as part of the architecture approval phase.

Key constraints carried forward from the legacy project:

- Use `testRegex` instead of `testMatch` if the workspace path contains parentheses.  This was a known bug fix in the legacy project and must be preserved.
- Never add more Jest configs than are needed.  Start with the minimum and add only when a genuinely different test environment is required.
- All configs must be documented with their purpose, environment, and run command.

> **Open Question OQ-010:** How many Jest configs does the new Cleaned architecture need?  Recommend: one for frontend unit/component tests, one for backend integration tests, one for requirements regression.  Confirm before creating.

---

## 6.6  Testing Patterns

### Domain logic unit test

```ts
// frontend/src/submissions/__tests__/submissions.service.test.ts
import { assignSubmission } from '../submissions.service';

describe('Submissions — Assignment', () => {
  it('T-submissions-assignment-R01: assigns to underwriter when role is manager', () => {
    const result = assignSubmission({ submissionId: '1', assignTo: 'user-2', callerRole: 'manager' });
    expect(result.assignedTo).toBe('user-2');
  });

  it('T-submissions-assignment-R02: throws when caller is not a manager', () => {
    expect(() =>
      assignSubmission({ submissionId: '1', assignTo: 'user-2', callerRole: 'underwriter' })
    ).toThrow('Insufficient permissions');
  });
});
```

### Component behaviour test

```tsx
// components/SectionGrid/test.tsx
import { render, screen } from '@testing-library/react';
import { SectionGrid } from './component';

describe('SectionGrid Component', () => {
  it('renders all sections passed as props', () => {
    const sections = [{ id: '1', name: 'Property' }, { id: '2', name: 'Marine' }];
    render(<SectionGrid sections={sections} />);
    expect(screen.getByText('Property')).toBeInTheDocument();
    expect(screen.getByText('Marine')).toBeInTheDocument();
  });
});
```

### Backend API integration test

```js
// backend/__tests__/requirements/S05-submissions.test.js
const request = require('supertest')
const app = require('../server')

// REQUIRED: Hard assertion on status 200
// Do NOT use expect([200, 500]).toContain(res.status) — that masks known bugs
it('T-05-03-R01: GET /api/my-work-items returns 200 with valid auth', async () => {
  const res = await request(app)
    .get('/api/my-work-items')
    .set('Authorization', `Bearer ${validToken}`)
  expect(res.status).toBe(200)             // Hard failure — 500 is never acceptable
  expect(Array.isArray(res.body)).toBe(true)
})

// REQUIRED: For every SQL route, verify referenced columns exist in DB
it('T-05-03-R02: submission table has the workflow_assigned_to column', async () => {
  const { rows } = await db.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'submission' AND column_name = 'workflow_assigned_to'
  `)
  expect(rows.length).toBe(1)   // Fails immediately if the migration was never run
})
```

---

## 6.7  API Contract Alignment Rule

**Frontend mock shapes must reflect the real backend response.**

When writing a frontend component test that mocks `api-client.get()` or `api-client.post()`, the mock return value must match the shape the backend actually returns — not an assumed or invented shape.

Before writing the mock, one of the following must be true:

1. The API contract for that endpoint has been defined and approved (see `09-Full-Stack-Development.md §3`), **or**
2. The endpoint already exists and has been manually verified (e.g. `Invoke-RestMethod` or `curl`)

**If the real endpoint does not exist yet**, the mock must reflect the agreed contract shape, and an open question must be logged until it is verified against the real implementation.

This rule exists because mocking an invented response shape produces tests that pass in CI but break in the browser — the worst kind of false confidence.

### Contract alignment test (required for every widget or page)

For every component that calls the API, the test file must include a comment block at the top of the mock section stating the verified source:

```ts
// API CONTRACT: GET /api/submissions
// Verified against: real backend (2026-03-06)
// Response shape: raw array of Submission objects — no .data wrapper
jest.mock('@/shared/lib/api-client/api-client', () => ({
  get: jest.fn().mockResolvedValue([{ id: 1, reference: 'SUB-001', ... }])
}))
```

If the endpoint is not yet built, use:

```ts
// API CONTRACT: GET /api/tasks
// Status: endpoint not yet implemented — mock reflects agreed contract shape
// Contract defined in: (link to requirements or contract doc)
```

---

## 6.8  Codebase Scan Tests

Scan tests enforce architectural rules across the whole codebase.  They are the automated equivalent of a code review.

Scan tests must verify:

| Pattern | Rule enforced |
|---------|--------------|
| No hardcoded `localhost:XXXX` URLs anywhere | API URLs must use the centralised `apiUrl()` helper |
| No `#RRGGBB` hex literals in `.jsx` or `.js` outside `brandColors.js` | Brand colour rule 1 |
| No hardcoded hex in `.css` outside `global.css :root` | Brand colour rule 2 |
| No cross-domain imports | Architectural boundary rule |
| No domain imports inside shared services | Shared service boundary rule |
| No `res.data.` access in widget/page files | Backend returns flat objects — no wrapper |
| No `expect([200, 4xx, 5xx]).toContain` in backend tests | Soft-masking known bugs is forbidden |
| Every API mock in FE tests must have an `// API CONTRACT:` comment | Contract alignment rule |

**Backend scan — SQL column safety (run as part of `npm run test:scan`)**

The backend column scan (`backend/__tests__/schema-validation.test.js`) must:
1. Parse every SQL query in `server.js` and extract `table_alias.column_name` references
2. Query the live database `information_schema.columns` for each extracted column
3. Assert that every column exists — a missing column is a hard test failure, not a warning
4. Cover every route that was added or modified in the current change set

This is the only automated check that catches the class of bug where a server.js route references a database column that has never been created (e.g., `s.workflow_assigned_to`).

---

## 6.10  Rules for AI Agents

1. **Never create a throwaway test.** Every test must be committed and maintained.
2. **Never write a test without a requirements entry.** Trace every test to a requirement.
3. **Use `testRegex` not `testMatch`** if the workspace path contains parentheses.
4. **Add new scan patterns to existing scan files** rather than creating new ones.
5. **Run the full scan test suite** after any change to fetch handling, API patterns, or colour tokens.
6. **Do not create a new Jest config** without architecture approval.
7. **Never write a backend test that accepts an error status as a valid pass.** `expect([200, 500]).toContain(res.status)` is forbidden. Use `expect(res.status).toBe(200)`. If a bug prevents 200, the test must fail and the bug must be fixed before the test is committed.
8. **After any backend route change, run Layer 2 tests** (`npm run test:backend`) before running Layer 1 tests. Frontend tests passing without backend verification is false confidence.
9. **When retesting a feature end-to-end**, "end-to-end" means all three layers: `npm run test:all`. It does not mean re-running frontend mocks only.
10. **When unblocking CI, document the right thing at the right level.** Always append the session to `docs/AI Guidelines/conversation-log.md`. Update deployment/runbook/CI notes in the same change only when the CI unblock changes operator steps, CI policy, release flow, environment rules, required checks, or reveals an enforced rule that is not yet documented clearly enough. Purely corrective fixes that only restore compliance with already-documented rules do not require runbook changes by default.

---

## 6.11  Production Readiness Gate

Code in the `Cleaned/` folder is production code. A feature or fix is **not ready to deploy** unless all of the following are true:

| Check | Command | Must pass |
|-------|---------|-----------|
| Frontend unit tests | `npm run test` | 100% — zero failures |
| Frontend codebase scan | `npm run test:scan` | 100% — zero violations |
| Backend schema validation | `npm run test:backend -- schema-validation` | 100% — every referenced column exists |
| Backend API smoke tests | `npm run test:backend -- api-smoke` | 100% — every route returns non-500 |
| Backend requirements tests | `npm run test:backend` | 100% — no skipped tests on committed features |
| E2E smoke tests | `npm run test:e2e` | All critical-path specs pass |

**"Done" definition:** A feature is done when every row above is green. A feature where frontend tests pass but backend tests do not exist yet is **not done** — it is a frontend stub waiting for a backend.

**What this means in practice:**
- You cannot close a task by showing `npm test` output alone
- Every task that touches the backend (new route, changed query, new DB column) requires Layer 2 evidence
- DB migrations must be run and the schema validation test must pass after the migration before any code is committed that depends on the new columns
- Silent failures (widget renders but shows no data) are production bugs, not acceptable states

---

## 6.12  Why Frontend-Only Tests Cannot Catch DB Bugs

This is a documented anti-pattern in this project. The following test passes with 100% confidence even when `/api/my-work-items` returns HTTP 500:

```tsx
// This test is USELESS for detecting DB bugs
jest.mock('@/shared/lib/api-client/api-client', () => ({ get: jest.fn() }))
;(apiGet as jest.Mock).mockResolvedValue(MOCK_TASKS)
// ^ The component never calls the real backend. The test passes whether or not
// the s.workflow_assigned_to column exists.
```

The ONLY tests that can detect a broken SQL column reference are:
1. **Layer 2 backend integration test** — calls the real endpoint against a real DB, asserts `status === 200`
2. **Layer 3 E2E test** — renders the widget in a real browser against a real backend

Neither existed for `/api/my-work-items` when the `workflow_assigned_to` column bug was introduced. Adding them is the fix. Relying on frontend tests alone is not.

---

## 6.9  E2E Tests (Playwright)

E2E tests cover critical user flows end-to-end. They are the only layer that proves the complete stack (browser → frontend → backend → database) works together. They are **not optional** for core flows.

**Required E2E specs (must exist before first production deploy):**

| Spec | What it covers |
|------|----------------|
| `auth.spec.js` | Login success, login failure, session persistence, logout |
| `submission-flow.spec.js` | Create submission → create quote → bind → view policy |
| `dashboard.spec.js` | Dashboard loads, all widgets render data (no "unable to load" errors) |
| `permissions.spec.js` | Role-based access: underwriter cannot access admin pages |

**Required for every new feature added to a critical path:**
- Add a spec (or extend an existing spec) before the PR is merged
- The spec must assert that data persists after page reload (proves DB write worked)
- The spec must assert the correct HTTP response appears (not a silent empty state)

**E2E environment:**
- Must run against a seeded test database — not the dev database
- Tests must be independent and idempotent (each test resets its own state)
- Reports in `playwright-report/`
- Config: `playwright.config.js` at the project root

**E2E and the DB bug class:**
Running `npm run test:e2e` with a real backend is the final validation that a backend route works. If a widget shows "unable to load" in an E2E test, that is a test failure. Silent empty states (widget loads but shows no data) must also cause the test to fail — not just error states.
