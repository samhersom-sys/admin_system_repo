# REQUIREMENTS — Reporting Domain (Frontend)

**Domain Code:** `RPT-FE`  
**Location:** `frontend/src/reporting/`  
**Status:** Block 1 requirements updated — pending tests and code alignment  
**Test file:** `frontend/src/reporting/__tests__/reports.test.tsx`  
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Backup Coverage Map

Sources read from `policy-forge-chat (BackUp)/`:
- `src/layouts/AppLayout/.../Reports/ReportsPage.jsx`
- `src/layouts/AppLayout/.../Reports/ReportCreatePage.jsx`
- `src/layouts/AppLayout/.../Reports/ReportRunPage.jsx`
- `src/layouts/AppLayout/.../Reports/DashboardCreatePage.jsx`
- `src/layouts/AppLayout/.../Reports/DashboardViewPage.jsx`
- `src/layouts/AppLayout/.../Reports/DashboardConfigurePage.jsx`
- `backend/create-dashboard-widgets-table.js`

| # | BackUp Feature | REQ ID | Status |
|---|---|---|---|
| 1 | Reports list page — core + custom reports | F-001–F-007 | COVERED |
| 2 | 4 core report templates (Submissions, New Business, Parties, Policies) | F-008 | COVERED |
| 3 | Custom report creation — field selection, filters, date basis | F-011–F-018 | COVERED |
| 4 | Report execution — run, display results table, export | F-021–F-027 | COVERED |
| 5 | Execution history tab | F-028 | COVERED |
| 6 | Audit history tab | F-029 | COVERED |
| 7 | Dashboard creation — name, description, pages, template | F-031–F-035 | DEFERRED — Block 2 |
| 8 | Dashboard view — render widgets, filters | F-036–F-040 | DEFERRED — Block 2 |
| 9 | Dashboard configuration — widget editor, slot assignment | — | DEFERRED — Block 2 |
| 10 | Scheduled reports (frequency, day-of-week/month) | F-019 | DEFERRED — Block 3 |

---

## 2. Impact Analysis

### Files to create (Block 1)
- `frontend/src/reporting/ReportsListPage/ReportsListPage.tsx`
- `frontend/src/reporting/ReportCreatePage/ReportCreatePage.tsx`
- `frontend/src/reporting/ReportRunPage/ReportRunPage.tsx`
- `frontend/src/reporting/reporting.service.ts`
- `frontend/src/reporting/__tests__/reports.test.tsx`

### Files to modify
- `frontend/src/main.jsx` — add routes: `/reports`, `/reports/create`, `/reports/edit/:id`, `/reports/run/:reportId`, `/reports/run/custom/:customId`
- `frontend/src/shell/AppSidebar.tsx` — register sidebar sections

### Dependencies
- `@/shared/lib/api-client/api-client` — `get`, `post`, `put`, `del`
- `@/shared/lib/auth-session/auth-session` — `getSession`
- `react-router-dom` — `useNavigate`, `useParams`, `Link`
- `@/shell/SidebarContext` — `useSidebarSection`

### API Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/report-templates` | List all report templates (core + custom) |
| POST | `/api/report-templates` | Create custom report template |
| GET | `/api/report-templates/:id` | Fetch single template |
| PUT | `/api/report-templates/:id` | Update template |
| DELETE | `/api/report-templates/:id` | Delete custom template |
| POST | `/api/report-templates/:id/run` | Execute report and return data |
| GET | `/api/report-templates/:id/history` | Execution history |
| GET | `/api/report-field-mappings/:domain` | Available fields per data source domain |
| GET | `/api/date-basis` | Date basis options for report filtering |

### Database Tables
| Table | Impact |
|---|---|
| `report_templates` | CRUD |
| `report_executions` | Insert / read (history) |
| `dashboard_widgets` | CRUD (Block 2) |

---

## 3. Scope

**In scope (Block 1):** ReportsListPage (`/reports`) — list core and custom report templates; ReportCreatePage (`/reports/create`, `/reports/edit/:id`) — create/edit custom report with field selection, filters, date basis, sort; ReportRunPage (`/reports/run/:reportId`, `/reports/run/custom/:customId`) — execute report and display results in a dynamic table with export to CSV.

**Deferred to Block 2:** Dashboard creation, view, configuration, and widget management.

**Deferred to Block 3:** Scheduled report execution (cron triggers, email delivery).

**Out of scope:** PDF generation (external service); real-time data streaming.

---

## 4. Requirements

### 4.1 ReportsListPage — /reports

**REQ-RPT-FE-F-001:** The Reports list page shall render a heading with the text `"Reporting"` without throwing an uncaught JavaScript exception on initial render.

