# REQUIREMENTS — Bordereaux Import NestJS Controller

**Domain Code:** `BA-BE-NE`  
**Location:** `backend/nest/src/binding-authorities/`  
**Status:** Code written — retroactive compliance with §03 Three-Artifact Rule (2026-05-22)  
**Test file:** `backend/nest/src/binding-authorities/bordereaux.spec.ts`  
**Standard:** Written per AI Guidelines §03-Three-Artifact-Rule.md

---

## Scope

**In scope:** The NestJS `BordereauxController` — a single `POST /api/bordereaux/import` endpoint that accepts normalised bordereaux rows from the `BordereauImportModal` wizard and persists them to the database.

**Out of scope:**
- Frontend modal UI (covered by `binding-authorities.requirements.md` §5)
- Full bordereaux export functionality (deferred — Block 4)
- Claims-type row handling (pending OQ-031)

---

## Impact Analysis

### API Endpoints

| Method | Path | Guard | Purpose |
|--------|------|-------|---------|
| POST | `/api/bordereaux/import` | `JwtAuthGuard` | Persist normalised bordereaux rows |

### Database Tables Written

| Table | Operation |
|-------|-----------|
| `policies` | find-or-create by `LOWER(reference)` + `created_by_org_code` |
| `policy_sections` | find-or-create by `policy_id` + `LOWER(reference)` |
| `policy_section_coverages` | find-or-create by `section_id` + `LOWER(reference)` |
| `policy_transactions` | INSERT per row when `transactionType` is present |

---

## Requirements

### REQ-BA-BE-NE-F-001 — JWT authentication required

All requests to `POST /api/bordereaux/import` shall require a valid JWT via `JwtAuthGuard`. Any request without a valid token shall receive HTTP 401.

Acceptance criteria:
- An unauthenticated request returns HTTP 401.
- A request with a valid JWT proceeds to the handler.

### REQ-BA-BE-NE-F-002 — Org scoping

The controller shall extract `orgCode` from `req.user.orgCode` and use it as the `created_by_org_code` for all newly created policies, and as the filter for finding existing policies. Rows belonging to a different org shall not be found or modified.

Acceptance criteria:
- Policy lookup uses `created_by_org_code = orgCode` as a filter condition.
- New policies are inserted with `created_by_org_code = orgCode`.

### REQ-BA-BE-NE-F-003 — Rows without a policy reference are skipped

When a row's `policy.reference` (or `policy.policyReference`) is absent or blank after trimming, that row shall be silently skipped. It shall not cause an error and shall not contribute to the created counts.

Acceptance criteria:
- A row with `policy.reference = ''` is skipped.
- A row with no `policy` key is skipped.
- The response `received` count reflects the total submitted rows; `createdPolicies` reflects only rows that produced a new policy.

### REQ-BA-BE-NE-F-004 — Policy: find-or-create

For each row with a non-blank policy reference, the controller shall: (1) query `policies` for a row with `LOWER(reference) = LOWER(pref)` AND `created_by_org_code = orgCode`; (2) if found, use the existing `id`; (3) if not found, insert a new row with `reference`, `insured` (from `policy.insuredName`), `inception_date`, `expiry_date`, `created_by_org_code`, `created_by`, and `status = 'Active'`, then use the returned `id`. The `createdPolicies` counter shall be incremented only on new insertions.

Acceptance criteria:
- An existing policy with the same reference (case-insensitive) and same org is reused without INSERT.
- A new policy reference produces an INSERT and increments `createdPolicies`.
- `LOWER()` normalisation is applied so `POL-001` and `pol-001` resolve to the same policy.

### REQ-BA-BE-NE-F-005 — Section: find-or-create (conditional on `section.reference`)

When a row has a non-blank `section.reference`, the controller shall: (1) query `policy_sections` for a row with `policy_id = policyId` AND `LOWER(reference) = LOWER(sref)`; (2) if found, use the existing `id`; (3) if not found, insert a new row with the section fields and increment `createdSections`. When `section.reference` is absent or blank, section processing is skipped for that row.

Acceptance criteria:
- An existing section reference for the same policy is reused without INSERT.
- A new section reference produces an INSERT and increments `createdSections`.
- A row with no `section.reference` does not attempt a section INSERT.

### REQ-BA-BE-NE-F-006 — Coverage: find-or-create (conditional on `coverage.reference` and resolved `sectionId`)

