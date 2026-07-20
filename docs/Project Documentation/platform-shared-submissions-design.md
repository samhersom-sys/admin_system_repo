# Platform Shared Submissions — Feature Design Document

**Status:** Design / Pre-Requirements — Post-Checkpoint 2  
**Date:** 2026-05-14  
**Last updated:** 2026-05-15 — Checkpoint 2 inputs applied (separate broker_submissions table confirmed, OQ-PSS-001 resolved, OQ-PSS-003 resolved, IC-PSS-001 confirmed)  
**Author:** AI Engineering Partner  
**References:**
- `AI Guidelines/01-AI-Behaviour-Rules.md` — Three-Artifact Rule
- `AI Guidelines/04-Architectural-Boundaries.md` — Domain & Module boundaries
- `AI Guidelines/05-Multi-Tenant-Rules.md` — Tenant segregation
- `AI Guidelines/08-Event-Driven-Communication.md` — Event contracts
- `AI Guidelines/09-Full-Stack-Development.md` — Full-stack planning sequence
- `AI Guidelines/15-Database-Standards.md` — Schema standards
- `Project Documentation/01-Architectural-Overview.md`
- `Project Documentation/02-Domain-Definitions.md`
- `Project Documentation/03-Workflow-Definitions.md`
- `Project Documentation/06-Multi-Tenant-Rules.md`

---

## ⚠ Pre-Implementation Checkpoint

This document is a **design proposal only**.  No requirements have been written, no tests exist, and no code has been produced.  In accordance with `AI Guidelines §1.4` and the Three-Artifact Rule, this document must be reviewed and confirmed before requirements are written, and requirements must be agreed before tests or code are produced.

The open questions listed throughout this document must be resolved before any individual batch of requirements is started.

---

## 1. Purpose and Scope

This document analyses and proposes a design for the **Platform Shared Submissions** enhancement.  The intent is to extend the existing submission and quotation capability to support cross-tenant digital placement workflows between broker organisations and insurer organisations on the same platform.

The following placement modes are described:

| Mode | Table | Description |
|------|-------|-------------|
| **Insurer Manual Submission** | `submissions` | Existing: insurer creates a submission manually for an offline-received risk. Unchanged. |
| **Broker Manual Submission** | `broker_submissions` | New: a broker organisation creates a submission for offline placement activity (email, phone, file transfer) with no platform sharing. A fully valid standalone record. |
| **Broker Platform Shared Submission** | `broker_submissions` | New: a broker creates a submission on the platform and digitally shares it with one or more insurer tenants. |
| **Insurer Platform Copy** | `submissions` | New: the insurer-side copy of a broker-shared submission, created automatically by the placement-sync workflow. Source = `platform_received`. |
| **Lead Market Placement** | `placement_invitations` | New: broker invites one or more insurers to provide lead quotations. |
| **Follow Market Placement** | `placement_invitations` | New: broker offers the same risk to additional insurers as follow market, referencing selected lead terms. |

---

## 2. How This Enhancement Fits the Existing Architecture

### 2.1 Architectural Alignment

The enhancement follows the same structural pattern already established:

```
SUBMISSION → QUOTE → POLICY → CLAIM
```

For platform shared placements, this chain operates across **two tenants** simultaneously:

```
Broker Tenant:
  BROKER SUBMISSION → (share) → LEAD INVITATION → FOLLOW INVITATION → SIGNING DOWN → PLACEMENT COMPLETE

Insurer Tenant (per insurer):
  PLATFORM SHARED SUBMISSION → QUOTE RESPONSE → (signed line)
```

Both sides use the **same submission, quote, and workflow domain logic** — extending rather than duplicating it.

### 2.2 Layering and Domain Ownership

Following the architectural layers defined in `01-Architectural-Overview.md`:

| Concept | Layer | Owner |
|---------|-------|-------|
| Insurer manual submission | Domain: `submissions` (existing) | Unchanged |
| Insurer platform copy (received) | Domain: `submissions` (existing) | Extended: gains `platform_submission_id` FK and `source = 'platform_received'` |
| Broker manual submission | Domain: `broker-submissions` (NEW) | New domain, separate from insurer submissions |
| Broker platform shared submission | Domain: `broker-submissions` (NEW) | Same table as broker manual; distinguished by `source` and `platform_submission_id` |
| Cross-tenant placement coordination | Domain: `placement` (NEW) | New domain — owns `platform_submissions`, `placement_invitations`, etc. |
| Insurer quote response | Domain: `quotes` (existing) | Reuse existing with extended context |
| Lead selection | Workflow: `lead-market-placement` (NEW) | New workflow |
| Follow placement | Workflow: `follow-market-placement` (NEW) | New workflow |
| Signing-down | Workflow: `signing-down` (NEW) | New workflow |
| Cross-tenant synchronisation | Workflow: `placement-sync` (NEW) | New workflow |
| Automated quote/referral rules | Domain: `settings` (extended) | New config type |
| MRC document view | Shared Module: `mrc-view` (NEW) | New shared module |

### 2.3 What Is Reused Unchanged

| Capability | Reuse Approach |
|------------|--------------|
| Insurer submission creation form | Insurer manual submission creation is completely unchanged |
| Broker submission form fields | `NewBrokerSubmissionPage` mirrors the same field set as the insurer form; domain is separate, fields are equivalent |
| Quote creation and pricing | Insurer uses existing quote creation flow against a platform-received submission |
| Referral workflow | Existing referral rules trigger on insurer-side platform copies exactly as they do on manual submissions |
| Workflow status state machine | Same status column on both `broker_submissions` and `submissions`; new statuses added; existing statuses unchanged |
| Document generation | MRC view renders from structured data using existing PDF pipeline |
| Assignment and task management | Existing assignment workflow applies to insurer-side processing |
| Audit trail | Existing audit service records all placement events, including cross-tenant actions |
| Notifications | Existing notifications service delivers cross-tenant alerts |
| Permission model | Extended with new placement-specific actions |

---

## 3. New Domains

### 3.0 Domain Architecture Decision (OQ-PSS-001 ✅ Resolved)

Broker submissions and insurer submissions are implemented as **separate top-level domains**, not as sub-domains of a shared `submissions` domain.  This decision aligns with `AI Guidelines §4.2` (each domain has a single owner, no cross-domain imports) and reflects the following reasoning:

- **Configurable per tenant type.** A broker tenant configures the `broker-submissions` domain module; an insurer tenant configures the `submissions` domain module.  Sub-domains would merge broker configuration and insurer configuration into a single module, violating independent tenancy.
- **No shared logic between them.** The two domains do not share business rules that would justify nesting.  Cross-domain communication happens via the event bus, not via imports.
- **Consistent with the established pattern.** The domain list in `Project Documentation/02-Domain-Definitions.md` lists all domains at the top level.  Adding `broker-submissions` and `placement` follows the same pattern.

The three new top-level domains introduced by this enhancement are:

| Domain | Type | Purpose |
|--------|------|---------|
| `broker-submissions` | NEW domain | Owns all broker submission records (manual and platform shared) |
| `placement` | NEW domain | Owns cross-tenant placement coordination |
| `submissions` | EXISTING domain | Unchanged except: receives `platform_submission_id` FK and extended `source` values |

---

## 4. New Domain: `broker-submissions`

### 4.1 Why a Separate Domain

Broker submissions are kept in a **separate table and domain** from insurer submissions for the following reasons:

1. **Structural security guarantee.** The database schema itself enforces the tenant boundary.  Insurer-side queries operate against `submissions`; broker-side queries operate against `broker_submissions`.  It is structurally impossible for a misconfigured insurer query to return broker data because the table does not exist in the insurer domain's module.  A shared table relies on application-layer filtering alone.

2. **Independent configurable modules.** Each domain is an independently configurable module per tenant type.  A broker tenant enables `broker-submissions`; an insurer tenant never has it.  A shared table forces both org types to share the same schema object.

3. **Broker manual submissions are a first-class concept.** A broker can create a manual submission (offline market, email, phone) that is never shared via the platform.  This is a valid standalone record in `broker_submissions` with `source = 'manual'` and `platform_submission_id = NULL`.  In a single table, three columns (`submission_type`, `source`, `sharing_status`) would be needed to express what a single `source` column on a separate table expresses cleanly.

4. **Zero migration risk.** The existing `submissions` table is unchanged.  All existing tests, API routes, and data continue to work exactly as before.

5. **Future linkage without schema risk.** The planned future process to join independently-created broker and insurer submissions (IC-PSS-001) can be implemented by creating a `platform_submissions` cross-reference record pointing at both existing rows.  Neither table's structure changes.

### 4.2 Broker Submission Types

The `broker_submissions` table has a single `source` column that captures how the submission was created:

| Source Value | Description | `platform_submission_id` |
|---|---|---|
| `manual` | Broker creates a submission for offline placement (emails, phone, file transfer). Never shared via platform. | NULL |
| `platform_shared` | Broker creates a submission and shares it digitally with insurer tenants via the platform. | Populated when sharing is initiated |

A broker manual submission can remain manual indefinitely.  It represents traditional market practice and is not a step toward platform sharing.

> **Open question OQ-PSS-002:** Should `source` be a VARCHAR with a CHECK constraint, or a foreign key to a lookup table consistent with other lookup patterns in the platform?  **Decision required.**

### 4.3 Broker Workflow Status State Machine

Broker submissions use the same `workflow_status` column pattern as insurer submissions (OQ-PSS-003 resolved — see §4.7).  New statuses are added for platform sharing.

**Broker manual submission:**
```
Created
  └─► In Review
        ├─► Declined
        └─► (no quote/bind on broker side — placement is managed separately)
```

**Broker platform shared submission:**
```
Created
  └─► Shared (lead invitations sent)
        └─► Lead Quotes Received
              └─► Lead Selected
                    ├─► Follow Market Sent
                    │     └─► Subscribed
                    │           └─► Signing Down
                    │                 └─► Placement Complete
                    └─► Placement Complete (100% single lead, no follow needed)
```

