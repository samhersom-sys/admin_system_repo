# PROJECT DOCUMENTATION — 03: WORKFLOW DEFINITIONS

This document defines each workflow in the new architecture.  Workflows orchestrate behaviour across domains.  They contain orchestration logic only — no domain logic.

---

## How to Read This Document

Each workflow entry includes:

- **Purpose** — What user goal this workflow achieves
- **Triggers** — What starts the workflow (user action, event, schedule)
- **Domains involved** — Which domains the workflow coordinates
- **Steps** — The sequence of actions the workflow orchestrates
- **Events consumed** — Events this workflow listens to
- **Events produced** — Events this workflow emits during orchestration
- **Known legacy code** — Where the matching logic currently lives
- **Open questions** — Unresolved questions about this workflow's scope

---

## Workflow: `broker-led-submission`

**Purpose:** Automate the intake of insurance submissions sent by brokers via email.

**Triggers:** New email arrives in the monitored submission inbox.

**Domains involved:** `submissions`, `parties`

**Steps:**
1. Email received by the email scheduler
2. Broker identity resolved from sender email domain → `parties` domain
3. AI extracts structured data from email content (insured name, premium, dates, class of business)
4. Confidence score assessed
5. If confidence ≥ 80%: create submission automatically → `submissions` domain
6. If confidence 50–79%: create submission flagged for review → `submissions` domain
7. If confidence < 50%: route to pending review queue → `submissions` domain
8. `submission.created` event published
9. Notifications domain notified

**Events consumed:** None (triggered externally by email)

**Events produced:**
- `submission.created` (via `submissions` domain)

**Known legacy code:**
- `backend/email-scheduler.js` — email monitoring
- `backend/services/` — AI extraction service (to be confirmed)
- `src/layouts/AppLayout/AppLayoutPages/Workflow/WorkflowPage.jsx` — assignment UI

**Open questions:**
- OQ-006: Is the AI extraction service a shared service or part of this workflow?
- OQ-007: Where does the confidence threshold configuration live — workflow config or settings domain?

---

## Workflow: `manual-submission`

**Purpose:** Allow a user to create a submission manually through the web interface.

**Triggers:** User navigates to "New Submission" and submits the form.

**Domains involved:** `submissions`, `parties`

**Steps:**
1. User fills in submission form
2. Party records resolved (insured, broker) → `parties` domain
3. Submission record created → `submissions` domain
4. `submission.created` event published

**Events produced:**
- `submission.created`

**Known legacy code:**
- `src/layouts/AppLayout/AppLayoutPages/Submission/SubmissionPage.jsx`

---

## Submission Lifecycle — Status State Machine

A submission's **lifecycle status** is separate from its **assignment** state.  These are two independent tracks on the submission record.

### Lifecycle status transitions

```
Created
  └─► In Review
        ├─► Outstanding          (being reviewed — not yet quoted or declined)
        │     ├─► Submission Declined
        │     └─► Quote Created
        │           ├─► Quote Disbanded   (decided not to proceed with this quote)
        │           │     ├─► Quote Created   (another quote can be created)
        │           │     └─► Submission Declined
        │           └─► Quoted             (quote formally issued to broker)
        │                 ├─► Quote Expired     (validity period elapsed)
        │                 ├─► Quote Withdrawn   (underwriter withdraws the offer)
        │                 ├─► Quote Declined    (broker/client declines the offer)
        │                 └─► Bound            (quote accepted → becomes a policy)
        └─► Submission Declined  (declined before review completes)
```

**"Created"** covers all intake methods: manual form, email intake (AI-extracted), API, or broker-portal submission.

**"Outstanding"** means the submission is sitting in review — clearance is being performed or the underwriter has not yet decided to quote or decline.

**"Quote Validity"** — a quote is valid for a period defined by the company or individual underwriter.  Expiry triggers a task to chase the broker.

### Assignment track (orthogonal to lifecycle status)

Any submission can be:
- **Unassigned** — in the team queue, not yet allocated to a person
- **Assigned to [user]** — a named individual is responsible for the next action

Assignment does not change lifecycle status.  A submission can be `Outstanding` + `Unassigned` (waiting in team queue) or `Outstanding` + `Assigned to Alice`.

Assignment automatically generates a task for the assigned user.  The task type is determined by the current lifecycle status (e.g. if `In Review`, the task is "Review and decide: quote or decline").

