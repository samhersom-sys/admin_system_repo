# REQUIREMENTS — Dashboard Stub Routes

**Domain Code:** `DASH-STUB`
**Status:** Stub / scaffold — returns safe empty data until domain tables are built
**Test file:** `backend/__tests__/api-smoke.test.js`
**Second artifact:** See smoke tests (`REQUIRED_200_ENDPOINTS` entries)

---

## 1. Scope

These routes exist to prevent the frontend dashboard widgets (KpiWidget, GwpChartWidget,
CumulativeGwpWidget, RecentActivityWidget, TasksWidget) from returning HTTP 500 errors
while the corresponding database tables are not yet migrated.

Each route returns a valid, empty response structure consistent with the shape expected
by the frontend widget. No data is fabricated.

---

## 2. Requirements

### 2.1 Quotes stub

**REQ-DASH-STUB-F-001:** `GET /api/quotes` shall return HTTP 200 with an empty JSON array `[]`
until the `quote` table is built. All query params (orgCode, assignedTo, status) shall be
accepted and silently ignored.

### 2.2 Policies stub

**REQ-DASH-STUB-F-002:** `GET /api/policies` shall return HTTP 200 with `[]`.

**REQ-DASH-STUB-F-003:** `GET /api/policies/gwp-monthly` shall return HTTP 200 with
`{ series: [] }`.

**REQ-DASH-STUB-F-004:** `GET /api/policies/gwp-cumulative` shall return HTTP 200 with
`{ series: [] }`.

**REQ-DASH-STUB-F-005:** `GET /api/policies/gwp-summary` shall return HTTP 200 with
`{ orgTotal: 0, userTotal: 0 }`.

### 2.3 Binding Authorities

**REQ-DASH-STUB-F-006:** `GET /api/binding-authorities` shall return HTTP 200 with an array of binding authority records scoped to the caller's `orgCode`. Records are filtered by `created_by_org_code` and `deleted_at IS NULL`, ordered by `created_at DESC`. Each record shall include a virtual `multi_year` field mapped from the DB `is_multi_year` column. Falls back to `[]` on error.

**REQ-DASH-STUB-F-012:** `POST /api/binding-authorities` shall accept `{ coverholder_id, inception_date, expiry_date, year_of_account, submission_id }` in the body, generate a reference (`BA-{timestamp}`), insert a new record with status `Draft` and org/user from JWT, and return HTTP 201 with the created record. Returns HTTP 500 with `{ message }` on error.

**REQ-DASH-STUB-F-013:** `GET /api/binding-authorities/:id` shall return HTTP 200 with a single binding authority record including joined coverholder name (from `party` table) and submission reference (from `submission` table). Returns HTTP 404 when not found, HTTP 403 when the caller's `orgCode` does not match `created_by_org_code`. The response shall include a virtual `multi_year` field mapped from `is_multi_year`.

**REQ-DASH-STUB-F-014:** `PUT /api/binding-authorities/:id` shall accept partial updates to status, coverholder_id, dates, year_of_account, is_multi_year, and submission_id. Returns HTTP 200 with the updated record (including resolved coverholder and submission_reference). Returns HTTP 404/403 as applicable.

**REQ-DASH-STUB-F-015:** `GET /api/binding-authorities/:id/sections` shall return HTTP 200 with an array of section records from `binding_authority_sections` where `binding_authority_id = :id`, ordered by `id ASC`. Falls back to `[]` on error.

**REQ-DASH-STUB-F-016:** `POST /api/binding-authorities/:id/sections` shall accept section fields, generate a reference (`SEC-{BA_ID}-{NNN}`), insert a row into `binding_authority_sections`, and return HTTP 201. Returns HTTP 500 on error.

**REQ-DASH-STUB-F-017:** `GET /api/binding-authorities/:id/transactions` shall return HTTP 200 with an array of transaction records from `binding_authority_transactions` where `binding_authority_id = :id`, ordered by `id ASC`. Falls back to `[]` on error.

**REQ-DASH-STUB-F-018:** `POST /api/binding-authorities/:id/transactions` shall accept `{ type, amount, currency, date, description }`, insert a row into `binding_authority_transactions` with `status = 'Active'` and user identity from JWT, and return HTTP 201. Returns HTTP 500 on error.

**REQ-DASH-STUB-F-010:** `GET /api/binding-authorities/:id/audit` shall return HTTP 200 with an array of audit event objects from the `audit_event` table where `entity_type = 'Binding Authority'` and `entity_id = :id`, ordered by `created_at ASC, id ASC`. Each object shall include: `action`, `user`, `userId`, `date`, `details`, `changes`.

**REQ-DASH-STUB-F-011:** `POST /api/binding-authorities/:id/audit` shall accept `{ action: string, details?: object }` in the body, read user identity from the JWT (never from body), insert a row into the `audit_event` table with `entity_type = 'Binding Authority'`, and return HTTP 201 with the inserted event. Returns HTTP 400 when `action` is absent.

