# REQUIREMENTS — Reporting Routes (Express)

**Domain Code:** `RPT-BE`
**Status:** Active
**Route file:** `backend/routes/reporting.js`
**Test file:** `backend/__tests__/reporting.test.js`

---

## 1. Scope

These routes implement the Express equivalent of the NestJS `ReportingController`.
They serve the Reports section of the frontend (`ReportsListPage`, `ReportRunPage`,
`ReportBuilderPage`) by reading from the `report_templates` and
`report_execution_history` tables in PostgreSQL.

---

## 2. Requirements

### 2.1 List report templates

**REQ-RPT-BE-F-001:** `GET /api/report-templates` shall return HTTP 200 with a JSON array
of report templates. The result includes all `type = 'core'` templates plus any
`type IN ('custom', 'dashboard')` templates scoped to the caller's `orgCode`. Results are
ordered by `name ASC`. Each object conforms to the `toTemplateDto` shape:
`{ id, name, description, type, data_source, date_basis, date_from, date_to, sort_by,
sort_order, fields, filters, created_by, created_at, updated_at }`.

### 2.2 Get single template

**REQ-RPT-BE-F-002:** `GET /api/report-templates/:id` shall return HTTP 200 with a single
template DTO. For non-core templates, if the template's `org_code` does not match the
caller's `orgCode`, return HTTP 404. Returns HTTP 404 if the template does not exist.

### 2.3 Create template

**REQ-RPT-BE-F-003:** `POST /api/report-templates` shall accept a JSON body with at least
`name` (non-empty string). Type defaults to `'custom'` unless `type === 'dashboard'`.
The `org_code` is auto-set from the JWT. Returns HTTP 201 with the created template DTO.
Returns HTTP 400 if `name` is missing or empty.

### 2.4 Update template

**REQ-RPT-BE-F-004:** `PUT /api/report-templates/:id` shall accept partial updates to
`name`, `description`, `data_source`, `date_basis`, `date_from`, `date_to`, `sort_by`,
`sort_order`, `fields`, `filters`. Only `custom`/`dashboard` templates owned by the
caller's `orgCode` may be updated. Returns HTTP 200 with the updated DTO.
Returns HTTP 404 if not found or not owned.

### 2.5 Delete template

**REQ-RPT-BE-F-005:** `DELETE /api/report-templates/:id` shall remove a `custom`/`dashboard`
template owned by the caller's `orgCode`. Returns HTTP 204 (no body).
Returns HTTP 404 if not found or not owned.

### 2.6 Run report

**REQ-RPT-BE-F-006:** `POST /api/report-templates/:id/run` shall execute the template's
query against the appropriate domain table, using the field-mapping semantic layer
(`DATA_SOURCES`) for SQL column allow-listing and parameterised queries. Returns
`{ data: [...rows] }`. Records every execution in `report_execution_history` with
`status = 'success'` or `'error'`. Returns HTTP 400 on SQL failure with history recorded.

### 2.7 Execution history

**REQ-RPT-BE-F-007:** `GET /api/report-templates/:id/history` shall return an array of
execution history records `{ id, run_at, run_by, row_count, status }` ordered by
`run_at DESC`. Enforces the same org-scope access check as REQ-RPT-BE-F-002.

### 2.8 Field mappings

**REQ-RPT-BE-F-008:** `GET /api/report-field-mappings/:domain` shall return an array of
field definitions `{ key, label, type?, lookupValues? }` for the given domain.
Returns `[]` for unknown domains. **No authentication required.**

---

## 3. Traceability

| Requirement ID       | Test file                             | Test description                          |
|----------------------|---------------------------------------|-------------------------------------------|
| REQ-RPT-BE-F-001    | `backend/__tests__/reporting.test.js` | `GET /api/report-templates → 200`         |
| REQ-RPT-BE-F-002    | `backend/__tests__/reporting.test.js` | `GET /api/report-templates/:id → 200`     |
| REQ-RPT-BE-F-003    | `backend/__tests__/reporting.test.js` | `POST /api/report-templates → 201`        |
| REQ-RPT-BE-F-004    | `backend/__tests__/reporting.test.js` | `PUT /api/report-templates/:id → 200`     |
| REQ-RPT-BE-F-005    | `backend/__tests__/reporting.test.js` | `DELETE /api/report-templates/:id → 204`  |
| REQ-RPT-BE-F-006    | `backend/__tests__/reporting.test.js` | `POST /api/report-templates/:id/run`      |
| REQ-RPT-BE-F-007    | `backend/__tests__/reporting.test.js` | `GET /api/report-templates/:id/history`   |
| REQ-RPT-BE-F-008    | `backend/__tests__/reporting.test.js` | `GET /api/report-field-mappings/:domain`  |
| REQ-RPT-BE-F-001    | `backend/__tests__/api-smoke.test.js` | `GET /api/report-templates → 200`         |
