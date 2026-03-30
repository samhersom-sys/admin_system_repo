# AI GUIDELINES — SECTION 3: REQUIREMENTS → TESTS → CODE FLOW

This document defines how every feature, fix, or component must progress from a requirement to working, tested code.  No stage may be skipped.

---

## 3.1  Why This Order Matters

Writing code before requirements exist means:
- Nobody agreed what the code should do
- Tests become reverse-engineered descriptions of the code, not the behaviour
- Bugs are hidden because the wrong behaviour is "tested"
- Changes are high-risk because there is no specification to validate against

Writing tests before code means:
- The desired behaviour is locked down first
- The code's only job is to make the tests pass
- Refactoring is safe because tests catch regressions

This is standard test-driven development (TDD) discipline applied at the feature level.

---

## 3.2  Stage 1 — Requirements

### What Is a Requirements File?

A requirements file is a plain-English specification of what a feature or component must do.  
It is not a design document, not a user story, and not a comment block.  
It is the single agreed statement of what the system must do.

### Where Requirements Live

Every domain module, workflow module, shared service, and component has its own requirements file:

```
frontend/src/quotes/quotes.requirements.md
frontend/src/workflow/workflow.requirements.md
frontend/src/shared/lib/permissions/permissions.requirements.md
frontend/src/shared/components/SectionGrid/requirements.md
frontend/src/home/home.requirements.md
```

### Requirements File Format

```markdown
# [Feature Name] — Requirements

## Purpose
[One paragraph describing what this thing does and why it exists.]

## Scope
[What is included and what is deliberately excluded.]

## Requirements

### R01 — [Short name]
[Clear, testable statement of what must happen.]
Acceptance criteria:
- [Criterion 1]
- [Criterion 2]

### R02 — [Short name]
...

## Open Questions
- [Any unresolved questions affecting these requirements]

## Dependencies
- [Other domains, services, or components this depends on]
```

### Acceptance Criteria Rules

Each requirement must have at least one acceptance criterion.  
Criteria must be:
- Specific (not vague like "works correctly")
- Testable (can be verified by a test)
- Unambiguous (only one interpretation)

### Authoritative Rewrite Rule

When a change alters a page contract, sidebar contract, tab set, workflow step, or any other user-visible control surface, the affected requirement section must be rewritten as the authoritative current-state contract.

Rules:
- Do not rely on a short delta note when the behavioural contract has changed.
- Remove or replace obsolete allowed items, labels, actions, and exclusions in the same edit.
- If a domain requirements file governs a page in that domain, that file is presumed authoritative for the page unless scope explicitly says otherwise.
- Adding a user-visible control that is not explicitly allowed by the current requirements is a guideline violation, even if it seems harmless.

This rule exists to prevent stale requirements from silently coexisting with newer UI code.

---

## 3.3  Stage 2 — Tests

Tests must be written **after requirements are agreed** and **before code is written**.

### Test File Naming

| Location | File name |
|----------|-----------|
| Domain | `frontend/src/quotes/__tests__/quotes.test.ts` |
| Workflow | `frontend/src/workflow/__tests__/workflow.test.ts` |
| Shared service | `frontend/src/shared/lib/permissions/permissions.test.ts` |
| Component | `frontend/src/shared/components/SectionGrid/__tests__/test.tsx` |
| Home page | `frontend/src/home/__tests__/home.test.tsx` |

### Test-to-Requirement Traceability

Every test must be traceable to a requirement.  
Use the naming convention:

```
T-[domain]-[feature]-R[requirement-number]
```

Example:
```ts
describe('Submissions Domain — Workflow Assignment', () => {
  it('T-submissions-assignment-R01: assigns submission to an underwriter', () => { ... });
});
```

### What to Test

| Test type | What it verifies |
|-----------|-----------------|
| Unit test | A single function or pure logic |
| Integration test | Interaction between components or services |
| Domain test | Business rules within a domain |
| Workflow test | Orchestration logic across domains |
| Component test | UI renders correctly and handles user interactions |

### Tests Must Not

- Import from other domains
- Test implementation details (test behaviour, not internals)
- Be written without a corresponding requirement
- Be skipped without documenting why

---