### 2.4 Dashboard widget data

**REQ-DASH-STUB-F-019:** `POST /api/dashboards/widgets/data` shall accept `{ widget, filters }` where `widget` has a `type` (`metric`, `chart`, `table`, `text`) and an optional `source` (e.g. `submissions`, `quotes`, `policies`, `binding_authorities`, `parties`). For `text` type, return `{ type: 'text' }`. For `metric` type, return `{ type: 'metric', value, label }` where value is computed using the requested `aggregation` (count/sum/avg/min/max) on the source table scoped to the caller's `orgCode`. For `chart` type, return `{ type: 'chart', rows }` grouped by the `attribute` field. For `table` type, return `{ type: 'table', rows }`. On error, return safe empty data rather than HTTP 500 to keep dashboards functional.

### 2.5 Date basis lookup

**REQ-DASH-STUB-F-020:** `GET /api/date-basis` shall return HTTP 200 with `['Created Date', 'Inception Date', 'Expiry Date']`. This endpoint serves the reporting date basis dropdown.

### 2.6 Notifications stub

**REQ-DASH-STUB-F-007:** `GET /api/notifications` shall return HTTP 200 with `[]`.

### 2.7 Recent records

**REQ-DASH-STUB-F-008:** `GET /api/recent-records-data` shall return HTTP 200 with an object
`{ submissions, quotes, policies, bindingAuthorities }`. Submissions are populated from the
`submission` table (most recent 15 by `createdDate` for the caller's `orgCode`). All other
types return `[]` until their tables exist.

### 2.8 Tasks stub

**REQ-DASH-STUB-F-009:** `GET /api/tasks` shall return HTTP 200 with `[]`. This endpoint
is listed as KNOWN_UNIMPLEMENTED in the smoke tests and is deferred pending the workflow
domain build. When built, remove from KNOWN_UNIMPLEMENTED.

---

## 3. Traceability

| Requirement ID | Test file | Test ID |
|---|---|---|
| REQ-DASH-STUB-F-001 | `backend/__tests__/api-smoke.test.js` | `GET /api/quotes → 200` |
| REQ-DASH-STUB-F-002 | `backend/__tests__/api-smoke.test.js` | `GET /api/policies → 200` |
| REQ-DASH-STUB-F-003 | `backend/__tests__/api-smoke.test.js` | KNOWN_UNIMPLEMENTED (tracked) |
| REQ-DASH-STUB-F-004 | `backend/__tests__/api-smoke.test.js` | KNOWN_UNIMPLEMENTED (tracked) |
| REQ-DASH-STUB-F-006 | `backend/__tests__/api-smoke.test.js` | `GET /api/binding-authorities → 200` |
| REQ-DASH-STUB-F-007 | `backend/__tests__/api-smoke.test.js` | `GET /api/notifications → 200` |
| REQ-DASH-STUB-F-008 | `backend/__tests__/api-smoke.test.js` | `GET /api/recent-records-data → 200` |
| REQ-DASH-STUB-F-010 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-BA-AUDIT-R10a, T-DASH-BA-AUDIT-R10b |
| REQ-DASH-STUB-F-011 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-BA-AUDIT-R11a, T-DASH-BA-AUDIT-R11b |
| REQ-DASH-STUB-F-012 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-BA-CRUD-R12 |
| REQ-DASH-STUB-F-013 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-BA-CRUD-R13 |
| REQ-DASH-STUB-F-014 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-BA-CRUD-R14 |
| REQ-DASH-STUB-F-015 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-BA-SECTIONS-R15 |
| REQ-DASH-STUB-F-016 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-BA-SECTIONS-R16 |
| REQ-DASH-STUB-F-017 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-BA-TXN-R17 |
| REQ-DASH-STUB-F-018 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-BA-TXN-R18 |
| REQ-DASH-STUB-F-019 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-WIDGET-R19 |
| REQ-DASH-STUB-F-020 | `backend/__tests__/dashboard-stubs.test.js` | T-DASH-DATEBASIS-R20 |

---

## 4. Change Log

| Date | Change |
|------|--------|
| 2026-05-22 | REQ-DASH-STUB-F-006 updated: now returns real BA records from binding_authorities table instead of empty `[]`. Added REQ-DASH-STUB-F-010 and F-011: audit GET/POST endpoints for binding authorities. |
| 2026-05-23 | Added REQ-DASH-STUB-F-012–F-018: full BA CRUD, sections, and transactions routes. Added REQ-DASH-STUB-F-019: dashboard widget data endpoint. Added REQ-DASH-STUB-F-020: date-basis lookup. Updated F-006 to include virtual `multi_year` field. |
