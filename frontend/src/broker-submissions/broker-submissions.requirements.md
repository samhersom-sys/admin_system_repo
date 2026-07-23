# REQUIREMENTS — Broker Submissions Domain

**Domain Code:** `PSS-BRK-DOM`
**Location:** `frontend/src/broker-submissions/`
**Status:** Agreed — ready for tests
**Test file:** `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts`
**Standard:** Written per [Guideline 13](../../docs/AI%20Guidelines/13-Requirements-Standards.md)
**Batch:** PSS-A — Broker Organisation Foundation
**Design reference:** `docs/Project Documentation/platform-shared-submissions-design.md §4, §7.0, §7.1`

---

## 1. Scope

**In scope:**
- What a broker submission is and what information it holds
- The two submission types (manual and platform shared) and their business meaning
- The rules that determine which organisations can create and manage broker submissions
- Status lifecycle of a broker submission from creation to close
- The rule that broker submission type values are drawn from a centrally managed approved list
- API adapter functions used by the broker submissions frontend

**Out of scope:**
- Sharing a submission with insurers via the platform (Batch PSS-B)
- Placement activity, invitations, and quote responses (Batches PSS-B onwards)
- Insurer-side submission view (Batch PSS-B)
- Amendment approval workflow (Batch PSS-G)
- UI rendering — see `BrokerSubmissionsPage.requirements.md` and `NewBrokerSubmissionPage.requirements.md`

---

## 2. Impact Analysis

### UI / Front-End Impact
New `broker-submissions` domain folder added under `frontend/src/`. This file covers the domain service and types layer only. See separate requirements files for the list page and new submission page.

### API Impact
The following new endpoints are required (full contract defined in Design Notes §8):
- `POST /api/broker-submissions` — create a new broker submission
- `GET /api/broker-submissions` — list submissions for the requesting user's organisation
- `GET /api/broker-submissions/:id` — retrieve a single submission by ID
- `PUT /api/broker-submissions/:id` — update editable fields on an existing submission

### Database Impact
New tables required (schema defined in design document §7.0a and §7.1):
- `organisations` table: new `org_type` column to record whether an organisation is a broker, insurer, or platform operator
- `broker_submissions` table: holds all broker submission records
- `lookup_broker_submission_sources` table: approved list of submission type values (`manual`, `platform_shared`)

Existing table change:
- `submission` table: `workflow_status` column corrected to reference the approved lookup list consistently with all other status fields on the platform (technical debt fix — no business behaviour change)

---

## 3. Requirements

### 3.1 What a broker submission is

**REQ-PSS-BRK-DOM-F-001:** A broker submission shall record the following information about a risk being placed: insured name, class of business, estimated premium, inception date, expiry date, and an optional reference number provided by the broker.

**REQ-PSS-BRK-DOM-F-002:** A broker submission shall be classified as one of two types at the time it is created: **manual** (the broker is handling placement independently, outside the platform) or **platform shared** (the broker intends to share the submission with one or more insurers via the platform).

**REQ-PSS-BRK-DOM-F-003:** The system shall only accept a submission type value that appears on the platform's approved list of submission source types. Attempts to create a submission with an unlisted type value shall be rejected.

**REQ-PSS-BRK-DOM-F-004:** Each broker submission shall have its own unique identifier assigned by the system at the time of creation.

**REQ-PSS-BRK-DOM-F-005:** A broker submission shall record which organisation created it, which user created it, and the date and time it was created.

**REQ-PSS-BRK-DOM-F-006:** A broker submission shall record the date and time it was most recently updated.

### 3.2 Status lifecycle

**REQ-PSS-BRK-DOM-F-007:** The system shall set the initial status of every new broker submission to **"Created"** when it is first saved.

**REQ-PSS-BRK-DOM-F-008:** The system shall allow the status of a broker submission to be updated by an authorised user of the same organisation. Status transitions follow the platform's standard workflow rules for submissions.

### 3.3 Organisation classification

**REQ-PSS-BRK-DOM-F-009:** The system shall classify every organisation as exactly one of: **broker**, **insurer**, or **platform operator**. An organisation may not hold more than one classification at a time.

**REQ-PSS-BRK-DOM-F-010:** All existing organisations shall be treated as **insurer** organisations unless a platform administrator explicitly sets them to a different classification.

**REQ-PSS-BRK-DOM-F-011:** Only a platform administrator shall be able to change an organisation's classification.

### 3.4 API adapter behaviour

**REQ-PSS-BRK-DOM-F-012:** The `createBrokerSubmission` function shall send the new submission details to the platform and return the saved submission record, including the system-assigned identifier, on success.

**REQ-PSS-BRK-DOM-F-013:** The `listBrokerSubmissions` function shall retrieve all submissions belonging to the currently signed-in user's organisation and shall support optional filtering by submission type and by status.

**REQ-PSS-BRK-DOM-F-014:** The `getBrokerSubmission` function shall retrieve the full details of a single submission by its identifier and shall return a clear error if the submission does not exist or does not belong to the user's organisation.

**REQ-PSS-BRK-DOM-F-015:** The `updateBrokerSubmission` function shall send only the changed fields to the platform and shall return the updated submission record on success.

---

## 4. Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-PSS-BRK-DOM-F-001 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-002 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-003 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-004 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-005 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-006 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-007 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-008 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-009 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-010 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-011 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-012 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-013 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-014 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |
| REQ-PSS-BRK-DOM-F-015 | `frontend/src/broker-submissions/__tests__/broker-submissions.domain.test.ts` | pending |

---

## 5. Open Questions

| ID | Question | Blocks |
|---|---|---|
| OQ-PSS-BRK-001 | Is the broker's own reference number (their internal numbering) mandatory or optional on a new submission? Current assumption: optional — brokers may not have assigned one yet at the time of initial capture. | REQ-PSS-BRK-DOM-F-001 |
| OQ-PSS-BRK-002 | Can a broker change the submission type (manual → platform shared or vice versa) after initial creation? Current assumption: yes, until the submission has been shared on the platform (once shared, type is locked). | REQ-PSS-BRK-DOM-F-002 |
| OQ-PSS-BRK-003 | Is estimated premium mandatory at creation, or can it be filled in later? Current assumption: optional at creation, as brokers may not yet have a precise premium estimate. | REQ-PSS-BRK-DOM-F-001 |

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-05-15 | Initial requirements written for Batch PSS-A |

---

## 7. Design Notes

### Submission types

| Type value | Business meaning |
|---|---|
| `manual` | The broker is managing placement of this risk entirely outside the PolicyForge platform (e.g. by phone, email, or paper slip). The submission record serves as an internal record-keeping entry. |
| `platform_shared` | The broker intends to use the platform to invite one or more insurers to quote or participate. The submission will later be shared via the platform placement workflow (Batch PSS-B). |

### Org type classification

| Classification | Who it applies to |
|---|---|
| `broker` | An organisation that places risk on behalf of insured clients (e.g. a Lloyd's or company market broker) |
| `insurer` | An underwriting organisation that quotes and writes risks (e.g. a Lloyd's syndicate or company underwriter) |
| `platform` | PolicyForge internal accounts and admin access |

### Approved submission source values (`lookup_broker_submission_sources`)

| Code | Display name |
|---|---|
| `manual` | Manual |
| `platform_shared` | Platform Shared |

### Dependencies

- `frontend/src/lib/api-client` — all HTTP calls go through this shared service
- `frontend/src/lib/auth-session` — `orgCode`, `userId`, and `orgType` resolved from session
