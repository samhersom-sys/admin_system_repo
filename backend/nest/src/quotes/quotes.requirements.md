# REQUIREMENTS — Quotes NestJS Module (Backend)

**Domain Code:** `QUO-BE-NE`  
**Location:** `backend/nest/src/quotes/`  
**Status:** Agreed — ready for code  
**Test file:** `backend/nest/src/quotes/quotes.spec.ts`  
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)  
**Amendment authority:** §1.8 — `QUO-BE-NE` domain code added to §13 §8 table (2026-03-25)

---

## Scope

**In scope:** All NestJS `QuotesService` and `QuotesController` public methods implementing the quotes API in the NestJS backend. This covers: CRUD operations, lifecycle transitions (mark quoted, bind, decline), audit events, copy, and sections management.

**Out of scope:** Express backend routes (`backend/routes/quotes.js` — covered by `QUO-BE` domain). Frontend pages. Coverages, deductions, participations (separate requirements files when implemented). Section detail PUT endpoint (Block 4 — not yet built).

---

## Impact Analysis

### UI / Front-End Impact
None. This requirements file covers the NestJS backend module only.

### API Impact
The following NestJS endpoints are covered by this requirements file. All endpoints are prefixed `/api/quotes` and require `Authorization: Bearer <JWT>`. All are multi-tenant; every operation is scoped to `req.user.orgCode`.

| Method | Path | Service method | Status |
|--------|------|----------------|--------|
| GET | `/api/quotes` | `findAll` | Implemented |
| POST | `/api/quotes` | `create` | Implemented |
| GET | `/api/quotes/:id` | `findOne` | Implemented |
| PUT | `/api/quotes/:id` | `update` | Implemented — Block 2 field gap (REQ-QUO-BE-NE-F-012) |
| POST | `/api/quotes/:id/quote` | `markQuoted` | Implemented |
| POST | `/api/quotes/:id/bind` | `bind` | Implemented |
| POST | `/api/quotes/:id/decline` | `decline` | Implemented |
| GET | `/api/quotes/:id/audit` | `getAudit` | Implemented — raw SQL (documented exception) |
| POST | `/api/quotes/:id/audit` | `postAudit` | Implemented — raw SQL (documented exception) |
| POST | `/api/quotes/:id/copy` | `copy` | **Not yet implemented** — REQ-QUO-BE-NE-F-010 |
| GET | `/api/quotes/:id/sections` | `listSections` | Implemented — raw SQL pending TypeORM migration |
| POST | `/api/quotes/:id/sections` | `createSection` | Implemented — raw SQL pending TypeORM migration |
| DELETE | `/api/quotes/:id/sections/:sectionId` | `deleteSection` | Implemented — raw SQL pending TypeORM migration |

### Database Impact
- `db/migrations/008-create-quotes-table.js` — base table (pre-existing)
- `db/migrations/074-alter-quotes-add-deleted-at.js` — `deleted_at` column (pre-existing)
- `db/migrations/084-alter-quotes-add-currency.js` — `quote_currency` column (pre-existing)
- `db/migrations/092-alter-quotes-add-last-opened.js` — `last_opened_date` column (pre-existing)
- `db/migrations/093-alter-quotes-add-block2-fields.js` — 12 Block 2 columns (`year_of_account`, `lta_applicable`, `lta_start_date/time`, `lta_expiry_date/time`, `contract_type`, `method_of_placement`, `unique_market_reference`, `renewable_indicator`, `renewal_date`, `renewal_status`) — must be reflected in entity before REQ-QUO-BE-NE-F-012 is satisfied
- `db/migrations/012-create-quote-sections-table.js` — `quote_sections` table (pre-existing)
- `db/migrations/078-alter-quote_sections-add-deleted-at.js` — `deleted_at` on sections (pre-existing)

---

## Requirements

### CRUD Operations

**REQ-QUO-BE-NE-F-001:** The `QuotesService.findAll` method shall return all quote records whose `created_by_org_code` matches the caller's `orgCode`, ordered by `created_date` descending. When `submissionId` is provided, the result shall be further filtered to only records whose `submission_id` matches. When `status` is provided, the result shall be further filtered to only records with that status value.

