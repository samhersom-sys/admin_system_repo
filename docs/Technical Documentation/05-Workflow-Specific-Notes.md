# TECHNICAL DOCUMENTATION — 05: WORKFLOW-SPECIFIC MIGRATION NOTES

This document provides migration notes specific to each workflow, focusing on where the workflow logic is currently hidden in the legacy codebase and what must happen to extract and rebuild it.

---

## Workflow: `broker-led-submission` (AI Email Intake)

### Where It Lives in Legacy

- `backend/email-scheduler.js` — monitors the email inbox, calls AI extraction
- `backend/services/` — AI extraction service (to be confirmed — need to read backend/services/)

### Migration Notes

- The email monitoring loop is backend-only and can continue running during the migration
- The AI extraction result creates a submission — this is where the workflow hands off to the `submissions` domain
- The confidence threshold (80% / 50% / below 50%) is currently hardcoded — should become a tenant-configurable setting
- Broker identification from email domain (`@aon.com` → Aon) is a mapping that must live somewhere — the `parties` domain seems the right place for the email-to-party lookup table

> **Open question OQ-006:** Where does the email-to-broker mapping live?  Is it part of the `parties` domain (a property of the party record) or is it workflow configuration?

---

## Workflow: `submission-assignment`

### Where It Lives in Legacy

- `src/layouts/AppLayout/AppLayoutPages/Workflow/WorkflowPage.jsx`

### Migration Notes

- The `WorkflowPage.jsx` handles both viewing the list of submissions AND the assignment action — these are two concerns that must be separated on migration:
  - Viewing the list → `app/pages/workflow/WorkflowPage.tsx` (read concern)
  - The assignment action → `PATCH /api/submissions/:id/assign` (write/workflow concern)
- **Assignment is orthogonal to submission lifecycle status.**  `assigned_to` is a separate column on the `submissions` table.  There is no status code `WF_ASSIGNED` — this was a legacy conflation.  A submission with status `In Review` may have no one assigned; a submission with status `Outstanding` may have been re-assigned multiple times.
- Assignment auto-creates a task for the new assignee ("Review newly assigned submission").  The task source is `'system'`.
- Authority delegation is a future capability: a user should be able to delegate their assignment authority to another user during an absence.  The delegating user's `assigned_to` entries temporarily route to the delegate.  This is not in scope for the initial build.
- After migration, assignment must check `permissions.can('submission.assign', callerContext)` — only permitted roles may assign submissions to others.
- The page contains 60+ hardcoded Tailwind colour violations (Priority 2 colour debt — do not migrate violations, rewrite with semantic tokens).

> **Open question OQ-027:** Submission routing automation — which routing methods (rules-based, specialism, broker-preferred, load-balanced) are in scope for the initial build?

---

## Workflow: `clearance-checking`

### Where It Lives in Legacy

- `src/layouts/AppLayout/AppLayoutPages/Workflow/ClearanceWorkflowPage.jsx`

### Migration Notes

- **Trigger correction:** Clearance is triggered when a submission reaches **Outstanding** status — *not* "In Review" as was previously noted.  Outstanding is the state where the submission has been fully reviewed and is ready for rating; it is at this point that the clearance check determines whether this risk already sits with a competing broker.
- The clearance page currently exists in the UI but its backend implementation is unclear — needs deeper analysis before requirements are written.
- 59 hardcoded Tailwind colour violations in `ClearanceWorkflowPage.jsx` — do not migrate violations, rewrite with semantic tokens.
- The workflow requires querying submissions, quotes, and policies to find potential duplicates — this is a cross-domain read.  In the new architecture, a workflow-specific API endpoint should handle this; the client must not directly query multiple domain databases.

**Three clearance scenarios (all triggered when submission → Outstanding):**

| Scenario | Description | Outcome |
|---|---|---|
| **Clean** | No matching records found | Clearance passes automatically; no task created |
| **Duplicate** | Risk already exists on this broker's own account (same insured, same period, same class) | Task created to review and merge or close one record |
| **Competing broker** | Risk exists but it was submitted by a *different* broker to the same insurer | Task created; both submissions remain active but are linked; insurer is aware of both brokers |

- **Configurable rules:** The matching criteria (insured name fuzzy match tolerance, inception date window, class of business scope) are tenant-configurable.  Rules live in a `clearance_rules` config table, not hardcoded.
- **Multi-tenant scope:**
  - Marketplace participants: clearance is cross-tenant (competing-broker scenario is possible)
  - Sole-tenant orgs: clearance is scoped within the org only (competing-broker scenario cannot arise)
- Each submission retains its own independent rating record regardless of clearance outcome.  Clearance is identification and warning; it does not block rating.

> **Open question OQ-030:** Who has authority to configure clearance matching rules — org admin only, or also team-level config?
> **Open question OQ-031:** When two competing-broker submissions are linked, does the system enforce rating alignment automatically or only issue a warning?

---

## Workflow: `quote-to-policy`

### Where It Lives in Legacy

- Logic is currently **embedded in pages**, not extracted as a workflow
- Quote acceptance likely happens inside `QuoteViewPage.jsx` via a button click that calls a backend route
- Policy binding likely happens in a backend route (`/api/quotes/:id/accept` or similar)
- No clear workflow file exists

### Migration Notes

- This is one of the most important workflows to define properly — it represents the moment a quote becomes a policy
- The trigger event (`quote.accepted`) must be published correctly for the `policies` domain and `finance` domain to react
- Invoice generation at policy binding is an open question (OQ-002)

---

## Workflow: `policy-endorsement`

### Where It Lives in Legacy

- `PolicyEndorsePage.jsx` and `PolicyEndorsementPage.jsx` appear to be two separate steps
- `src/components/common/Movement.jsx` renders financial movements

### Migration Notes

- The two-step endorsement pages (`endorse` vs `endorsement/edit`) may represent:
  - Step 1: Initiate endorsement (set reason, dates)
  - Step 2: Edit the sections affected
- This must be confirmed before requirements are written
- The endorsement workflow interacts with the `finance` domain if movements generate invoices

---

## Workflow: `data-quality-review`

### Where It Lives in Legacy

- `src/layouts/AppLayout/AppLayoutPages/Workflow/DataQualityPage.jsx` — 62 colour violations
- `src/layouts/AppLayout/AppLayoutPages/Settings/DataQualitySettingsPage.jsx` — configuration

### Migration Notes

- This feature exists as a UI page but its backend implementation and rules are unclear
- Data quality rules are configurable (what constitutes a "quality issue" is defined in settings)

> **Open question OQ-022:** What data quality rules are currently active?  What types of issues does the system detect?  Need to read `DataQualityPage.jsx` and the settings page in detail before defining requirements.

---

## Workflow: `ai-email-intake`

### Where It Lives in Legacy

- `backend/email-scheduler.js`
- `backend/.env.email-example` — email connection config

### Migration Notes

- This workflow is entirely backend — no UI component
- It runs on a schedule and creates submissions autonomously
- The email connection credentials are environment variables — this pattern should be preserved
- AI extraction uses OpenAI API (from `Project Documentation/01-Architectural-Overview.md`)
- The workflow's output (a created submission) must trigger the `submission.created` event in the new architecture

---

## Missing Workflow: My Work Items

The legacy `MyWorkItemsPage.jsx` (`/my-work-items`) shows the current user's personal task list.  This is not currently defined as a formal workflow.

> **Open question OQ-023:** Is "My Work Items" a standalone feature (tasks pushed to the user by workflow events) or is it a user-managed task list?  This determines whether it needs its own workflow definition.