### 4.4 `broker-submissions` Domain — Owns

- `broker_submissions` records (manual and platform shared)
- Broker submission workflow status transitions
- Broker submission assignment
- Broker submission field validation and business rules

### 4.5 `broker-submissions` Domain — Does Not Own

- The insurer's received copy of the submission (owned by `submissions` domain)
- Cross-tenant placement coordination (owned by `placement` domain)
- Quote records (owned by `quotes` domain)
- Party records (owned by `parties` domain)

### 4.6 `broker-submissions` Domain — Public Interface

```ts
createManualSubmission(data, tenantContext)        // source='manual'; platform_submission_id=NULL
createPlatformSubmission(data, tenantContext)      // source='platform_shared'; platform_submission_id=NULL initially
shareSubmission(submissionId, tenantContext)       // sets platform_submission_id; triggers placement domain
assignSubmission(submissionId, assignTo, callerContext)
updateStatus(submissionId, newStatus, callerContext)
getSubmission(submissionId, tenantContext)
listSubmissions(filters, tenantContext)
```

### 4.7 OQ-PSS-003 ✅ Resolved — Shared Workflow Status Column

Both `broker_submissions` and `submissions` (insurer) use the **same status column name and the same status lookup table**.  Platform shared submissions appear in the same workflow queue as manual submissions.  The queue is filtered by `org_type` to show each tenant the statuses relevant to them.

Broker tenants and insurer tenants may each configure their own workflow rules (assignment routing, SLA triggers, automation) through the `settings` domain without requiring a separate status schema.

### 4.8 `broker-submissions` Domain — Events Published

| Event | Trigger |
|-------|---------|
| `broker-submission.created` | Any broker submission created (manual or platform_shared) |
| `broker-submission.shared` | Broker initiates platform sharing; triggers placement domain |
| `broker-submission.status-changed` | Workflow status changes |

---

## 5. New Domain: `placement`

### 5.1 Why a New Domain Is Needed

Cross-tenant placement coordination is a distinct business concept that does not belong solely to either `submissions` or `quotes`.  It orchestrates:

- Sharing a broker submission with one or more insurer tenants
- Tracking invitation status per insurer
- Recording insurer quote responses against invitations
- Supporting broker lead selection
- Orchestrating follow market placement
- Signing-down subscribed capacity

This is a vertical slice of business logic with its own data model, lifecycle, and rules.  It is not exclusively owned by any existing domain.

> **OQ-PSS-001 ✅ Resolved.** The placement coordination domain is a separate top-level domain.  See §3.0.

### 5.2 Placement Domain — Owns

- `platform_submission` records (cross-tenant link between broker submission and insurer submission)
- `placement_invitation` records (broker → insurer invitations, lead or follow)
- `placement_quote_response` records (insurer response to invitation, referencing a quote)
- `placement_lead_selection` records (broker-selected lead quotes)
- `placement_participation` records (final signed line per insurer)
- Placement lifecycle status transitions
- Signing-down calculations (proportional reduction, respecting "stand" capacity)

### 5.3 Placement Domain — Does Not Own

- The broker's submission record (owned by `broker-submissions`)
- The insurer's local submission copy (owned by `submissions`)
- The insurer's quote record (owned by `quotes`)
- Automated referral rules configuration (owned by `settings`)
- Document generation (owned by shared module `mrc-view`)

### 5.4 Placement Domain — Public Interface

```ts
createPlatformSubmission(brokerSubmissionId, brokerOrgCode, tenantContext)
inviteLeadMarket(platformSubmissionId, insurerOrgCodes[], tenantContext)
inviteFollowMarket(platformSubmissionId, selectedLeadTermsId, insurerOrgCodes[], tenantContext)
recordQuoteResponse(invitationId, quoteId, offeredLineSize, lineType, tenantContext)
selectLeadQuote(invitationId, tenantContext)
performSigningDown(platformSubmissionId, tenantContext)
getPlacementSummary(platformSubmissionId, tenantContext)
```

### 5.5 Placement Domain — Events Published

| Event | Trigger |
|-------|---------|
| `placement.submission-shared` | Broker shares a submission with an insurer |
| `placement.invitation-created` | A placement invitation is created |
| `placement.quote-response-received` | Insurer records a quote response |
| `placement.lead-selected` | Broker selects a lead quote |
| `placement.follow-invitation-created` | Broker creates a follow market invitation |
| `placement.signed-down` | Signing-down operation completed |
| `placement.completed` | Full placement is complete |
| `placement.invitation-declined` | Insurer declines an invitation |

---

## 6. Minimal Extensions to the `submissions` Domain (Insurer)

The `submissions` table is the insurer's existing submission store.  This enhancement makes **two minimal additions** to it.  The core table definition, all existing fields, all existing API routes, and all existing tests are **unchanged**.

There is **no `submission_type` column** on the `submissions` table.  All rows in this table are insurer submissions.  Broker submissions are stored in the separate `broker_submissions` table (see §4).

### 6.1 New Field: `platform_submission_id` (nullable)

A nullable foreign key to `platform_submissions(id)`.

- NULL for all `manual` and `email` submissions
- Populated when an insurer receives a platform-shared submission copy (source = `platform_received`)
- This link allows the insurer's submission to navigate directly to the cross-tenant coordination record

### 6.2 Extended `source` Values

The existing `source` column is extended with one new value:

| Source Value | Meaning | `platform_submission_id` |
|---|---|---|
| `manual` | Existing: insurer creates manually | NULL |
| `email` | Existing: AI-extracted from broker email | NULL |
| `platform_received` | New: insurer's copy, received via platform sharing | Populated |

### 6.3 IC-PSS-001 ✅ Confirmed — Insurer-Side Structural Invariant

Insurer organisations only ever have `source = 'manual'`, `'email'`, or `'platform_received'` rows in the `submissions` table.  They never create `platform_shared` originals (those are broker records in `broker_submissions`).  Broker organisations never have rows in this table.

The separate-table architecture makes this a **structural guarantee** — it cannot be accidentally violated by a misconfigured query, because the `broker_submissions` table simply does not exist within the `submissions` domain module.

> **IC-PSS-001 nuance acknowledged:** In a future scenario where a dual-role org acts as both broker and insurer, the architecture would require a decision about which table (or both) it uses.  The separate table approach makes that future decision explicit and deliberate rather than hidden.  This is acceptable for the initial build.

### 6.4 Extensions to the `submissions` Domain Public Interface

The existing interface is extended with one new method for receiving platform copies (called by the `placement-sync` workflow only — never by the broker):

```ts
// Existing — unchanged
createSubmission(data, tenantContext)
assignSubmission(submissionId, assignTo, callerContext)
updateStatus(submissionId, newStatus, callerContext)
getSubmission(submissionId, tenantContext)
listSubmissions(filters, tenantContext)

// New — called by placement-sync only
receivePlatformCopy(brokerSubmissionData, insurerOrgCode, platformSubmissionId)
  // source='platform_received'; platform_submission_id=<id>
```

### 6.5 New Events Published by `submissions` Domain

| Event | Trigger |
|-------|---------|
| `submission.platform-shared-received` | Insurer receives a platform shared submission copy |

---

## 7. New Database Schema

All naming follows the standards defined in `AI Guidelines/15-Database-Standards.md`.

### 7.0 Why the `platform_submissions` Table Exists (and Why a Flag Is Not Sufficient)

A common simplification question is whether a boolean flag on the `submissions` table (`is_platform_shared`) could replace the `platform_submissions` table.  It cannot, for three distinct reasons:

**Reason 1 — The `submissions` table is tenant-scoped; a placement is cross-tenant.**  Every row in `submissions` belongs to exactly one org.  A placement involves one broker org and one or more insurer orgs.  The placement as an entity spans multiple tenants.  There is no single-tenant row that can authoritatively represent the whole placement.  The `platform_submissions` table is that cross-tenant record.

**Reason 2 — Placement-level aggregate state has no single-tenant home.**  `total_capacity_percent`, `signed_capacity_percent`, and `placement_status` are properties of the placement as a whole — not of the broker's submission record, and not of any individual insurer's copy.  If stored on the broker's submission row, these fields would be broker-tenant data pretending to describe a multi-tenant concept.  They belong on a record whose scope matches the concept it describes.

**Reason 3 — The broker cannot query across tenant boundaries.**  The broker needs to know which insurer tenants have been invited, whether their submission copies have been created, and the current status of each invitation.  Under strict tenant isolation (`AI Guidelines §5`), the broker cannot query the insurer's `submissions` rows (different `org_code`).  The `platform_submission_tenants` table is the broker's own record of this information — held within the broker's accessible scope — without violating tenant isolation.

**The hybrid improvement:** The `broker_submissions` table already carries `platform_submission_id FK` (NULL for manual; populated when shared).  The `submissions` (insurer) table gains the same nullable `platform_submission_id FK`.  This gives every tenant-scoped submission row a direct link to the cross-tenant coordination record when applicable.  For `manual` and `email` submissions this column is NULL.

### 7.0a `organisations` Table Extension

The `organisations` table (existing) gains an `org_type` column.  This resolves OQ-PSS-013.

```sql
-- Migration: ALTER TABLE organisations ADD COLUMN org_type VARCHAR(30) NOT NULL DEFAULT 'insurer'
-- CHECK constraint: CHECK (org_type IN ('insurer', 'broker', 'platform'))

-- org_type values:
--   'insurer'  — an insurance underwriting organisation
--   'broker'   — a broker organisation that places risk
--   'platform' — PolicyForge internal accounts (platform admin)
```

All existing organisations will be migrated to `org_type = 'insurer'` as the safe default.  Broker orgs must be explicitly set to `org_type = 'broker'` by a platform admin.

