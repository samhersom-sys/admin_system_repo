# REQUIREMENTS — Backend Route: Submissions

**Domain Code:** `SUB-BE`  
**Location:** `backend/routes/submissions.js`  
**Status:** Implementation pending  
**Test file:** `backend/__tests__/submissions.test.js`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `GET /api/submissions`, `POST /api/submissions`, `GET /api/submissions/:id`, `PUT /api/submissions/:id`, submission edit-lock endpoints (`POST /api/submissions/:id/edit-lock`, `DELETE /api/submissions/:id/edit-lock`); related submissions join table CRUD (`GET /api/submissions/:id/related`, `POST /api/submissions/:id/related`, `DELETE /api/submissions/:id/related/:relatedId`); multi-tenant isolation via `createdByOrgCode`; JWT authentication on every route.  
**Out of scope:** Status transition logic (belongs to workflow domain); field-level validation beyond required-field checks.

---

## 2. Requirements

### 2.1 GET /api/submissions

**REQ-SUB-BE-F-001:** The `GET /api/submissions` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when the header is absent or the token is invalid.

**REQ-SUB-BE-F-002:** The `GET /api/submissions` endpoint shall return HTTP 200 with a JSON array of all submission records where `createdByOrgCode` equals `req.user.orgCode`.

**REQ-SUB-BE-F-003:** The `GET /api/submissions` endpoint shall return HTTP 200 with an empty array `[]` when no matching records exist.

**REQ-SUB-BE-F-004:** The `GET /api/submissions` endpoint shall accept an optional `?status=<value>` query parameter and shall filter the returned array to only records matching that status when the parameter is present.

**REQ-SUB-BE-F-035:** The `GET /api/submissions` endpoint shall accept optional `?date_basis=<label>&date_from=<YYYY-MM-DD>&date_to=<YYYY-MM-DD>` query parameters. When all three are present and `date_basis` maps to a known column (`Created Date` → `createdDate`, `Inception Date` → `inceptionDate`, `Expiry Date` → `expiryDate`), the endpoint shall cast the column value to a date and filter to rows where the date falls within the inclusive range `[date_from, date_to]`. When `date_basis` does not map to a known column, the date parameters shall be silently ignored.

### 2.2 POST /api/submissions

**REQ-SUB-BE-F-005:** The `POST /api/submissions` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-SUB-BE-F-006:** The `POST /api/submissions` endpoint shall return HTTP 400 when the request body does not contain the `insured` field.

**REQ-SUB-BE-F-007:** The `POST /api/submissions` endpoint shall override the `createdByOrgCode` field to `req.user.orgCode` regardless of any value supplied in the request body.

**REQ-SUB-BE-F-008:** The `POST /api/submissions` endpoint shall override the `status` field to `'Created'` regardless of any value supplied in the request body.

**REQ-SUB-BE-F-009:** The `POST /api/submissions` endpoint shall return HTTP 201 with the full inserted record — including the auto-generated `id` — on success.

**REQ-SUB-BE-F-010:** The `POST /api/submissions` endpoint shall return HTTP 500 with an error message when the database operation fails.

### 2.3 GET /api/submissions/:id

**REQ-SUB-BE-F-011:** The `GET /api/submissions/:id` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-SUB-BE-F-012:** The `GET /api/submissions/:id` endpoint shall return HTTP 200 with the submission JSON when the record exists and `createdByOrgCode` equals `req.user.orgCode`.

**REQ-SUB-BE-F-013:** The `GET /api/submissions/:id` endpoint shall return HTTP 404 when no record exists with the given id.

**REQ-SUB-BE-F-014:** The `GET /api/submissions/:id` endpoint shall return HTTP 403 when the record exists but `createdByOrgCode` does not equal `req.user.orgCode`.

### 2.4 PUT /api/submissions/:id

