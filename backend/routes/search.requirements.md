# REQUIREMENTS — Backend Route: Global Search

**Domain Code:** `SEARCH-BE`  
**Location:** `backend/routes/search.js`  
**Routes mounted at:** `/api/search`  
**Status:** Requirements agreed — tests and implementation follow  
**Test file:** `backend/__tests__/search.test.js`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `GET /api/search` — query all entity types (Submission, Quote, Policy, Binding Authority, Party, Claim) with optional filter params; merge `lastOpenedDate` from `audit_event`

**Out of scope:**
- Full-text search / fuzzy matching (ILIKE only)
- Saved searches
- Search result export

---

## 2. Recommended Approach

**Recommended approach:** `GET /api/search` with optional filter query params. When no filters are supplied, return the current user's most-recently-opened records (up to 15 per entity type) by reading `audit_event`. When filters are supplied, run ILIKE queries against all entity tables.

**Potential flaws:**

1. **New user / empty audit — no default results.** If a user has never opened any record, the default (no-filter) view returns an empty response. This is technically correct but looks broken on first login.
   - *Risk:* low — affects only genuinely new users on first session.

2. **Performance at scale.** Six parallel table queries + one audit join on every search with broad filters could be slow at high row counts. Without indexes on `LOWER(reference)` etc., full-table ILIKE scans are O(n).
   - *Risk:* medium — acceptable at current scale; must revisit if any table exceeds 500k rows.

3. **Cross-tenant data leak if orgCode is absent from queries.** If any entity table is accidentally queried without an orgCode filter, data from other tenants would be exposed.
   - *Risk:* high — mitigated by explicit orgCode filter on every per-table query.

**Alternatives considered:**

A. **Single denormalised search table** (updated via triggers) — faster reads, but adds complexity, drift risk, and a second write path. Overkill for current scale.

B. **`POST /api/search` with a JSON body** (as in the backup) — allows richer filter expressions, but `GET` with query params is more REST-conventional, easier to test, and allows browser URL caching. Chosen approach.

C. **Fallback to `createdDate` ordering when audit is empty** — resolves flaw 1 cleanly. **Adopted:** the endpoint falls back to `ORDER BY "createdDate" DESC LIMIT 15` per entity type when the user has no audit events.

**Recommendation stands because:** Query-param `GET` with per-tenant orgCode filtering and an audit-event fallback is the simplest approach that is safe, testable, and matches the backup's behaviour without its security gaps.

---

## 3. Requirements

### 3.1 Authentication and Authorisation

**REQ-SEARCH-BE-F-001:** The endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-SEARCH-BE-F-002:** All database queries shall filter by `req.user.orgCode` (multi-tenant isolation). The org code must never be accepted from query params or request body.

### 3.2 Default mode (no filters)

**REQ-SEARCH-BE-F-003:** When no filter params are supplied, the endpoint shall read `audit_event` to find the entity IDs this user has most recently opened or updated, then batch-fetch those entity rows from their respective tables. Up to 15 records per entity type shall be returned, ordered by `lastOpenedDate DESC`.

**REQ-SEARCH-BE-F-004:** When the user has no audit events (new user), the endpoint shall fall back to returning the 15 most recently created records per entity type, ordered by `createdDate DESC`.

**REQ-SEARCH-BE-F-005:** Each record in the default-mode response shall include a `lastOpenedDate` field (ISO timestamp string or `null` when derived from the fallback).

### 3.3 Filter mode (at least one filter param present)

**REQ-SEARCH-BE-F-006:** The endpoint shall accept the following optional query parameters: `type`, `reference`, `status`, `insured`, `broker`, `inceptionFrom`, `inceptionTo`, `expiryFrom`, `expiryTo`.

**REQ-SEARCH-BE-F-007:** When `type` is supplied, only the matching entity table shall be queried. Valid values: `Submission`, `Quote`, `Policy`, `Binding Authority`, `Party`, `Claim`. An invalid value shall return HTTP 400.

**REQ-SEARCH-BE-F-008:** String filter params (`reference`, `status`, `insured`, `broker`) shall match using case-insensitive ILIKE (`%value%`).

