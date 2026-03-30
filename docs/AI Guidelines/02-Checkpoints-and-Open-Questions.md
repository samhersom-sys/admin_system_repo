# AI GUIDELINES — SECTION 2: CHECKPOINTS AND OPEN QUESTIONS

This document explains how checkpoints work, when they are triggered, and how open questions are tracked and resolved.

---

## 2.1  What Is a Checkpoint?

A checkpoint is a deliberate pause in the work where the AI asks for human confirmation before continuing.

Checkpoints exist because:

- Early assumptions can be wrong
- Architectural decisions are hard to reverse later
- Domain boundaries are easy to blur under pressure
- Missing rules must be found, not invented
- The team must stay aligned throughout the transition

---

## 2.2  When Checkpoints Are Triggered

A checkpoint is automatically triggered after:

| Trigger | Example |
|---------|---------|
| Completing a full legacy analysis section | "I have finished mapping the Submissions domain." |
| Proposing a domain boundary | "I believe Clearance belongs inside the Submissions domain, not its own domain." |
| Proposing a workflow classification | "I believe the Broker-Led Submission flow is a workflow, not a domain." |
| Encountering a contradiction | "The legacy code treats Notifications as a context, but the new architecture places it in Shared Services." |
| Before creating any new file | "I am about to create the first domain file.  Please confirm." |
| Before migrating any legacy file | "I am about to propose a migration for SubmissionsContext.js.  Please confirm my mapping." |
| Before any bulk file operation (3+ files renamed, moved, or deleted) | "I am about to rename 24 files from `.jsx` to `.tsx`.  Here are my assumptions and exceptions — shall I proceed?" |
| Completing any documentation section | "I have finished the homepage rebuild plan.  Please review before I continue." |
| After changing any guideline file | Confirm no existing code violates the new rule — list any violations found, or confirm none. |
| After making any file change | Confirm plain English explanation was given before the change was made (§1.9). |

---

## 2.3  Checkpoint Format

Every checkpoint must follow this format:

```
CHECKPOINT — [Section Name]

Summary of what has been completed:
- [List of completed items]

Findings / interpretations:
- [List of key decisions made]

Assumptions made:
- [List of assumptions]

Open questions (if any):
- [List of unanswered questions]

---
Please confirm:
1. Is this interpretation correct?
2. Should [X] belong to this domain / workflow / service?
3. Are there any corrections before I continue?

I will not proceed until confirmed.
```

---

## 2.4  Open Questions Log

Every question that cannot be resolved with confidence is an open question.  
Open questions must not be guessed or assumed away.

### Where They Live

```
Technical Documentation/08-Open-Questions.md
```

### Format for Each Entry

```markdown
## OQ-[NUMBER]: [Short title]

- **Raised:** [Date]
- **Status:** Open / Answered / Deferred
- **Context:** [Why this question arose]
- **Question:** [The exact question that needs answering]
- **Why it matters:** [Impact on architecture / migration / behaviour]
- **Dependencies:** [What is blocked until this is answered]
- **Answer (when resolved):** [Fill in when answered]
```

### Example

```markdown
## OQ-001: Should Clearance be its own domain or part of Submissions?

- **Raised:** 2026-03-05
- **Status:** Open
- **Context:** Legacy code handles clearance inside WorkflowPage.jsx alongside submission assignment.
- **Question:** Is Clearance checking a sub-feature of the Submissions domain, or does it warrant its own vertical slice?
- **Why it matters:** Determines whether Clearance logic is co-located with Submissions or isolated separately.
- **Dependencies:** Blocks domain boundary decisions and the migration plan for WorkflowPage.
- **Answer:** [Pending]
```

---

## 2.5  Guideline Update Protocol

When any AI Guideline is updated — whether a rule is added, changed, or removed — the following steps are **mandatory** before the update is considered complete.

### Step 1 — Identify affected code

State explicitly which files, patterns, or rules are affected by the change.  Do not assume only new files are affected.  Existing files written before the update may not comply.

### Step 2 — Add a scan test (if the rule can be automated)

If the new or changed rule can be checked programmatically:
- Add a new `describe` block to `frontend/src/__tests__/codebase-scan.test.js`
- The test must scan all relevant files and fail with a clear message if any file violates the rule
- The new test must be added **in the same update** as the guideline change — never after

### Step 3 — Run the scan against all existing code

```
npm run test:scan
```

All existing files must pass before the guideline update is considered complete.  If failures are found, fix the non-compliant files and re-run.

### Step 4 — Manual review (for rules that cannot be automated)

Some rules cannot be checked by a scan (e.g. "the API contract must be agreed before writing code").  For these:
- Identify which existing files were built without the rule in place
- Review them manually and document any gaps as open questions or tech debt
- Record the review date and outcome in the affected file as a comment

### Step 5 — Confirm completion

The guideline update is complete when:
- [ ] The scan test covers the new rule (or manual review is documented)
- [ ] `npm run test:scan` passes with no failures
- [ ] Any non-compliant files have been fixed or logged as tracked tech debt

### Summary table — What to do when a guideline changes

| Type of change | Action required |
|---|---|
| New automated rule | Add scan test + run scan + fix violations |
| Changed automated rule | Update scan test + run scan + fix violations |
| Removed automated rule | Remove scan test block |
| New process rule (not automatable) | Manual review of existing code + document findings |
| Clarification only (no rule change) | No scan required |

---

## 2.6  How Open Questions Are Resolved

1. The AI raises the question and adds it to `08-Open-Questions.md`
2. The team reviews and provides an answer
3. The AI updates the status and fills in the answer
4. The AI continues only after the question is answered (unless it is explicitly deferred)

Questions can be **deferred** when:
- They do not block immediate progress
- The team agrees to revisit them in a later phase
- A temporary assumption is acceptable and documented

Deferred questions must still be tracked and revisited.

---

## 2.6  Risk Register Relation

Some open questions carry risk if left unresolved.  
High-risk open questions must also be entered in the Risk Register:

```
Technical Documentation/09-Risk-Register.md
```

The AI must flag when an open question also represents a risk.

---

## 2.7  Definition of Done

A task, fix, or feature is **done** when ALL of the following are true. The AI must NOT mark a task complete, close a checkpoint, or move to the next feature until every applicable row is checked.

| Layer | Evidence required | Command |
|-------|-------------------|---------|
| Frontend unit | Zero test failures | `npm test` |
| Frontend scan | Zero scan violations | `npm run test:scan` |
| Backend schema | Every referenced DB column confirmed present | `npm run test:backend -- schema-validation` |
| Backend smoke | Every route returns non-500 | `npm run test:backend -- api-smoke` |
| Backend requirements | Zero failures, zero skips on committed features | `npm run test:backend` |
| E2E smoke | Critical path spec passes | `npm run test:e2e` |
| Runtime validation | Every widget renders real data (not mock, not empty) when run against the live backend | Manual / E2E |

**"npm test passed" is not done.** It is evidence that the UI handles mock data correctly. It says nothing about the backend.

**Layers that are not yet applicable** (e.g. backend test infrastructure not yet set up) must be logged as a tracked open question with a deadline, not silently skipped. The risk must be entered in the Risk Register.

### What triggered this rule

In March 2026 the `/api/my-work-items` route had a broken SQL column reference (`s.workflow_assigned_to` does not exist). The frontend tests passed at 100/100 because they never called the real backend. The bug was only discovered by running the app in the browser. This class of bug is prevented entirely by requiring Layer 2 backend test evidence before any task is marked done.