**REQ-QUO-BE-NE-F-002:** The `QuotesService.create` method shall reject with `BadRequestException` when the `insured` field is absent or blank. On a valid payload it shall generate a unique reference in the format `QUO-{ORG}-{YYYYMMDD}-{NNN}` where `NNN` is a zero-padded sequence of existing references for that org-date prefix, incremented by one. The created quote shall have `status = 'Draft'`, `inception_time` defaulting to `'00:00:00'`, `expiry_time` defaulting to `'23:59:59'`, `quote_currency` defaulting to `'USD'`, and `expiry_date` auto-computed as inception + 365 days when not supplied.

**REQ-QUO-BE-NE-F-003:** The `QuotesService.findOne` method shall return the quote record when the query scoped to the caller's `orgCode` returns a match (`WHERE id = :id AND created_by_org_code = :orgCode`). It shall throw `NotFoundException` when no record matching both conditions is found. Org-level access control is enforced structurally at the query level; a separate `ForbiddenException` (403) is not applied in this method — from the caller's perspective, another org's quote simply does not exist (see OQ-QUO-BE-NE-003).

**REQ-QUO-BE-NE-F-004:** The `QuotesService.update` method shall throw `NotFoundException` when no record exists. It shall throw `ForbiddenException` when `created_by_org_code` does not match. It shall throw `BadRequestException` when the quote status is `'Bound'` or `'Declined'`. On a valid request it shall apply only the explicitly enumerated mutable fields (`insured`, `insured_id`, `submission_id`, `business_type`, `inception_date`, `expiry_date`, `inception_time`, `expiry_time`, `quote_currency`, `payload`) and return the updated record. It shall never allow mutation of `reference`, `id`, `status`, `created_date`, or `created_by_org_code` via this method.

### Lifecycle Transitions

**REQ-QUO-BE-NE-F-005:** The `QuotesService.markQuoted` method shall transition the quote status from `'Draft'` to `'Quoted'`. It shall throw `BadRequestException` when the current status is not `'Draft'`. It shall throw `NotFoundException` when no record exists. It shall throw `ForbiddenException` when `orgCode` does not match.

**REQ-QUO-BE-NE-F-006:** The `QuotesService.bind` method shall transition the quote status from `'Quoted'` to `'Bound'`. It shall throw `BadRequestException` when the current status is not `'Quoted'`. It shall throw `NotFoundException` when no record exists. It shall throw `ForbiddenException` when `orgCode` does not match.

**REQ-QUO-BE-NE-F-007:** The `QuotesService.decline` method shall throw `BadRequestException` when `reasonCode` is absent. It shall throw `BadRequestException` when the current quote status is `'Bound'`. It shall transition the quote status to `'Declined'` and merge `{ declineReasonCode, declineReasonText }` into the `payload` JSONB column. It shall throw `NotFoundException` when no record exists. It shall throw `ForbiddenException` when `orgCode` does not match.

### Audit

**REQ-QUO-BE-NE-F-008:** The `QuotesService.getAudit` method shall delegate to `AuditService.getHistory('Quote', id)`, which returns all `audit_event` rows for the quote mapped to `{ action, user, userId, date, details, changes }` ordered oldest-first. It shall throw `NotFoundException` when the quote does not exist. It shall throw `ForbiddenException` when `orgCode` does not match. No direct `DataSource.query` call shall be made in this method (see OQ-QUO-BE-NE-006).

**REQ-QUO-BE-NE-F-009:** The `QuotesService.postAudit` method shall delegate to `AuditService.writeEvent(body, user)` to write a single audit event for the quote (`entityType = 'Quote'`, `entityId = :id`). It shall return the created audit event as `{ id, action, entity_type, entity_id, created_at, otherUsersOpen }` with HTTP status 201. `otherUsersOpen` shall be populated from the `writeEvent` result when the action contains `"Opened"`, and shall be an empty array `[]` otherwise. It shall throw `BadRequestException` when `action` is absent or not a string. It shall throw `NotFoundException` when the quote does not exist. It shall throw `ForbiddenException` when `orgCode` does not match. No direct `DataSource.query` call shall be made in this method. No `getHistory` call is required — the response is the created event, not the full audit history (updated 2026-04-09 — previous shape `{ success, audit, otherUsersOpen }` superseded by RESTful created-resource response).