**Self-assignment and delegation:**  The user taking an action defaults to being the assignee for the next step but can unassign the record so it returns to the team queue.  This supports underwriting authority delegation — a user who lacks the authority to quote at a certain level unassigns the record after review so a senior underwriter can pick it up.

---

## Workflow: `submission-assignment`

**Purpose:** Route a submission to the correct user or team for the next action.

**Triggers:**
- New submission created (`submission.created`)
- User manually reassigns or unassigns from the workflow queue

**Domains involved:** `submissions`, `tasks`

**Steps:**
1. Submission enters queue (unassigned by default unless routing rules resolve an owner)
2. Assignment made — either by routing rules, manager, or self-allocation by underwriter
3. Assignment recorded → `submissions` domain (`assigned_to`, `assigned_by`, `assigned_date`)
4. Task auto-created for the assignee appropriate to current lifecycle status
5. `submission.assigned` event published
6. Assignee notified

**Events produced:**
- `submission.assigned`

**Future automation (OQ-027):**
- Rules-based routing (class of business, risk size)
- Workload-balanced assignment
- AI agent routing for email-originated submissions
- Referral based on underwriting authority limits (premium or limit thresholds per user)

**Known legacy code:**
- `src/layouts/AppLayout/AppLayoutPages/Workflow/WorkflowPage.jsx`

---

## Workflow: `clearance-checking`

**Purpose:** Determine whether an incoming submission represents a risk already seen — either a true duplicate or a competing-broker scenario — before the underwriter proceeds to quote.

**Triggers:** Submission enters `Outstanding` status (task auto-created: "Perform clearance check").

**Domains involved:** `submissions`

**Steps:**
1. Clearance check task assigned to reviewing underwriter
2. System applies configurable matching rules to find candidate matches:
   - Same insured (by ID or name fuzzy match)
   - Overlapping inception/expiry dates (configurable tolerance in days)
   - Same class of business (optional — configurable)
   - Same coverage type (optional — configurable)
3. Matches surfaced to the underwriter
4. For each match, underwriter determines scenario:

   | Scenario | Outcome |
   |----------|---------|
   | Same broker, same risk — true duplicate | Flag as duplicate; consolidate or decline the new record |
   | Different brokers, same risk — competing submission | Link records; system warning applied; both remain active; rating basis must be aligned |
   | Different risk despite superficial match | Dismiss match; no action |

5. Clearance outcome recorded on the submission
6. Submission proceeds to `Quote Created` or `Submission Declined`

**Clearance is configurable per org:**
- Rules (which fields to match, tolerances) configured in Settings by org administrator
- Clearance step can be included or excluded from the submission workflow via workflow configuration

**Multi-tenant clearance scope:**
- For **marketplace participants**: cross-tenant clearance is possible (a broker may submit to multiple insurers simultaneously — this is expected and both records should remain active but be linked)
- For **sole-tenant orgs**: clearance is scoped within the org only

**Each submission carries its own rating record regardless of clearance outcome.**  Clearance is an identification and warning mechanism, not a gate that prevents independent rating.

**Events consumed:**
- `submission.status-changed` (when status → Outstanding)

**Events produced:**
- `submission.clearance-outcome-recorded`

**Known legacy code:**
- `src/layouts/AppLayout/AppLayoutPages/Workflow/ClearanceWorkflowPage.jsx`
- `backend/server.js` — `/api/clearance/check/:id`, `/api/clearance/config`

**Open questions:**
- OQ-030: Who has authority to configure clearance matching rules — org admin only, or also team-level config?
- OQ-031: When two competing-broker submissions are linked, does the system enforce rating alignment automatically or just warn?

---

## Workflow: `quote-to-policy`

**Purpose:** Convert an accepted quote into a bound policy.

**Triggers:**
- User marks quote as `Bound` within the application
- Future: inbound email with embedded submission ID confirms broker acceptance (auto-task creation)

**Domains involved:** `quotes`, `policies`, `finance`

**Steps:**
1. Quote status updated to `Bound` → `quotes` domain emits `quote.accepted`
2. Workflow receives `quote.accepted`
3. Policy record created from quote data → `policies` domain
4. `policy.bound` event published
5. Invoice generation triggered → `finance` domain (OQ-002)
6. Task created for broker chase if quote reaches expiry date without acceptance (configurable lead time)

