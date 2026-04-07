# REQUIREMENTS — AppLayout

**Domain Code:** `LAYOUT`  
**Location:** `app/AppLayout/AppLayout.jsx`  
**Status:** Implementation pending  
**Test file:** N/A (structural composition — exempt per Three-Artifact Rule §3.6)  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** Provider nesting order; `<Outlet />` placement inside `<main class="app-content">`; prohibition on domain imports; ErrorBoundary placement contract.  
**Out of scope:** Domain logic, data fetching, business rules (AppLayout is structural composition only).

---

## 1a. Impact Analysis

### UI Components (to create / modify)

| Component | Path | Purpose |
|-----------|------|---------|
| AppLayout | `app/AppLayout/AppLayout.jsx` | Shell wrapper — provider nesting, Sidebar, Outlet, NotificationDock |

### Provider Nesting (composition dependencies)

| Provider | Purpose |
|----------|---------|
| NotificationProvider | Notification context for all child routes |
| SidebarContextProvider | Sidebar open/close state for all child routes |

### Composed Children

| Component | Path | Role |
|-----------|------|------|
| Sidebar | `app/AppLayout/Sidebar.tsx` | Navigation sidebar |
| NotificationDock | `app/AppLayout/NotificationDock.tsx` | Slide-out notification panel |
| ErrorBoundary | `components/ErrorBoundary/` | Applied at router level in `main.jsx`, NOT in AppLayout |
| Outlet | `react-router-dom` | Renders matched child route |

### API Endpoints

None — AppLayout is structural composition only.

### Database Tables

None — no data fetching.

---

## 2. Requirements

**REQ-LAYOUT-F-001:** The `AppLayout` component shall render `NotificationProvider` as the outer context wrapper and `SidebarContextProvider` as the inner context wrapper so that any component inside the sidebar context also has access to notification context.

**REQ-LAYOUT-F-002:** The `AppLayout` component shall render the `<Outlet />` element inside a `<main>` element that carries the CSS class `app-content`.

**REQ-LAYOUT-C-001:** The `AppLayout.jsx` file shall not contain any import from `domains/`, `workflows/`, or any page-specific module.

**REQ-LAYOUT-C-002:** The `AppLayout.jsx` file shall not render an `ErrorBoundary` wrapper; the `ErrorBoundary` is applied at the router level in `main.jsx` to avoid a duplicate boundary.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-LAYOUT-F-001 | N/A (structural) | — |
| REQ-LAYOUT-F-002 | N/A (structural) | — |
| REQ-LAYOUT-C-001 | N/A (structural) | — |
| REQ-LAYOUT-C-002 | N/A (structural) | — |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-LAYOUT-{TYPE}-{NNN} format per Guideline 13 |
| 2026-04-05 | Added Impact Analysis (§1a): structural composition — 1 component, 2 providers, 4 composed children |

---

## 6. Design Notes

This component qualifies as a structural composition file under §3.6 of the Three-Artifact Rule (`03-Three-Artifact-Rule.md`). It contains no testable business logic of its own — all behaviour within the shell is owned and tested by `Sidebar`, `NotificationDock`, and the individual page components.
