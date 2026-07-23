# REQUIREMENTS — Submissions NestJS Module (Backend)

**Domain Code:** `SUB-BE-NE`  
**Location:** `backend/nest/src/submissions/`  
**Status:** Agreed — ready for code  
**Test file:** `backend/nest/src/submissions/submissions.spec.ts`  
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## Scope

**In scope:** All `SubmissionsService` and `SubmissionsController` public methods implementing the submissions API in the NestJS backend. This covers: CRUD operations, edit-lock lifecycle, status transitions, related submission links, and binding authority lookup.

**Out of scope:** Express backend routes (`backend/routes/submissions.js`). Frontend pages. Clearance module (separate requirements file). Workflow status assignment module.

---

## Impact Analysis

### UI / Front-End Impact
None. This requirements file covers the NestJS backend module only.

### API Impact
All endpoints are prefixed `/api/submissions` and require `Authorization: Bearer <JWT>`. All operations are multi-tenant; every query is scoped to `req.user.orgCode`.

| Method | Path | Service method | Status |
|--------|------|----------------|--------|
| GET | `/api/submissions` | `findAll` | Implemented |
| POST | `/api/submissions` | `create` | Implemented |
| GET | `/api/submissions/:id` | `findOne` | Implemented |
| PUT | `/api/submissions/:id` | `update` | Implemented |
| POST | `/api/submissions/:id/submit` | `submit` | Implemented (legacy workflow) |
| POST | `/api/submissions/:id/decline` | `decline` | Implemented (legacy workflow — see note at R08) |
| GET | `/api/submissions/:id/related` | `findRelated` | Implemented |
| POST | `/api/submissions/:id/related` | `linkRelated` | Implemented |
| DELETE | `/api/submissions/:id/related/:relatedId` | `removeRelated` | Implemented |
| GET | `/api/submissions/:id/binding-authorities` | `findBindingAuthorities` | Implemented |
| POST | `/api/submissions/:id/edit-lock` | `acquireEditLock` | Implemented |
| DELETE | `/api/submissions/:id/edit-lock` | `releaseEditLock` | Implemented |

### Database Impact
- `submissions` — base table (pre-existing)
- `submission_edit_lock` — edit lock table, TTL 90 seconds (pre-existing)
- `submission_related` — normalised pair links table (pre-existing)
- `binding_authority` — external table queried by R12 (pre-existing)
- **[C2 — OQ-STAT-001]** `is_active BOOLEAN DEFAULT TRUE NULL` — new column added in Checkpoint C via `TypeORM synchronize()`. Maintained by application events (Checkpoint D) and nightly jobs (Checkpoint E).
- **[C4 — OQ-STAT-005]** `renewed_submission_id INT NULL` — new column, bidirectional renewal link (expiring → new).
- **[C4 — OQ-STAT-005]** `renewed_from_submission_id INT NULL` — new column, bidirectional renewal link (new → expiring).

---

## Requirements

### CRUD Operations

**REQ-SUB-BE-NE-F-001:** The `SubmissionsService.findAll` method shall return all submission records whose `createdByOrgCode` matches the caller's `orgCode`, ordered by `createdDate` descending. When `status` is provided, the result shall be further filtered to only records with that status value. When `status` is omitted, no additional filter is applied. Each returned row shall be augmented with a boolean `hasQuote` field: `true` when at least one quote with matching `submission_id` exists for the org, `false` otherwise.

**REQ-SUB-BE-NE-F-002:** The `SubmissionsService.create` method shall reject with `BadRequestException` when the `insured` field is absent or blank. On a valid payload, it shall set `status = 'Created'`, `isActive = true` (explicit — not relying on DB default), `createdByOrgCode` from the caller's `orgCode`, and auto-compute `expiryDate` as `inceptionDate + 1 year` when `expiryDate` is not explicitly supplied. An explicitly supplied `expiryDate` shall not be overridden.

**REQ-SUB-BE-NE-F-003:** The `SubmissionsService.findOne` method shall throw `NotFoundException` when no submission with the given `id` exists. It shall throw `ForbiddenException` when the submission's `createdByOrgCode` does not match the caller's `orgCode`. On success, it shall return the submission row augmented with `hasQuote: false` and `hasPolicy: false` (computed association flags — full implementation is a future block).

