# TECHNICAL DOCUMENTATION — 03: HOMEPAGE REBUILD PLAN

This document describes the plan for rebuilding the application homepage dashboard in the new `Cleaned` architecture.  It maps the legacy homepage to the new structure and describes what each widget needs.

---

## 3.1  Current State (Legacy Homepage)

The legacy authenticated homepage lives at `/app-home` and is rendered by `ApplicationHomePage.jsx`.

**What it currently does:**
- Fetches submissions, quotes, policies, parties, and binding authorities in parallel via raw `fetch()` calls on mount
- Renders KPI cards (counts, GWP totals)
- Renders a Monthly GWP by Year chart
- Renders a Cumulative GWP by Year chart
- Renders a recent records list
- Refreshes when the user navigates back to the page or returns to the browser tab

**Problems with the current implementation:**
- Uses raw `fetch()` directly — no centralised API client
- No tenant scoping on the API calls (no `org_code` filtering)
- No permission checks — all authenticated users see the same homepage
- KPI card colours are hardcoded as Tailwind class strings in a data array (colour debt)
- Duplicate `RecentRecords.jsx` in two locations
- Error state is checked incorrectly (checks for falsy context, not API error)
- Charts use Chart.js — colour config needs to use `brandColors.chart` tokens

---

## 3.2  New Homepage Location

```
app/pages/home/
  home.requirements.md         ← requirements (to be written before code)
  home.test.tsx                ← tests (to be written before code)
  index.jsx                    ← entry point, routing target for /app-home
  HomeDashboard.jsx            ← assembles all widgets
  HomeWidgets/
    TasksWidget.jsx            ← NEW: pending work items for the current user
    RecentActivityWidget.jsx   ← replaces RecentRecords.jsx
    NotificationsWidget.jsx    ← NEW: recent notifications
    QuickActionsWidget.jsx     ← NEW: shortcut buttons to common actions
    KpiWidget.jsx              ← replaces KpiCards.jsx
    GwpChartWidget.jsx         ← replaces GwpChart.jsx
    CumulativeGwpWidget.jsx    ← replaces CumulativeGwpChart.jsx
```

---

## 3.3  Widget Map (Legacy → New)

| Legacy component | New widget | Category | Notes |
|-----------------|------------|----------|-------|
| `KpiCards.jsx` | `KpiWidget.jsx` | New (rebuilt) | Fix colour debt; use `brandColors` tokens |
| `GwpChart.jsx` | `GwpChartWidget.jsx` | New (rebuilt) | Use `brandColors.chart` tokens |
| `CumulativeGwpChart.jsx` | `CumulativeGwpWidget.jsx` | New (rebuilt) | Use `brandColors.chart` tokens |
| `RecentRecords.jsx` | `RecentActivityWidget.jsx` | New (rebuilt) | Scope to tenant; show submissions + policies + quotes |
| *(none)* | `TasksWidget.jsx` | New | Show current user's pending work items |
| *(none)* | `NotificationsWidget.jsx` | New | Show recent unread notifications |
| *(none)* | `QuickActionsWidget.jsx` | New | Links to New Submission, Workflow, Search |

---

## 3.4  Domains the Homepage Touches

| Domain | Why |
|--------|-----|
| `submissions` | KPI count, recent activity, quick action (new submission) |
| `quotes` | KPI count, GWP chart data, recent activity |
| `policies` | KPI count, GWP chart data, recent activity |
| `binding-authorities` | KPI count |
| `auth` | Current user context (for greeting, tasks widget) |

**Important:** The homepage **does not call domains directly**.  It calls the API (via the `api-client` shared service) and lets the backend domain routes return the data.

---

## 3.5  Workflows the Homepage Triggers

| Quick action | Workflow triggered |
|-------------|-------------------|
| "New Submission" button | Routes to `manual-submission` workflow start |
| "Workflow" button | Routes to `submission-assignment` workflow |
| "My Work Items" | Routes to the user's personal task list |