## 3.4  Stage 3 — Code

Code is written only after:

1. The requirements file is complete and agreed
2. The tests are written and failing (red)
3. The code is then written to make the tests pass (green)
4. The code is refactored while keeping tests green (refactor)

### Code Must

- Satisfy every acceptance criterion in its requirements file
- Pass all tests
- Respect all architectural boundaries
- Use agreed naming conventions
- Be placed in the correct folder according to the architecture

### Code Must Not

- Contain undocumented business logic
- Cross domain boundaries
- Import from another domain directly
- Contain untested behaviour
- Contain hardcoded configuration values

---

## 3.5  AI Enforcement Rules

The AI will:

1. Refuse to write code if a requirements file does not exist
2. Refuse to write code if tests have not been written
3. Flag any test that cannot be traced to a requirement
4. Flag any requirement that cannot be expressed as a test
5. Flag any code that violates an architectural boundary
6. Flag any user-visible action, label, or sidebar item that is present in code but not explicitly allowed by the active requirements
7. Flag any requirements update that leaves superseded UI contract items in place after the implementation changed

These are not warnings.  They are hard stops.

---

## 3.6  Page Layout Proof (Mandatory for Page-Level Components)

Before writing any requirement for a Page component (any file ending in `Page.tsx`), the AI **must**:

1. Read the corresponding BackUp source file and locate its `return (...)` block.
2. Extract the top-level structural diagram of what is rendered **unconditionally** vs what is gated by a tab, state, or condition.
3. Record this in the requirements file under a **`## Page Layout`** section using an ASCII diagram. Example:

```
## Page Layout (from BackUp: QuoteViewPage.jsx)
┌────────────────────────────────────┐
│  Banner (locked / dirty messages)  │  ← unconditional
│  Form columns (all field groups)   │  ← unconditional
├────────────────────────────────────┤
│  TabsNav: Sections | Broker | …    │  ← unconditional
├────────────────────────────────────┤
│  Active tab content                │  ← conditional on activeTab
└────────────────────────────────────┘
```

4. The requirement that introduces `TabsNav` **must explicitly list** every element rendered outside the tab system (i.e. unconditionally).
5. The AI must ask for confirmation if the BackUp structure is ambiguous or if the Cleaned equivalent differs for a clear reason.

**This step is mandatory. Skipping it is a guideline violation.**

The violation that prompted this rule: `QuoteViewPage` — the AI placed the entire form inside a "Details" tab, which was never requested and contradicted the BackUp structure where the form is always visible above the tab strip.

---

## 3.7  Exceptions

The only exceptions to the three-artifact rule are:

| Situation | Allowed shortcut |
|-----------|-----------------|
| Pure structural change (renaming, moving files) | Code only — no logic change |
| Copy-paste migration with zero logic change | Code only — mark as "migration, no logic change" |
| Fixing a typo in a string constant | Code only — no requirements needed |

All other work follows Requirements → Tests → Code without exception.

---

## 3.7  Mandatory Completion Checklist

A feature is **not done** until every item below is confirmed in the same session:

| # | Check | Command |
|---|-------|---------|
| 1 | All Jest tests pass with zero failures | `npx jest --no-coverage` |
| 2 | Vite build produces zero errors and zero warnings | `npx vite build` |
| 3 | The browser renders the affected pages without a blank screen | Open the dev server and visually check |

**Why `npx vite build` is mandatory:** Jest passes even when import paths are wrong or CSS is broken, because Jest mocks the module resolver (`jsdom` never parses real CSS).  A clean build is the only mechanical check that catches path-typos, missing files, and CSS at-rule ordering issues before they reach a user.

**Why a visual browser check is mandatory:** A clean build does not guarantee visible output.  CSS custom property issues (wrong `@import` path, wrong `@import` order) produce a zero-error build but a blank or invisible page.  The check takes < 10 seconds and eliminates an entire class of silent failures.

### Root Error Boundary
`frontend/src/main.jsx` must always wrap the router in `<ErrorBoundary>` from `@/shared/components/ErrorBoundary/component`.  Without it, any React render error produces a completely blank page with no visible message.  The error boundary ensures a crash surfaces a readable red alert instead of silence.
