# REQUIREMENTS — Reporting Domain (Frontend)

**Domain Code:** `RPT-FE`  
**Location:** `frontend/src/reporting/`  
**Status:** Reporting and dashboard requirements updated through live widget rendering/filter contract — pending traceability cleanup  
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
| 7 | Dashboard creation — name, description, pages, template | F-031–F-037 | COVERED |
| 8 | Dashboard view — render configured widgets | F-040, F-042 | COVERED |
| 9 | Dashboard configuration — widget editor, slot assignment | F-038–F-039, F-041 | COVERED |
| 10 | Scheduled reports (frequency, day-of-week/month) | F-019 | DEFERRED — Block 3 |

---

## 2. Impact Analysis

### Files to create / maintain
- `frontend/src/reporting/ReportsListPage/ReportsListPage.tsx`
- `frontend/src/reporting/ReportCreatePage/ReportCreatePage.tsx`
- `frontend/src/reporting/ReportRunPage/ReportRunPage.tsx`
- `frontend/src/reporting/DashboardCreatePage/DashboardCreatePage.tsx`
- `frontend/src/reporting/DashboardConfigurePage/DashboardConfigurePage.tsx`
- `frontend/src/reporting/DashboardViewPage/DashboardViewPage.tsx`
- `backend/nest/src/reporting/reporting.requirements.md`
- `frontend/src/reporting/reporting.service.ts`
- `frontend/src/reporting/__tests__/reports.test.tsx`

### Files to modify
- `frontend/src/main.jsx` — add routes: `/reports`, `/reports/create`, `/reports/edit/:id`, `/reports/run/:reportId`, `/dashboards/view/:reportId`, `/dashboards/create`, `/dashboards/edit/:id`, `/dashboards/configure/:id`
- `frontend/src/shell/AppSidebar.tsx` — register sidebar sections

### Dependencies
- `@/shared/lib/api-client/api-client` — `get`, `post`, `put`, `del`
- `@/shared/lib/auth-session/auth-session` — `getSession`
- `react-router-dom` — `useNavigate`, `useParams`, `Link`
- `@/shell/SidebarContext` — `useSidebarSection`
- `backend/nest/src/reporting/reporting.service.ts` — widget data execution contract

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
| POST | `/api/dashboards/widgets/data` | Execute one dashboard widget against live data |

### Database Tables
| Table | Impact |
|---|---|
| `report_templates` | CRUD |
| `report_executions` | Insert / read (history) |
| `dashboard_widgets` | CRUD (Block 2) |

---

## 3. Scope

**In scope:** ReportsListPage (`/reports`) — list core reports, custom reports, and dashboards; ReportCreatePage (`/reports/create`, `/reports/edit/:id`) — create/edit custom report with field selection, filters, date basis, sort; ReportRunPage (`/reports/run/:reportId`, `/reports/run/custom/:customId`) — execute report and display results in a dynamic table with export to CSV; DashboardCreatePage (`/dashboards/create`, `/dashboards/edit/:id`) — create and edit dashboard layout metadata; DashboardConfigurePage (`/dashboards/configure/:id`) — assign widgets to configured slots and render saved widgets with live data instead of placeholder previews; DashboardViewPage (`/dashboards/view/:reportId`) — display configured dashboard widgets with live data and filter-driven refresh.

**Deferred to Block 2:** Persisted dashboard-specific widget rows, widget-level saved filter presets, and cross-source join semantics for a single widget.

**Deferred to Block 3:** Scheduled report execution (cron triggers, email delivery).

**Out of scope:** PDF generation (external service); real-time data streaming.

---

## 4. Requirements

## 4a. Page Layout

### DashboardConfigurePage Layout (from BackUp: DashboardConfigurePage.jsx)

```text
┌──────────────────────────────────────────────┐
│ Heading + dashboard name                     │  ← unconditional
├──────────────────────────────────────────────┤
│ Page selector chips                          │  ← unconditional when pages exist
├──────────────────────────────────────────────┤
│ Current page / section widget grid           │  ← unconditional
│  └─ each configured slot renders a widget    │
│     empty slot renders add-widget affordance │
├──────────────────────────────────────────────┤
│ Widget editor modal                          │  ← conditional on Add/Edit Widget
└──────────────────────────────────────────────┘
```

