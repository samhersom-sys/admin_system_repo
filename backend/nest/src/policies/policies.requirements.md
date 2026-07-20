# REQUIREMENTS — Policies NestJS Module (Backend)

**Domain Code:** `POL-BE-NE`  
**Location:** `backend/nest/src/policies/`  
**Status:** Agreed — ready for code  
**Test file:** `backend/nest/src/policies/policies.spec.ts`  
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## Scope

**In scope:** All `PoliciesService` and `PoliciesController` public methods implementing the policies API in the NestJS backend. This covers: CRUD operations, sections management, endorsements, invoices, transactions, coverages, locations, audit, and GWP analytics.

**Out of scope:** Express backend routes (`backend/routes/policies.js`). Frontend pages. Policy section coverages detail editing (not yet built).

---

## Impact Analysis

### UI / Front-End Impact
None. This requirements file covers the NestJS backend module only.

### API Impact
All endpoints are prefixed `/api/policies` and require `Authorization: Bearer <JWT>`. All operations are multi-tenant; every query is scoped to `req.user.orgCode`.

| Method | Path | Service method | Status |
|--------|------|----------------|--------|
| GET | `/api/policies` | `findAll` | Implemented |
| GET | `/api/policies/gwp-monthly` | `getGwpMonthly` | Implemented |
| GET | `/api/policies/gwp-cumulative` | `getGwpCumulative` | Implemented |
| GET | `/api/policies/gwp-summary` | `getGwpSummary` | Implemented |
| POST | `/api/policies` | `create` | Implemented |
| GET | `/api/policies/:id` | `findOne` | Implemented |
| PUT | `/api/policies/:id` | `update` | Implemented |
| GET | `/api/policies/:id/sections` | `getSections` | Implemented |
| POST | `/api/policies/:id/sections` | `createSection` | Implemented |
| GET | `/api/policies/:id/sections/:sectionId` | `getSectionDetail` | Implemented |
| GET | `/api/policies/:id/invoices` | `getInvoices` | Implemented |
| GET | `/api/policies/:id/transactions` | `getTransactions` | Implemented |
| POST | `/api/policies/:id/transactions` | `createTransaction` | Implemented |
| GET | `/api/policies/:id/sections/:sectionId/transactions` | `getSectionTransaction` | Implemented |
| GET | `/api/policies/:id/audit` | `getAudit` | Implemented |
| POST | `/api/policies/:id/audit` | `postAudit` | Implemented |
| GET | `/api/policies/:id/endorsements` | `getEndorsements` | Implemented |
| POST | `/api/policies/:id/endorsements` | `createEndorsement` | Implemented |
| POST | `/api/policies/:id/endorsements/:endorsementId/issue` | `issueEndorsement` | Implemented |
| GET | `/api/policies/:id/sections/:sectionId/coverages` | `getCoverages` | Implemented |
| GET | `/api/policies/:id/locations` | `getLocations` | Implemented |

### Database Impact
- `policies` — base table (pre-existing)
- `policy_sections` — raw SQL (no TypeORM entity yet, pre-existing)
- `policy_transactions` — raw SQL (no TypeORM entity yet, pre-existing)
- `policy_invoices` — raw SQL (no TypeORM entity yet, pre-existing)
- `policy_section_coverages` — raw SQL (no TypeORM entity yet, pre-existing)
- `policy_location_rows` — raw SQL (no TypeORM entity yet, pre-existing)
- **[C3 — OQ-STAT-002]** `version_status_id INT NULL` — new column added in Checkpoint C via `TypeORM synchronize()`, FK referencing `lookup_policy_version_statuses(id)`. Holds `Original` or `Endorsed`.
- `lookup_policy_version_statuses` — new lookup table seeded with `Original` (ORIGINAL) and `Endorsed` (ENDORSED) in Checkpoint C.

---

## Requirements

### CRUD Operations

**REQ-POL-BE-NE-F-001:** The `PoliciesService.findAll` method shall return all policy records whose `createdByOrgCode` matches the caller's `orgCode`, ordered by `createdDate` descending. When the org has no policies, it shall return an empty array.

**REQ-POL-BE-NE-F-002:** The `PoliciesService.findOne` method shall return the policy record when the query scoped to the caller's `orgCode` returns a match. It shall throw `NotFoundException` when no record with the given `id` exists. It shall throw `ForbiddenException` when the record's `createdByOrgCode` does not match the caller's `orgCode`.

