# REQUIREMENTS — Broker Submissions Backend Module

**Domain Code:** `PSS-BRK-BE`
**Location:** `backend/nest/src/broker-submissions/`
**Status:** Agreed — ready for tests
**Test file:** `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts`
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)
**Batch:** PSS-A — Broker Organisation Foundation
**Design reference:** `docs/Project Documentation/platform-shared-submissions-design.md §4, §7.0a, §7.1, §8.1`

---

## 1. Scope

**In scope:**
- Creating a new broker submission
- Retrieving a single broker submission by ID
- Listing all broker submissions for an organisation
- Updating editable fields on a broker submission
- Access control: only broker organisations may use these endpoints
- Tenant isolation: each broker organisation sees only its own submissions
- Audit trail: every creation and update is recorded
- The `org_type` column on organisations (new field, needed to gate access)

**Out of scope:**
- Sharing a submission on the platform (Batch PSS-B)
- Placement, invitations, or quote handling (Batches PSS-B onwards)
- Broker submission deletion (not permitted in this batch — submissions are retained for audit)
- Insurer-facing submission endpoints (existing `submissions` domain, unchanged)

---

## 2. Impact Analysis

### UI / Front-End Impact
None. This file covers the backend API only. Frontend pages are covered in `BrokerSubmissionsPage.requirements.md` and `NewBrokerSubmissionPage.requirements.md`.