**Quote chase task:**
A task is auto-generated before quote expiry to prompt the user to follow up with the broker.  If email chase is sent from the system, a unique submission reference code embedded in the email can auto-create an acceptance task when the broker replies (future automation scope — OQ-032).

**Events consumed:**
- `quote.accepted`

**Events produced:**
- `policy.bound` (via `policies` domain)

**Known legacy code:**
- Logic is currently embedded in QuoteViewPage.jsx and the backend quote acceptance route

**Open questions:**
- OQ-002: Does the Finance domain react to `policy.bound` to generate an invoice, or does the Policy domain trigger it directly?
- OQ-032: Email reply-to-quote auto-acceptance via embedded reference code — in scope for initial build or future iteration?

---

## Workflow: `policy-endorsement`

**Purpose:** Apply a mid-term change to a bound policy.

**Triggers (two sources):**
1. **Broker creates a submission update in the application** — broker submits a change request via the UI against an existing bound policy.  This creates a new submission-style record linked to the original policy and triggers the endorsement workflow.
2. **Inbound email requesting a policy update** — an email is received against an existing policy reference.  The AI intake workflow identifies the policy reference, routes it to the endorsement workflow, and creates a draft endorsement for the assigned underwriter to review.

Both trigger paths produce the same endorsement record; only the origination differs.

**Domains involved:** `policies`, `submissions` (for broker-initiated path), `ai-email-intake` (for email-triggered path)

**Steps:**
1. Endorsement record created linked to the bound policy → `policies` domain
   - Trigger path recorded (`source`: `'broker-submission-update'` | `'email-inbound'`)
2. Underwriter reviews and edits the affected sections
3. Movement (financial delta) calculated and recorded
4. Endorsement finalised and issued
5. `policy.endorsed` event published
6. Invoice generated from the movement value → `sharedmodules/invoices/`

**Events consumed:**
- `submission.endorsement-request-created` (broker-initiated path)
- `email.endorsement-trigger-detected` (email-initiated path — future automation scope)

**Events produced:**
- `policy.endorsed`

**Known legacy code:**
- `src/layouts/AppLayout/AppLayoutPages/Policy/PolicyEndorsement/`
- `src/layouts/AppLayout/AppLayoutPages/Policy/PolicyEndorsePage.jsx` — Step 1 (initiate)
- `src/layouts/AppLayout/AppLayoutPages/Policy/PolicyEndorsement/` — Step 2 (edit sections)
- `src/components/common/Movement.jsx`

**Open questions:**
- OQ-012: Does `Movement.jsx` calculate the movement value or only display it?  This determines whether calculation logic must be migrated out of the component.

---

## Workflow: `tasks`

**Purpose:** Create, assign, and complete work items that direct users to take specific actions.  Tasks are the atomic unit of work assigned to individuals or teams.

**Triggers (two sources):**
1. **System-generated** — automatically created by workflow events (e.g. submission assigned, clearance match found, quote approaching expiry)
2. **User-created** — manually created by any user with task-creation permission

**Domains involved:** `tasks`, `submissions`, `quotes`, `policies`, `claims` (any domain can cause a task to be created)

**Task model:**
| Field | Description |
|---|---|
| `id` | Primary key |
| `title` | Short description of the work required |
| `source` | `'system'` or `'user'` |
| `linked_record_type` | `'submission'`, `'quote'`, `'policy'`, `'claim'`, or `null` |
| `linked_record_id` | FK to the related record, or null for standalone tasks |
| `assigned_to_user_id` | The individual assigned, or null if assigned to a team |
| `assigned_to_team_id` | The team assigned, or null if assigned to an individual |
| `status` | `'open'` | `'in-progress'` | `'completed'` | `'cancelled'` |
| `due_date` | Optional deadline |
| `created_at` | Timestamp |
| `created_by_user_id` | Who (or which system process) created the task |

**Assignment model:**
- A task is assigned to either a user *or* a team, never both simultaneously
- When a task is assigned to a team, any team member may **claim** it (claim sets `assigned_to_user_id` and removes `assigned_to_team_id`)
- Once claimed, the task belongs to that individual; it can be re-assigned by a manager or re-released to the team