### DashboardViewPage Layout (from BackUp: DashboardViewPage.jsx)

```text
┌──────────────────────────────────────────────┐
│ Heading + dashboard description              │  ← unconditional
├──────────────────────────────────────────────┤
│ Metadata card                                │  ← conditional on showMetadata
├──────────────────────────────────────────────┤
│ Dashboard Filters panel                      │  ← conditional on filterable widgets/fields
├──────────────────────────────────────────────┤
│ Page navigation                              │  ← conditional when multiple pages exist
├──────────────────────────────────────────────┤
│ Current page widget grid                     │  ← unconditional
└──────────────────────────────────────────────┘
```

### 4.1 ReportsListPage — /reports

**REQ-RPT-FE-F-001:** The Reports list page shall render a heading with the text `"Reporting"` without throwing an uncaught JavaScript exception on initial render.

**REQ-RPT-FE-F-002:** The Reports list page shall NOT render an inline "Create Report" or "+ New Report" button on the page header. The Create Report action is available in the sidebar only.

**REQ-RPT-FE-F-003:** The Reports list page shall call `GET /api/report-templates` on mount, display a loading indicator while the request is in flight, and render the returned records once loading is complete.

**REQ-RPT-FE-F-004:** The page shall display reports in two sections: **Core Reports** (system-provided, non-deletable) and **Custom Reports** (user-created).

**REQ-RPT-FE-F-005:** Each report card shall display: Name, Description, Type (Core/Custom), Created By, Date Created, and a `"Run"` action button rendered with the brand colour (`text-brand-500`). For core reports, clicking Run shall navigate to `/reports/run/{data_source}` (e.g. `/reports/run/submissions`). For custom reports, clicking Run shall navigate to `/reports/run/{id}` where `{id}` is the numeric template ID.

**REQ-RPT-FE-F-005a:** When the ReportRunPage is opened for a core report (non-numeric `reportId` matching a known data source key such as `submissions`, `quotes`, `parties`, or `policies`), clicking "Run Report" shall call `GET /api/{dataSource}` directly (e.g. `GET /api/submissions`) rather than `POST /api/report-templates/:id/run`. This avoids a 404 because core report templates are not persisted in the database.

**REQ-RPT-FE-F-006:** Each custom report card shall additionally display an `"Edit"` button and a `"Delete"` button. For report templates, Edit shall navigate to `/reports/edit/:id`. For dashboard templates, Edit shall navigate to `/dashboards/edit/:id`. Delete shall call `DELETE /api/report-templates/:id` and remove the card on success.

**REQ-RPT-FE-F-007:** When no reports exist (empty API response), the page shall render `"No reports found."`.

**REQ-RPT-FE-F-008:** The page shall display four core report templates that are always present: **Submissions Report** (data source: submissions), **New Business Report** (data source: quotes), **Parties Report** (data source: parties), **Policies Report** (data source: policies). Core reports cannot be edited or deleted.

### 4.2 ReportCreatePage — /reports/create and /reports/edit/:id

**REQ-RPT-FE-F-011:** The Report Create page shall render a heading `"Create Report"` (new) or `"Edit Report"` (edit mode) and a form for defining a custom report.

**REQ-RPT-FE-F-012:** The form shall include the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| Report Name | text input | Yes | Display name |
| Description | textarea | Yes | Purpose description |
| Date Basis | select (dynamic, from `GET /api/date-basis`) | Conditionally required — when Date From or Date To is set | Time range filter basis |
| Date From | date input | Conditionally required — when Date Basis is set | Start of range |
| Date To | date input | Conditionally required — when Date Basis is set | End of range |
| Sort By | select (from selected fields) | No | Sort column |
| Sort Order | select (Ascending, Descending) | No | Sort direction |

The Data Source selector is not a user-visible form field. Instead, field mappings for all 7 domains (Submissions, Quotes, Policies, Policy Transactions, Binding Authorities, Parties, Claims) are loaded on page mount and shown together in the Available Fields panel, with Domain visible as a column on each row.

**REQ-RPT-FE-F-013:** On page mount the form shall call `GET /api/report-field-mappings/:domain` for each of the 7 supported domains in parallel and display an **always-visible two-panel field selection table**:

- **Left panel ("Available Fields"):** A table with columns: Field, Domain, and an Add action per row rendered as a green plus (`+`) icon action styled consistently with the app's green table action buttons. A text search box above the table shall filter rows by field name or domain (case-insensitive). The panel shall be scrollable with `max-h-80`.
- **Right panel ("Selected Fields"):** A table with columns: # (position), Field, Domain, and Order (Move Up ↑, Move Down ↓ buttons and Remove ✕ per row). Move Up/Down buttons shall be rendered as clearly visible bordered button elements (not plain icon-only links). The panel header shall display `"Selected Fields (N)"` where N is the count. The panel shall be scrollable with `max-h-80` and `min-h-[200px]`.
- Clicking Add shall move the field from the left panel to the right panel. Clicking Remove shall move it back. Fields in the right panel shall be orderable via Move Up / Move Down.
- Selected fields shall be stored as an array of objects: `Array<{ id: string, label: string, domain: string }>` — preserving the field's display label and originating domain.
- Fields from the same domain key loaded across multiple API calls shall be deduplicated by composite key `fieldKey::domain`.

**REQ-RPT-FE-F-014:** The form shall always render at least one visible filter row, even before the user clicks `"Add Filter"`. Filters are independent of the selected report fields and may reference any field from all loaded field mappings (all 7 domains). Each filter row shall contain:

- **Connector** — a toggle displayed before each row after the first, defaulting to `AND`, allowing the user to switch to `OR`.
- **Group** — a numeric group selector so users can build grouped expressions such as `Group 1: A AND B` and `Group 2: C AND D`, with `OR` between the groups.
- **Field picker** — a searchable control that filters by field label or domain name and allows selecting from all available field mappings across all 7 domains.
- **Operator select** — `equals`, `not_equals`, `contains`, `not_contains`, `starts_with`, `ends_with`, `greater_than`, `less_than`, and `in`.
- **Value input** — a searchable, creatable text control. When operator is `in`, the control shall support adding multiple values as removable chips/tokens. When lookup suggestions are available they shall be offered while typing, but the user must still be able to enter free text values that are not present in the suggestion list.
- **Move Up ↑ / Move Down ↓ buttons** — allowing the user to reorder filter rows.
- **Remove button** — removes that filter row.

Filter rows shall be stored as an array of objects: `Array<{ connector?: 'AND' | 'OR', group?: number, field: string, operator: string, value: string | string[] }>`.

**REQ-RPT-FE-F-015:** The page shall register a contextual sidebar section via `useSidebarSection` containing a `Save` action when the user is on `/reports/create` or `/reports/edit/:id`. Triggering that sidebar action shall call `POST /api/report-templates` (create) or `PUT /api/report-templates/:id` (edit) with the form data and navigate to `/reports` on success. The page shall not render an inline Save button.

**REQ-RPT-FE-F-016:** The page shall not render an inline `Cancel` button. Users shall return via the shared sidebar `Back` action.

**REQ-RPT-FE-F-017:** In edit mode, the page shall fetch `GET /api/report-templates/:id` on mount and pre-populate all form fields.

**REQ-RPT-FE-F-018:** Validation: Report Name and Description are required. At least one field must be selected. When Date Basis is set, both Date From and Date To are required and Date From must be before Date To. When Date From or Date To is set, Date Basis is required.

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

### 4.4 DashboardCreatePage — /dashboards/create and /dashboards/edit/:id

**REQ-RPT-FE-F-031:** The Dashboard Create page shall render a heading `"Create Dashboard"` (new) or `"Edit Dashboard"` (edit mode).

**REQ-RPT-FE-F-032:** The page shall provide a form with **Dashboard Name** (text input, required) and **Description** (textarea).

**REQ-RPT-FE-F-033:** The page shall include a **Show Dashboard Metadata** checkbox that defaults to checked.

**REQ-RPT-FE-F-034:** The page shall include a **Dashboard Layout** section. Each page item shall have a **Page Name** text input, an **Enable Page Scroll** checkbox, and a **Layout Template** button. When scroll is enabled, a **Number of Sections** select (1–5) shall appear with per-section template selectors.

**REQ-RPT-FE-F-035:** The layout section shall include an **Add Page** button that appends a new page to the list.