**REQ-SUB-BE-NE-F-006:** The `SubmissionsService.update` method shall throw `NotFoundException` when no submission with the given `id` exists. It shall throw `ConflictException` when the caller does not hold the active edit lock on the submission. It shall apply only the following explicitly enumerated mutable fields, using COALESCE semantics (i.e. a `null` value in the body shall leave the existing stored value unchanged):
  - Core fields: `insured`, `insuredId`, `placingBroker`, `placingBrokerName`, `brokerId`, `contractType`, `inceptionDate`, `expiryDate`, `renewalDate`, `status`, `invitedInsurers`, `partyCreatedId`
  - Workflow/AI fields (migrations 106–108): `workflowNotes`, `aiExtracted`, `reviewRequired`, `emailSource`, `extractionConfidence`
  - Clearance fields (migration 108): `clearanceStatus`, `clearanceStatusCode`, `clearanceNotes`, `autoClearanceChecked`

It shall never allow mutation of `reference`, `id`, `createdDate`, or `createdByOrgCode` via this method.

### Edit Lock

**REQ-SUB-BE-NE-F-004:** The `SubmissionsService.acquireEditLock` method shall throw `NotFoundException` when no submission with the given `id` exists. It shall attempt an UPSERT on `submission_edit_lock` with a TTL of 90 seconds. On successful UPSERT (no conflict), it shall return a lock response with `isHeldByCurrentUser = true`. When the lock is held by another user, it shall throw `ConflictException` with `code: 'SUBMISSION_EDIT_LOCKED'` and include the `lockedByUserId` and `lockedByUserName` of the holder. When the UPSERT fails but no active lock can be found, it shall throw `ConflictException` with `code: 'SUBMISSION_EDIT_LOCK_UNAVAILABLE'`.

**REQ-SUB-BE-NE-F-005:** The `SubmissionsService.releaseEditLock` method shall throw `NotFoundException` when no submission with the given `id` exists. On success, it shall delete the lock row for the given `submission_id` and `user_id` from `submission_edit_lock` and return without error.

### Legacy Workflow Transitions

**REQ-SUB-BE-NE-F-007:** The `SubmissionsService.submit` method shall transition the submission status to `'In Review'`. It shall throw `ConflictException` when the caller does not hold the active edit lock. It shall throw `NotFoundException` when no submission with the given `id` exists.

> **Note:** The `'In Review'` status value is a legacy workflow status not included in the OQ-STAT-007 11-value market status set. Resolution (migration to the new status model or removal of this method) is deferred to a future checkpoint. The method and its tests remain in place as documentation of existing behaviour.

**REQ-SUB-BE-NE-F-008:** The `SubmissionsService.decline` method shall reject with `BadRequestException` when the `reasonCode` parameter is empty or absent. It shall throw `ConflictException` when the caller does not hold the active edit lock. It shall transition the submission status to `'Declined'` and insert an audit entry into `public.audit_event`.

> **Note:** The `'Declined'` status value was removed from `lookup_submission_statuses` per OQ-STAT-004. This `decline()` method predates that decision and operates as a legacy workflow action (underwriter-level decline before quoting). It uses a plain-text status column and is not constrained by the lookup table. Resolution (align with OQ-STAT-004 by routing through `Closed` or a new dedicated mechanism) is deferred to a future checkpoint.

### Related Submissions

**REQ-SUB-BE-NE-F-009:** The `SubmissionsService.findRelated` method shall throw `NotFoundException` when no submission with the given `id` exists. On success, it shall return all submission records linked to the given submission via `submission_related`.

**REQ-SUB-BE-NE-F-010:** The `SubmissionsService.linkRelated` method shall throw `BadRequestException` when `id === relatedId` (self-link). It shall insert a link into `submission_related` with the pair stored in normalised order `(MIN(id, relatedId), MAX(id, relatedId))` to prevent duplicate reverse-direction rows. It shall throw `NotFoundException` when the resulting `SELECT` after insert returns no row (i.e. the `relatedId` does not exist in the database).

**REQ-SUB-BE-NE-F-011:** The `SubmissionsService.removeRelated` method shall throw `NotFoundException` when no submission with the given `id` exists. It shall delete the link from `submission_related` using the normalised pair order `(MIN(id, relatedId), MAX(id, relatedId))`.

**REQ-SUB-BE-NE-F-012:** The `SubmissionsService.findBindingAuthorities` method shall throw `NotFoundException` when no submission with the given `id` exists. On success, it shall return all `binding_authority` records linked to the submission, queried from `binding_authority ba` with `submission_id` as the parameter.