**REQ-RPT-FE-F-002:** The Reports list page shall render a `"+ New Report"` button that navigates to `/reports/create` when clicked.

**REQ-RPT-FE-F-003:** The Reports list page shall call `GET /api/report-templates` on mount, display a loading indicator while the request is in flight, and render the returned records once loading is complete.

**REQ-RPT-FE-F-004:** The page shall display reports in two sections: **Core Reports** (system-provided, non-deletable) and **Custom Reports** (user-created).

**REQ-RPT-FE-F-005:** Each report card shall display: Name, Description, Type (Core/Custom), Created By, Date Created, and a `"Run"` button that navigates to `/reports/run/:reportId` or `/reports/run/custom/:customId`.

**REQ-RPT-FE-F-006:** Each custom report card shall additionally display an `"Edit"` button (navigates to `/reports/edit/:id`) and a `"Delete"` button that calls `DELETE /api/report-templates/:id` and removes the card on success.

**REQ-RPT-FE-F-007:** When no reports exist (empty API response), the page shall render `"No reports found."`.

**REQ-RPT-FE-F-008:** The page shall display four core report templates that are always present: **Submissions Report** (data source: submissions), **New Business Report** (data source: quotes), **Parties Report** (data source: parties), **Policies Report** (data source: policies). Core reports cannot be edited or deleted.

### 4.2 ReportCreatePage — /reports/create and /reports/edit/:id

**REQ-RPT-FE-F-011:** The Report Create page shall render a heading `"Create Report"` (new) or `"Edit Report"` (edit mode) and a form for defining a custom report.

**REQ-RPT-FE-F-012:** The form shall include the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| Report Name | text input | Yes | Display name |
| Description | textarea | Yes | Purpose description |
| Data Source | select (Submissions, Quotes, Policies, Policy Transactions, Binding Authorities, Parties, Claims) | Yes | Determines available fields — 7 domains |
| Date Basis | select (dynamic, from `GET /api/date-basis`) | Conditionally required — when Date From or Date To is set | Time range filter basis |
| Date From | date input | Conditionally required — when Date Basis is set | Start of range |
| Date To | date input | Conditionally required — when Date Basis is set | End of range |
| Sort By | select (from selected fields) | No | Sort column |
| Sort Order | select (Ascending, Descending) | No | Sort direction |

**REQ-RPT-FE-F-013:** When a Data Source is selected, the form shall call `GET /api/report-field-mappings/:domain` and display a **two-panel field selection table**:

- **Left panel ("Available Fields"):** A table with columns: Field, Domain, and an Add button per row. A domain dropdown filter above the table shall allow narrowing the list by domain. The panel shall be scrollable with `max-h-96`.
- **Right panel ("Selected Fields"):** A table with columns: Field, Domain, and Actions (Move Up ↑, Move Down ↓, Remove ✕ buttons per row). The panel header shall display `"Selected Fields (N)"` where N is the count. The panel shall be scrollable with `max-h-96` and `min-h-[200px]`.
- Clicking Add shall move the field from the left panel to the right panel. Clicking Remove shall move it back. Fields in the right panel shall be orderable via Move Up / Move Down.
- Selected fields shall be stored as an array of objects: `Array<{ id: string, label: string, domain: string }>` — preserving the field's display label and originating domain.

**REQ-RPT-FE-F-014:** The form shall include an `"Add Filter"` button that allows adding filter conditions. Each filter row shall contain: Field (select from currently selected fields in the right panel), Operator (select: equals, not_equals, contains, not_contains, starts_with, ends_with, greater_than, less_than — 8 operators), Value (text input), and a Remove button.

**REQ-RPT-FE-F-015:** Clicking `"Save"` shall call `POST /api/report-templates` (create) or `PUT /api/report-templates/:id` (edit) with the form data and navigate to `/reports` on success.

**REQ-RPT-FE-F-016:** Clicking `"Cancel"` shall navigate back to `/reports` without saving.

**REQ-RPT-FE-F-017:** In edit mode, the page shall fetch `GET /api/report-templates/:id` on mount and pre-populate all form fields.

**REQ-RPT-FE-F-018:** Validation: Report Name, Description, and Data Source are required. At least one field must be selected. When Date Basis is set, both Date From and Date To are required and Date From must be before Date To. When Date From or Date To is set, Date Basis is required.

**REQ-RPT-FE-F-019:** An optional **Schedule** section shall include: Schedule Enabled (checkbox), Schedule Frequency (select: Daily, Weekly, Monthly), Day of Week (select, visible when Weekly), Day of Month (number, visible when Monthly). **DEFERRED — Block 3.** The section shall render `"Scheduled reporting — coming soon."` as placeholder.

### 4.3 ReportRunPage — /reports/run/:reportId and /reports/run/custom/:customId