**REQ-RPT-FE-F-036:** Clicking a Layout Template or Section Template button shall open a **TemplateSelector modal** that renders all standard DASHBOARD_TEMPLATES in a visual grid and closes on selection.

**REQ-RPT-FE-F-037:** The page shall register a contextual sidebar section via `useSidebarSection` when the user is on `/dashboards/create` or `/dashboards/edit/:id`. On both routes the sidebar shall expose a `Save` action. On `/dashboards/edit/:id` it shall also expose a `Configure Widgets` action that navigates to `/dashboards/configure/:id`. The page shall not render inline Save, Configure Widgets, or Cancel buttons, or helper copy instructing the user to use the sidebar. Triggering Save with a non-empty Dashboard Name shall call `POST /api/report-templates` (create) or `PUT /api/report-templates/:id` (edit) with `type: "dashboard"`. On successful **create** and **edit**, the page shall navigate to `/dashboards/configure/:id` so the user can assign and edit widgets immediately.

### 4.5 DashboardConfigurePage — /dashboards/configure/:id

**REQ-RPT-FE-F-038:** The Dashboard Configure page shall register a contextual sidebar section via `useSidebarSection` with a `Save Widgets` action. The page shall not render inline `Save Widgets` or `Back to Layout` buttons, or helper copy instructing the user to use the sidebar. Users shall return via the shared sidebar `Back` action.

**REQ-RPT-FE-F-039:** The widget editor shall support backup-aligned configuration fields by widget type. Measures and attributes shall be selectable from all loaded reporting domains, with the domain visible in the option label. Chart widgets shall expose chart-type-specific fields: line, bar, and area charts shall allow selecting an x-axis field, x-axis label, y-axis label, optional y-axis field, optional legend split attribute, and one or more measures. Both x-axis and y-axis selectors shall accept any loaded field, including measures such as Gross Written Premium and date fields such as Inception Date. If the selected y-axis field is itself a measure, it shall count as a chart measure even when the separate measures checklist is empty. Pie and doughnut charts shall allow selecting a category attribute, category label, and one or more measures. Metric widgets shall allow selecting a measure and aggregation. Table widgets shall allow selecting one or more attributes/columns from any domain. Text widgets shall allow entering note content. Triggering `Save Widgets` shall persist the configured widget definitions inside the dashboard config.

**REQ-RPT-FE-F-041:** After a widget has been saved into a slot, both DashboardConfigurePage and DashboardViewPage shall render that widget using live data returned by the backend widget-data API rather than a static preview tile. Metric, chart, and table widgets shall show loading, empty, and error states driven by the API response. Text widgets shall render their saved note content directly. Widgets whose configured fields span multiple distinct data sources shall render the merged live-data response returned by the backend rather than falling back to an unsupported-state placeholder.

### 4.6 DashboardViewPage — /dashboards/view/:reportId

**REQ-RPT-FE-F-040:** Dashboard templates shall open on `/dashboards/view/:reportId`, not on the ReportRunPage. The Dashboard View page shall load the saved dashboard config, render the dashboard name and description, optionally render metadata when `showMetadata` is enabled, provide page tabs when multiple dashboard pages exist, and display configured widgets in their saved layout slots. The page shall not render a `Run Report` action or report-results table.

**REQ-RPT-FE-F-042:** DashboardViewPage shall render a collapsible `Dashboard Filters` panel whenever the current dashboard contains filterable live widgets. The panel shall expose: `Analysis Basis`, `Date Basis`, `Reporting Date`, and repeatable custom field filters derived from the filterable fields used by the current page's widgets. Clicking `Apply Filters` shall rerun the live widget queries for the current page with the selected filter state; clicking `Reset Filters` shall restore defaults and rerun the widgets. The page shall not silently ignore filter changes.

### 4.5 Cross-cutting

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
| 2026-04-14 | F-014 rewritten: filter field list now uses ALL field mappings (not just selected fields); AND/OR connector added between rows; Move Up/Down ordering added; lookup-type fields show `in` operator and searchable multiselect value control; filter stored as `{connector?, field, operator, value: string \| string[]}[]`. F-037 updated: on successful *create* navigate to `/dashboards/edit/:id`; on edit navigate to `/reports`. Backend: `GET /api/date-basis` endpoint added returning date basis options. |

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