**Views:**
- `/my-work-items` — shows tasks assigned to the current user, or assigned to a team the user belongs to (and not yet claimed)
- `TasksWidget` on the home dashboard — shows the same filtered subset

**Events consumed (examples — not exhaustive):**
- `submission.assigned` → creates task "Review newly assigned submission"
- `clearance.match-found` → creates task "Review clearance match"
- `quote.approaching-expiry` → creates task "Chase broker for quote acceptance"

**Events produced:**
- `task.created`
- `task.claimed`
- `task.completed`
- `task.cancelled`

**Known legacy code:**
- `src/layouts/AppLayout/AppLayoutPages/Workflow/MyWorkItemsPage.jsx` — personal view
- `src/layouts/AppLayout/AppLayoutPages/HomeWidgets/TasksWidget.jsx` — dashboard widget

---

## Workflow: `workflow-page-view`

**Purpose:** Provide a role- and company-scoped view of all active workflow items, enabling supervisors and managers to see across their team's work, not just their own.

This is a **view**, not a workflow in the event-driven sense.  It aggregates live data from the `submissions`, `clearance`, and `tasks` domains and filters by the caller's role and organisational context.

**Who sees what:**

| Role | What they see |
|---|---|
| Underwriter | Submissions assigned to them; their open tasks |
| Underwriting Manager | All submissions across their team; all open tasks for team members |
| Broker Admin | Submissions they have created or are named on |
| Org Admin | Full view across their org |
| PolicyForge Admin | Cross-org visibility (platform-level) |

**Filters available (role-dependent):**
- By team
- By submission lifecycle status
- By clearance status
- By assignee
- By due date / staleness

**Page structure (current legacy reference):**
- `WorkflowPage.jsx` — submission list + assignment action (single combined page — should be split on migration)
- `ClearanceWorkflowPage.jsx` — clearance-specific view

**Migration note:**
The legacy `WorkflowPage.jsx` conflates two concerns: the list view (read) and the assignment action (write/workflow step).  On migration these should be separated:
1. `app/pages/workflow/WorkflowPage.tsx` — read-only view, consumes `GET /api/workflow/submissions`
2. Assignment triggers a `PATCH /api/submissions/:id/assign` call to the `submissions` domain

---

## Workflow: `binding-authority-reporting`

**Purpose:** Capture bordereaux transactions and generate reports for binding authority contracts.

**Triggers:** Transaction entry or scheduled bordereaux run.

**Domains involved:** `binding-authorities`, `finance`

**Steps:**
1. Transaction recorded against a BA section → `binding-authorities` domain
2. Transactions aggregated for bordereaux report
3. Report generated → PDF generation shared service

**Known legacy code:**
- `src/layouts/AppLayout/AppLayoutPages/BindingAuthority/`
- `src/utils/bordereauValidations.js`
- `backend/document-generator.js`

---

## Workflow: `claim-lifecycle`

**Purpose:** Manage the full lifecycle of a claim from opening to settlement.

**Triggers:** User creates a new claim.

**Domains involved:** `claims`, `policies`, `finance`

**Steps:**
1. Claim created linked to a policy → `claims` domain
2. Reserve set
3. Transactions recorded
4. Payments processed → `finance` domain
5. Claim settled or closed
6. `claim.settled` event published

**Events produced:**
- `claim.opened`
- `claim.settled`

**Known legacy code:**
- `src/layouts/AppLayout/AppLayoutPages/Claim/`
- `src/context/claimsContext.jsx`

---

## Workflow: `data-quality-review`

**Purpose:** Surface and resolve data quality issues across submissions, quotes, and policies.

**Triggers:** Automated scan or manual quality check.

**Domains involved:** `submissions`, `quotes`, `policies`

**Known legacy code:**
- `src/layouts/AppLayout/AppLayoutPages/Workflow/DataQualityPage.jsx`
- `src/layouts/AppLayout/AppLayoutPages/Settings/DataQualitySettingsPage.jsx`

---

## Workflow: `ai-email-intake`

**Purpose:** Monitor email inbox and extract submission data using AI.

**Triggers:** Scheduled email check.

**Domains involved:** `submissions`, `parties`

**Known legacy code:**
- `backend/email-scheduler.js`
- `backend/services/` (to be confirmed — AI extraction service)

**Open questions:**
- OQ-006: Does AI extraction belong to this workflow, or should it be a shared service called `ai-extractor`?