**REQ-RPT-FE-F-021:** The Report Run page shall fetch the report template on mount and display a loading indicator while in flight.

**REQ-RPT-FE-F-022:** The page shall display the report name, description, and a `"Run Report"` button. Clicking the button shall call `POST /api/report-templates/:id/run` with the template's filters and date range.

**REQ-RPT-FE-F-023:** While the report is executing, a loading indicator with `"Generating report…"` shall be shown.

**REQ-RPT-FE-F-024:** On success, the results shall be rendered in a dynamic table whose columns match the template's selected fields. The `<thead>` shall always be rendered (per §14.7 RULE 8). When results are empty, the `<tbody>` shall render `"No records match the report criteria."`.

**REQ-RPT-FE-F-025:** The page shall include an `"Export CSV"` button that generates a CSV file from the current result set and triggers a browser download. The filename shall be `{reportName}_{YYYY-MM-DD}.csv`.

**REQ-RPT-FE-F-026:** An inline error message shall be displayed when the report execution fails.

**REQ-RPT-FE-F-027:** The page shall display a `TabsNav` with three tabs: `{ key: 'results', label: 'Results' }`, `{ key: 'history', label: 'Execution History' }`, `{ key: 'audit', label: 'Audit History' }`. The default tab shall be `'results'`.

**REQ-RPT-FE-F-028:** The **Execution History** tab shall fetch `GET /api/report-templates/:id/history` on first activation and display a table with columns: Run Date, Run By, Records Returned, Duration (ms).

**REQ-RPT-FE-F-029:** The **Audit History** tab shall display changes to the report template (created, modified, deleted events) sourced from the audit system.

### 4.4 Cross-cutting

**REQ-RPT-FE-C-001:** All API calls must go through `@/shared/lib/api-client/api-client`; no direct `fetch()` or `axios`.

**REQ-RPT-FE-C-002:** All table header cells shall use Title Case text with no `uppercase` or `tracking-wide` CSS class (per §14.5 RULE 7).

### 4.5 Security

**REQ-RPT-FE-S-001:** The reporting pages shall not be accessible without a valid authenticated session.

**REQ-RPT-FE-S-002:** Custom reports shall only be editable/deletable by the user who created them or by users with `admin` or `manager` roles.

---

## 5. Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-RPT-FE-F-001 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-002 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-003 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-004 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-005 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-006 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-007 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-008 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-011 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-012 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-013 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-014 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-015 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-016 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-017 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-018 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-021 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-022 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-023 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-024 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-025 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-026 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-027 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-028 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-F-029 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-C-001 | code review | — |
| REQ-RPT-FE-C-002 | code review | — |
| REQ-RPT-FE-S-001 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |
| REQ-RPT-FE-S-002 | `frontend/src/reporting/__tests__/reports.test.tsx` | pending |

---

## 6. Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-RPT-001 | Should core reports be configurable (allow users to add/remove columns) or fixed? | Open |
| OQ-RPT-002 | What export formats are required beyond CSV? Legacy referenced PDF generation. | Open — PDF deferred |
| OQ-RPT-003 | Should report results support server-side pagination for large datasets? | Open |
| OQ-RPT-004 | What data source fields are available for Binding Authorities reports? | Open |

---

## 7. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Stub formatted per Guideline 13 |
| 2026-04-05 | Full requirements written from BackUp source. 24 functional + 2 constraint + 2 security REQs added. Block 1: ReportsListPage, ReportCreatePage, ReportRunPage. Dashboards deferred to Block 2. Scheduled reports deferred to Block 3. |
| 2026-04-07 | F-012 rewritten: 7 data source domains (added Policy Transactions, Claims; removed finance); Date Basis changed from static to dynamic `GET /api/date-basis`; Description now required. F-013 rewritten: flat checkbox list replaced with two-panel Available/Selected field table with Add/Remove/Reorder; fields stored as `{id, label, domain}[]` not `string[]`. F-014 rewritten: 8 filter operators (added not_contains, starts_with, ends_with). F-018 strengthened: Description required, conditional date validation. API endpoints table updated with `/api/date-basis`. |

---

## 8. Design Notes

### Core Report Templates
| Report | Data Source | Default Columns |
|---|---|---|
| Submissions Report | submissions | id, insuredName, brokerName, workflowStatus, assignedToName, createdDate |
| New Business Report | quotes | id, insuredName, broker, status, premium, effectiveDate, createdAt |
| Parties Report | parties | id, name, role, email, phone, addressLine1, city, country |
| Policies Report | policies | id, insuredName, policyNumber, effectiveDate, premium, status |

### CSV Export
The CSV export shall use RFC 4180 format. Field values containing commas, quotes, or newlines shall be properly escaped.