**REQ-QUO-BE-NE-F-014:** When the `action` in a `POST /api/quotes/:id/audit` request contains the word `"Opened"`, the `postAudit` method shall include `otherUsersOpen: string[]` in the response, populated by `AuditService.detectConcurrentUsers('Quote', id, userName)`. When `action` does not contain `"Opened"`, `otherUsersOpen` shall be an empty array `[]` in the response. (See OQ-AUDIT-001 for rationale.)

### Copy

**REQ-QUO-BE-NE-F-010:** The `QuotesService.copy` method shall create a new `Draft` quote by duplicating all editable header fields from the source quote (`insured`, `insured_id`, `submission_id`, `business_type`, `inception_date`, `expiry_date`, `inception_time`, `expiry_time`, `quote_currency`, and all Block 2 fields from migration 093). The copy shall be available from any source status including `'Declined'`. The `declineReasonCode` and `declineReasonText` values from the source quote's `payload` shall NOT be copied to the new Draft — the copy represents a fresh attempt, not a continuation of the declined quote (see OQ-QUO-BE-NE-007). The new quote shall be assigned a freshly generated reference (same format as REQ-QUO-BE-NE-F-002), `status = 'Draft'`, and `created_by_org_code = orgCode`. It shall throw `NotFoundException` when no record is found for the given `id` and `orgCode` (query-scoped lookup; consistent with F-003 pattern from OQ-QUO-BE-NE-003 — a record belonging to another org is treated as non-existent, not as a 403). The 201 response body shall be the newly created quote record.

### Sections

**REQ-QUO-BE-NE-F-011:** The `QuotesService.listSections` method shall return all `quote_sections` rows where `quote_id = :id` and `deleted_at IS NULL`, ordered by `id` ascending. It shall throw `NotFoundException` when the parent quote does not exist. It shall throw `ForbiddenException` when `orgCode` does not match.

**REQ-QUO-BE-NE-F-012:** The `QuotesService.createSection` method shall insert a new row into `quote_sections` with an auto-generated reference derived from the parent quote reference and the next available sequence number (e.g. `{quoteRef}-S01`). It shall throw `BadRequestException` when the parent quote status is `'Bound'` or `'Declined'`. It shall throw `NotFoundException` when the parent quote does not exist. It shall throw `ForbiddenException` when `orgCode` does not match. The response shall be the newly created section row and the HTTP status shall be 201.

**REQ-QUO-BE-NE-F-013:** The `QuotesService.deleteSection` method shall soft-delete the section record by setting `deleted_at = NOW()`. It shall throw `NotFoundException` when the section does not exist for the given `id` and `sectionId`, or has already been soft-deleted. It shall throw `ForbiddenException` when the parent quote's `orgCode` does not match. The response shall be `{ message: 'Section deleted' }`.

### Coverages

**REQ-QUO-BE-NE-F-041:** The `QuotesService.getCoverages` method shall return all `quote_section_coverages` rows where `section_id = :sectionId` and `deleted_at IS NULL`, ordered by `id` ascending. It shall throw `NotFoundException` when the parent quote does not exist for the given `id` and `orgCode`. It shall throw `ForbiddenException` when `orgCode` does not match. **Prerequisite:** migration 100 creates the `quote_section_coverages` table.

**REQ-QUO-BE-NE-F-042:** The `QuotesService.createCoverage` method shall insert a new row into `quote_section_coverages` with an auto-generated `reference` of the form `{sectionRef}-COV-{NNN}` where `NNN` is a 3-digit zero-padded count of existing non-deleted coverages for that section plus one. It shall throw `NotFoundException` when the parent quote does not exist. It shall throw `ForbiddenException` when `orgCode` does not match. The response shall be the created coverage row and the HTTP status shall be 201.