### API Impact
New endpoints added:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/broker-submissions` | Create a new broker submission |
| `GET` | `/api/broker-submissions` | List submissions for the signed-in user's organisation |
| `GET` | `/api/broker-submissions/:id` | Retrieve a single submission by ID |
| `PUT` | `/api/broker-submissions/:id` | Update editable fields on a submission |

All endpoints require a valid authenticated session. All endpoints are restricted to users whose organisation is classified as a broker.

### Database Impact
- `organisations` table: new `org_type` column (`broker`, `insurer`, `platform`). All existing rows default to `insurer`. Schema change in design document §7.0a.
- `broker_submissions` table: new table. Schema in design document §7.1.
- `lookup_broker_submission_sources` table: new lookup table. Values: `manual`, `platform_shared`.
- `submission` table (existing): `workflow_status` column updated to reference `lookup_workflow_statuses` (technical debt fix, no behaviour change).

---

## 3. Requirements

### 3.1 Creating a broker submission

**REQ-PSS-BRK-BE-F-001:** The system shall create a new broker submission when a valid request is received and shall return the complete saved submission record, including its system-assigned identifier, to the caller.

**REQ-PSS-BRK-BE-F-002:** The system shall reject a create request and return an error if the insured name is not provided.

**REQ-PSS-BRK-BE-F-003:** The system shall reject a create request and return an error if the inception date is not provided.

**REQ-PSS-BRK-BE-F-004:** The system shall reject a create request and return an error if the submission type is not one of the values on the platform's approved list of submission source types.

**REQ-PSS-BRK-BE-F-005:** The system shall set the submission status to **"Created"** on every new broker submission, regardless of any status value supplied in the request.

**REQ-PSS-BRK-BE-F-006:** The system shall record the organisation of the user creating the submission from their authentication token; it shall not accept an organisation code supplied in the request body as the submission owner.

### 3.2 Retrieving a broker submission

**REQ-PSS-BRK-BE-F-007:** The system shall return the full details of a broker submission when a valid request is made for a submission that belongs to the requesting user's organisation.

**REQ-PSS-BRK-BE-F-008:** The system shall return a "not found" response when a request is made for a submission that does not belong to the requesting user's organisation, regardless of whether that submission exists in the system. The response shall not reveal that the submission exists.

### 3.3 Listing broker submissions

**REQ-PSS-BRK-BE-F-009:** The system shall return a list of all broker submissions belonging to the requesting user's organisation when a list request is received.

**REQ-PSS-BRK-BE-F-010:** The system shall support filtering the list of broker submissions by submission type (manual or platform shared).

**REQ-PSS-BRK-BE-F-011:** The system shall support filtering the list of broker submissions by status.

**REQ-PSS-BRK-BE-F-012:** The system shall return an empty list, not an error, when a broker organisation has no submissions matching the requested filters.

### 3.4 Updating a broker submission

**REQ-PSS-BRK-BE-F-013:** The system shall update the editable fields of a broker submission when a valid update request is received from a user in the same organisation as the submission.

**REQ-PSS-BRK-BE-F-014:** The system shall reject an update request and return an error if the updated submission type value is not on the platform's approved list of submission source types.

**REQ-PSS-BRK-BE-F-015:** The system shall record the date and time of every update to a broker submission.

### 3.5 Access control

**REQ-PSS-BRK-BE-S-001:** The system shall reject any request to the broker submissions endpoints from a user whose organisation is not classified as a broker, unless the user holds the platform administrator role (`internal_admin`). The response shall return a "forbidden" status and shall not reveal details about why access was denied beyond "access denied".

**REQ-PSS-BRK-BE-S-002:** The system shall determine the requesting user's organisation type and role from their authentication token. Organisation type or role claims from the request body or URL shall be ignored.

**REQ-PSS-BRK-BE-S-003:** A broker user shall only be able to create, view, or update submissions belonging to their own organisation. Any attempt to access a submission from a different organisation shall be treated as if the submission does not exist.

**REQ-PSS-BRK-BE-S-004:** All broker submissions endpoints shall require a valid authenticated session. Requests without a valid session shall receive an "unauthorised" response.

**REQ-PSS-BRK-BE-S-007:** A platform administrator (role = `internal_admin`) shall be able to call the list and get-single endpoints for broker submissions. The list endpoint shall return submissions from all organisations (no tenant filter applied). The get-single endpoint shall return any submission by ID regardless of which organisation created it.

**REQ-PSS-BRK-BE-S-008:** A platform administrator shall not be permitted to create or update broker submissions. Requests from a platform administrator to the create or update endpoints shall receive a "forbidden" response.

### 3.6 Audit trail

**REQ-PSS-BRK-BE-S-005:** The system shall record in the audit trail every creation of a broker submission, including: the identifier of the new submission, the user who created it, the organisation they belong to, and the date and time of the action.

**REQ-PSS-BRK-BE-S-006:** The system shall record in the audit trail every update to a broker submission, including: the submission identifier, the fields that were changed, the user who made the change, and the date and time of the action.

### 3.7 Architecture constraints

**REQ-PSS-BRK-BE-C-001:** The broker submissions backend module shall have no direct code dependency on the insurer submissions module. Communication between the two domains shall only occur through the platform event bus or through clearly defined shared interfaces.

**REQ-PSS-BRK-BE-C-002:** The submission type values accepted by the create and update endpoints shall be validated against the `lookup_broker_submission_sources` table, not against a hardcoded list in application code.

---

## 4. Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-PSS-BRK-BE-F-001 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-002 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-003 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-004 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-005 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-006 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-007 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-008 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-009 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-010 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-011 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-012 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-013 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-014 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-F-015 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-S-001 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-S-002 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-S-003 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-S-004 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-S-005 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-S-006 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-S-007 | `backend/nest/src/broker-submissions/broker-submissions.spec.ts` | pending |
| REQ-PSS-BRK-BE-S-008 | `backend/nest/src/broker-submissions/broker-submissions.spec.ts` | pending |
| REQ-PSS-BRK-BE-C-001 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |
| REQ-PSS-BRK-BE-C-002 | `backend/nest/src/broker-submissions/__tests__/broker-submissions.integration.test.ts` | pending |

---

## 5. Open Questions

| ID | Question | Blocks |
|---|---|---|
| OQ-PSS-BRK-004 | Which fields are editable after a broker submission is created? Current assumption: all fields except `org_code`, `created_by`, `created_at`. Submission type (manual/platform shared) is editable until the submission has been shared on the platform. | REQ-PSS-BRK-BE-F-013 |
| OQ-PSS-BRK-005 | Should the list endpoint support pagination? Current assumption: yes, default page size of 50 records. | REQ-PSS-BRK-BE-F-009 |

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-05-15 | Initial requirements written for Batch PSS-A |

---

## 7. Design Notes

### HTTP response codes

| Scenario | HTTP Status |
|---|---|
| Successful creation | 201 Created |
| Successful retrieval or list | 200 OK |
| Successful update | 200 OK |
| Missing required field | 400 Bad Request |
| Invalid submission type value | 400 Bad Request |
| No valid session | 401 Unauthorised |
| Organisation type is not broker | 403 Forbidden |
| Submission not found or belongs to another org | 404 Not Found |

### Organisation type guard

Access to broker submissions endpoints is controlled by a guard that checks the `org_type` field on the organisation record linked to the authenticated user. Only `org_type = 'broker'` is permitted. This check uses the organisation record in the database — it is not derived from the JWT payload alone.

### Technical debt fix (co-delivered with PSS-A)

The existing `submission` table stores `workflow_status` as a free-text column. As part of the PSS-A migration, this column is updated to reference the `lookup_workflow_statuses` table consistently with all other status columns on the platform. This is a corrective data migration with no change to business behaviour — the values already match the lookup codes.