**REQ-SUB-BE-F-015:** The `PUT /api/submissions/:id` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-SUB-BE-F-016:** The `PUT /api/submissions/:id` endpoint shall permit updates to the fields `inceptionDate`, `expiryDate`, `contractType`, `placingBroker`, `placingBrokerId`, and the following fields added by migrations 106–108 (schema-only at first, now API-wired): `workflow_notes`, `ai_extracted`, `review_required`, `email_source`, `email_received_date`, `email_processed_date`, `extraction_confidence`, `assigned_by`, `assigned_date`, `clearance_status`, `clearance_status_code`, `clearance_notes`, `clearance_matched_submissions`, `clearance_reviewed_by`, `clearance_reviewed_date`, `auto_clearance_checked`. These new fields are all optional in the patch body.

**REQ-SUB-BE-F-026:** (Submissions NestJS service — gap-fill) The NestJS `SubmissionsService.update()` method shall also accept and persist the following optional patch fields from migrations 091, 106, 107, 108: `workflow_notes`, `ai_extracted`, `review_required`, `email_source`, `email_received_date`, `email_processed_date`, `extraction_confidence`, `assigned_by`, `assigned_date`, `clearance_status`, `clearance_status_code`, `clearance_notes`, `clearance_matched_submissions`, `clearance_reviewed_by`, `clearance_reviewed_date`, `auto_clearance_checked`. Fields absent from the body shall be left unchanged.

**REQ-SUB-BE-F-017:** The `PUT /api/submissions/:id` endpoint shall strip the fields `status`, `createdByOrgCode`, `createdBy`, and `reference` from the request body before issuing the UPDATE statement.

**REQ-SUB-BE-F-018:** The `PUT /api/submissions/:id` endpoint shall return HTTP 200 with the updated record on success.

**REQ-SUB-BE-F-019:** The `PUT /api/submissions/:id` endpoint shall return HTTP 404 when no record exists with the given id.

**REQ-SUB-BE-F-020:** The `PUT /api/submissions/:id` endpoint shall return HTTP 403 when the record exists but belongs to a different org.

### 2.5 Related Submissions (join table)

*Prerequisites: `submission_related` migration must be run before these endpoints are implemented.*

**REQ-SUB-BE-F-021:** The `GET /api/submissions/:id/related` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-SUB-BE-F-022:** The `GET /api/submissions/:id/related` endpoint shall return HTTP 200 with a JSON array of submission records that are linked to the given submission via the `submission_related` join table, using a JOIN to the `submission` table to return the full submission row.

**REQ-SUB-BE-F-023:** The `GET /api/submissions/:id/related` endpoint shall return HTTP 403 when the parent submission exists but belongs to a different org.

**REQ-SUB-BE-F-024:** The `POST /api/submissions/:id/related` endpoint shall require a valid `Authorization: Bearer <token>` header, shall accept `{ relatedSubmissionId }` in the body, and shall insert a row into the `submission_related` join table linking the two submissions. It shall return HTTP 201 with the newly linked submission record on success.

**REQ-SUB-BE-F-025:** The `POST /api/submissions/:id/related` endpoint shall return HTTP 400 when `relatedSubmissionId` is absent from the body, and HTTP 403 when the parent submission belongs to a different org.

**REQ-SUB-BE-F-026:** The `DELETE /api/submissions/:id/related/:relatedId` endpoint shall require a valid `Authorization: Bearer <token>` header, shall delete the row from `submission_related` where the pair `(submission_id, related_submission_id)` matches, and shall return HTTP 204 on success or HTTP 404 when the link does not exist.

### 2.6 Concurrent Edit Lock

**REQ-SUB-BE-F-027:** The `POST /api/submissions/:id/edit-lock` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-SUB-BE-F-028:** The `POST /api/submissions/:id/edit-lock` endpoint shall, when the submission belongs to `req.user.orgCode` and no unexpired lock exists or the unexpired lock is already held by the current user, create or renew the submission edit lock and return HTTP 200 with a JSON body containing `submissionId`, `lockedByUserId`, `lockedByUserName`, `lockedByUserEmail`, `expiresAt`, and `isHeldByCurrentUser: true`.