The homepage itself is not a workflow step.  It is a navigation surface.

---

## 3.6  Shared Services the Homepage Uses

| Shared service | Used for |
|---------------|---------|
| `api-client` | All data fetching (replaces raw `fetch()`) |
| `permissions` | Deciding which widgets to show based on user role |
| `notifications` | Fetching notifications for the `NotificationsWidget` |
| `design-tokens` | All colours via `brandColors` and `brandClasses` |
| `auth-session` | Getting the current user for greeting and task scope |
| `formatters` | Formatting currency and dates in charts |

---

## 3.7  Reusable UI Primitives the Homepage Uses

| Primitive | Used by |
|-----------|---------|
| `Card` | Widget wrapper cards |
| `LoadingSpinner` | Loading state for each widget |
| `ErrorBoundary` | Per-widget error isolation |

---

## 3.8  What Needs to Be Created

The following files need to be created inside `app/pages/home/` **after** requirements are approved:

| File | Status | Notes |
|------|--------|-------|
| `home.requirements.md` | **To create first** | Define what the homepage must do for each role |
| `home.test.tsx` | To create second | Tests for each widget's rendering and data |
| `index.jsx` | To create third | Route target, composes `HomeDashboard` |
| `HomeDashboard.jsx` | To create third | Assembles widgets in layout |
| `HomeWidgets/TasksWidget.jsx` | To create third | Fetches and displays user's pending tasks |
| `HomeWidgets/RecentActivityWidget.jsx` | To create third | Recent submissions, quotes, policies |
| `HomeWidgets/NotificationsWidget.jsx` | To create third | Unread notifications |
| `HomeWidgets/QuickActionsWidget.jsx` | To create third | Navigation buttons |
| `HomeWidgets/KpiWidget.jsx` | To create third | Key metrics headline figures |
| `HomeWidgets/GwpChartWidget.jsx` | To create third | Monthly GWP chart |
| `HomeWidgets/CumulativeGwpWidget.jsx` | To create third | Cumulative GWP chart |

**No file in this list should be created until `home.requirements.md` is written and confirmed.**

---

## 3.9  Multi-Tenant Considerations

| Consideration | Rule |
|--------------|------|
| KPI counts must only reflect the current user's tenant data | API calls must include `org_code` context |
| GWP charts must only show the current tenant's policy data | As above |
| Notifications widget must only show the current user's notifications | Scoped by `userId` and `orgCode` |
| Quick Actions must only show actions the user has permission to perform | Use `permissions` shared service |
| Tasks widget must only show the current user's tasks | Scoped by `userId` |

---

## 3.10  Permission-Driven Widget Visibility

Different roles should see different widgets.  This must be driven by the `permissions` shared service, not by hardcoded role checks in the component.

**Proposed widget visibility by role (to confirm as part of requirements):**

| Widget | Underwriter | Manager | Broker | Claims Handler | Finance |
|--------|------------|---------|--------|---------------|---------|
| KPI metrics | ✓ | ✓ | Limited | Limited | ✓ |
| GWP charts | ✓ | ✓ | ✗ | ✗ | ✓ |
| Tasks widget | ✓ | ✓ | ✓ | ✓ | ✓ |
| Recent activity | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ |
| Quick actions | ✓ | ✓ | ✓ (limited) | ✓ (limited) | ✗ |

This table is a proposal only.  It must be confirmed as a requirement before implementation.

> **Open question OQ-020:** What should each role see on the homepage?  Confirm the widget visibility matrix before writing requirements.

---

## 3.11  Homepage Rebuild Checkpoint

Before any homepage code is written, the following must be confirmed:

1. Is the widget list complete?
2. Is the permission-driven visibility matrix agreed?
3. Are the API endpoints for each widget known and documented?
4. Are the design tokens for chart colours finalised?

I will stop and ask for confirmation of the above before writing `home.requirements.md`.