This `org_type` is the mechanism by which:
- Broker-only API endpoints are protected (`@Roles` guard checks org_type)
- Broker submissions route to `broker-submissions` domain; insurer submissions route to `submissions` domain (see §4 and §6)
- Insurer-only rule configuration is restricted to `org_type = 'insurer'`

### 7.1 `broker_submissions` Table (NEW)

Owns all broker organisation submissions.  Created by the `broker-submissions` domain module.  Insurer-side domain code has no access to this table.

```sql
broker_submissions (
  id                      SERIAL PRIMARY KEY,
  org_code                VARCHAR(20) NOT NULL,             -- broker org; validated against organisations.org_type = 'broker'
  reference               VARCHAR(50),                      -- broker's internal reference
  insured_name            VARCHAR(255) NOT NULL,
  class_of_business       VARCHAR(100),
  estimated_premium       NUMERIC(15,2),
  inception_date          DATE,
  expiry_date             DATE,
  source                  VARCHAR(30) NOT NULL DEFAULT 'manual',  -- 'manual' | 'platform_shared'
  sharing_status          VARCHAR(30) NOT NULL DEFAULT 'not_shared',  -- 'not_shared' | 'shared'
  platform_submission_id  INTEGER,                          -- NULL for manual; FK to platform_submissions.id when shared
  workflow_status         VARCHAR(50) NOT NULL DEFAULT 'Created',
  assigned_to             INTEGER REFERENCES users(id),
  assigned_by             INTEGER REFERENCES users(id),
  assigned_date           TIMESTAMP WITH TIME ZONE,
  created_by              INTEGER NOT NULL REFERENCES users(id),
  created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
)
```

Indexes: `idx_broker_submissions_org_code`, `idx_broker_submissions_platform_submission_id`

> **Note on `platform_submission_id`:** A forward reference.  The FK constraint (`REFERENCES platform_submissions(id)`) is added after `platform_submissions` is created.  Alternatively, use a deferred constraint.  For manual submissions this column is permanently NULL.

> **OQ-PSS-002 ✅ Resolved — Checkpoint 3:** `source` and `sharing_status` use **lookup table FKs**, consistent with the 27 existing `lookup_*` tables in the platform.  Create `lookup_broker_submission_sources` (values: `manual`, `platform_shared`) with `id`, `code`, `name`, `description`, `is_active`, `order_index`.  The `source` column on `broker_submissions` becomes `source_id INTEGER NOT NULL REFERENCES lookup_broker_submission_sources(id)`.

> **Technical debt note — `submission` table:** The existing `submission` entity currently stores `workflow_status` as a plain `VARCHAR(50)` column (migration 091) rather than a FK to `lookup_workflow_statuses`.  This is inconsistent with the platform pattern and should be fixed in a separate migration as part of Batch PSS-A, alongside adding the `broker_submissions` table.  This is not a breaking change — values already match lookup codes.

---

### 7.2 Cross-Table Usage Matrix

This matrix shows which tables are touched in each placement scenario.  Use this to validate the schema before writing requirements.

| Scenario | `broker_submissions` | `submissions` (insurer) | `platform_submissions` | `platform_submission_tenants` | `placement_invitations` | `placement_quote_responses` | `quotes` | `placement_lead_selections` | `placement_participations` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Broker: manual (not shared)** | ✅ Created | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Broker: create platform_shared** | ✅ Created | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Broker: share with insurer(s)** | ✅ Updated (platform_submission_id set) | ❌ | ✅ Created | ✅ Row per insurer | ✅ Row per insurer (lead) | ❌ | ❌ | ❌ | ❌ |
| **Insurer: manual submission** | ❌ | ✅ Created | ❌ | ❌ | ❌ | ❌ | ✅ May exist | ❌ | ❌ |
| **Insurer: receives platform copy** | ❌ | ✅ Created (source='platform_received') | ✔ Exists | ✅ Updated (status → copy_created) | ✔ Exists | ❌ | ❌ | ❌ | ❌ |
| **Insurer: responds with quote** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Created | ✅ Created | ❌ | ❌ |
| **Broker: selects lead quote** | ❌ | ❌ | ✅ Updated (status) | ❌ | ✅ Updated (status) | ✅ Updated (status) | ❌ | ✅ Created | ❌ |
| **Broker: invites follow market** | ✔ Read | ❌ | ✔ Read | ✅ New row per insurer | ✅ New row per insurer (follow) | ❌ | ❌ | ❌ | ❌ |
| **Signing-down** | ❌ | ❌ | ✅ Updated (signed_capacity_percent) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Created/Updated |
| **Future: link independently-created** | ✔ Existing | ✔ Existing | ✅ New link record | ✅ New row per insurer | ✅ New rows | ❌ | ❌ | ❌ | ❌ |

**Legend:** ✅ Row created or updated in this step — ✔ Read-only access — ❌ Not involved

---

### 7.3 `platform_submissions` Table

The cross-tenant coordination record for a placement.  Not owned by any single tenant.  Referenced by the broker's `broker_submissions` row and all insurer `submissions` copies via `platform_submission_id FK`.

```sql
platform_submissions (
  id                      SERIAL PRIMARY KEY,
  shared_reference        VARCHAR(50) NOT NULL UNIQUE,   -- cross-tenant correlation identifier
  broker_org_code         VARCHAR(20) NOT NULL,          -- validated against organisations.org_type = 'broker'
  broker_submission_id    INTEGER NOT NULL REFERENCES broker_submissions(id),
  placement_status        VARCHAR(50) NOT NULL DEFAULT 'draft',
  total_capacity_percent  NUMERIC(6,3),                 -- sum of all invited insurer line offers
  signed_capacity_percent NUMERIC(6,3),                 -- sum of all signed lines post signing-down
  created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
)
```

Indexes: `idx_platform_submissions_broker_org`, `idx_platform_submissions_shared_reference`

**Link to broker and insurer rows:** The broker's `broker_submissions` row has `platform_submission_id = <id>` pointing here.  Each insurer `submissions` copy also carries `platform_submission_id = <same id>`.  This FK on both sides allows any submission row to navigate directly to its coordination record.

### 7.4 `platform_submission_tenants` Table

The broker's record of which insurer tenants have been invited and the status of their submission copy creation.  This table exists within the broker's accessible scope and does not require cross-tenant queries.  Without this table, the broker would have no compliant way to track invitation status across insurer tenants.

```sql
platform_submission_tenants (
  id                        SERIAL PRIMARY KEY,
  platform_submission_id    INTEGER NOT NULL REFERENCES platform_submissions(id),
  insurer_org_code          VARCHAR(20) NOT NULL,         -- validated against organisations.org_type = 'insurer'
  insurer_submission_id     INTEGER,                      -- NULL until insurer copy is created; not a FK (cross-tenant)
  status                    VARCHAR(50) NOT NULL DEFAULT 'invited',  -- invited | copy_created | declined | withdrawn
  invited_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  copy_created_at           TIMESTAMP WITH TIME ZONE,
  UNIQUE (platform_submission_id, insurer_org_code)
)
```

> **Note on `insurer_submission_id`:** This column records the ID of the insurer's submission copy for operational tracking only.  It is deliberately **not** a foreign key constraint because the referenced row lives in a different tenant's data scope.  No JOIN across tenants is permitted — this column is a reference for audit and operational support purposes only.

### 7.5 `placement_invitations` Table

Represents a broker's invitation to an insurer for lead or follow market participation.

```sql
placement_invitations (
  id                        SERIAL PRIMARY KEY,
  platform_submission_id    INTEGER NOT NULL REFERENCES platform_submissions(id),
  insurer_org_code          VARCHAR(20) NOT NULL,
  invitation_type           VARCHAR(20) NOT NULL,     -- 'lead' | 'follow'
  response_intent           VARCHAR(30),               -- NULL until responded: 'quote' | 'follow_only' | 'declined'
  status                    VARCHAR(30) NOT NULL DEFAULT 'sent',  -- sent | responded | declined | withdrawn
  lead_terms_reference_id   INTEGER REFERENCES placement_lead_selections(id),  -- NULL for lead invitations
  invited_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  responded_at              TIMESTAMP WITH TIME ZONE,
  UNIQUE (platform_submission_id, insurer_org_code, invitation_type)
)
```

**`response_intent` values (set when insurer responds to a lead invitation):**

| Value | Meaning |
|---|---|
| `quote` | Insurer intends to create a lead quote in their system |
| `follow_only` | Insurer declines to quote as lead but wants to be considered for follow market |
| `declined` | Insurer declines the invitation entirely |

This declaration is captured **before** a quote is created.  It allows the broker to see at a glance which invited insurers are pursuing lead quotes vs. expressing follow-only interest, without waiting for quote submissions.

> **Auto-rating (future scope):** In a future batch, the platform will auto-generate a pre-populated draft quote for an insurer whose `response_intent = 'quote'`, using their configured rating schedules in `SettingsModule`.  This is noted as a future requirement and must **not** be included in the initial build.  For the initial build, the insurer creates the quote manually in their existing flow.

> **OQ-PSS-004 ✅ Resolved — Checkpoint 3:** An insurer can be invited for both lead and follow on the same placement.  Unique constraint confirmed as `(platform_submission_id, insurer_org_code, invitation_type)`.  When responding to a lead invitation, the insurer must declare `response_intent`.

### 7.6 `placement_quote_responses` Table

Insurer's quote response to a placement invitation.

```sql
placement_quote_responses (
  id                      SERIAL PRIMARY KEY,
  invitation_id           INTEGER NOT NULL REFERENCES placement_invitations(id),
  quote_id                INTEGER NOT NULL REFERENCES quotes(id),  -- points to insurer's own quote
  offered_line_percent    NUMERIC(6,3) NOT NULL,
  line_type               VARCHAR(20) NOT NULL,  -- 'proportional' | 'stand'
  status                  VARCHAR(30) NOT NULL DEFAULT 'submitted',  -- submitted | selected | not_selected | withdrawn
  submitted_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (invitation_id)
)
```

