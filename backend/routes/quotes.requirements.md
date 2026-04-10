# REQUIREMENTS — Backend Route: Quotes

**Domain Code:** `QUO-BE`  
**Location:** `backend/routes/quotes.js`  
**Status:** Implementation pending  
**Test file:** `backend/__tests__/quotes.test.js`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `GET /api/quotes`, `POST /api/quotes`, `GET /api/quotes/:id`, `PUT /api/quotes/:id`, `POST /api/quotes/:id/bind`, `POST /api/quotes/:id/decline`; multi-tenant isolation via `created_by_org_code`; JWT authentication on every route.  
**Out of scope:** Quote section management (separate `/api/quotes/:id/sections` routes — deferred to a later block); pricing engine; rating integration.

---

## 2. API Contract

### R01 — GET /api/quotes

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/quotes` |
| Query params | `?submission_id=<integer>` (optional), `?status=<string>` (optional) |
| Success | `200 [{ id, reference, submission_id, insured, insured_id, status, business_type, inception_date, expiry_date, inception_time, expiry_time, quote_currency, created_date, created_by, created_by_org_code }]` |
| 401 | `{ error: "Unauthorised" }` |
| Auth required | Yes |
| Tenant-scoped | Yes — filtered by `created_by_org_code = req.user.orgCode` |

### R02 — POST /api/quotes

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/api/quotes` |
| Request body | `{ insured: string (required), insured_id?: string, submission_id?: integer, business_type?: string, inception_date?: string, expiry_date?: string, inception_time?: string, expiry_time?: string, quote_currency?: string, created_by?: string }` |
| Success | `201 { id, reference, submission_id, insured, insured_id, status, business_type, inception_date, expiry_date, inception_time, expiry_time, quote_currency, created_date, created_by, created_by_org_code }` |
| 400 | `{ error: "insured is required" }` |
| 401 | `{ error: "Unauthorised" }` |
| Auth required | Yes |
| Tenant-scoped | Yes — `created_by_org_code` forced from JWT |

### R03 — GET /api/quotes/:id

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/quotes/:id` |
| Success | `200 { ...quote }` |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Quote not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes — 403 when record belongs to another org |

### R04 — PUT /api/quotes/:id

| Field | Value |
|---|---|
| Method | `PUT` |
| Path | `/api/quotes/:id` |
| Request body | Partial quote — mutable fields only |
| Success | `200 { ...updated quote }` |
| 400 | `{ error: "Cannot edit a Bound or Declined quote" }` |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Quote not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes |

### R05 — POST /api/quotes/:id/bind

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/api/quotes/:id/bind` |
| Request body | None required |
| Success | `200 { ...quote, status: "Bound" }` |
| 400 | `{ error: "Only a Quoted quote may be bound" }` |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Quote not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes |

### R06 — POST /api/quotes/:id/decline

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/api/quotes/:id/decline` |
| Request body | `{ reasonCode: string (required), reasonText?: string }` |
| Success | `200 { ...quote, status: "Declined" }` |
| 400 | `{ error: "reasonCode is required" }` — also 400 when quote is already Bound |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Quote not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes |

---

## 3. Requirements

### 3.1 GET /api/quotes

**REQ-QUO-BE-F-001:** The `GET /api/quotes` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when the header is absent or the token is invalid.

**REQ-QUO-BE-F-002:** The `GET /api/quotes` endpoint shall return HTTP 200 with a JSON array of all quote records where `created_by_org_code` equals `req.user.orgCode`.

**REQ-QUO-BE-F-003:** The `GET /api/quotes` endpoint shall accept an optional `?submission_id=<integer>` query parameter and shall filter the returned array to only records with that `submission_id` when the parameter is present.

**REQ-QUO-BE-F-004:** The `GET /api/quotes` endpoint shall accept an optional `?status=<string>` query parameter and shall filter the returned array to only records matching that status when the parameter is present.

### 3.2 POST /api/quotes

**REQ-QUO-BE-F-005:** The `POST /api/quotes` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-QUO-BE-F-006:** The `POST /api/quotes` endpoint shall return HTTP 400 when the request body does not contain the `insured` field.

**REQ-QUO-BE-F-007:** The `POST /api/quotes` endpoint shall override the `created_by_org_code` field to `req.user.orgCode` regardless of any value supplied in the request body.

**REQ-QUO-BE-F-008:** The `POST /api/quotes` endpoint shall override the `status` field to `'Draft'` regardless of any value supplied in the request body.

**REQ-QUO-BE-F-009:** The `POST /api/quotes` endpoint shall generate a reference of the form `QUO-{ORGCODE}-{YYYYMMDD}-{NNN}` server-side, where `NNN` is a zero-padded 3-digit sequence of quotes created by that org on that calendar day.

**REQ-QUO-BE-F-010:** The `POST /api/quotes` endpoint shall default `quote_currency` to `'USD'` when not supplied in the request body.

**REQ-QUO-BE-F-011:** The `POST /api/quotes` endpoint shall return HTTP 201 with the full inserted record — including the auto-generated `id` and `reference` — on success.

### 3.3 GET /api/quotes/:id

**REQ-QUO-BE-F-012:** The `GET /api/quotes/:id` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-QUO-BE-F-013:** The `GET /api/quotes/:id` endpoint shall return HTTP 200 with the quote JSON when the record exists and `created_by_org_code` equals `req.user.orgCode`.

**REQ-QUO-BE-F-014:** The `GET /api/quotes/:id` endpoint shall return HTTP 404 when no record exists with the given id.

**REQ-QUO-BE-F-015:** The `GET /api/quotes/:id` endpoint shall return HTTP 403 when the record exists but `created_by_org_code` does not equal `req.user.orgCode`.

### 3.4 PUT /api/quotes/:id

**REQ-QUO-BE-F-016:** The `PUT /api/quotes/:id` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-QUO-BE-F-017:** The `PUT /api/quotes/:id` endpoint shall return HTTP 400 when the quote's current status is `'Bound'` or `'Declined'` (immutable terminal states).

**REQ-QUO-BE-F-018:** The `PUT /api/quotes/:id` endpoint shall strip the fields `status`, `reference`, `created_by_org_code`, `created_by`, and `created_date` from the request body before issuing the UPDATE statement.

**REQ-QUO-BE-F-019:** The `PUT /api/quotes/:id` endpoint shall return HTTP 200 with the updated record on success.

**REQ-QUO-BE-F-020:** The `PUT /api/quotes/:id` endpoint shall return HTTP 404 when no record exists with the given id, and HTTP 403 when the record belongs to a different org.

### 3.5 POST /api/quotes/:id/bind

**REQ-QUO-BE-F-021:** The `POST /api/quotes/:id/bind` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-QUO-BE-F-022:** The `POST /api/quotes/:id/bind` endpoint shall transition the quote status from `'Quoted'` to `'Bound'` and shall return HTTP 200 with the updated record.

**REQ-QUO-BE-F-023:** The `POST /api/quotes/:id/bind` endpoint shall return HTTP 400 when the current status is not `'Quoted'`, with the message `"Only a Quoted quote may be bound"`.

**REQ-QUO-BE-F-024:** The `POST /api/quotes/:id/bind` endpoint shall return HTTP 404 when no record exists with the given id.

### 3.6 POST /api/quotes/:id/decline

**REQ-QUO-BE-F-025:** The `POST /api/quotes/:id/decline` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-QUO-BE-F-026:** The `POST /api/quotes/:id/decline` endpoint shall return HTTP 400 when `reasonCode` is not present in the request body.

**REQ-QUO-BE-F-027:** The `POST /api/quotes/:id/decline` endpoint shall transition the quote status to `'Declined'` and shall return HTTP 200 with the updated record when `reasonCode` is supplied and the quote is not already `'Bound'`.

**REQ-QUO-BE-F-028:** The `POST /api/quotes/:id/decline` endpoint shall return HTTP 400 when the current status is `'Bound'`, with the message `"Cannot decline a Bound quote"`.

**REQ-QUO-BE-F-029:** The `POST /api/quotes/:id/decline` endpoint shall return HTTP 404 when no record exists with the given id.

### 3.7 GET /api/quotes/:id/audit

**REQ-QUO-BE-F-030:** The `GET /api/quotes/:id/audit` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when the header is absent or the token is invalid.

**REQ-QUO-BE-F-031:** The `GET /api/quotes/:id/audit` endpoint shall return HTTP 403 when the quote identified by `:id` exists but its `created_by_org_code` does not match `req.user.orgCode`, and HTTP 404 when no quote exists with that id.

**REQ-QUO-BE-F-032:** The `GET /api/quotes/:id/audit` endpoint shall return HTTP 200 with an array of audit event objects from the `audit_event` table where `entity_type = 'Quote'` and `entity_id = :id`, ordered by `created_at ASC, id ASC`. Each object in the array shall include: `action`, `user` (= `user_name`), `userId`, `date` (= `created_at`), `details` (= `details.details`), `changes` (= `details.changes`).

### 3.8 POST /api/quotes/:id/audit

**REQ-QUO-BE-F-033:** The `POST /api/quotes/:id/audit` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when the header is absent or the token is invalid.

**REQ-QUO-BE-F-034:** The `POST /api/quotes/:id/audit` endpoint shall return HTTP 403 when the quote exists but belongs to a different org, and HTTP 404 when no quote exists with that id.

**REQ-QUO-BE-F-035:** The `POST /api/quotes/:id/audit` endpoint shall return HTTP 400 when the `action` field is absent or not a non-empty string.

**REQ-QUO-BE-F-036:** The `POST /api/quotes/:id/audit` endpoint shall insert a row into the `audit_event` table with `entity_type = 'Quote'`, `entity_id = :id`, `action` from the request body, `user_name` and `user_id` from `req.user` (never from the request body), and `details` from the optional `details` field in the request body (defaulting to `{}`). On success it shall return HTTP 201 with the inserted event row.

---

### 3.9 — GET /api/quotes/:id/sections

**REQ-QUO-BE-F-037:** The `GET /api/quotes/:id/sections` endpoint shall require a valid `Authorization: Bearer <token>` header (401 when absent or invalid), verify the parent quote exists and its `created_by_org_code` equals `req.user.orgCode` (404 when no quote, 403 when different org), and return HTTP 200 with an array of all non-soft-deleted `quote_sections` rows for that quote sorted by `id ASC`.

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/quotes/:id/sections` |
| Success | `200 [ ...sections ]` |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Quote not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes |

### 3.10 — POST /api/quotes/:id/sections

**REQ-QUO-BE-F-038:** The `POST /api/quotes/:id/sections` endpoint shall require a valid JWT token (401), check parent quote ownership (403/404), return HTTP 400 when the quote status is `'Bound'` or `'Declined'`, auto-generate a section `reference` of the form `{quoteRef}-SEC-{NNN}` (NNN = 3-digit zero-padded count of non-deleted sections for that quote including the new one), insert a row into `quote_sections`, and return HTTP 201 with the created section.

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/api/quotes/:id/sections` |
| Request body | Optional partial section fields |
| Success | `201 { ...section }` |
| 400 | `{ error: "Cannot add sections to a Bound or Declined quote" }` |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Quote not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes |

### 3.11 — PUT /api/quotes/:id/sections/:sectionId

**REQ-QUO-BE-F-039:** The `PUT /api/quotes/:id/sections/:sectionId` endpoint shall require a valid JWT token (401), check parent quote ownership (403/404), verify the section exists and belongs to that quote (404 when not found or soft-deleted), apply all mutable fields from the request body (including `payload` JSONB for riskSplits and taxOverrides), and return HTTP 200 with the updated section.

| Field | Value |
|---|---|
| Method | `PUT` |
| Path | `/api/quotes/:id/sections/:sectionId` |
| Request body | Partial section — mutable fields |
| Success | `200 { ...updated section }` |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Quote not found" }` or `{ error: "Section not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes |

### 3.12 — DELETE /api/quotes/:id/sections/:sectionId

**REQ-QUO-BE-F-040:** The `DELETE /api/quotes/:id/sections/:sectionId` endpoint shall require a valid JWT token (401), check parent quote ownership (403/404), set `deleted_at = NOW()` on the section row (soft delete), and return HTTP 204 with no body.

| Field | Value |
|---|---|
| Method | `DELETE` |
| Path | `/api/quotes/:id/sections/:sectionId` |
| Success | `204` (no body) |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Quote not found" }` or `{ error: "Section not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes |

### 3.13 — GET /api/quotes/:id/sections/:sectionId/coverages

**REQ-QUO-BE-F-041:** The `GET /api/quotes/:id/sections/:sectionId/coverages` endpoint shall require a valid JWT token (401), check parent quote ownership (403/404), verify the section exists (404), and return HTTP 200 with an array of all non-soft-deleted rows from `quote_section_coverages` for that section sorted by `id ASC`. **Prerequisite:** migration 100 creates the `quote_section_coverages` table.

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/quotes/:id/sections/:sectionId/coverages` |
| Success | `200 [ ...coverages ]` |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Quote not found" }` or `{ error: "Section not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes |

### 3.14 — POST /api/quotes/:id/sections/:sectionId/coverages

**REQ-QUO-BE-F-042:** The `POST /api/quotes/:id/sections/:sectionId/coverages` endpoint shall require a valid JWT token (401), check parent quote ownership (403/404), auto-generate a coverage `reference` of the form `{sectionRef}-COV-{NNN}` (NNN = 3-digit zero-padded count of non-deleted coverages for that section including the new one), insert a row into `quote_section_coverages`, and return HTTP 201 with the created coverage.

### 3.15 — PUT /api/quotes/:id/sections/:sectionId/coverages/:coverageId

**REQ-QUO-BE-F-043:** The `PUT /api/quotes/:id/sections/:sectionId/coverages/:coverageId` endpoint shall require a valid JWT token (401), check parent quote ownership (403/404), verify the coverage belongs to that section (404), apply mutable fields from the request body, and return HTTP 200 with the updated record. When both `effective_date` and `expiry_date` are present in the request body and non-null, the server shall compute `days_on_cover = Math.max(0, Math.ceil((new Date(expiry_date) - new Date(effective_date)) / 86400000))` and persist it alongside the other updates.

### 3.16 — DELETE /api/quotes/:id/sections/:sectionId/coverages/:coverageId

**REQ-QUO-BE-F-044:** The `DELETE /api/quotes/:id/sections/:sectionId/coverages/:coverageId` endpoint shall require a valid JWT token (401), check parent quote ownership (403/404), set `deleted_at = NOW()` on the coverage row (soft delete), and return HTTP 204 with no body.

### 3.17 — GET /api/quote-sections/:sectionId/participations

**REQ-QUO-BE-F-045:** The `GET /api/quote-sections/:sectionId/participations` endpoint shall require a valid JWT token (401), resolve the section's parent quote and verify `created_by_org_code` equals `req.user.orgCode` (403/404 when not found or forbidden), and return HTTP 200 with an array of all participation rows for that section ordered by `id ASC`.

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/quote-sections/:sectionId/participations` |
| Success | `200 [ ...participations ]` |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Section not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes (via parent quote) |

### 3.18 — POST /api/quote-sections/:sectionId/participations

**REQ-QUO-BE-F-046:** The `POST /api/quote-sections/:sectionId/participations` endpoint shall require a valid JWT token (401), verify ownership (403/404), accept a `{ participations: [...] }` body, and within a single database transaction DELETE all existing participation rows for that section then INSERT the new rows. It shall return HTTP 200 with the full saved participations list.

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/api/quote-sections/:sectionId/participations` |
| Request body | `{ participations: [{ insurer_id, insurer_name, written_line, signed_line, role?, reference?, notes? }] }` |
| Success | `200 [ ...saved participations ]` |
| 400 | `{ error: "participations must be an array" }` |
| 401 | `{ error: "Unauthorised" }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "Section not found" }` |
| Auth required | Yes |
| Tenant-scoped | Yes (via parent quote) |