**REQ-SUB-BE-F-029:** The `POST /api/submissions/:id/edit-lock` endpoint shall return HTTP 409 with a user-facing message naming the current lock holder when another user holds an unexpired edit lock for the submission.

**REQ-SUB-BE-F-030:** The `DELETE /api/submissions/:id/edit-lock` endpoint shall require a valid `Authorization: Bearer <token>` header, shall release the current user's edit lock for that submission when one exists, and shall return HTTP 204 regardless of whether a lock row was deleted.

**REQ-SUB-BE-F-031:** The `PUT /api/submissions/:id` endpoint shall require the current user to hold the active submission edit lock before updating any editable submission fields.

**REQ-SUB-BE-F-032:** The `PUT /api/submissions/:id` endpoint shall return HTTP 409 with a user-facing message naming the lock holder when another user holds the active submission edit lock, and shall return HTTP 409 with a generic refresh-and-retry message when no active lock is held by the caller.

**REQ-SUB-BE-F-033:** The `POST /api/submissions/:id/submit` endpoint shall require the current user to hold the active submission edit lock before transitioning the submission status.

**REQ-SUB-BE-F-034:** The `POST /api/submissions/:id/decline` endpoint shall require the current user to hold the active submission edit lock before transitioning the submission status.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-SUB-BE-F-001 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-002 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-003 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-004 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-005 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-006 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-007 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-008 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-009 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-010 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-011 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-012 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-013 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-014 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-015 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-016 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-017 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-018 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-019 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-020 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-021 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-022 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-023 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-024 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-025 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-026 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-027 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-028 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-029 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-030 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-031 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-032 | `backend/__tests__/submissions.test.js` | pending |
| REQ-SUB-BE-F-033 | `backend/__tests__/submissions.test.js` | validated |
| REQ-SUB-BE-F-034 | `backend/__tests__/submissions.test.js` | validated |
| REQ-SUB-BE-F-035 | `backend/__tests__/submissions.test.js` | T-SUB-BE-R35a, T-SUB-BE-R35b, T-SUB-BE-R35c |

---

## 4. Open Questions

**Migration note:** A `submission_related` join table is required before any of the related-submissions endpoints can be implemented. This table must be created via a numbered migration script (e.g. `backend/migrations/NNN-create-submission-related-table.js`) before the routes are written.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-SUB-BE-{TYPE}-{NNN} format per Guideline 13 |
| 2026-03-20 | Added REQ-SUB-BE-F-021–F-026: related submissions join table endpoints (Block E) |
| 2026-03-23 | Added REQ-SUB-BE-F-027–F-034: submission concurrent edit-lock acquire/release plus save, submit, and decline enforcement |
| 2026-05-22 | Added REQ-SUB-BE-F-035: date range filtering (date_basis, date_from, date_to) for Submissions Report date filter fix |

---

## 6. Design Notes

### Database table: `submission`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL | PK |
| `reference` | VARCHAR | System generated |
| `submissionType` | VARCHAR | |
| `insured` | VARCHAR | Display name of insured |
| `insuredId` | VARCHAR | FK to party record |
| `placingBroker` | VARCHAR | Broker company name |
| `placingBrokerId` | VARCHAR | FK to party record |
| `contractType` | VARCHAR | |
| `inceptionDate` | DATE | |
| `expiryDate` | DATE | |
| `status` | VARCHAR | Lifecycle status |
| `createdDate` | TIMESTAMPTZ | |
| `createdBy` | VARCHAR | |
| `createdByOrgCode` | VARCHAR | Tenant scope |

### Dependencies

- `backend/db.js` — `runQuery`, `runCommand`
- `backend/middleware/auth.js` — `authenticateToken`