**REQ-POL-BE-NE-F-003:** The `PoliciesService.create` method shall generate a unique reference in the format `POL-{ORG}-{YYYYMMDD}-{NNN}` where `NNN` is a zero-padded sequence, incremented from the last existing reference for that org-date prefix. The created policy shall have `status = 'Active'`. It shall map `quote_id` and `submission_id` from snake_case body fields to camelCase entity properties (`quoteId`, `submissionId`). The `createdBy` parameter shall be set directly on the created record.

**REQ-POL-BE-NE-F-004:** The `PoliciesService.update` method shall throw `NotFoundException` when no policy with the given `id` exists. It shall throw `ForbiddenException` when `createdByOrgCode` does not match. On a valid request, it shall apply the updated fields and return the saved record.

### Sections

**REQ-POL-BE-NE-F-005:** The `PoliciesService.getSections` method shall throw `NotFoundException` when no policy with the given `id` exists. On success, it shall return all rows from `policy_sections` for that `policy_id`.

**REQ-POL-BE-NE-F-006:** The `PoliciesService.getSectionDetail` method shall throw `NotFoundException` when no policy with the given `id` exists, or when no section with the given `sectionId` exists on that policy. On success, it shall return the single section row.

### Financial Sub-Resources

**REQ-POL-BE-NE-F-007:** The `PoliciesService.getInvoices` method shall throw `NotFoundException` when no policy with the given `id` exists. On success, it shall return all rows from `policy_invoices` for that `policy_id`.

**REQ-POL-BE-NE-F-008:** The `PoliciesService.getTransactions` method shall throw `NotFoundException` when no policy with the given `id` exists. On success, it shall return all rows from `policy_transactions` for that `policy_id`.

### Audit

**REQ-POL-BE-NE-F-009:** The `PoliciesService.getAudit` method shall throw `NotFoundException` when no policy with the given `id` exists. On success, it shall delegate to `AuditService.getHistory` with `entityType = 'Policy'` and return the result.

**REQ-POL-BE-NE-F-010:** The `PoliciesService.postAudit` method shall throw `BadRequestException` when `event_type` is missing or empty. It shall throw `NotFoundException` when no policy with the given `id` exists. On success, it shall write the audit event via `AuditService.writeEvent` with `entityType = 'Policy'` and `entityId` matching the policy `id`, and return `{ success: true, audit, otherUsersOpen }`.

### Endorsements

**REQ-POL-BE-NE-F-011:** The `PoliciesService.getEndorsements` method shall throw `NotFoundException` when no policy with the given `id` exists. On success, it shall return all endorsement-type rows from `policy_transactions` for that `policy_id`.

**REQ-POL-BE-NE-F-012:** The `PoliciesService.createEndorsement` method shall throw `NotFoundException` when no policy with the given `id` exists. It shall throw `BadRequestException` when `endorsement_type` is missing. It shall throw `BadRequestException` when `effective_date` is missing. On a valid request, it shall insert a new row into `policy_transactions` with `transaction_type = 'Contractual'` and `status = 'Draft'`, and return the created row augmented with `sub_type` set from `endorsement_type`.

**REQ-POL-BE-NE-F-013:** The `PoliciesService.issueEndorsement` method shall throw `NotFoundException` when no policy with the given `id` exists. It shall throw `NotFoundException` when the endorsement row identified by `endorsementId` is not found. On success, it shall update the endorsement status to `'Issued'` and return `{ policy, endorsement }` where `endorsement.sub_type` defaults to `null` when not present.

### Coverages and Locations

**REQ-POL-BE-NE-F-014:** The `PoliciesService.getCoverages` method shall throw `NotFoundException` when no policy with the given `id` exists. On success, it shall return all rows from `policy_section_coverages` for that `policy_id` and `section_id`.

**REQ-POL-BE-NE-F-015:** The `PoliciesService.getLocations` method shall throw `NotFoundException` when no policy with the given `id` exists. On success, it shall return all rows from `policy_location_rows` for that `policy_id`.

### GWP Analytics