**REQ-SEARCH-BE-F-009:** Date range params (`inceptionFrom`, `inceptionTo`, `expiryFrom`, `expiryTo`) shall filter using `>=` and `<=` on the respective date column. Invalid date strings shall return HTTP 400.

**REQ-SEARCH-BE-F-010:** In filter mode, `lastOpenedDate` shall be looked up from `audit_event` (most recent Opened/Updated event for that entity by any user) and included in each result record.

**REQ-SEARCH-BE-F-014:** Quote search results shall be sourced from the current `quotes` table, scoped by `created_by_org_code`, and returned using the search API field names `yearOfAccount`, `inceptionDate`, `expiryDate`, `createdDate`, and `createdBy`. When `year_of_account` is not present in the deployed schema, the API shall return `yearOfAccount: null` rather than suppressing Quote results.

**REQ-SEARCH-BE-F-015:** Policy search results shall be sourced from the current `policies` table, scoped by `created_by_org_code`, and returned using the search API field names `yearOfAccount`, `inceptionDate`, `expiryDate`, `createdDate`, and `createdBy`. When `year_of_account` is not present in the deployed schema, the API shall return `yearOfAccount: null` rather than suppressing Policy results.

**REQ-SEARCH-BE-F-016:** Binding Authority search results shall be sourced from the current `binding_authorities` table, scoped by `created_by_org_code`, and returned using the search API field names `yearOfAccount`, `inceptionDate`, `expiryDate`, `createdDate`, and `createdBy`.

**REQ-SEARCH-BE-F-017:** Claim search results shall be sourced from the current `claims` table and scoped to the caller’s tenant by joining through the related `policies` row. Claim results shall return the search API field names `createdDate` and `createdBy`; when a direct `created_by` field is not present in the deployed schema, the API shall return `createdBy: null` rather than suppressing Claim results.

### 3.4 Response

**REQ-SEARCH-BE-F-011:** The response body shall be a JSON object with the keys: `submissions`, `quotes`, `policies`, `bindingAuthorities`, `parties`, `claims` — each an array (empty if no results).

**REQ-SEARCH-BE-F-012:** The endpoint shall return HTTP 200 in all success cases (including zero results).

**REQ-SEARCH-BE-F-013:** The endpoint shall return HTTP 500 with `{ error: string }` when a database operation fails.

---

## 4. Security

- `orgCode` always from `req.user.orgCode` (JWT) — never trusted from client.
- All parameterised queries use `$N` placeholders — no string interpolation of user input.
- Date inputs validated before inclusion in queries.

---

## 5. Traceability

| Requirement ID | Test file | Test ID |
|----------------|-----------|---------|
| REQ-SEARCH-BE-F-001 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R01 |
| REQ-SEARCH-BE-F-002 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R02 |
| REQ-SEARCH-BE-F-003 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R03 |
| REQ-SEARCH-BE-F-004 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R04 |
| REQ-SEARCH-BE-F-005 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R05 |
| REQ-SEARCH-BE-F-006 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R06 |
| REQ-SEARCH-BE-F-007 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R07 |
| REQ-SEARCH-BE-F-008 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R08 |
| REQ-SEARCH-BE-F-009 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R09 |
| REQ-SEARCH-BE-F-010 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R10 |
| REQ-SEARCH-BE-F-011 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R11 |
| REQ-SEARCH-BE-F-012 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R12 |
| REQ-SEARCH-BE-F-013 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R13 |
| REQ-SEARCH-BE-F-014 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R14 |
| REQ-SEARCH-BE-F-015 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R15 |
| REQ-SEARCH-BE-F-016 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R16 |
| REQ-SEARCH-BE-F-017 | `backend/__tests__/search.test.js` | T-BE-SEARCH-R17 |

---

## 6. Change Log

| Date | Change |
|------|--------|
| 2026-03-13 | Initial requirements written |
| 2026-03-23 | Added explicit live-schema contracts for Quote, Policy, Binding Authority, and Claim search, including null fallbacks for optional fields |