### Checkpoint C — New Column Behaviour (OQ-STAT-001, OQ-STAT-005)

**REQ-SUB-BE-NE-F-C01 [C2 — OQ-STAT-001]:** Every `submission` record shall have an `is_active` boolean column. The default value shall be `true`. When a submission enters a terminal status (`Expired`, `Cancelled`, `Lapsed`, `Renewed`, `Closed`, `Disbanded`), `is_active` shall be set to `false`. When a submission is in an active status (`Open`, `Quoted`, `Bound`, `Issued`, `Active`), `is_active` shall be `true`. The synchronisation between `status` and `is_active` is performed by `updateStatusFromQuote()` (Checkpoint D) and nightly reconciliation jobs (Checkpoint E).

**REQ-SUB-BE-NE-F-C03 [D2 — OQ-STAT-001]:** The `SubmissionsService.updateStatusFromQuote` method shall accept `(submissionId: number | null, status: string, isActive: boolean, orgCode: string)`. When `submissionId` is `null` or `undefined`, the method shall return immediately without error (no-op). When `submissionId` is provided, it shall load the submission by `id` and `createdByOrgCode`, throw `NotFoundException` when not found, then set `submission.status = status` and `submission.isActive = isActive` and save. This method is called by `QuotesService.bind()` (→ `'Bound'`, `true`) and `QuotesService.issuePolicy()` (→ `'Issued'`, `true`).

**REQ-SUB-BE-NE-F-C02 [C4 — OQ-STAT-005]:** The `submission` table shall have two nullable integer columns for bidirectional renewal links:
- `renewed_submission_id`: set on the expiring submission; stores the `id` of the new renewal submission.
- `renewed_from_submission_id`: set on the new renewal submission; stores the `id` of the expiring submission.
Both columns default to `null`. They shall be set atomically when a renewal is processed (Checkpoint D logic). No DB-level FK constraint is applied to these columns; referential integrity is enforced at the service layer.

---

## Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-SUB-BE-NE-F-001 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R01a, R01b |
| REQ-SUB-BE-NE-F-002 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R02a, R02b, R02c, R02d, R02e, R02f |
| REQ-SUB-BE-NE-F-003 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R03a, R03b, R03c |
| REQ-SUB-BE-NE-F-004 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R04a, R04b, R04c, R04d |
| REQ-SUB-BE-NE-F-005 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R05a, R05b |
| REQ-SUB-BE-NE-F-006 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R06a, R06b, R06c, R06d, R06e, R06f, R06g |
| REQ-SUB-BE-NE-F-007 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R07a, R07b, R07c |
| REQ-SUB-BE-NE-F-008 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R08a, R08b, R08c, R08d |
| REQ-SUB-BE-NE-F-009 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R09a, R09b |
| REQ-SUB-BE-NE-F-010 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R10a, R10b, R10c, R10d |
| REQ-SUB-BE-NE-F-011 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R11a, R11b, R11c |
| REQ-SUB-BE-NE-F-012 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R12a, R12b, R12c |
| REQ-SUB-BE-NE-F-C01 | n/a | Schema-level — entity column verified by TypeORM synchronize; no unit test target |
| REQ-SUB-BE-NE-F-C02 | n/a | Schema-level — entity columns verified by TypeORM synchronize; no unit test target |
| REQ-SUB-BE-NE-F-C03 | `backend/nest/src/submissions/submissions.spec.ts` | T-SUB-BE-NE-R13a, R13b, R13c |

---

## Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-STAT-004 | `decline()` still sets status to `'Declined'` which is removed from the 11-value set (OQ-STAT-007). What is the correct replacement status? | Open — see OQ-STAT-009 |
| OQ-STAT-007 | `submit()` still sets status to `'In Review'` which is not in the 11-value set. What is the correct replacement? | Open — see OQ-STAT-009 |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-05-19 | Initial creation — retroactive compliance with §03 Three-Artifact Rule and §13 Requirements Standards. Covers all SubmissionsService public methods (F-001 to F-012). Impact Analysis, traceability, and open questions sections added. |
| 2026-05-19 | Checkpoint C additions — F-C01 (`is_active` column), F-C02 (renewal columns). F-002 updated to note explicit `isActive = true`. Checkpoint D additions — F-C03 (`updateStatusFromQuote()` method). Traceability: R02f, R13a–R13c added. |