---

## 4. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-QUO-BE-F-001 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R01b |
| REQ-QUO-BE-F-002 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R01a |
| REQ-QUO-BE-F-003 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R01c |
| REQ-QUO-BE-F-004 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R01d |
| REQ-QUO-BE-F-005 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R02e |
| REQ-QUO-BE-F-006 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R02d |
| REQ-QUO-BE-F-007 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R02f |
| REQ-QUO-BE-F-008 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R02a |
| REQ-QUO-BE-F-009 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R02b |
| REQ-QUO-BE-F-010 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R02g |
| REQ-QUO-BE-F-011 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R02a |
| REQ-QUO-BE-F-012 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R03c |
| REQ-QUO-BE-F-013 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R03a |
| REQ-QUO-BE-F-014 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R03b |
| REQ-QUO-BE-F-015 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-016 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R04c |
| REQ-QUO-BE-F-017 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-018 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R04b |
| REQ-QUO-BE-F-019 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R04a |
| REQ-QUO-BE-F-020 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R04d |
| REQ-QUO-BE-F-021 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R05c |
| REQ-QUO-BE-F-022 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R05a |
| REQ-QUO-BE-F-023 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R05b |
| REQ-QUO-BE-F-024 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R05d |
| REQ-QUO-BE-F-025 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R06d |
| REQ-QUO-BE-F-026 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R06b |
| REQ-QUO-BE-F-027 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R06a |
| REQ-QUO-BE-F-028 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R06c |
| REQ-QUO-BE-F-029 | `backend/__tests__/quotes.test.js` | T-BE-quotes-R06e |
| REQ-QUO-BE-F-030 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-031 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-032 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-033 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-034 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-035 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-036 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-037 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-038 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-039 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-040 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-041 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-042 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-043 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-044 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-045 | `backend/__tests__/quotes.test.js` | pending |
| REQ-QUO-BE-F-046 | `backend/__tests__/quotes.test.js` | pending |

---

## 5. Open Questions

None.

---

## 6. Change Log

| Date | Change |
|------|--------|
| 2026-06-08 | Initial requirements written — Quotes BE Block 2 |
| 2026-03-19 | Block 3: REQ-QUO-BE-F-030 to F-036 added — GET and POST /api/quotes/:id/audit endpoints |
| 2026-03-20 | Block 3 remaining + Block 4: REQ-QUO-BE-F-037 to F-046 added — sections CRUD (§3.9–3.12), coverages CRUD (§3.13–3.16), participations (§3.17–3.18); migration 094 prerequisite noted |

---

## 7. Impact Analysis

### UI / Front-End Impact
- `QuotesListPage` — new list page at `/quotes`
- `NewQuotePage` — new create page at `/quotes/new`
- `QuoteViewPage` — new view page at `/quotes/:id`
- `SubmissionViewPage` — `hasQuote` computed field now wired from real subquery

### API Impact
| Method | Path | Change |
|---|---|---|
| `GET` | `/api/quotes` | New |
| `POST` | `/api/quotes` | New |
| `GET` | `/api/quotes/:id` | New |
| `PUT` | `/api/quotes/:id` | New |
| `POST` | `/api/quotes/:id/bind` | New |
| `POST` | `/api/quotes/:id/decline` | New |

### Database Impact
- Migration `008-create-quotes-table.js` — table already exists
- Migration `084-alter-quotes-add-currency.js` — adds `quote_currency TEXT DEFAULT 'USD'` column (gap fix)
