# REQUIREMENTS — Home Dashboard

**Domain Code:** `HOME`  
**Location:** `app/features/home/`  
**Status:** Tests written (`home.test.tsx`) — awaiting code  
**Test file:** `app/features/home/home.test.tsx`  
**Standard:** Written per [Guideline 13](../../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

This document covers the requirements for the authenticated homepage dashboard at `/app-home`.

It does not cover:
- Reporting dashboards (separate pages under `app/pages/reports/` and `app/pages/dashboards/`)
- Individual domain pages (submissions list, quotes, policies, etc.)
- The login page (see `app/pages/auth/auth.requirements.md`)

---

## 1a. Impact Analysis

### UI Components (to create / modify)

| Component | Path | Purpose |
|-----------|------|---------|
| HomeDashboard | `app/features/home/HomeDashboard.tsx` | Page shell — renders widget grid inside AppLayout |
| KpiWidget | `app/features/home/KpiWidget.tsx` | Open submissions, active quotes, bound policies, active BAs counts |
| GwpChartWidget | `app/features/home/GwpChartWidget.tsx` | Bar chart — GWP by year (3-year comparison) |
| CumulativeGwpWidget | `app/features/home/CumulativeGwpWidget.tsx` | Line chart — cumulative GWP over 3 years |
| RecentActivityWidget | `app/features/home/RecentActivityWidget.tsx` | Current user's recently opened records from audit events |
| TasksWidget | `app/features/home/TasksWidget.tsx` | Pending tasks assigned to current user |

### API Endpoints (consumed)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/submissions?status=open&orgCode={orgCode}` | KPI — open submission count |
| GET | `/api/quotes?status=active&orgCode={orgCode}` | KPI — active quote count |
| GET | `/api/policies?status=bound&orgCode={orgCode}` | KPI — bound policy count |
| GET | `/api/binding-authorities?status=active&orgCode={orgCode}` | KPI — active BA count |
| GET | `/api/policies/gwp-summary?orgCode={orgCode}` | GWP summary data for bar chart |
| GET | `/api/policies/gwp-monthly?years=3` | Monthly GWP data for line chart |
| GET | `/api/policies/gwp-cumulative?years=3` | Cumulative GWP data for line chart |
| GET | `/api/activity/recent?userId={userId}&limit=10` | Recent activity for current user |
| GET | `/api/tasks?assignedTo={userId}&status=pending` | Pending tasks for current user |

### Database Tables (read by API)

| Table | Key Columns | Role |
|-------|-------------|------|
| `submissions` | id, status, org_code | Source for open submissions KPI |
| `quotes` | id, status, org_code | Source for active quotes KPI |
| `policies` | id, status, org_code, gwp | Source for bound policies KPI + GWP charts |
| `binding_authorities` | id, status, org_code | Source for active BA KPI |
| `audit_events` | id, user_id, action, entity_type, entity_id, created_at | Recent activity source |
| `tasks` | id, assigned_to, status | Pending tasks source |

### Dependencies

- `lib/api-client` — HTTP wrapper for all endpoint calls
- `lib/auth-session` — `getSession()` for userId and orgCode context
- `lib/formatters` — `number`, `currency`, `relativeTime`, `date` formatters
- `Chart.js` — Charting library for GWP bar/line charts
- `components/ErrorBoundary` — Widget-level error isolation
- `components/LoadingSpinner` — Per-widget loading states

---

## 2. Route and Access Control

| Property | Value |
|----------|-------|
| Route | `/app-home` |
| Public or private | **Private** — requires a valid authenticated session |
| Layout | **AppLayout** — wrapped with Sidebar and Navbar |
| Guard | `RequireAuth` — redirect to `/login` if session is absent or expired |
| Redirect if unauthenticated | `/login` |

---

## 3. Page Purpose

The homepage is the first screen a user sees after logging in.  Its purpose is to:

1. Give the user an immediate read on the current state of the business (KPIs, GWP)
2. Surface the user's personal pending work (tasks)
3. Provide fast navigation to the most common actions for that user's role

The homepage is a **read-mostly surface**.  It does not initiate workflows itself — it links to them.

---

## 4. Widget Inventory

The homepage assembles the following widgets.  Each widget is an independent component responsible for its own data fetching, loading state, and error state.

| Widget | File | Purpose |
|--------|------|---------|
| `KpiWidget` | `HomeWidgets/KpiWidget.jsx` | Headline counts and GWP totals |
| `GwpChartWidget` | `HomeWidgets/GwpChartWidget.jsx` | Monthly GWP by year (bar/line chart) |
| `CumulativeGwpWidget` | `HomeWidgets/CumulativeGwpWidget.jsx` | Cumulative GWP by year (line chart) |
| `RecentActivityWidget` | `HomeWidgets/RecentActivityWidget.jsx` | Most recent submissions, quotes, and policies |
| `TasksWidget` | `HomeWidgets/TasksWidget.jsx` | Current user's pending work items |

Each widget must:
- Manage its own loading state (show `LoadingSpinner` while fetching)
- Manage its own error state (show an inline error message — not crash the page)
- Be wrapped in an `ErrorBoundary` so one failing widget does not take down the whole dashboard
- Fetch data via the `api-client` shared service — no raw `fetch()`
- Pass `orgCode` and `userId` from the `auth-session` service to every API call that requires them

---

## 5. Widget Specifications

### 5.1  KpiWidget

**Purpose:** Display headline counts and GWP totals so users can assess volume and premium at a glance.

**Dual-scope display — confirmed requirement:**
Each KPI card must support two views simultaneously:
- **Organisation view** — the metric scoped to the user's entire `org_code` (all records belonging to the organisation)
- **My view** — the same metric scoped to the current `userId` only (records assigned to or created by this individual)

Both views are displayed within the same KPI card.  The layout (e.g. primary number = org total, secondary number = personal total) is a design decision to be confirmed, but the data requirement is fixed.

**Data required:**

| Metric | Org-scope API | User-scope API | Notes |
|--------|--------------|----------------|-------|
| Open submissions | `GET /api/submissions?status=open&orgCode={orgCode}` | `GET /api/submissions?status=open&assignedTo={userId}` | |
| Active quotes | `GET /api/quotes?status=active&orgCode={orgCode}` | `GET /api/quotes?status=active&assignedTo={userId}` | |
| Bound policies | `GET /api/policies?status=bound&orgCode={orgCode}` | `GET /api/policies?status=bound&assignedTo={userId}` | |
| Active BAs | `GET /api/binding-authorities?status=active&orgCode={orgCode}` | Not applicable | BAs are org-level |
| YTD GWP | `GET /api/policies/gwp-summary?orgCode={orgCode}` | `GET /api/policies/gwp-summary?userId={userId}` | |

**Display rules:**
- Each metric is shown as a card with a label, an org-level total, and a user-level total
- Colour accents must use `brandColors` tokens — no hardcoded Tailwind colour classes
- Numbers formatted via `formatters.number` and `formatters.currency`
- Cards must not contain any threshold logic — display only

---

### 5.2  GwpChartWidget

**Purpose:** Show monthly GWP broken down by year so users can compare year-on-year performance.

**Data required:**

| Data | Source API |
|------|-----------|
| Monthly GWP by year | `GET /api/policies/gwp-monthly?years=3` |

**Display rules:**
- Chart type: **multi-line chart** (one line per year) — confirmed
- Chart colours must use `brandColors.chart` tokens — no hardcoded hex values in component code
- Axis labels formatted using `formatters.currency` and `formatters.monthYear`
- Chart library: Chart.js (existing dependency — do not introduce a second chart library)
- Empty state: display "No data available" message — do not render an empty chart

---

### 5.3  CumulativeGwpWidget

**Purpose:** Show cumulative GWP progression through the year for each available year.

**Data required:**

| Data | Source API |
|------|-----------|
| Cumulative GWP by month, by year | `GET /api/policies/gwp-cumulative?years=3` |

**Display rules:**
- Chart type: multi-line chart (one line per year)
- All chart colour rules from 5.2 apply
- Empty state: same as 5.2

---

### 5.4  RecentActivityWidget

**Purpose:** Show the most recently created or updated records across submissions, quotes, and policies so users can resume recent work quickly.

**Data required:**

| Data | Source API |
|------|-----------|
| Recent records | `GET /api/activity/recent?userId={userId}&limit=10` |

The API shall return a unified list of records that the **current user** has recently opened, based on `audit_event` rows where `user_id = userId` and `action LIKE '%Opened%'`, grouped by entity (`entity_type` + `entity_id`), ordered by most-recent `created_at` DESC, limited to 10 distinct entities. Each record includes: `type` (`Submission` / `Quote` / `Policy` / `Party` / `BindingAuthority`), `id`, `reference`, `insured name`, `status`, `lastOpenedDate`.

**Display rules:**
- Show record type as a badge (colour-coded using `brandColors` tokens)
- Show reference number, insured name, status, and relative time (e.g. "2 hours ago") formatted via `formatters.relativeTime`
- Each row is a link that navigates to the relevant page for that record type
- Maximum 10 records shown; no pagination on the homepage — "View all" link navigates to the relevant list page
- Scoped to the **current user** (`userId`) — shows the current user's own recently opened records, not the org's last-updated records (see OQ-QUO-FE-001 in `docs/Technical Documentation/08-Open-Questions.md`)

---

### 5.5  TasksWidget

**Purpose:** Show the current user's pending work items so nothing is missed.

**Task types — confirmed:** Tasks are both system-assigned (pushed by workflow events, e.g. "New submission assigned to you") and user-created (manually added to-do items).  Both appear in the same widget.  A `source` field (`'system'` or `'user'`) distinguishes them in the display if needed.

**Data required:**

| Data | Source API |
|------|-----------|
| User's pending tasks | `GET /api/tasks?assignedTo={userId}&status=pending` |

**Display rules:**
- Show task description, source indicator, related record reference (if any), and due date
- Due date formatted via `formatters.date`
- Overdue tasks highlighted — use `brandColors` overdue token, not hardcoded red
- Maximum 5 tasks shown on the homepage; "View all" navigates to `/my-work-items`
- Scoped to `userId` — only the current user's tasks

---

## 6. HomeDashboard Layout

`HomeDashboard.jsx` is the assembly component.  It does not fetch any data itself — it renders the widgets in a grid layout.

**Layout structure (proposed):**

```
┌──────────────────────────────────────────────────────────┐
│  KpiWidget  (full width — 4 metric cards side by side)   │
├────────────────────────────┬─────────────────────────────┤
│  GwpChartWidget            │  CumulativeGwpWidget         │
│  (half width)              │  (half width)                │
├──────────────┬───────────────────────────────────────────┤
│ TasksWidget  │ RecentActivityWidget                        │
│ (1/3 width)  │ (2/3 width)                                 │
└──────────────┴───────────────────────────────────────────┘
```

This is a proposal.  The layout must be responsive — the grid must stack to a single column on narrow viewports.  Exact breakpoints follow the `design-tokens` responsive scale.

---

## 7. Widget Visibility — All Roles, Data-Filtered

**Confirmed:** All users see all widgets.  Widget visibility is **not** role-gated.  The data *within* each widget is filtered based on the user's organisation (`org_code`) and, where relevant, their individual user account (`userId`).

**The rule:**
- Every widget is visible to every authenticated user.
- The `permissions` shared service is **not** used to hide widgets.  It is used only to control actions within widgets (e.g. whether a quick-action button is enabled).
- Data returned by each API endpoint is already scoped to the requesting user's `org_code` by backend middleware.
- Widgets that support dual-scope (see section 5.1) show both an org-level view and a user-level view within the same widget.

**How this works in a multi-tenant model (submissions example):**

A broker submits risk to two underwriting organisations.

| Viewer | What they see |
|--------|---------------|
| Broker | Submission count = 1 (they created one submission) |
| Underwriter Org A | Submission count = 1 (the submission was routed to them) |
| Underwriter Org B | Submission count = 1 (also routed to them) |
| Underwriter Org C (not routed) | Submission count = 0 |

Each organisation sees only the data relevant to them.  The widget layout and structure is identical for all.

---

## 8. Architecture Compliance Rules

| Rule | How it applies here |
|------|---------------------|
| **Three-artifact rule** | This file (`home.requirements.md`) → `home.test.tsx` → component files |
| **No raw fetch** | All widgets use `api-client` — no `fetch()` calls in component code |
| **No hardcoded colours** | All colours via `brandColors` tokens — no hex values, no bare Tailwind colour classes |
| **No domain imports** | Homepage files must not import from `domains/` |
| **No sharedmodule imports** | Homepage files do not directly import from `sharedmodules/` (invoices and locations are not needed on the homepage) |
| **Tenant scoping** | `orgCode` from `auth-session` is passed to every API call — never omitted |
| **Permission-driven actions** | Widget *visibility* is not role-gated — all users see all widgets.  The `permissions` service controls only which *actions* within a widget are enabled (e.g. whether a quick-action button is active). |
| **Per-widget error isolation** | Each widget wrapped in `ErrorBoundary` — one failure must not crash the dashboard |
| **Per-widget loading state** | Each widget shows its own `LoadingSpinner` — not a single full-page spinner |

---

## 9. What Must Be Confirmed Before Tests Are Written

| # | Item | Status |
|---|------|--------|
| 1 | Widget visibility: all users see all widgets, data filtered by org/user | **Confirmed** |
| 2 | KPI dual-scope: org total + user total in same card | **Confirmed** |
| 3 | GWP chart type: multi-line | **Confirmed** |
| 4 | Tasks: both system-assigned and user-created | **Confirmed** |
| 5 | Each widget is a discrete imported component | **Confirmed** |
| 6 | Dashboard grid layout | **Deferred — does not block tests** |
| 7 | Submission routing workflow (new — see OQ-027) | **Open — does not block homepage tests** |
| 8 | API endpoints: confirm existing vs to-be-built | To verify against backend |

**All homepage blockers are now resolved.  Tests may be written.**

---

## 10. Formal Requirements

### 10.1 Route and access

**REQ-HOME-F-001:** The home dashboard shall be accessible only to authenticated users at route `/app-home`; unauthenticated access shall redirect to `/login` via the `RequireAuth` guard.

### 10.2 Widget rendering

**REQ-HOME-F-002:** The `HomeDashboard` component shall render the following five widget components without throwing an uncaught exception on initial render: `KpiWidget`, `GwpChartWidget`, `CumulativeGwpWidget`, `RecentActivityWidget`, `TasksWidget`.

**REQ-HOME-F-003:** Each widget shall be wrapped in an `ErrorBoundary` component so that a runtime failure in one widget does not cause any other widget or the dashboard shell to unmount.

**REQ-HOME-F-004:** Each widget shall display a `LoadingSpinner` while its API data fetch is in flight.

**REQ-HOME-F-005:** Each widget shall display an inline error message (without crashing) when its API call returns a non-2xx response.

**REQ-HOME-C-001:** No widget within `app/features/home/` shall call `fetch()` directly; all HTTP calls shall go through `@/lib/api-client`.

**REQ-HOME-C-002:** No file within `app/features/home/` shall import from any `domains/` module.

**REQ-HOME-C-003:** No file within `app/features/home/` shall contain hardcoded hex colour literals; all colour references shall use `brandColors` tokens or Tailwind class names.

### 10.3 KpiWidget

**REQ-HOME-F-006:** The `KpiWidget` shall display an organisation-scoped count and a user-scoped count within the same card for each of the following KPIs: open submissions, active quotes, bound policies, active binding authorities, and YTD GWP.

**REQ-HOME-F-007:** The `KpiWidget` shall format numeric counts using `formatters.number` and currency values using `formatters.currency`.

**REQ-HOME-F-008:** The `KpiWidget` shall pass `orgCode` (from `auth-session`) to every organisation-scoped API call and `userId` (from `auth-session`) to every user-scoped API call.

### 10.4 GwpChartWidget

**REQ-HOME-F-009:** The `GwpChartWidget` shall render a multi-line Chart.js chart showing monthly GWP by year using data from `GET /api/policies/gwp-monthly?years=3`.

**REQ-HOME-F-010:** The `GwpChartWidget` shall display a "No data available" message and shall not render an empty chart when the API returns an empty dataset.

**REQ-HOME-C-004:** The `GwpChartWidget` shall not introduce a second chart library; Chart.js is the only permitted chart dependency.

### 10.5 CumulativeGwpWidget

**REQ-HOME-F-011:** The `CumulativeGwpWidget` shall render a multi-line Chart.js chart showing cumulative GWP by month per year using data from `GET /api/policies/gwp-cumulative?years=3`.

**REQ-HOME-F-012:** The `CumulativeGwpWidget` shall display a "No data available" message when the API returns an empty dataset.

### 10.6 RecentActivityWidget

**REQ-HOME-F-013:** The `RecentActivityWidget` shall call `GET /api/activity/recent?limit=10` and shall display up to 10 records each containing: record type (as a colour-coded badge), reference number, insured name, status, and last-updated time formatted via `formatters.relativeTime`.

**REQ-HOME-F-014:** Each row in the `RecentActivityWidget` shall be a navigation link that routes to the correct record detail page for that record type.

### 10.7 TasksWidget

**REQ-HOME-F-015:** The `TasksWidget` shall call `GET /api/tasks?assignedTo={userId}&status=pending` and shall display up to 5 tasks each containing: task description, source indicator (`'system'` or `'user'`), related record reference (if any), and due date formatted via `formatters.date`.

**REQ-HOME-F-016:** The `TasksWidget` shall visually highlight overdue tasks using the `brandColors` overdue token.

**REQ-HOME-F-017:** The `TasksWidget` shall include a "View all" link that navigates to `/my-work-items`.

### 10.8 Navigation Reset

**REQ-HOME-F-018:** When the user navigates to `/app-home` (including re-clicking the Home link while already on the home page), the active page/tab state shall reset to `'overview'`. This ensures the user always lands on the Overview tab regardless of which sub-tab was previously selected. Implementation shall use React Router's `location.key` change to detect navigation events.

---

## 11. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-HOME-F-001 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-002 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-003 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-004 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-005 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-C-001 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-C-002 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-C-003 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-006 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-007 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-008 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-009 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-010 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-C-004 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-011 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-012 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-013 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-014 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-015 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-016 | `app/features/home/home.test.tsx` | pending |
| REQ-HOME-F-017 | `app/features/home/home.test.tsx` | pending |

---

## 12. HomeEmbeddedDashboard — Pinned Dashboard Tab (Block 2 addition)

This section covers the `HomeEmbeddedDashboard` component rendered inside the **Dashboard** tab of the home page. It allows users to view full reporting dashboards without leaving the home screen.

### REQ-HOME-DASH-F-001 — Filter by `showOnHomepage` flag

The `HomeEmbeddedDashboard` component shall call `getReportTemplates()` on mount and filter the results to only those templates whose `type === 'dashboard'` **and** whose `fields.showOnHomepage === true`. The filtered list is known as the **pinned dashboards** list.

Acceptance criteria:
- Only dashboards with `showOnHomepage: true` appear in the pinned list.
- A dashboard with `showOnHomepage: false` (or the property absent) is excluded from the list.

### REQ-HOME-DASH-F-002 — Empty state when no dashboards are pinned

When the pinned dashboards list is empty, the component shall render a message: `"No dashboards are pinned to the homepage. Enable Show on Homepage on any dashboard to display it here."` No error state shall be shown; this is an expected user-configuration state.

Acceptance criteria:
- The message is visible when no templates have `showOnHomepage: true`.
- No `LoadingSpinner` is shown after the fetch resolves to an empty list.
- `getDashboard()` is NOT called when the list is empty.

### REQ-HOME-DASH-F-003 — Pagination dots for multiple pinned dashboards

When there is more than one pinned dashboard, the component shall render a row of pagination dots (`role="tablist"`) containing one dot per pinned dashboard. The currently selected dot shall have width `w-6` and height `h-3` (pill shape) styled `bg-brand-600`; unselected dots shall be `w-3 h-3 bg-brand-200`. Clicking an unselected dot shall update `selectedIndex` to that dot's index, which triggers loading of the corresponding dashboard.

Acceptance criteria:
- With exactly 1 pinned dashboard, no pagination dot row is rendered.
- With 2+ pinned dashboards, exactly N dots are rendered.
- Each dot has `role="tab"` and `aria-label` equal to the dashboard's name.
- The active dot has `aria-selected="true"`; all others have `aria-selected="false"`.
- Clicking a dot updates the active selection (the clicked dot becomes the active pill).

### REQ-HOME-DASH-F-004 — Load and display selected dashboard

When a dashboard is selected (by index), the component shall: call `getDashboard(id)`, display a `LoadingSpinner` during the request, then render the dashboard title, page tabs (if multi-page), and widget grid. The widget grid must use the `DashboardLiveWidget` component and the live slot/section layout from the dashboard's `dashboardConfig`.

Acceptance criteria:
- The dashboard name appears as an `<h2>` heading above the content.
- If the dashboard has multiple pages, page-selector pills are rendered.
- An error message ("Could not load dashboard.") is shown when `getDashboard()` rejects.

### REQ-HOME-DASH-F-005 — `DashboardCreatePage` showOnHomepage checkbox

The `DashboardCreatePage` component shall include a **"Show on Homepage"** checkbox in its create/edit form. When checked, the value `showOnHomepage: true` shall be stored in the dashboard's `dashboardConfig` payload. When unchecked, the value shall be `false`. On load, the form shall initialise the checkbox state from the existing dashboard's `dashboardConfig.showOnHomepage` value.

Acceptance criteria:
- The checkbox renders with an accessible label.
- Saving with the checkbox checked persists `showOnHomepage: true` in the dashboard config.
- Saving with the checkbox unchecked persists `showOnHomepage: false`.
- Loading an existing dashboard with `showOnHomepage: true` pre-checks the box.
- Loading an existing dashboard with `showOnHomepage: false` (or absent) leaves the box unchecked.

---

## 11. Traceability (updated)

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-HOME-F-001 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-002 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-003 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-004 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-005 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-C-001 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-C-002 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-C-003 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-006 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-007 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-008 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-009 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-010 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-C-004 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-011 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-012 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-013 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-014 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-015 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-016 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-017 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-F-018 | `frontend/src/home/__tests__/home.test.tsx` | pending |
| REQ-HOME-DASH-F-001 | `frontend/src/home/__tests__/home.test.tsx` | T-HOME-DASH-R01a, R01b |
| REQ-HOME-DASH-F-002 | `frontend/src/home/__tests__/home.test.tsx` | T-HOME-DASH-R02a, R02b |
| REQ-HOME-DASH-F-003 | `frontend/src/home/__tests__/home.test.tsx` | T-HOME-DASH-R03a, R03b, R03c, R03d |
| REQ-HOME-DASH-F-004 | `frontend/src/home/__tests__/home.test.tsx` | T-HOME-DASH-R04a, R04b |
| REQ-HOME-DASH-F-005 | `frontend/src/reporting/__tests__/DashboardCreatePage.test.tsx` | T-RPT-DASH-CREATE-R05a, R05b, R05c |

---

## 13. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Formal REQ-HOME-{TYPE}-{NNN} statements added per Guideline 13 |
| 2026-03-25 | §5.4 RecentActivityWidget data source amended — widget now shows current user's own recently opened records (audit-event based, `userId`-filtered) rather than org-level last-opened. API updated to `GET /api/activity/recent?userId={userId}&limit=10`. Scope note updated. (OQ-QUO-FE-001) |
| 2026-04-05 | Added Impact Analysis (§1a): 6 UI components, 9 API endpoints, 6 DB tables, 6 dependencies |
| 2026-05-22 | §12 added — HomeEmbeddedDashboard requirements (REQ-HOME-DASH-F-001 to F-005) covering pinned dashboard filtering, empty state, pagination dots, live widget rendering, and showOnHomepage checkbox. Retroactive compliance with Three-Artifact Rule — code was written before requirements; acknowledged. Traceability table updated. Open questions OQ-034 raised. |
| 2026-05-22 | REQ-HOME-F-018 added — Navigation reset: Home page always resets to Overview tab on navigation (Defect 3). §10.8 added. Traceability table updated. |