> **Note on `follow_market_interest`:** This boolean has been removed.  Follow market interest is now captured upfront via `placement_invitations.response_intent = 'follow_only'` when an insurer responds to a lead invitation.  This is a cleaner separation: intent is on the invitation record; the quote response contains only the financial terms.

### 7.7 `placement_lead_selections` Table

Records broker selection of a lead quote.

```sql
placement_lead_selections (
  id                          SERIAL PRIMARY KEY,
  platform_submission_id      INTEGER NOT NULL REFERENCES platform_submissions(id),
  placement_quote_response_id INTEGER NOT NULL REFERENCES placement_quote_responses(id),
  selected_by                 INTEGER NOT NULL REFERENCES users(id),
  selected_at                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes                       TEXT
)
```

### 7.8 `placement_participations` Table

Final signed line per insurer for a placement.

```sql
placement_participations (
  id                        SERIAL PRIMARY KEY,
  platform_submission_id    INTEGER NOT NULL REFERENCES platform_submissions(id),
  insurer_org_code          VARCHAR(20) NOT NULL,
  invitation_type           VARCHAR(20) NOT NULL,  -- 'lead' | 'follow'
  original_line_percent     NUMERIC(6,3) NOT NULL,
  signed_line_percent       NUMERIC(6,3),          -- set after signing down
  line_type                 VARCHAR(20) NOT NULL,  -- 'proportional' | 'stand'
  status                    VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending | signed | declined
  signed_at                 TIMESTAMP WITH TIME ZONE,
  UNIQUE (platform_submission_id, insurer_org_code, invitation_type)
)
```

### 7.9 `insurer_placement_rules` Table

Configurable rules per insurer tenant that determine whether a received submission triggers an automatic quote or a referral.  Uses a **relational model** (rules → conditions rows) consistent with the existing approach in the platform.  Placement rule management lives in `SettingsModule` alongside the existing rating rules page.

```sql
insurer_placement_rules (
  id          SERIAL PRIMARY KEY,
  org_code    VARCHAR(20) NOT NULL,
  rule_name   VARCHAR(100) NOT NULL,
  rule_order  INTEGER NOT NULL DEFAULT 0,  -- evaluation sequence; lower = higher priority
  action      VARCHAR(30) NOT NULL,         -- 'auto_quote' | 'refer' | 'decline'
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
)

rule_conditions (
  id          SERIAL PRIMARY KEY,
  rule_id     INTEGER NOT NULL REFERENCES insurer_placement_rules(id) ON DELETE CASCADE,
  field       VARCHAR(50) NOT NULL,   -- 'class_of_business' | 'estimated_premium' | 'territory' | 'inception_date_window'
  operator    VARCHAR(20) NOT NULL,   -- 'is' | 'is_not' | 'is_one_of' | 'greater_than' | 'less_than' | 'between'
  value       TEXT NOT NULL,          -- stored as text; cast at evaluation time based on field type
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
)
```

Indexes: `idx_insurer_placement_rules_org_code`, `idx_rule_conditions_rule_id`

All conditions within a rule are evaluated as **AND** (all must match).  Nested OR groups are a future enhancement.

> **OQ-PSS-005 ✅ Resolved — Checkpoint 3:** Relational model confirmed, consistent with existing platform approach.  JSONB rejected.

> **OQ-PSS-006 ✅ Resolved — Checkpoint 3:** Placement rules live in `SettingsModule`, on an extended version of the existing rating rules settings page.  A separate `PlacementRulesModule` is not required for rule management (see §8.3 which now becomes evaluation-only).

> **OQ-PSS-011 ✅ Resolved — Checkpoint 3:** Minimum viable condition fields are the same fields available in the existing rating rules conditions: `class_of_business`, `estimated_premium`, `territory`, `inception_date_window`.  No new condition infrastructure is required.

> **Auto-rating (future scope):** The `action = 'auto_quote'` value is defined in the schema now.  In the initial build, matching this rule routes the submission to a "ready to quote" queue but does not create a quote automatically.  A future batch will wire this action to the rating engine to auto-generate a pre-populated draft quote using the insurer's configured rating schedules.

---

### 7.10 `submission_document_versions` Table

Tracks versioned PDFs generated from a broker submission.  Each time the broker generates or regenerates an MRC document, a version record is created.  Insurers are notified when a new version supersedes a previous one.

```sql
submission_document_versions (
  id                      SERIAL PRIMARY KEY,
  broker_submission_id    INTEGER NOT NULL REFERENCES broker_submissions(id),
  platform_submission_id  INTEGER REFERENCES platform_submissions(id),  -- NULL for manual submissions
  version_number          INTEGER NOT NULL DEFAULT 1,
  generated_by            INTEGER NOT NULL REFERENCES users(id),
  generated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  document_hash           VARCHAR(64),       -- SHA-256 of rendered content for change detection
  status                  VARCHAR(30) NOT NULL DEFAULT 'current',  -- 'current' | 'superseded'
  superseded_at           TIMESTAMP WITH TIME ZONE,
  UNIQUE (broker_submission_id, version_number)
)
```

Index: `idx_submission_document_versions_broker_sub`

**Rules:**
- Only one version per submission can have `status = 'current'` at any time
- When a new version is generated, the previous version is updated to `status = 'superseded'`
- If a platform submission exists, all invited insurer tenants are notified when a new version is generated

---

### 7.11 `submission_amendments` Table

Tracks proposed changes to a shared submission that require lead insurer approval before taking effect.  Not all field changes require approval — only those that materially affect an insurer's underwriting decision.