When a row has a resolved `sectionId` and a non-blank `coverage.reference`, the controller shall: (1) query `policy_section_coverages` for a row with `section_id = sectionId` AND `LOWER(reference) = LOWER(cref)`; (2) if found, skip; (3) if not found, insert a new row and increment `createdCoverages`.

Acceptance criteria:
- An existing coverage reference for the same section is not duplicated.
- A new coverage reference produces an INSERT and increments `createdCoverages`.
- Coverage processing is skipped when `sectionId` is null or `coverage.reference` is blank.

### REQ-BA-BE-NE-F-007 — Transaction: INSERT when `policyTxn.transactionType` is present

When a row has a non-blank `policyTxn.transactionType` (after trimming), the controller shall INSERT a row into `policy_transactions` with `policy_id`, `transaction_type`, `effective_date` (from `policyTxn.effectiveDate` if present), `created_by`, and `payload = '{}'::jsonb`. The `createdTransactions` counter shall be incremented for each INSERT.

Acceptance criteria:
- A row with `policyTxn.transactionType = 'New Business'` inserts a `policy_transactions` row.
- A row with no `policyTxn` key does not insert a transaction.
- `createdTransactions` is incremented once per inserted transaction row.

### REQ-BA-BE-NE-F-008 — Response shape

The controller shall return HTTP 200 with the body:
```json
{
  "success": true,
  "type": "<body.type>",
  "received": <total rows submitted>,
  "createdPolicies": <count>,
  "createdSections": <count>,
  "createdCoverages": <count>,
  "createdTransactions": <count>
}
```

Acceptance criteria:
- HTTP status is 200 for any valid authenticated request (even if `rows` is empty).
- `received` equals `body.rows.length`.
- `success` is always `true` on a 200 response.
- `type` reflects `body.type` (defaulting to `'Transactional'` when absent).

### REQ-BA-BE-NE-F-009 — Empty rows array is valid

When `body.rows` is an empty array, the controller shall return HTTP 200 with all counts as `0`.

Acceptance criteria:
- `{ rows: [] }` returns `{ success: true, received: 0, createdPolicies: 0, ... }`.

---

## Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-030 | Should the endpoint receive all rows or only the first 5 preview rows? | Open — see 08-Open-Questions.md |
| OQ-031 | Which tables should Claims-type bordereaux rows be written to? | Open — no handler exists yet |
| OQ-032 | Should org scoping use importing user's org or coverholder's org? | Open — blocked by OQ-009 |

---

## Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-BA-BE-NE-F-001 | `backend/nest/src/binding-authorities/bordereaux.spec.ts` | T-BA-BE-NE-R01a |
| REQ-BA-BE-NE-F-002 | `backend/nest/src/binding-authorities/bordereaux.spec.ts` | T-BA-BE-NE-R02a |
| REQ-BA-BE-NE-F-003 | `backend/nest/src/binding-authorities/bordereaux.spec.ts` | T-BA-BE-NE-R03a, R03b |
| REQ-BA-BE-NE-F-004 | `backend/nest/src/binding-authorities/bordereaux.spec.ts` | T-BA-BE-NE-R04a, R04b, R04c |
| REQ-BA-BE-NE-F-005 | `backend/nest/src/binding-authorities/bordereaux.spec.ts` | T-BA-BE-NE-R05a, R05b, R05c |
| REQ-BA-BE-NE-F-006 | `backend/nest/src/binding-authorities/bordereaux.spec.ts` | T-BA-BE-NE-R06a, R06b, R06c |
| REQ-BA-BE-NE-F-007 | `backend/nest/src/binding-authorities/bordereaux.spec.ts` | T-BA-BE-NE-R07a, R07b, R07c |
| REQ-BA-BE-NE-F-008 | `backend/nest/src/binding-authorities/bordereaux.spec.ts` | T-BA-BE-NE-R08a, R08b |
| REQ-BA-BE-NE-F-009 | `backend/nest/src/binding-authorities/bordereaux.spec.ts` | T-BA-BE-NE-R09a |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-05-22 | Initial creation — retroactive compliance with §03 Three-Artifact Rule. Code written before requirements; violation acknowledged. Covers all currently-implemented BordereauxController behaviour (F-001 to F-009). Open questions OQ-030, OQ-031, OQ-032 raised. |