**REQ-POL-BE-NE-F-GWP-1:** The `PoliciesService.getGwpMonthly` method shall return a `{ series: [...] }` object with monthly GWP totals grouped by year and month for the requesting org. Records with `null` `inception_date` or `null` `gross_written_premium` shall be excluded. `deleted_at IS NULL` shall be enforced.

**REQ-POL-BE-NE-F-GWP-2:** The `PoliciesService.getGwpCumulative` method shall return a `{ series: [...] }` object with cumulative GWP data for the requesting org.

**REQ-POL-BE-NE-F-GWP-3:** The `PoliciesService.getGwpSummary` method shall return `{ orgTotal, userTotal }` — the total GWP for the org and the total GWP for the specific user identified by `username`.

### Checkpoint C — New Column Behaviour (OQ-STAT-002)

**REQ-POL-BE-NE-F-C01 [C3 — OQ-STAT-002]:** Every `policy` record shall have a `version_status_id` nullable integer column referencing `lookup_policy_version_statuses(id)`. When a new policy is created via `issuePolicy()` in the quotes module (see `REQ-QUO-BE-NE-F-037`), its `version_status_id` shall reference the `Original` entry in `lookup_policy_version_statuses`. When a policy is created as a result of issuing an endorsement (`issueEndorsement`), its `version_status_id` shall reference the `Endorsed` entry. The column is nullable to allow legacy records created before Checkpoint C to be migrated in a future checkpoint.

> **Implementation note:** The `version_status_id` column is added to the `policies` table via `TypeORM synchronize()`. The `lookup_policy_version_statuses` table is seeded by `db/seeds/033-lookup-policy-version-statuses.js` which must run before `db/seeds/025-policies.js`.

### Coverage and Coverage-Detail Date/Time Delta (2026-07-10)

1. **REQ-POL-BE-NE-F-016:** The policies backend shall support `effective_date`, `effective_time`, `expiry_date`, and `expiry_time` at policy coverage and policy coverage-detail levels in request/response payloads. Acceptance criteria: create and update operations persist second-precision values and return the same values in subsequent reads.
2. **REQ-POL-BE-NE-F-017:** Defaulting at policy coverage level shall follow parent policy-section precedence: `effective_date` defaults from section effective or inception date, `expiry_date` defaults to section inception plus one year where section expiry is not explicitly supplied, `effective_time` defaults to parent time when present otherwise `00:00:00`, and `expiry_time` defaults to parent time when present otherwise `23:59:59`; policy coverage-detail shall inherit from parent policy coverage using the same precedence. Acceptance criteria: creating rows with omitted fields returns computed defaults matching the precedence and inherited values.
3. **REQ-POL-BE-NE-F-018:** API contracts shall preserve backward compatibility by accepting payloads that omit the new fields and applying server defaults, while enforcing validation for provided values (ISO date and `HH:mm:ss` time). Acceptance criteria: legacy payloads continue to succeed and malformed date/time values return HTTP 400.
4. **REQ-POL-BE-NE-F-019:** Policy issue/copy pathways from quotes shall carry quote coverage and coverage-detail date/time values into policy records, preserving explicit quote overrides and defaulting only null source fields. Acceptance criteria: issued policy records match quote source values for non-null fields and show defaults only where quote fields were null.
5. **REQ-POL-BE-NE-F-020:** Persistence and migration delivery shall be additive and rollback-safe: migrations add nullable fields for policy coverage and coverage-detail date/time values, include deterministic backfill from parent policy-section values, and provide reversible down migration scoped to new artifacts. Acceptance criteria: migration up succeeds on existing data and down migration reverts only new date/time artifacts.
6. **REQ-POL-BE-NE-F-021:** Grid and detail policy API surfaces shall remain aligned by returning a single canonical source of truth for coverage and coverage-detail date/time fields across list and detail endpoints. Acceptance criteria: for the same ids, list and detail responses return matching `effective_date`, `effective_time`, `expiry_date`, and `expiry_time` values.
7. **REQ-POL-BE-NE-F-022:** Non-functional constraints shall apply to all new policy coverage date/time behavior: strict tenant scoping, support for a defined compatibility window where old and new clients coexist, and rollback procedures that avoid cross-tenant data exposure. Acceptance criteria: tenant-filtered tests pass, compatibility tests pass for both payload shapes, and rollback rehearsal keeps org data isolated.