**Fields that trigger the approval workflow:**
- Estimated premium (any change)
- Policy limits / sum insured (increases only; decreases are broker's prerogative)
- Location information (additions, removals, material changes)
- Inception or expiry date changes
- Class of business changes

```sql
submission_amendments (
  id                        SERIAL PRIMARY KEY,
  platform_submission_id    INTEGER NOT NULL REFERENCES platform_submissions(id),
  proposed_by               INTEGER NOT NULL REFERENCES users(id),
  proposed_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  field_name                VARCHAR(100) NOT NULL,     -- the field being changed
  old_value                 TEXT,
  new_value                 TEXT NOT NULL,
  status                    VARCHAR(30) NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'withdrawn'
  resolved_at               TIMESTAMP WITH TIME ZONE,
  resolution_notes          TEXT
)

submission_amendment_approvals (
  id                        SERIAL PRIMARY KEY,
  amendment_id              INTEGER NOT NULL REFERENCES submission_amendments(id),
  insurer_org_code          VARCHAR(20) NOT NULL,     -- the lead insurer being asked to approve
  invitation_id             INTEGER NOT NULL REFERENCES placement_invitations(id),
  decision                  VARCHAR(20),               -- NULL until decided: 'approved' | 'rejected'
  decided_by                INTEGER REFERENCES users(id),
  decided_at                TIMESTAMP WITH TIME ZONE,
  notes                     TEXT,
  UNIQUE (amendment_id, insurer_org_code)
)
```

**Multi-lead approval rule:** If a placement has two lead underwriters, both must approve an amendment before it takes effect.  The `submission_amendment_approvals` table has one row per lead insurer per amendment.  The amendment moves to `status = 'approved'` only when all lead insurers have approved.

**Amendment approval triggers a new document version:** Once an amendment is approved, the changes are applied to the broker submission and a new document version is generated automatically.

> **Scope note:** The amendment approval workflow is a separate implementation batch (PSS-G).  The initial build (PSS-A through PSS-F) creates the tables as part of the schema but does not implement the approval UI or enforcement logic.  In the initial build, field changes are applied directly without approval gating.

---

## 8. New Backend Modules (NestJS)

Following the pattern defined in `AI Guidelines/04-Architectural-Boundaries.md §4.2a`:

### 8.1 `BrokerSubmissionsModule` (`backend/nest/src/broker-submissions/`) ← NEW

```
broker-submissions.module.ts
broker-submissions.controller.ts
broker-submissions.service.ts
```

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/broker-submissions` | Create a broker submission (manual or platform_shared) |
| `GET` | `/api/broker-submissions` | List broker's own submissions |
| `GET` | `/api/broker-submissions/:id` | Get broker submission detail |
| `PUT` | `/api/broker-submissions/:id` | Update a broker submission |
| `POST` | `/api/broker-submissions/:id/share` | Initiate platform sharing (calls placement domain) |
| `PUT` | `/api/broker-submissions/:id/status` | Update workflow status |
| `PUT` | `/api/broker-submissions/:id/assign` | Assign submission |

All endpoints:
- `@UseGuards(JwtAuthGuard)` at class level
- `orgCode` from `req.user.orgCode` only — never from body or query
- `@Roles('broker')` guard on all endpoints (insurer users cannot reach this module)

### 8.2 `PlacementModule` (`backend/nest/src/placement/`)

```
placement.module.ts
placement.controller.ts
placement.service.ts
```

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/placement` | Create a platform submission (broker shares) |
| `GET` | `/api/placement/:id` | Get placement summary (broker view) |
| `POST` | `/api/placement/:id/invite-lead` | Invite insurer(s) for lead market |
| `POST` | `/api/placement/:id/invite-follow` | Invite insurer(s) for follow market |
| `POST` | `/api/placement/invitations/:invitationId/respond` | Insurer records quote response |
| `POST` | `/api/placement/:id/select-lead` | Broker selects lead quote |
| `POST` | `/api/placement/:id/sign-down` | Broker performs signing-down |
| `GET` | `/api/placement/:id/participations` | List all participations (broker view) |
| `GET` | `/api/placement/received` | Insurer: list received platform submissions |

All endpoints:
- `@UseGuards(JwtAuthGuard)` at class level
- `orgCode` from `req.user.orgCode` only — never from body or query
- Role guards on sensitive operations (e.g. broker-only routes use `@Roles('broker')`)

### 8.3 `PlacementRulesModule` (`backend/nest/src/placement-rules/`)

```
placement-rules.module.ts
placement-rules.controller.ts
placement-rules.service.ts
```

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/placement-rules` | List this org's placement rules |
| `POST` | `/api/placement-rules` | Create a rule |
| `PUT` | `/api/placement-rules/:id` | Update a rule |
| `DELETE` | `/api/placement-rules/:id` | Delete a rule |
| `POST` | `/api/placement-rules/evaluate` | Evaluate rules against a submission |

> **Open question OQ-PSS-006:** Should placement rule management live in `PlacementRulesModule` or within the existing `SettingsModule`?  Argument for Settings: it is the existing home for insurer configuration.  Argument for a dedicated module: placement rules have their own evaluation engine and API contract distinct from rating rules and data quality settings.  **Decision required.**

### 8.4 `PlacementSyncModule` (`backend/nest/src/placement-sync/`)

Handles cross-tenant synchronisation of shared submission data.

```
placement-sync.module.ts
placement-sync.controller.ts    -- internal webhook/event receiver
placement-sync.service.ts       -- sync logic
```

This module is responsible for:
- Creating insurer-side submission copies when a broker shares
- Propagating broker-authorised updates to insurer copies
- Publishing `submission.platform-shared-received` event to the insurer's submission domain

> **Open question OQ-PSS-007:** Should cross-tenant synchronisation be implemented as a synchronous in-process operation (same NestJS instance, no queue) or via an asynchronous event queue (e.g. Redis/BullMQ, or database-backed job queue)?  Synchronous is simpler to build initially.  Asynchronous is more resilient at scale.  For the initial build, synchronous within the same request cycle is recommended, with the architecture designed so async can be introduced later.  **Decision required.**

---

## 9. New Workflows

### 9.1 Workflow: `broker-submission-creation`

**Purpose:** Allow a broker organisation user to create a submission representing a placement opportunity.  The broker may choose a manual (offline) submission or a platform shared submission at creation time.

**Triggers:** Broker user (member of an org with `org_type = 'broker'`) navigates to "New Submission" in the broker-submissions domain.

**Domains involved:** `broker-submissions`, `parties`

**Steps:**
1. Broker fills in submission form (same fields as the insurer's submission form)
2. Broker selects submission type: **Manual** (offline/unshared) or **Platform Shared** (will be shared digitally)
3. Backend validates caller's org has `org_type = 'broker'` before allowing creation
4. Party records resolved (insured, broker is the logged-in org) → `parties` domain
5. Submission created in `broker_submissions` table with `source = 'manual'` or `source = 'platform_shared'` → `broker-submissions` domain
6. `platform_submission_id` is NULL at creation for both types — populated only when broker initiates sharing (a subsequent explicit action)
7. `broker-submission.created` event published

**Events produced:** `broker-submission.created`

---

### 9.2 Workflow: `lead-market-placement`

**Purpose:** Allow a broker to share a platform_shared submission with one or more insurers for lead quotation.

**Triggers:** Broker selects "Share for Lead Quotation" on a broker submission with `source = 'platform_shared'`.

**Domains involved:** `broker-submissions`, `placement`, `parties`

**Steps:**
1. Broker selects one or more insurer tenants to invite (validated against `organisations.org_type = 'insurer'`)
2. `platform_submissions` record created → `placement` domain; `shared_reference` generated
3. Broker's submission updated: `platform_submission_id` set to new record's ID; `sharing_status` → `'shared'` → `broker-submissions` domain
4. For each selected insurer:
   a. `platform_submission_tenants` row created (status: 'invited') → `placement` domain
   b. `placement_invitation` record created (type: 'lead') → `placement` domain
   c. Cross-tenant submission copy created in insurer tenant with `source = 'platform_received'`, `platform_submission_id` set → `submissions` domain (insurer table, via `placement-sync` workflow)
   d. `platform_submission_tenants.insurer_submission_id` updated; status set to 'copy_created'
   e. Insurer receives notification of new platform shared submission
5. Broker submission workflow_status updated to 'Shared' → `broker-submissions` domain
6. `placement.submission-shared` event published for each insurer tenant

**Events produced:**
- `broker-submission.shared`
- `placement.submission-shared` (per insurer)
- `placement.invitation-created` (per insurer)
- `submission.platform-shared-received` (in each insurer tenant)

**Insurer confidentiality:** The invitation payload to each insurer contains only the submission data — it does not include other invited insurer names, their invitation status, or any other insurer's data.

---

### 9.3 Workflow: `insurer-platform-submission-processing`

**Purpose:** Allow an insurer to review and respond to a received platform shared submission.

**Triggers:** Insurer's `submission.platform-shared-received` event.

**Domains involved:** `submissions`, `quotes`, `placement`

**Steps:**
1. Automated rule evaluation against insurer's `insurer_placement_rules` → `settings` / `placement-rules` domain
2. If rule action = `auto_quote`: draft quote pre-populated → `quotes` domain
3. If rule action = `refer`: submission routed to referral queue → `submissions` domain (`Referred` status)
4. If rule action = `decline`: submission declined → `submissions` domain
5. Underwriter reviews submission and creates/amends quote → `quotes` domain
6. Underwriter submits quote response including:
   - Offered line size (percentage)
   - Line type ('proportional' or 'stand')
   - Follow market interest flag
7. `placement_quote_response` record created → `placement` domain
8. `placement.quote-response-received` event published

**Events produced:**
- `placement.quote-response-received`

---

### 9.4 Workflow: `lead-selection-and-follow-placement`

**Purpose:** Allow a broker to review lead quotations, select a lead, and invite follow market.

**Triggers:** Broker views lead quote responses on a platform submission.

**Domains involved:** `placement`, `submissions`

**Steps (lead selection):**
1. Broker reviews lead quote responses (own responses only — no cross-insurer visibility)
2. Broker selects one or more lead quotes of interest
3. `placement_lead_selection` records created → `placement` domain
4. `placement.lead-selected` event published per selection
5. Non-selected insurers notified (quote not progressed) → `notifications`

**Steps (follow market):**
6. Broker selects additional insurers for follow market invitation
7. Follow market invitation references the selected lead terms
8. For each selected follow market insurer:
   a. `placement_invitation` record created (type: 'follow') → `placement` domain
   b. Platform shared submission created/updated in insurer tenant → `placement-sync`
   c. Selected lead terms (premium, conditions) shared with follow insurer **without lead insurer identity**
9. Follow insurer processes submission against provided lead terms

**Events produced:**
- `placement.lead-selected`
- `placement.follow-invitation-created`

---

### 9.5 Workflow: `signing-down`

**Purpose:** When subscribed capacity exceeds 100%, proportionally reduce participating insurer lines while respecting "stand" capacity.

**Triggers:** Broker initiates signing-down after all participations are collected.

**Domains involved:** `placement`

**Algorithm:**
1. Calculate total subscribed capacity (sum of all `placement_participations.original_line_percent`)
2. If total ≤ 100%: no signing-down required
3. If total > 100%:
   a. Separate participations into `stand` (cannot be reduced) and `proportional`
   b. Calculate remaining capacity after allocating all `stand` lines
   c. Proportionally reduce `proportional` lines to fill remaining capacity
   d. Calculate reduction factor: `remaining_capacity / sum_of_proportional_lines`
   e. Apply factor to each proportional line (round to 3 decimal places)
   f. Update `placement_participations.signed_line_percent` for all records
4. Publish `placement.signed-down` event

**Constraint:** If `stand` lines alone exceed 100%, the placement cannot proceed — broker must remove a stand participant or renegotiate.  This is an error condition that must surface clearly to the broker.

**Events produced:** `placement.signed-down`

> **Open question OQ-PSS-008:** Should signing-down be a one-shot operation (broker clicks, it runs) or a proposed/confirmed two-step flow (system proposes the signed lines, broker confirms before committing)?  Recommendation: two-step for auditability.  **Decision required.**

---

### 9.6 Workflow: `placement-sync`

**Purpose:** Create and maintain insurer-side submission copies that remain synchronised with authorised broker data.

**Triggers:**
- `placement.invitation-created` — create insurer submission copy
- `submission.updated` (broker side, authorised fields) — propagate to insurer copies

**Domains involved:** `submissions`, `placement`

**Synchronisation rules:**
- The broker submission is the source of truth
- Insurer copies receive only broker-authorised fields (see §10 Tenant Segregation)
- Insurer-specific data (their quote, their referral notes) is never synchronised to the broker
- Synchronisation events carry `shared_reference` as the correlation identifier
- Every sync operation is recorded in the audit trail

**Events consumed:** `placement.invitation-created`, `submission.updated`

**Events produced:** `submission.platform-shared-received`

> **OQ-PSS-007 \u2705 Resolved \u2014 Checkpoint 3:** Synchronous for the initial build.  The sync runs within the same request cycle before the broker's "Share" action returns.  A future batch may replace the synchronous call with a queue dispatch (Redis/BullMQ or database-backed job queue) for resilience at scale.  Architecture is written so this replacement does not require changing the surrounding code.

---

### 9.7 Workflow: `amendment-approval` *(Batch PSS-G)*

**Purpose:** Gate certain broker submission field changes behind lead insurer approval before they take effect and before a new document version is generated.

**Triggers:** Broker edits a field that is on the amendment approval list (premium, limits, locations, dates, class of business) on a submission that has an active platform placement with at least one accepted lead.

**Domains involved:** `broker-submissions`, `placement`

**Steps:**
1. Broker edits an amendment-gated field on a shared submission
2. The change is captured as a `submission_amendments` record (`status = 'pending'`); the submission field itself is **not yet updated**
3. One `submission_amendment_approvals` row is created per lead insurer currently on the placement
4. Each lead insurer is notified: "Amendment approval required"
5. Each lead insurer reviews the proposed change and responds (`approved` or `rejected`)
6. **If all leads approve:**
   a. The broker submission field is updated
   b. Insurer copies are synchronised via `placement-sync`
   c. A new `submission_document_versions` record is created
   d. All invited insurers are notified of the new document version
   e. Amendment `status` → `'approved'`
7. **If any lead rejects:**
   a. The change does not take effect
   b. Amendment `status` → `'rejected'`
   c. Broker is notified with the rejection reason
8. Broker may withdraw a pending amendment at any time (sets `status = 'withdrawn'`)

**Multi-lead rule:** Two lead underwriters may exist on a single placement.  Both must approve before the amendment takes effect.  If one approves and the other rejects, the amendment is rejected.

**Events produced:**
- `placement.amendment-proposed`
- `placement.amendment-approved`
- `placement.amendment-rejected`
- `placement.amendment-withdrawn`
- `placement.document-version-created`

> **Initial build scope:** PSS-A through PSS-F create the schema tables but do not enforce the approval gate.  Field changes are applied directly.  PSS-G implements the gate, the approval UI for lead insurers, and the notification flow.

---

## 10. New Shared Module: `mrc-view`

### 10.1 Why a Shared Module

The MRC (Market Reform Contract) style placement view must be:
- Renderable from a broker submission in the broker tenant
- Renderable from a platform shared submission in an insurer tenant
- Consistent in format across both tenants
- Usable by the existing document/PDF generation pipeline

This makes it a shared module: two tenants need identical rendering from the same structured data shape.

### 10.2 MRC View Data Model

The MRC view renders from a structured data object assembled from the submission fields.  It does not have its own database table — it is a view projection of submission data.

**MRC View sections (minimum viable):**

| Section | Content |
|---------|---------|
| Risk Details | Insured name, inception/expiry, class of business, estimated premium |
| Conditions & Clauses | Coverages, exclusions, warranties (from submission sections) |
| Information | Risk narrative, risk characteristics |
| Locations | Risk locations (from `locations` shared module) |
| Subscription | Participation lines (broker view only; insurer sees own line only) |

### 10.3 Module Location

```
frontend/src/sharedmodules/mrc-view/
  mrc-view.requirements.md
  mrc-view.service.ts     -- builds MRC view data from submission
  MrcView.tsx             -- renders MRC view
  MrcView.test.tsx
  index.ts
```

> **Open question OQ-PSS-009:** The existing document/PDF generation pipeline must be confirmed before MRC view requirements are written.  Which part of the codebase currently handles PDF generation?  Is there a backend PDF service or does the frontend render and capture?  This must be investigated before the MRC view module requirements are agreed.

---

## 11. New Frontend Pages and Components

### 11.0 Frontend Folder Structure

Following `AI Guidelines §4.2` (domain folder per feature, requirements inside domain), the three domains introduced by this enhancement map to three separate top-level domain folders:

```
frontend/src/

  submissions/                          ← EXISTING (insurer domain — unchanged core)
    submissions.requirements.md
    submissions.service.ts
    submissions.module.ts
    SubmissionsPage.tsx                  ← lists insurer submissions (manual + received platform copies)
    SubmissionViewPage.tsx               ← existing view, extended with platform copy indicators
    NewSubmissionPage.tsx                ← existing manual insurer submission creation
    __tests__/

  broker-submissions/                   ← NEW (broker domain — only visible to org_type='broker')
    broker-submissions.requirements.md
    broker-submissions.service.ts
    broker-submissions.module.ts
    BrokerSubmissionsPage.tsx            ← lists all broker submissions (manual + platform_shared)
    BrokerSubmissionViewPage.tsx         ← view/edit broker submission + placement tab when shared
    NewBrokerSubmissionPage.tsx          ← create broker submission (choose manual or platform_shared)
    __tests__/

  placement/                            ← NEW (cross-tenant coordination domain)
    placement.requirements.md
    placement.service.ts
    placement.module.ts
    PlacementOverviewPage.tsx            ← broker's placement status dashboard per submission
    LeadSelectionPage.tsx                ← review and select lead quotes
    FollowMarketPage.tsx                 ← invite follow market insurers
    SigningDownPage.tsx                  ← signing-down operation and confirmation
    __tests__/
```

Backend follows the same pattern:

```
backend/nest/src/
  submissions/            ← EXISTING (minor: +platform_submission_id field handling)
  broker-submissions/     ← NEW
  placement/              ← NEW
  placement-rules/        ← NEW (or within settings/ — see OQ-PSS-006)
  placement-sync/         ← NEW
```

### 11.1 Broker Tenant — New Pages

| Page | Route | Description |
|------|-------|-------------|
| Broker Submission List | `/broker-submissions` | Lists all broker submissions (manual and platform_shared) |
| Broker New Submission | `/broker-submissions/new` | Creates a broker submission; select manual or platform_shared |
| Broker Submission View | `/broker-submissions/:id` | Views/edits broker submission; placement tab visible for platform_shared |
| Placement Overview | `/placement/:platformSubmissionId` | Broker's view of placement status, invitations, responses |
| Lead Selection | `/placement/:platformSubmissionId/select-lead` | Review and select lead quotations |
| Follow Market | `/placement/:platformSubmissionId/follow-market` | Invite follow market insurers |
| Signing Down | `/placement/:platformSubmissionId/sign-down` | Review and confirm signing-down |

### 11.2 Insurer Tenant — New Pages / Extensions

| Page | Route | Description |
|------|-------|-------------|
| Submissions List | `/submissions` (existing) | Lists all insurer submissions; platform received copies shown with a badge |
| Platform Submission View | `/submissions/:id` (existing page, extended) | Reviews shared submission with MRC view tab and quote response action |
| Placement Response | `/submissions/:id/respond` | Insurer provides line size, line type, follow market interest |

### 11.3 Settings / Admin Extensions

| Page | Route | Description |
|------|-------|-------------|
| Placement Rules | `/settings/placement-rules` | Insurer configures automated quote/referral rules |

### 11.4 Shared Components

| Component | Purpose | Layer |
|-----------|---------|-------|
| `PlacementStatusBadge` | Renders placement status with appropriate colour/label | `components/` |
| `LineTypeIndicator` | Shows 'Proportional' or 'Stand' capacity designation | `components/` |
| `InvitationStatusCard` | Shows invitation status per insurer (broker view, no insurer identity cross-pollination) | `components/` |
| `MrcView` | Renders MRC-style placement document | `sharedmodules/mrc-view/` |
| `SigningDownPreview` | Shows proposed signed lines before broker confirms | `components/` |

---

## 12. Security and Tenant Segregation

### 10.1 Broker Visibility Rules

A broker user may see:
- Their own broker submissions
- Aggregated placement status (how many responses received, subscription %)
- Individual quote responses — but **not associated with insurer identity** until the broker explicitly selects to view an individual response
- Signed lines after signing-down is complete

A broker user must not see:
- Other broker tenants' submissions
- Insurer-specific internal data (referral notes, internal pricing decisions)

### 10.2 Insurer Visibility Rules

An insurer user may see:
- Submissions shared with their tenant only
- Their own quote records
- Their own invitation status
- Broker-authorised placement information (lead terms if they are a follow market participant)

An insurer user must not see:
- The identities of other invited insurers
- Other insurers' quote responses
- Other insurers' participation sizes
- Total subscription percentage (which would reveal how many others are participating)

### 10.3 API Enforcement

Every placement API endpoint:
- Validates `orgCode` from JWT — never from body or query
- Broker-side endpoints: validate that the `orgCode` matches the `broker_org_code` on the `platform_submissions` record
- Insurer-side endpoints: validate that the `orgCode` matches the `insurer_org_code` on the `platform_submission_tenants` record
- Platform admin: cross-tenant read access only for support/audit purposes

### 10.4 Cross-Tenant Data Payload Filtering

When a platform shared submission is delivered to an insurer tenant, the payload must be filtered:

| Field | Shared with insurer? | Reason |
|-------|---------------------|--------|
| Insured name | ✅ Yes | Required for underwriting |
| Risk details (class, dates, premium) | ✅ Yes | Required for underwriting |
| Broker organisation name | ✅ Yes | Insurer knows who submitted |
| Other invited insurer names | ❌ No | Confidentiality |
| Number of insurers invited | ❌ No | Confidentiality |
| Total subscription % | ❌ No | Confidentiality |
| Other insurer quote responses | ❌ No | Confidentiality |
| Lead selection outcome (before announcement) | ❌ No | Confidentiality |
| Follow market lead terms (after broker shares) | ✅ Yes (for follow invitees) | Required for follow market |

> **Open question OQ-PSS-010:** Should the broker's name always be visible to the insurer, or should anonymous submissions be a configurable option (blind placement)?  London Market convention is that the broker is always known to the insurer.  However, if blind placement is a future requirement, the architecture should accommodate it.  **Decision required — does not block initial build if assumption is "broker always visible".**

### 10.5 Audit Requirements

Every cross-tenant operation must be recorded in the audit trail with:
- `orgCode` of the initiating tenant
- `orgCode` of the receiving tenant
- The `shared_reference` as the correlation identifier
- The action performed and its outcome

---

## 13. Automated Quotation and Referral Rules

### 11.1 Rule Evaluation Model

When an insurer receives a platform shared submission, their placement rules are evaluated in `rule_order` sequence.  The first matching rule determines the action.  If no rule matches, the default action is 'refer'.

### 11.2 Supported Condition Types (Initial Set)

| Condition Type | Field | Operator | Example |
|---|---|---|---|
| Class of business | `class_of_business` | `equals`, `in`, `not_in` | `class_of_business equals 'Property'` |
| Estimated premium | `estimated_premium` | `lt`, `lte`, `gt`, `gte`, `between` | `estimated_premium lte 500000` |
| Broker organisation | `broker_org_code` | `equals`, `in`, `not_in` | `broker_org_code in ['ORG001', 'ORG002']` |
| Country of risk | `country` | `equals`, `in` | `country equals 'GB'` |
| Sum insured | `sum_insured` | `lt`, `lte`, `gt`, `gte` | `sum_insured lte 10000000` |

> **Open question OQ-PSS-011:** What is the minimum viable set of condition types for the initial build?  Class of business, estimated premium, and broker identity are likely the highest-value conditions.  Additional types (country, sum insured, risk characteristics) can be added incrementally.  **Confirm initial scope.**

### 11.3 Rule Storage (JSONB Condition Schema)

```json
{
  "operator": "AND",
  "conditions": [
    { "field": "class_of_business", "op": "in", "values": ["Property", "Casualty"] },
    { "field": "estimated_premium", "op": "lte", "value": 500000 }
  ]
}
```

Nested condition groups (`AND`/`OR`) should be supported in the schema from the outset, even if the initial UI only exposes flat AND conditions.

---

## 14. Workload and Workflow Management Integration

### 12.1 Task Generation

| Event | Task Created | Assigned To |
|-------|-------------|-------------|
| `submission.platform-shared-received` | "Review new platform submission" | Insurer's team queue or via placement rules |
| `placement.quote-response-received` | "New lead quotation received" | Broker's team queue |
| `placement.lead-selected` | "Lead terms confirmed — initiate follow market?" | Broker's team queue |
| `placement.follow-invitation-created` | "Review follow market request" | Insurer's team queue |
| `placement.signed-down` | "Signing down complete — finalise placement" | Broker's team queue |

### 12.2 Workflow Queue Visibility

The existing workflow/workload page should be extended to show:

**Broker tenant queue:**
- Awaiting lead quote responses (by submission)
- Lead responses ready for review
- Follow market outstanding
- Signing-down required
- Placement complete

**Insurer tenant queue:**
- Platform submissions received — pending action
- Referred submissions (requiring manual underwriting decision)
- Invitations requiring response

### 12.3 SLA Monitoring

> **OQ-PSS-012 ✅ Confirmed deferred — Checkpoint 4:** SLA timers are not in scope for PSS-A through PSS-G.  The `responded_at` timestamp is captured on `placement_invitations` so SLA enforcement can be added later without a schema change.  Raise as a separate feature request when required.

---

## 15. Events Catalogue Extension

The following new events are added to the platform events catalogue (`Project Documentation/07-Event-Driven-Communication-Rules.md`):

### Broker-Submissions Domain Events (NEW)

| Event | Trigger | Payload |
|-------|---------|---------|
| `broker-submission.created` | Broker org creates any submission (manual or platform_shared) | `{ submissionId, orgCode, source, classOfBusiness, estimatedPremium }` |
| `broker-submission.shared` | Broker initiates platform sharing; triggers placement domain | `{ submissionId, orgCode, platformSubmissionId, sharedReference }` |
| `broker-submission.status-changed` | Workflow status changes on broker submission | `{ submissionId, orgCode, oldStatus, newStatus }` |

### Submissions Domain Extensions (Insurer)

| Event | Trigger | Payload |
|-------|---------|---------|
| `submission.platform-shared-received` | Insurer tenant receives a platform shared submission copy | `{ submissionId, orgCode, platformSubmissionId, sharedReference, brokerOrgCode }` |

### Placement Domain Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `placement.submission-shared` | Broker shares submission | `{ platformSubmissionId, sharedReference, brokerOrgCode, brokerSubmissionId }` |
| `placement.invitation-created` | Invitation sent to insurer | `{ invitationId, platformSubmissionId, insurerOrgCode, invitationType }` |
| `placement.invitation-declined` | Insurer declines invitation | `{ invitationId, platformSubmissionId, insurerOrgCode, reason }` |
| `placement.quote-response-received` | Insurer submits quote response | `{ invitationId, platformSubmissionId, insurerOrgCode, quoteId, offeredLinePercent, lineType }` |
| `placement.lead-selected` | Broker selects lead quote | `{ platformSubmissionId, invitationId, selectedResponseId, brokerOrgCode }` |
| `placement.follow-invitation-created` | Broker invites follow market | `{ invitationId, platformSubmissionId, insurerOrgCode, leadTermsReferenceId }` |
| `placement.signed-down` | Signing-down operation complete | `{ platformSubmissionId, signingFactor, participations: [{ orgCode, original, signed, lineType }] }` |
| `placement.completed` | Full placement finalised | `{ platformSubmissionId, sharedReference, totalSignedPercent }` |

### Placement Domain — Document Versioning Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `placement.document-version-created` | New MRC document version generated for a shared submission | `{ platformSubmissionId, brokerSubmissionId, versionNumber, documentHash }` |

### Placement Domain — Amendment Approval Events *(Batch PSS-G)*

| Event | Trigger | Payload |
|-------|---------|---------|
| `placement.amendment-proposed` | Broker proposes a material field change on a shared submission | `{ amendmentId, platformSubmissionId, fieldName, oldValue, newValue, proposedBy }` |
| `placement.amendment-approved` | All lead insurer(s) approve the amendment | `{ amendmentId, platformSubmissionId, fieldName, newValue }` |
| `placement.amendment-rejected` | At least one lead insurer rejects the amendment | `{ amendmentId, platformSubmissionId, fieldName, rejectedBy, reason }` |
| `placement.amendment-withdrawn` | Broker withdraws a pending amendment | `{ amendmentId, platformSubmissionId, withdrawnBy }` |

---

## 16. Permissions Extension

New permission actions to be added to the `permissions` shared service:

| Action | Role(s) Permitted | Description |
|--------|------------------|-------------|
| `submission.create-platform` | `broker` | Create a platform shared submission (org_type must be 'broker') |
| `submission.share` | `broker` | Share a submission with insurer(s) |
| `placement.view` | `broker`, `underwriter`, `manager` | View placement summary |
| `placement.invite-lead` | `broker` | Send lead market invitations |
| `placement.invite-follow` | `broker` | Send follow market invitations |
| `placement.select-lead` | `broker` | Select lead quote(s) |
| `placement.sign-down` | `broker` | Perform signing-down |
| `placement.respond-lead` | `underwriter`, `manager` | Submit lead quote response |
| `placement.respond-follow` | `underwriter`, `manager` | Submit follow market response |
| `placement.decline-invitation` | `underwriter`, `manager` | Decline a placement invitation |
| `placement-rules.manage` | `tenant-admin`, `manager` | Manage insurer placement rules |

> **OQ-PSS-013 ✅ Resolved:** The `broker` permissions listed here apply to users within an organisation whose `org_type = 'broker'`.  Broker is a distinct organisation type, not a user role that can exist within any org.  API guards must validate both the user's JWT role AND their org's `org_type` before permitting broker-only actions.  See §5.0a.

---

## 17. New Requirement Domain Codes

Following `AI Guidelines/13-Requirements-Standards.md §4.1`, the following new domain codes are required:

| Domain | Code |
|--------|------|
| Platform Shared Submissions — broker domain | `PSS-BRK` |
| Platform Shared Submissions — insurer domain | `PSS-INS` |
| Placement domain module | `PLC-DOM` |
| Placement backend routes | `PLC-BE` |
| Placement Rules — settings | `PLC-RULES` |
| Placement Overview page | `PLC-PG` |
| Lead Selection page | `PLC-LEAD` |
| Follow Market page | `PLC-FOLLOW` |
| Signing Down page | `PLC-SIGN` |
| MRC View shared module | `MRC` |
| Placement Sync workflow | `PLC-SYNC` |

---

## 18. Proposed Implementation Batches

This feature is large and should be delivered incrementally.  Each batch must follow the Three-Artifact Rule.

### Batch PSS-A — Broker Organisation Foundation
**Scope:** Org type classification, broker submission creation (manual and platform_shared)

Dependencies: OQ-PSS-002 resolved (IC-PSS-001 ✅ already confirmed)

**Deliverables:**
- `org_type` column added to `organisations` table (`'insurer'` | `'broker'` | `'platform'`)
- New `broker_submissions` table (source: `'manual'` | `'platform_shared'`; sharing_status; platform_submission_id FK nullable)
- `platform_submission_id` FK column added to `submissions` (insurer table, nullable)
- `source = 'platform_received'` value added to `submissions`
- `BrokerSubmissionsModule` — broker submission creation (both manual and platform_shared)
- `broker-submission.create` permission gate (validates `org_type = 'broker'`)
- Broker Submission List page (`/broker-submissions`)
- Broker New Submission page (`/broker-submissions/new`)

---

### Batch PSS-B — Platform Submission Schema and Lead Invitation
**Scope:** Core platform submission data model, lead market invitation flow

Dependencies: Batch PSS-A complete; OQ-PSS-002, OQ-PSS-007 resolved (OQ-PSS-001 ✅, OQ-PSS-003 ✅ already resolved)

**Deliverables:**
- `platform_submissions`, `platform_submission_tenants`, `placement_invitations` tables
- `PlacementModule` backend (create, invite-lead, list received)
- `PlacementSyncModule` — synchronous create-insurer-copy implementation
- Broker Placement Overview page (basic)
- Insurer Platform Submissions list page

---

### Batch PSS-C — Insurer Quote Response
**Scope:** Insurer reviews submission, provides quote response

Dependencies: Batch PSS-B complete; OQ-PSS-004 resolved

**Deliverables:**
- `placement_quote_responses` table
- `placement/invitations/:id/respond` endpoint
- Insurer Platform Submission View page — MRC view (basic), response form
- MRC View shared module (initial implementation)
- Automated rule evaluation (basic — class of business + premium threshold conditions)
- `insurer_placement_rules` table

---

### Batch PSS-D — Lead Selection and Follow Market
**Scope:** Broker selects lead, follow market invitation

Dependencies: Batch PSS-C complete; OQ-PSS-008 resolved

**Deliverables:**
- `placement_lead_selections` table
- Lead selection endpoint and Lead Selection page
- Follow market invitation endpoint and Follow Market page
- Insurer-side follow market response flow

---

### Batch PSS-E — Signing Down and Placement Completion
**Scope:** Signing down algorithm, placement completion

Dependencies: Batch PSS-D complete

**Deliverables:**
- `placement_participations` table
- Signing-down endpoint and Signing Down page
- Placement Completion flow and status updates
- Workflow queue extensions (broker and insurer)

---

### Batch PSS-F — MRC Document Generation, PDF, and Document Versioning
**Scope:** MRC view integrated with existing PDF pipeline; versioned document records

Dependencies: OQ-PSS-009 resolved ✅; Batch PSS-C complete

**Deliverables:**
- MRC View full implementation
- PDF render-on-demand from structured submission data
- Consistent MRC view across broker and insurer tenants
- `submission_document_versions` table and version-tracking logic
- Insurer notification on new document version generated
- `submission_amendments` and `submission_amendment_approvals` tables created *(logic gated until PSS-G)*

---

### Batch PSS-G — Amendment Approval Workflow *(New scope from OQ-PSS-009)*
**Scope:** Gate material submission field changes behind lead insurer approval before they take effect.

Dependencies: Batch PSS-F complete; at least one active placement with accepted lead in test environment

**Deliverables:**
- Amendment creation endpoint: broker submits proposed material change → `submission_amendments` record created
- Approval/rejection endpoints for lead insurer(s)
- Multi-lead approval logic: amendment only applied when all lead insurers approve
- Rejection notification to broker with reason
- Auto-apply on full approval: update submission field, trigger `placement-sync`, create new document version
- Broker UI: amendment history view, withdraw pending amendment
- Insurer UI: pending approval inbox, approve/reject with notes
- Events: `placement.amendment-proposed`, `placement.amendment-approved`, `placement.amendment-rejected`, `placement.amendment-withdrawn`, `placement.document-version-created`

---

## 19. Open Questions Summary

| ID | Status | Question | Blocks |
|----|--------|----------|--------|
| OQ-PSS-001 | ✅ **Resolved** | New `placement` domain vs. sub-domain of `submissions`? | **Resolved — Checkpoint 2.** Separate top-level domains: `broker-submissions`, `placement`, and `submissions` (existing). Sub-domains rejected: would merge broker-configurable and insurer-configurable modules. See §3.0. |
| OQ-PSS-002 | ❓ Open | `source` column on `broker_submissions` and `platform_received` on `submissions`: CHECK constraint or lookup FK? | `broker_submissions` schema, `submissions` schema |
| OQ-PSS-003 | ✅ **Resolved** | Same or separate workflow status column for platform shared submissions? | **Resolved — Checkpoint 2.** Same `workflow_status` column on both `broker_submissions` and `submissions`. Same queue. Each tenant type may configure their own workflow rules. See §4.7. |
| OQ-PSS-004 | ❓ Open | Can an insurer be lead and follow on same placement? | invitations schema |
| OQ-PSS-005 | ❓ Open | Placement rule conditions: JSONB vs. relational model? | `insurer_placement_rules` schema |
| OQ-PSS-006 | ❓ Open | Placement rules in `PlacementRulesModule` or `SettingsModule`? | Backend module design |
| OQ-PSS-007 | ❓ Open | Synchronous vs. asynchronous placement sync? | `PlacementSyncModule` |
| OQ-PSS-008 | ❓ Open | Signing down: one-shot or proposed/confirmed two-step? | Signing down UX |
| OQ-PSS-009 | ❓ Open | PDF generation pipeline — how does it currently work? | MRC View module |
| OQ-PSS-010 | ❓ Open | Is anonymous (blind) broker identity a future requirement? | Data sharing payload design |
| OQ-PSS-011 | ❓ Open | Minimum viable condition types for placement rules? | PSS-C scope |
| OQ-PSS-012 | ✅ **Deferred** | SLA timers on placement steps — in scope? | **Confirmed deferred — Checkpoint 4.** Not in scope for PSS-A through PSS-G.  `responded_at` timestamp already captured for future use. |
| OQ-PSS-013 | ✅ **Resolved** | Broker as role within any org, or broker as a distinct org type? | Resolved — Checkpoint 1: broker is a distinct `org_type` on `organisations`. See §7.0a. |
| IC-PSS-001 | ✅ **Confirmed with nuance** | Broker orgs never receive submission copies; insurer orgs never create `platform_shared` originals. Confirmed. Nuance: if a dual-role org is ever required, the separate-table architecture makes the decision explicit. See §6.3. |

---

## 20. Assumptions (Subject to Confirmation)

| # | Assumption | Status |
|---|------------|--------|
| A-001 | The broker is always identifiable to the insurer (no anonymous/blind placement in initial scope). | ✅ **Confirmed — Checkpoint 3.** Broker identity always visible to insurers.  Insurer-to-insurer anonymity maintained during placement; all market identities visible after binding. |
| A-002 | A submission can only be shared once as a platform submission (one `platform_submissions` record per broker submission). | Assumed |
| A-003 | The existing PDF generation infrastructure can render from the MRC view data model without fundamental rework. | ✅ **Confirmed — Checkpoint 3.** Render-on-demand approach confirmed.  PDF versioning required.  See §7.10 and §9.7 for versioning and amendment approval flow. |
| A-004 | Synchronisation is one-directional: broker → insurer for submission data; insurer → broker for quote responses only. | Assumed |
| A-005 | The initial automated rule engine supports flat AND condition sets only; nested OR groups are a future enhancement. | ✅ **Confirmed — Checkpoint 3** (via OQ-PSS-005).  Relational conditions model used; flat AND sets for initial build.  Nested OR groups deferred to a future batch. |
| A-006 | An insurer may decline to respond to an invitation without penalty (no forced response). | Assumed |
| A-007 | Signing down runs against all subscribed participations collectively, not per-invitation. | Assumed |
| A-008 | A broker org never receives submission copies; an insurer org never creates `platform_shared` originals. The separate `broker_submissions` / `submissions` table architecture makes this a structural guarantee, not an application assertion. | ✅ **Confirmed — see IC-PSS-001 (§19)** |
| A-009 | Material field changes to a shared submission require lead insurer approval before taking effect.  For the initial build (PSS-A to PSS-F), this gate is not enforced; enforcement is delivered in Batch PSS-G. | Assumed |

---

## ✅ Checkpoint

**Checkpoint 1 — Closed (2026-05-14):**
- OQ-PSS-013 ✅ Resolved: broker is a distinct `org_type`
- `submission_type` ✅ Confirmed: two types only — `manual` and `platform_shared` (Checkpoint 1 framing; Checkpoint 2 supersedes with separate tables)
- `platform_submissions` table ✅ Confirmed: separate table required; flag alone insufficient; rationale documented in §7.0

**Checkpoint 2 — Closed (2026-05-15):**
- Separate `broker_submissions` and `submissions` tables ✅ Confirmed: structural security guarantee, independent domain modules, zero migration risk. See §4 and §6.
- OQ-PSS-001 ✅ Resolved: separate top-level domains (`broker-submissions`, `placement`, `submissions`). Sub-domains rejected. See §3.0.
- OQ-PSS-003 ✅ Resolved: same `workflow_status` column for all submissions. Same queue. Tenant-configurable rules. See §4.7.
- IC-PSS-001 ✅ Confirmed with nuance: broker orgs never receive copies (invariant holds); insurer orgs may create manual submissions. Separate tables make this structural. See §6.3.
- `broker_submissions` table schema documented — see §7.1.
- `broker-submissions` backend module documented — see §8.1.
- Frontend domain folder structure documented — see §11.0.
- Cross-table usage matrix documented — see §7.2.

**Checkpoint 3 — Closed (2026-05-16):**
- OQ-PSS-002 ✅ Resolved: lookup FK pattern for `source`; `lookup_broker_submission_sources` table.  Tech debt: fix `workflow_status` VARCHAR → FK on existing `submission` table in Batch PSS-A.
- OQ-PSS-004 ✅ Resolved: insurer can be invited for both lead and follow.  Unique constraint `(platform_submission_id, insurer_org_code, invitation_type)` confirmed.  `response_intent` column added to capture quote vs follow-only intent before quote creation.
- OQ-PSS-005 ✅ Resolved: relational conditions model.  `insurer_placement_rules` → `rule_conditions` child table.
- OQ-PSS-006 ✅ Resolved: placement rules live in `SettingsModule` (existing rating rules page, extended).
- OQ-PSS-007 ✅ Resolved: synchronous sync for initial build; architecture supports future async substitution.
- OQ-PSS-008 ✅ Resolved: two-step signing-down confirmed.
- OQ-PSS-009 ✅ Resolved: render-on-demand PDF confirmed; PDF versioning required; material change amendment approval workflow added as Batch PSS-G.
- OQ-PSS-010 ✅ Resolved: broker visible to insurers; insurer-to-insurer anonymity until binding.
- OQ-PSS-011 ✅ Resolved: condition types are same as existing rating rules conditions in settings.
- IC-PSS-001 ✅ Confirmed: A-008 updated.
- Auto-rating noted as **future requirement** across §7.5, §7.9, §13.
- Batch PSS-G added: amendment approval workflow (new scope from OQ-PSS-009).
- New tables: `submission_document_versions` (§7.10), `submission_amendments` (§7.11), `submission_amendment_approvals` (§7.11).
- New workflow: `amendment-approval` (§9.7).
- New events: document versioning + amendment approval events (§15).

**Checkpoint 4 — Closed (2026-05-15):**
- Schema micro-decision ✅ Confirmed: `response_intent` on `placement_invitations` is **nullable** throughout.  Application-level validation enforces that a value is set before `responded_at` is recorded.  No DB-level NOT NULL constraint added.  This is consistent with the existing pattern across the platform.
- OQ-PSS-012 ✅ Confirmed deferred: SLA timers are not in scope for the initial batches (PSS-A through PSS-G).  Can be raised as a separate feature request.
- Batch priority ✅ Confirmed: **PSS-A is the first batch to implement.**  All decisions needed for PSS-A are now resolved.

**All open questions resolved.  Design document is complete.  Requirements writing may now begin for Batch PSS-A.**
