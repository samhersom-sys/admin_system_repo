# REQUIREMENTS — Configurable Homepage (HOME-CFG) v2

**Domain Code:** `HOME-CFG`  
**Location:** `frontend/src/home/`  
**Status:** Draft v2 — Gate 1 pending Project Sponsor approval  
**Test file:** `frontend/src/home/__tests__/homepage-config.test.tsx` _(to be created — Test Analyst gate)_  
**Standard:** Written per [Guideline 13](../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Feature Overview

The Configurable Homepage feature replaces the static, hardcoded "Overview" tab on the home page (`/app-home`) with a fully dynamic, user-configurable homepage driven by the existing dashboard engine.

**Target state:**

1. **Homepages are dashboards.** A dashboard stored in `report_templates` can be marked as the user's **master homepage** (Homepage=ON) or as a **Dashboard** (shown on homepage as a page/section, Dashboard=ON). At most one row per user may be the master homepage.
2. **The Overview tab is replaced** at runtime by the user's master homepage dashboard, rendered via the existing `DashboardViewPage` widget runtime. If no master homepage is set, the Overview tab is absent and an empty state is shown.
3. **All homepage configuration is managed inline on the existing Report Library page (`/reports`).** There is no new navigation entry and no new page. The Report Library gains:
   - A **"Core Homepages" table section** at the very top of the page (above Core Application Reports)
   - Three new columns — **Homepage**, **Dashboard**, **No** — in all four tables
4. **Default system homepage.** A "Default Homepage" core report template is seeded for every new user, pre-configured with the current Overview layout. It is seeded with Dashboard=ON and Homepage=ON for that user so that nothing changes visually at first login.
5. **Recent Records and My Tasks** are promoted from hardcoded home widgets to `type: 'core'` entries in `report_templates`, appearing in both the Core Homepages table and the Core Application Reports table.
6. **Per-user overrides for core templates** are stored in a new `user_homepage_preferences` table. Dashboard toggle/page-order for custom templates continue to use `PUT /api/report-templates/:id`.

**Source files read (2026-06-29):**

- `frontend/src/home/index.tsx` — current two-tab structure
- `frontend/src/home/HomeDashboard.tsx` — current hardcoded Overview widgets
- `frontend/src/home/HomeEmbeddedDashboard.tsx` — current "Dashboard" tab (filters by `showOnHomepage`)
- `frontend/src/home/HomeWidgets/RecentActivityWidget.tsx` — calls `GET /api/recent-records-data`
- `frontend/src/home/HomeWidgets/TasksWidget.tsx` — calls `GET /api/tasks?assignedTo=<userId>`
- `frontend/src/reporting/reporting.service.ts` — API adapter functions and `ReportTemplate` type
- `frontend/src/reporting/ReportsListPage/ReportsListPage.tsx` — four-table structure, column definitions, `CORE_TEMPLATES` constant
- `frontend/src/reporting/coreDashboards.ts` — core dashboard structure
- `frontend/src/reporting/reports.requirements.md` — max REQ IDs: REQ-RPT-FE-F-050, REQ-RPT-BE-F-057, REQ-RPT-DB-F-054

---

## 2. Impact Analysis

### UI / Front-End Impact

| File | Change |
|------|--------|
| `frontend/src/home/index.tsx` | **Modified** — render master homepage via `DashboardViewPage` when `masterHomepageTemplateId` is set; remove Overview tab when not set; show setup prompt when master is null |
| `frontend/src/home/HomeDashboard.tsx` | **Retained** — used only as layout reference for the seed definition; no longer rendered directly when a master homepage is set |
| `frontend/src/home/HomeEmbeddedDashboard.tsx` | **Removed** — superseded by the master homepage mechanism |
| `frontend/src/reporting/ReportsListPage/ReportsListPage.tsx` | **Modified** — (1) add "Core Homepages" table section at top; (2) add Homepage, Dashboard, No columns to all four tables; (3) add Recent Records and My Tasks to `CORE_TEMPLATES`; (4) add toggle handlers calling the new endpoints |
| `frontend/src/reporting/reporting.service.ts` | **Modified** — add `patchMasterHomepage` and `patchHomepagePreferences` adapter functions; add `masterHomepageTemplateId` to auth session type |
| `frontend/src/home/MyHomepagesPage/MyHomepagesPage.tsx` | **Removed from scope** — v1 planned this page; v2 confirms it does not exist; all configuration is inline on `ReportsListPage` |

### API Impact

| Method | Endpoint | Change | Request body | Response shape |
|--------|----------|--------|--------------|----------------|
| `PATCH` | `/api/users/me/master-homepage` | **New** | `{ masterHomepageTemplateId: number \| null }` | `{ id, masterHomepageTemplateId }` |
| `PATCH` | `/api/users/me/homepage-preferences` | **New** | `{ templateId: number, showOnHomepage?: boolean, homepagePageOrder?: number \| null }` | upserted preference row |
| `GET` | `/api/auth/me` | **Modified** — add field | — | existing fields + `masterHomepageTemplateId: number \| null` |
| `GET` | `/api/recent-records` | **New** _(alias of `/api/recent-records-data`)_ | — | `{ submissions, quotes, policies, bindingAuthorities }` |
| `PUT` | `/api/report-templates/:id` | **Existing** — used for custom template `showOnHomepage` toggle | `{ showOnHomepage: boolean }` (partial) | existing |

> **Note:** The current `RecentActivityWidget` calls `GET /api/recent-records-data`. The canonical endpoint for the promoted core report is `GET /api/recent-records`. The legacy route should be preserved until all callers are migrated (see OQ-CHOME-009).

### Database Impact

| Entity / Table | Change | Migration |
|----------------|--------|-----------|
| `users` | Add column `master_homepage_template_id` (nullable integer FK → `report_templates.id`, `ON DELETE SET NULL`) | New migration — DBA to confirm number |
| `user_homepage_preferences` | **New table** — per-user overrides for template homepage visibility and page order | New migration — DBA to confirm number |
| `report_templates` | Seed: "Default Homepage" core template; "Recent Records" and "My Tasks" core templates | Seed file update |

---

## 3. Functional Requirements — Frontend

### REQ-HOME-CFG-FE-F-001: Default Homepage core template seeded at user creation

**REQ-HOME-CFG-FE-F-001:** The system shall create a "Default Homepage" `type: 'core'` record in `report_templates` for every new user at account creation time, pre-configured with the current Overview layout (KPI metric strip, GWP bar chart, Cumulative GWP chart, Recent Records widget, My Tasks widget), seeded with `show_on_homepage = true`, `homepage_page_order = 1`, and `is_master_homepage = true` for that user.

**Acceptance criteria:**

- AC-001a: After a new user account is created, `users.master_homepage_template_id` is a non-null integer referencing the seeded "Default Homepage" `report_templates` record.
- AC-001b: A `user_homepage_preferences` row for that user and the Default Homepage template exists with `show_on_homepage = true` and `homepage_page_order = 1`.
- AC-001c: A user who has never modified their homepage settings sees the Default Homepage rendered at `/app-home` immediately after first login.
- AC-001d: The seeded Default Homepage contains exactly five widget slots: KPI metric strip (source: `kpi`), GWP bar chart (source: `gwp`), Cumulative GWP chart (source: `cumulativeGwp`), Recent Records table (source: `recent-records`), My Tasks table (source: `tasks`).

---

### REQ-HOME-CFG-FE-F-002: Core Homepages table section at top of ReportsListPage

**REQ-HOME-CFG-FE-F-002:** The `ReportsListPage` component shall render a "Core Homepages" table section at the very top of the page (above Core Application Reports), showing all core report template records where `type = 'core'` and `show_on_homepage = true` as resolved from seeded entries or server-returned data.

**Acceptance criteria:**

- AC-002a: Navigating to `/reports` renders a section labelled "Core Homepages" above the "Core Application Reports" section.
- AC-002b: The Core Homepages section contains at least the "Default Homepage", "Recent Records", and "My Tasks" rows after seeding.
- AC-002c: The Core Homepages table renders the same base columns as Core Application Reports (Report Name, Description, Type) plus the three new columns (Homepage, Dashboard, No) plus Actions.
- AC-002d: When no core templates with `show_on_homepage = true` are present, the section renders an empty state row.

---

### REQ-HOME-CFG-FE-F-003: Homepage column — master toggle, single active per user

**REQ-HOME-CFG-FE-F-003:** All four tables on `ReportsListPage` (Core Homepages, Core Application Reports, Core Application Dashboards, My Custom Reports) shall include a **Homepage** column displaying a circular toggle icon per row. At most one row per user may have Homepage=ON at any time. Activating a row's Homepage toggle deactivates any previously active row (optimistic client update) and calls `PATCH /api/users/me/master-homepage` with body `{ masterHomepageTemplateId: <id> }`.

**Acceptance criteria:**

- AC-003a: Each row in all four tables displays a circular toggle icon in the Homepage column; the icon is visually distinct between ON and OFF states.
- AC-003b: At most one toggle across all four tables is in the ON state simultaneously; activating any toggle turns off all others.
- AC-003c: Activating a Homepage toggle triggers exactly one `PATCH /api/users/me/master-homepage` request with the correct `masterHomepageTemplateId`.
- AC-003d: The toggle is disabled (non-interactive) while the PATCH request is in flight.
- AC-003e: On error response, the toggle reverts to its pre-click state and an error notification is shown via `useNotifications`.

---

### REQ-HOME-CFG-FE-F-004: Homepage toggle — clicking an active toggle clears the master

**REQ-HOME-CFG-FE-F-004:** When the authenticated user clicks a Homepage toggle that is already ON (Homepage=ON → OFF), the `ReportsListPage` shall call `PATCH /api/users/me/master-homepage` with body `{ masterHomepageTemplateId: null }`. On a 200 response, all Homepage toggles shall show OFF and the home page shall render no Overview tab and display an empty state / setup prompt.

**Acceptance criteria:**

- AC-004a: Clicking the currently active Homepage toggle triggers `PATCH /api/users/me/master-homepage` with `{ masterHomepageTemplateId: null }`.
- AC-004b: On success, no row in any table shows the Homepage toggle in the ON state.
- AC-004c: Navigating to `/app-home` after clearing the master renders no "Overview" tab in the tab bar.
- AC-004d: The home page renders a setup prompt or empty state guiding the user to configure a homepage via the Report Library.

---

### REQ-HOME-CFG-FE-F-005: Dashboard column — show-on-homepage toggle, multiple rows

**REQ-HOME-CFG-FE-F-005:** All four tables on `ReportsListPage` shall include a **Dashboard** column displaying a circular toggle icon per row. Multiple rows may have Dashboard=ON simultaneously. Toggling Dashboard for a custom report or dashboard calls `PUT /api/report-templates/:id` with the updated `showOnHomepage` value. For core templates, toggling Dashboard calls `PATCH /api/users/me/homepage-preferences` with `{ templateId, showOnHomepage: <boolean> }` to store a per-user override.

**Acceptance criteria:**

- AC-005a: Multiple rows across all four tables may have the Dashboard toggle ON simultaneously.
- AC-005b: Toggling Dashboard ON for a custom template triggers `PUT /api/report-templates/:id` with body containing `showOnHomepage: true`.
- AC-005c: Toggling Dashboard OFF for a custom template triggers `PUT /api/report-templates/:id` with body containing `showOnHomepage: false`.
- AC-005d: Toggling Dashboard ON or OFF for a core template triggers `PATCH /api/users/me/homepage-preferences` with `{ templateId: <id>, showOnHomepage: <boolean> }`.
- AC-005e: The toggle is disabled while the API call is in flight; on error the toggle reverts and a notification is shown.

---

### REQ-HOME-CFG-FE-F-006: No column — editable page order integer

**REQ-HOME-CFG-FE-F-006:** All four tables on `ReportsListPage` shall include a **No** column displaying an editable integer input per row. The value represents the page-level display order on the homepage. The field is blank and disabled when Dashboard=OFF for that row. Changes call `PATCH /api/users/me/homepage-preferences` with `{ templateId, homepagePageOrder: <value> }`.

**Acceptance criteria:**

- AC-006a: Each row displays an editable integer input in the No column; the input is blank and non-interactive when Dashboard=OFF.
- AC-006b: When Dashboard=ON, the input is editable and accepts positive integers ≥ 1 only (client-side validation per REQ-HOME-CFG-FE-C-003).
- AC-006c: Committing a valid page order value (on blur or Enter) triggers `PATCH /api/users/me/homepage-preferences` with `{ templateId: <id>, homepagePageOrder: <value> }`.
- AC-006d: On error response, the input reverts to its previous value and a notification is shown.

---

### REQ-HOME-CFG-FE-F-007: Overview tab replaced at runtime by the master homepage

**REQ-HOME-CFG-FE-F-007:** The `HomePage` component (`frontend/src/home/index.tsx`) shall read `masterHomepageTemplateId` from the authenticated session (sourced from `GET /api/auth/me`) and, when the value is a non-null integer, render the referenced dashboard using the existing `DashboardViewPage` widget runtime in place of the static `HomeDashboard` component. When `masterHomepageTemplateId` is null, the "Overview" tab shall not appear in the tab bar.

**Acceptance criteria:**

- AC-007a: When `masterHomepageTemplateId` is a non-null integer, navigating to `/app-home` renders the dashboard with that ID via the `DashboardViewPage` runtime; the static `HomeDashboard` component is not rendered.
- AC-007b: When `masterHomepageTemplateId` is null, the tab bar does not include an "Overview" tab.
- AC-007c: The `HomePage` component does not call `GET /api/report-templates` directly — it uses the `masterHomepageTemplateId` already present in the session to fetch the single referenced dashboard via `GET /api/report-templates/:id`.
- AC-007d: The tab resets to the master homepage (or first available tab) whenever `location.key` changes, matching existing `useEffect` reset behaviour.

---

### REQ-HOME-CFG-FE-F-008: "Recent Records" promoted to a core report template

**REQ-HOME-CFG-FE-F-008:** The `CORE_TEMPLATES` constant in `ReportsListPage` and the backend seed shall include a "Recent Records" entry with `type: 'core'` and `data_source: 'recent-records'`. The corresponding backend route `GET /api/recent-records` shall return the same payload shape as the current `GET /api/recent-records-data` endpoint. Recent Records shall appear in both the Core Homepages table and the Core Application Reports table on `ReportsListPage`.

**Acceptance criteria:**

- AC-008a: The Core Application Reports section of `/reports` includes a row with `name = 'Recent Records'`.
- AC-008b: The Core Homepages section of `/reports` includes a row with `name = 'Recent Records'`.
- AC-008c: Clicking "Run" on the Recent Records row navigates to `/reports/run/recent-records`.
- AC-008d: `GET /api/recent-records` returns an aggregated list with columns: Reference, Record Type, Submission Type, Policy Status, Record Status, Insured, Broker, Last Opened, User — matching the existing `RecentActivityWidget` column set.

---

### REQ-HOME-CFG-FE-F-009: "My Tasks" promoted to a core report template

**REQ-HOME-CFG-FE-F-009:** The `CORE_TEMPLATES` constant in `ReportsListPage` and the backend seed shall include a "My Tasks" entry with `type: 'core'` and `data_source: 'tasks'`. My Tasks shall appear in both the Core Homepages table and the Core Application Reports table on `ReportsListPage`.

**Acceptance criteria:**

- AC-009a: The Core Application Reports section of `/reports` includes a row with `name = 'My Tasks'`.
- AC-009b: The Core Homepages section of `/reports` includes a row with `name = 'My Tasks'`.
- AC-009c: Clicking "Run" navigates to `/reports/run/tasks`.
- AC-009d: The `ReportRunPage` for `reportId = 'tasks'` calls `GET /api/tasks?assignedTo=<currentUserId>` and renders columns: Task (description), Source, Due (formatted DD/MM/YYYY) — matching the existing `TasksWidget` columns.

---

### REQ-HOME-CFG-FE-F-010: Promoted core reports addable as dashboard widgets

**REQ-HOME-CFG-FE-F-010:** The `DashboardConfigurePage` widget editor shall list `recent-records` and `tasks` as selectable data sources for `table`-type widgets, allowing the user to add either as a widget to any dashboard page slot. The saved widget shall execute via `POST /api/dashboards/widgets/data` and render live data in the slot.

**Acceptance criteria:**

- AC-010a: The widget editor modal data source dropdown includes `recent-records` and `tasks` alongside existing data sources.
- AC-010b: A dashboard widget saved with `source: 'recent-records'` and `type: 'table'` renders live data in the slot.
- AC-010c: A dashboard widget saved with `source: 'tasks'` and `type: 'table'` renders live data in the slot.
- AC-010d: Both widget types use the same widget runtime as all other table widgets — no special-case rendering path.

---

### REQ-HOME-CFG-FE-F-011: Live preview for promoted core report widgets

**REQ-HOME-CFG-FE-F-011:** The `DashboardConfigurePage` widget editor modal shall render a live data preview table when the user selects `recent-records` or `tasks` as the widget data source, updating automatically when the configuration changes.

**Acceptance criteria:**

- AC-011a: Selecting `recent-records` as the data source in the widget editor renders a preview table populated with live data from `POST /api/dashboards/widgets/data` within 2 seconds of the last configuration change (subject to API latency).
- AC-011b: Selecting `tasks` as the data source triggers the same preview behaviour.
- AC-011c: The preview area shows a loading spinner while the API call is in flight.
- AC-011d: The Save button remains enabled regardless of preview load state; preview load failure does not block saving.

---

## 4. Functional Requirements — Backend

### REQ-HOME-CFG-BE-F-001: PATCH /api/users/me/master-homepage

**REQ-HOME-CFG-BE-F-001:** The `UsersController` shall expose `PATCH /api/users/me/master-homepage`, protected by `JwtAuthGuard`, that accepts a JSON body `{ masterHomepageTemplateId: number | null }`, validates that the referenced template (when non-null) has a `tenant_id` matching the authenticated user's organisation, updates `users.master_homepage_template_id` for the authenticated user, and returns HTTP 200 with `{ id, masterHomepageTemplateId }`.

**Acceptance criteria:**

- AC-BE-001a: `PATCH /api/users/me/master-homepage` with `{ masterHomepageTemplateId: 99 }` authenticated as user 42 returns HTTP 200 and sets `users.master_homepage_template_id = 99` for user 42.
- AC-BE-001b: The same request with `{ masterHomepageTemplateId: null }` returns HTTP 200 and sets `users.master_homepage_template_id = NULL`.
- AC-BE-001c: An unauthenticated request returns HTTP 401.
- AC-BE-001d: A request with `masterHomepageTemplateId` referencing a template whose `tenant_id` does not match the caller's organisation returns HTTP 403.
- AC-BE-001e: A request with a non-existent `masterHomepageTemplateId` returns HTTP 422.

---

### REQ-HOME-CFG-BE-F-002: PATCH /api/users/me/homepage-preferences

**REQ-HOME-CFG-BE-F-002:** The `UsersController` shall expose `PATCH /api/users/me/homepage-preferences`, protected by `JwtAuthGuard`, that accepts a JSON body `{ templateId: number, showOnHomepage?: boolean, homepagePageOrder?: number | null }` and upserts a row in the `user_homepage_preferences` table for the authenticated user, returning HTTP 200 with the upserted preference record.

**Acceptance criteria:**

- AC-BE-002a: `PATCH /api/users/me/homepage-preferences` with `{ templateId: 5, showOnHomepage: true }` upserts a row in `user_homepage_preferences` with `user_id = <caller>`, `template_id = 5`, `show_on_homepage = true`.
- AC-BE-002b: A second call with `{ templateId: 5, homepagePageOrder: 2 }` updates the existing row's `homepage_page_order = 2` without overwriting the existing `show_on_homepage` value.
- AC-BE-002c: An unauthenticated request returns HTTP 401.
- AC-BE-002d: A request where `templateId` references a template whose `tenant_id` does not match the caller's organisation returns HTTP 403.

---

### REQ-HOME-CFG-BE-F-003: GET /api/auth/me includes masterHomepageTemplateId

**REQ-HOME-CFG-BE-F-003:** The `AuthController` `GET /api/auth/me` response payload shall include a `masterHomepageTemplateId` field of type `number | null`, sourced from `users.master_homepage_template_id` for the authenticated user, so that the frontend `HomePage` component can determine which dashboard to render without a separate API round-trip on load.

**Acceptance criteria:**

- AC-BE-003a: `GET /api/auth/me` for a user with `master_homepage_template_id = 7` returns a response body containing `"masterHomepageTemplateId": 7`.
- AC-BE-003b: `GET /api/auth/me` for a user with `master_homepage_template_id = NULL` returns a response body containing `"masterHomepageTemplateId": null`.
- AC-BE-003c: The `masterHomepageTemplateId` key is present in every authenticated `GET /api/auth/me` response and is never omitted.

---

## 5. DB Impact Analysis

### REQ-HOME-CFG-DB-F-001: Add master_homepage_template_id to the users table

**REQ-HOME-CFG-DB-F-001:** A database migration shall add column `master_homepage_template_id` (nullable integer FK → `report_templates.id`, `ON DELETE SET NULL`) to the `users` table. DBA to confirm the exact migration number.

**Acceptance criteria:**

- AC-DB-001a: After the migration runs, `users.master_homepage_template_id` exists as a nullable integer column in the `users` table.
- AC-DB-001b: The FK constraint to `report_templates(id)` is enforced at the database level; inserting a non-existent ID returns a constraint violation.
- AC-DB-001c: Deleting a referenced `report_templates` record sets all referencing `users.master_homepage_template_id` values to `NULL` automatically (`ON DELETE SET NULL`).
- AC-DB-001d: All existing `users` rows have `master_homepage_template_id = NULL` after the migration (no data corruption).

---

### REQ-HOME-CFG-DB-F-002: Create user_homepage_preferences table

**REQ-HOME-CFG-DB-F-002:** A database migration shall create a `user_homepage_preferences` table with columns: `id` (PK), `user_id` (FK → `users.id`), `template_id` (FK → `report_templates.id`), `show_on_homepage` (boolean, default false), `homepage_page_order` (nullable integer), `tenant_id` (FK → `organizations.id`). A unique constraint on `(user_id, template_id)` ensures one preference row per user per template. DBA to confirm the exact migration number.

**Acceptance criteria:**

- AC-DB-002a: After the migration runs, the `user_homepage_preferences` table exists with the specified columns and types.
- AC-DB-002b: A unique constraint on `(user_id, template_id)` prevents duplicate preference rows; attempting to insert a duplicate returns a unique violation error.
- AC-DB-002c: `tenant_id` has a FK to `organizations.id` and is non-null; all inserts must include a valid `tenant_id`.
- AC-DB-002d: The `show_on_homepage` column defaults to `false` if not specified at insert.

---

## 6. Security Requirements

### REQ-HOME-CFG-FE-S-001: Endpoints scoped to the authenticated user only (no IDOR)

**REQ-HOME-CFG-FE-S-001:** `PATCH /api/users/me/master-homepage` and `PATCH /api/users/me/homepage-preferences` shall only allow the authenticated user to modify their own preferences. `JwtAuthGuard` derives the user identity exclusively from the JWT `sub` claim — there is no `:id` path parameter on either endpoint, eliminating the IDOR vector. Any unauthenticated request returns HTTP 401.

**Acceptance criteria:**

- AC-S-001a: Authenticated request with valid JWT → HTTP 200 (when body is valid).
- AC-S-001b: Unauthenticated request (missing or invalid token) → HTTP 401.
- AC-S-001c: Code review confirms there is no `:id` path parameter on either endpoint — user identity is always derived from the JWT `sub` claim.

---

### REQ-HOME-CFG-FE-S-002: Template IDs must reference an organisation-accessible template

**REQ-HOME-CFG-FE-S-002:** `masterHomepageTemplateId` (in `PATCH /api/users/me/master-homepage`) and `templateId` (in `PATCH /api/users/me/homepage-preferences`) must each reference a `report_templates` record whose `tenant_id` matches the authenticated user's organisation; otherwise the endpoint returns HTTP 403.

**Acceptance criteria:**

- AC-S-002a: Submitting a `masterHomepageTemplateId` referencing a template in a different tenant returns HTTP 403.
- AC-S-002b: Submitting a `templateId` in homepage-preferences referencing a template in a different tenant returns HTTP 403.
- AC-S-002c: Submitting `masterHomepageTemplateId: null` always returns HTTP 200 (no validation required to clear).
- AC-S-002d: Submitting a non-existent template ID returns HTTP 422.

---

## 7. Constraint Requirements

### REQ-HOME-CFG-FE-C-001: All API calls via shared api-client module

**REQ-HOME-CFG-FE-C-001:** All HTTP requests in `frontend/src/home/**` and in the `ReportsListPage` homepage toggle handlers shall be made using functions exported from `@/shared/lib/api-client/api-client` (`get`, `post`, `put`, `patch`, `del`); no direct `fetch()` or `axios` calls are permitted.

**Acceptance criteria:**

- AC-C-001a: Code review confirms zero direct `fetch()` or `axios` calls in `frontend/src/home/**`.
- AC-C-001b: Code review confirms the homepage toggle handlers in `ReportsListPage` use `patch` and `put` from `api-client`.

---

### REQ-HOME-CFG-FE-C-002: At most one master homepage per user at any time

**REQ-HOME-CFG-FE-C-002:** The `PATCH /api/users/me/master-homepage` endpoint and the `ReportsListPage` Homepage toggle UI shall together ensure that at most one row has Homepage=ON per user at any time. Setting a new master homepage automatically and atomically replaces any previously stored value without requiring the caller to clear the old value first.

**Acceptance criteria:**

- AC-C-002a: Calling `PATCH /api/users/me/master-homepage` with `{ masterHomepageTemplateId: 55 }` when `master_homepage_template_id` is already `33` results in `master_homepage_template_id = 55` (not both simultaneously).
- AC-C-002b: The `ReportsListPage` never renders more than one Homepage toggle in the ON state simultaneously.
- AC-C-002c: The constraint is enforced by the single-column model (`INTEGER NULL` on `users`), not by a list or junction table.

---

### REQ-HOME-CFG-FE-C-003: No (page order) must be a positive integer ≥ 1 when Dashboard=ON

**REQ-HOME-CFG-FE-C-003:** The `ReportsListPage` No column input shall reject values that are not positive integers ≥ 1 with a client-side validation error before any API call is made. Zero, negative values, non-integer values, and empty strings when Dashboard=ON shall all be rejected.

**Acceptance criteria:**

- AC-C-003a: Entering `0` in the No field when Dashboard=ON shows a validation error and does not trigger an API call.
- AC-C-003b: Entering a non-integer (e.g. `1.5` or `abc`) shows a validation error and does not trigger an API call.
- AC-C-003c: A valid value ≥ 1 triggers `PATCH /api/users/me/homepage-preferences` with the correct `homepagePageOrder`.
- AC-C-003d: The No field is blank and non-interactive when Dashboard=OFF; no validation runs in this state.

---

## 8. Traceability Table

| Requirement ID | Description | Status |
|----------------|-------------|--------|
| REQ-HOME-CFG-FE-F-001 | Default Homepage core template seeded at user creation | SA Approved |
| REQ-HOME-CFG-FE-F-002 | Core Homepages table section at top of ReportsListPage | SA Approved |
| REQ-HOME-CFG-FE-F-003 | Homepage column — master toggle, single active per user | SA Approved |
| REQ-HOME-CFG-FE-F-004 | Homepage toggle — clicking active toggle clears master | SA Approved |
| REQ-HOME-CFG-FE-F-005 | Dashboard column — show-on-homepage toggle, multiple rows | SA Approved |
| REQ-HOME-CFG-FE-F-006 | No column — editable page order integer | SA Approved |
| REQ-HOME-CFG-FE-F-007 | Overview tab replaced at runtime by master homepage | SA Approved |
| REQ-HOME-CFG-FE-F-008 | "Recent Records" promoted to core report template | SA Approved |
| REQ-HOME-CFG-FE-F-009 | "My Tasks" promoted to core report template | SA Approved |
| REQ-HOME-CFG-FE-F-010 | Promoted core reports addable as dashboard widgets | SA Approved — condition: getDashboardWidgetData requires userId/username injection (OQ-CHOME-012) |
| REQ-HOME-CFG-FE-F-011 | Live preview for promoted core report widgets | SA Approved |
| REQ-HOME-CFG-BE-F-001 | PATCH /api/users/me/master-homepage | SA Approved — condition: new UsersModule must be created |
| REQ-HOME-CFG-BE-F-002 | PATCH /api/users/me/homepage-preferences | SA Approved — condition: new UsersModule must be created |
| REQ-HOME-CFG-BE-F-003 | GET /api/auth/me includes masterHomepageTemplateId | SA Approved |
| REQ-HOME-CFG-DB-F-001 | Migration: master_homepage_template_id on users table | SA Approved |
| REQ-HOME-CFG-DB-F-002 | Migration: user_homepage_preferences table | SA Flagged — AC-DB-002c must be updated: tenant_id → org_code (varchar NOT NULL); see OQ-CHOME-011 |
| REQ-HOME-CFG-FE-S-001 | Endpoints scoped to authenticated user only (no IDOR) | SA Approved |
| REQ-HOME-CFG-FE-S-002 | Template IDs must reference organisation-accessible template | SA Approved |
| REQ-HOME-CFG-FE-C-001 | All API calls via api-client | SA Approved |
| REQ-HOME-CFG-FE-C-002 | At most one master homepage per user | SA Approved |
| REQ-HOME-CFG-FE-C-003 | Page order must be positive integer ≥ 1 when Dashboard=ON | SA Approved |

---

## 9. Open Questions

| ID | Question | Status | Answer |
|----|----------|--------|--------|
| OQ-CHOME-001 | Should "Recent Records" and "My Tasks" use a new subtype, or be regular `type: 'core'` entries? | **Resolved** | Standard `type: 'core'` entries — no new subtype needed. |
| OQ-CHOME-002 | Which widget types should be supported for homepage-eligible widgets? | **Resolved** | Any widget type (table, chart, metric) — user defines the type, sees a live preview, and explicitly saves. |
| OQ-CHOME-003 | What is the relationship between the Overview tab and the master homepage? | **Resolved** | The Overview tab is replaced by the master homepage. If no master is set, the Overview tab does not appear. |
| OQ-CHOME-004 | Is homepage configuration per-user or per-organisation? | **Resolved** | Per user only. |
| OQ-CHOME-005 | Where should the `masterHomepageTemplateId` pointer live? | **Resolved** | `master_homepage_template_id` column on the `users` table (REQ-HOME-CFG-DB-F-001). |
| OQ-CHOME-006 | Should the dashboard config page be reused or a new homepage config page created? | **Resolved** | Reuse existing `DashboardConfigurePage`. No new homepage config page. |
| OQ-CHOME-007 | Can multiple dashboards be marked `show_on_homepage: true`, and can more than one be the master? | **Resolved** | Multiple Dashboard=ON rows are allowed. Exactly one master homepage per user at any time. |
| OQ-CHOME-008 | Is homepage configuration multi-tenant? | **Resolved** | Per-user (users are tenant-scoped; multi-tenant isolation is automatic). |
| OQ-CHOME-009 | The current `RecentActivityWidget` calls `GET /api/recent-records-data`, but the formalised endpoint is `GET /api/recent-records`. Should the legacy route be kept as an alias, deprecated, or removed? | **Resolved — SA 2026-06-30** | SA Decision: Alias + deprecate-with-notice. Add `@Get('recent-records')` to `DashboardController` calling the same `dashboardService.getRecentRecords()` method. Add `// @deprecated — use GET /api/recent-records` comment to the existing handler. Formal route removal deferred to a follow-up ticket. |
| OQ-CHOME-010 | When a user has no `user_homepage_preferences` row for a core template, should the initial Dashboard toggle state default to `false` (opt-in) or inherit from a system default? | **Resolved — SA 2026-06-30** | SA Decision: Explicit seed row. At new user creation the seed creates an explicit `user_homepage_preferences` row for the "Default Homepage" template with `show_on_homepage = true` and `homepage_page_order = 1`. The UI always reads from the preferences table — no fallback logic. An absent row resolves to `false` by column default, but the seed prevents new users from silently reaching that state. |
| OQ-CHOME-011 | `user_homepage_preferences` — should the tenancy column be `tenant_id` (INT FK → organizations.id) or `org_code` (varchar, matching existing users/report_templates pattern)? | **Resolved — SA 2026-06-30** | SA Decision: Use `org_code` (varchar NOT NULL), matching existing `users` and `report_templates` patterns. OQ-CHOME-008 established per-user isolation is sufficient. REQ-HOME-CFG-DB-F-002 AC-DB-002c must be corrected from `tenant_id FK → organizations.id` to `org_code (varchar NOT NULL)`. |
| OQ-CHOME-012 | `POST /api/dashboards/widgets/data` currently passes only `orgCode` to `getDashboardWidgetData`. The `recent-records` source requires `userId` and `username` for user-scoped query filtering. Should the controller be updated? | **Resolved — SA 2026-06-30** | SA Decision: Yes. `reporting.controller.ts` must pass `req.user.id` and `req.user.username` alongside `req.user.orgCode` to `getDashboardWidgetData`. Additive internal method signature change — no external API contract broken. `reporting.controller.ts` must be added to the BA Impact Analysis. |

---

## 10. Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| `report_templates` table (existing) | Data | Homepages are dashboards stored here; no new homepage table required |
| `users` table (existing) | Data | New column `master_homepage_template_id` (REQ-HOME-CFG-DB-F-001) |
| `user_homepage_preferences` table (new) | Data | Per-user overrides for Dashboard toggle and page order (REQ-HOME-CFG-DB-F-002) |
| `GET /api/auth/me` (existing) | API | Extended to include `masterHomepageTemplateId` (REQ-HOME-CFG-BE-F-003) |
| `DashboardViewPage` / `DashboardConfigurePage` (existing) | UI | Homepage rendering reuses the existing dashboard widget runtime — no new engine |
| `ReportsListPage.tsx` (existing) | UI | Modified to add Core Homepages section and three new columns across all tables |
| `reporting.service.ts` (existing) | Service | Add `patchMasterHomepage` and `patchHomepagePreferences` adapter functions |
| `GET /api/recent-records` (new route) | API | Backend must expose this route; may alias `GET /api/recent-records-data` |
| `GET /api/tasks` (existing) | API | No contract change required |

---

## 11. Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-29 | 1.0 | Business Analyst (AI) | Initial draft — Gate 1 |
| 2026-06-29 | 2.0 | Business Analyst (AI) | Full revision per Project Sponsor confirmed UI model: removed `MyHomepagesPage`; added Core Homepages table section at top of `ReportsListPage`; added Homepage / Dashboard / No columns to all four tables; changed endpoint paths from `/api/users/:id/...` to `/api/users/me/...` (eliminates IDOR); added `PATCH /api/users/me/homepage-preferences` (REQ-HOME-CFG-BE-F-002); added `user_homepage_preferences` DB migration (REQ-HOME-CFG-DB-F-002); renumbered FE-F-001–F-011 (v1 had F-001–F-010, now 11 reqs); added BE-F-002, BE-F-003; added C-003 (page order validation); updated S-001 to document IDOR elimination; added OQ-CHOME-010. |