**REQ-QUO-BE-NE-F-043:** The `QuotesService.updateCoverage` method shall apply only the mutable fields from the request body to the identified `quote_section_coverages` row and return the updated record. When both `effective_date` and `expiry_date` are present and non-null in the request body, the server shall compute and persist `days_on_cover = Math.max(0, Math.ceil((new Date(expiry_date) - new Date(effective_date)) / 86400000))`. It shall throw `NotFoundException` when the coverage does not exist for the given `coverageId` and `sectionId`. It shall throw `ForbiddenException` when `orgCode` does not match.

**REQ-QUO-BE-NE-F-044:** The `QuotesService.deleteCoverage` method shall soft-delete the coverage row by setting `deleted_at = NOW()`. It shall throw `NotFoundException` when the coverage does not exist. It shall throw `ForbiddenException` when `orgCode` does not match. The HTTP response status shall be 204 with no body.

### Security

**REQ-QUO-BE-NE-S-001:** All `QuotesController` routes shall require a valid JWT via `JwtAuthGuard`. Any request without a valid token shall receive HTTP 401.

**REQ-QUO-BE-NE-S-002:** All service methods that read or mutate quote data shall compare the caller's `orgCode` (from the JWT) with the record's `created_by_org_code`. A mismatch shall result in `ForbiddenException` (HTTP 403). Under no circumstances shall a caller be permitted to read or modify another organisation's quote records.

**REQ-QUO-BE-NE-S-003:** The `update` method shall never allow the caller to overwrite `status` directly. Status transitions are only permitted via the dedicated transition methods (`markQuoted`, `bind`, `decline`).

### Constraints

**REQ-QUO-BE-NE-C-001:** All quote CRUD operations (`findAll`, `findOne`, `create`, `update`, `markQuoted`, `bind`) shall use the TypeORM `Repository<Quote>` injected via `@InjectRepository(Quote)`. Direct `DataSource.query` (raw SQL) shall not be used for these operations.

**REQ-QUO-BE-NE-C-002:** ~~Superseded 2026-03-25~~ — The `decline` method shall fetch the current record via `repository.findOne()`, merge `{ declineReasonCode, declineReasonText }` into `payload` in JavaScript, then save via `repository.save()`. The raw SQL JSONB merge exception is removed (see OQ-QUO-BE-NE-005).

**REQ-QUO-BE-NE-C-003:** ~~Superseded 2026-03-25~~ — The `getAudit` and `postAudit` methods shall delegate to `AuditService`, which uses the `AuditEvent` TypeORM entity. The raw SQL exception is removed once the `AuditEvent` entity is created (see OQ-QUO-BE-NE-006).

**REQ-QUO-BE-NE-C-004:** The `listSections`, `createSection`, and `deleteSection` methods shall use the TypeORM `Repository<QuoteSection>` injected via `@InjectRepository(QuoteSection)` once the `QuoteSection` entity exists. Until the entity is created, raw SQL with a `// TODO: migrate to QuoteSection entity — REQ-QUO-BE-NE-C-004` comment is the interim approach.

**REQ-QUO-BE-NE-C-005:** All errors encountered in service methods shall be logged to the `error_log` table via the `logError` private method before re-throwing. This applies to 500-class errors only; 4xx validation errors (BadRequestException, NotFoundException, ForbiddenException) do not require `error_log` entries but should log at `console.warn` where appropriate.

---

## Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-QUO-BE-NE-F-001 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R01 |
| REQ-QUO-BE-NE-F-002 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R02a, R02b, R02c |
| REQ-QUO-BE-NE-F-003 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R03a, R03b, R03c |
| REQ-QUO-BE-NE-F-004 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R04a, R04b, R04c, R04d |
| REQ-QUO-BE-NE-F-005 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R05a, R05b |
| REQ-QUO-BE-NE-F-006 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R06a, R06b |
| REQ-QUO-BE-NE-F-007 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R07a, R07b, R07c |
| REQ-QUO-BE-NE-F-008 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R08a, R08b |
| REQ-QUO-BE-NE-F-009 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R09a, R09b |
| REQ-QUO-BE-NE-F-014 | `backend/nest/src/quotes/quotes.spec.ts` | pending — Stage 2 |
| REQ-QUO-BE-NE-F-041 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R41a, R41b, R41c |
| REQ-QUO-BE-NE-F-042 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R42a, R42b, R42c, R42d |
| REQ-QUO-BE-NE-F-043 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R43a, R43b, R43c, R43d |
| REQ-QUO-BE-NE-F-044 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R44a, R44b, R44c |
| REQ-QUO-BE-NE-F-010 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R10a, R10b, R10c |
| REQ-QUO-BE-NE-F-011 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R11a, R11b |
| REQ-QUO-BE-NE-F-012 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R12a, R12b, R12c |
| REQ-QUO-BE-NE-F-013 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R13a, R13b |
| REQ-QUO-BE-NE-S-001 | controller integration test | pending |
| REQ-QUO-BE-NE-S-002 | `backend/nest/src/quotes/quotes.spec.ts` | (NotFoundException / ForbiddenException paths above) |
| REQ-QUO-BE-NE-S-003 | `backend/nest/src/quotes/quotes.spec.ts` | T-QUO-BE-NE-R04a |
| REQ-QUO-BE-NE-C-001 | code review | — |
| REQ-QUO-BE-NE-C-002 | code review | — |
| REQ-QUO-BE-NE-C-003 | code review | — |
| REQ-QUO-BE-NE-C-004 | code review | — |
| REQ-QUO-BE-NE-C-005 | code review | — |

---

## Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-QUO-BE-NE-001 | Should `copy` also duplicate sections (deep copy)? Backup `routes/quotes.js` does not copy sections — shallow copy only. | Closed — shallow copy only, matching Express behaviour |
| OQ-QUO-BE-NE-002 | `update` currently does not accept Block 2 fields (`yearOfAccount`, `ltaApplicable`, etc.) because the `Quote` entity lacks those columns. Should the entity be extended? | Closed — Yes. `quote.entity.ts` must be extended (migration 093 already run) and `update()` must enumerate the new mutable fields. |
| OQ-QUO-BE-NE-003 | Should `findOne` throw 403 for org mismatch? | Closed — Remove 403; enforce at query level; 404 returned for another org's quote. F-003 updated. |
| OQ-QUO-BE-NE-004 | Is concurrent user detection needed now in NestJS? | Closed — Yes. `AuditService.detectConcurrentUsers()` to be implemented; result in `postAudit` response via F-014. |
| OQ-QUO-BE-NE-005 | Should `decline()` JSONB merge use raw SQL or JS? | Closed — JS merge. C-002 superseded. |
| OQ-QUO-BE-NE-006 | Should audit raw SQL be replaced with AuditEvent TypeORM entity? | Closed — Yes. AuditEvent entity to be created; C-003 superseded. |
| OQ-QUO-BE-NE-007 | Should `copy` allow Declined as source status? | Closed — Yes; declinature reason not copied. F-010 updated. |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-25 | Initial creation — retroactive compliance with §03 Three-Artifact Rule. Covers all currently-implemented NestJS quotes service methods (F-001 to F-009, F-011 to F-013) plus planned Copy endpoint (F-010). Three violations acknowledged: sections added without requirements, copy not yet in NestJS, Block 2 entity gap. |
| 2026-03-25 | F-003 amended — ForbiddenException removed; org-scoping enforced at query level (OQ-QUO-BE-NE-003). F-008/F-009 amended — delegate to AuditService; no direct DataSource.query (OQ-QUO-BE-NE-006). F-009 response shape updated to include `{ success, audit, otherUsersOpen }`. F-014 added — concurrent-user detection in postAudit response (OQ-AUDIT-001). F-010 amended — copy available from all statuses including Declined; declinature reason not copied (OQ-QUO-BE-NE-007). C-002/C-003 superseded. |
| 2026-03-25 | F-010 further amended (Stage 2 prerequisite) — ForbiddenException for orgCode mismatch removed; replaced with NotFoundException (query-scoped lookup consistent with F-003). Traceability: R10c updated, R10d added. |
