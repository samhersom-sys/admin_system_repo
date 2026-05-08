# REQUIREMENTS — Sidebar

**Domain Code:** `SIDEBAR`  
**Location:** `app/AppLayout/Sidebar.jsx`  
**Status:** Implementation pending  
**Test file:** `app/AppLayout/Sidebar.test.tsx`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** Permanent navigation links; Create quick-menu on `/app-home`; contextual action section; hover expand/collapse; user profile footer; sign-out.  
**Out of scope:** Data fetching, domain business logic, modal/dialog management, inline form inputs.

---

## 2. Requirements

### 2.1 Permanent navigation

**REQ-SIDEBAR-F-001:** The sidebar shall render the following 6 permanent top-level navigation links on every authenticated route: Home, Search, Reporting, Finance, Workflow, Settings. Domain-specific headers (Submissions, Quotes, Policies, Binding Authorities) are contextual — see REQ-SIDEBAR-F-016.

**REQ-SIDEBAR-F-002:** Each navigation link shall navigate to the correct application route when activated.

**REQ-SIDEBAR-F-003:** The navigation link matching the current route shall carry the CSS class `sidebar-item--active`.

### 2.2 Create quick-menu

**REQ-SIDEBAR-F-004:** The sidebar shall render a "Create" button only when the current route is `/app-home`; the button shall be absent on all other routes.

**REQ-SIDEBAR-F-005:** Clicking the "Create" button shall toggle the submenu open and closed.

**REQ-SIDEBAR-F-006:** When the Create submenu is open, it shall display only the create flows whose routes currently exist in the app shell: Submission, Quote, and Party. The sidebar shall not render create options for Binding Authority Contract, Policy, or Claim until live create routes exist.

### 2.3 Contextual action section

**REQ-SIDEBAR-F-007:** When a page registers a contextual section via `useSidebarSection`, its items shall be rendered inline directly below the active domain header (e.g. Submissions). No separate contextual area is rendered at the foot of the nav.

**REQ-SIDEBAR-F-007a:** For routes in the reporting domain (`/reports/*` and `/dashboards/*`), a registered contextual section shall render directly below the top-level `Reporting` nav item and shall replace the default `Create Report` / `Create Dashboard` hover actions while the contextual section is active.

**REQ-SIDEBAR-F-008:** The contextual section shall display each `item` from the `items` array as a button with an icon and label. The `title` field on the registered section object is used internally for context only and shall not be rendered as a visible heading in the sidebar.

### 2.6 Domain contextual nav sub-items

**REQ-SIDEBAR-F-016:** Each domain nav header (Submissions, Quotes, Policies, Binding Authorities) shall display a list of sub-action items directly beneath it when the user hovers over that header. These predefined sub-items (derived from the backup sub-menus) shall be shown when no page section is registered for that domain. Sub-actions that trigger behaviour dispatch `CustomEvent` on `window`; sub-actions that navigate use `<NavLink>`. Sub-items shall be absent from the DOM when the domain header is not hovered.

**REQ-SIDEBAR-F-016a:** The top-level `Reporting` nav item shall display `Create Report` and `Create Dashboard` quick actions on non-edit reporting pages. When a reporting page registers a contextual section, those quick actions shall be hidden and the registered section shall be shown instead.

**REQ-SIDEBAR-F-018:** Sub-items (both page-registered and predefined) shall use the CSS class `sidebar-domain-sub-item` which renders them at a slightly different background colour to visually distinguish them from top-level nav items.

**REQ-SIDEBAR-F-009:** Clicking a contextual action button shall dispatch `window.dispatchEvent(new CustomEvent(item.event))` and shall not call any page function directly.

**REQ-SIDEBAR-F-010:** A contextual action item marked `disabled` shall render with the HTML `disabled` attribute and shall not dispatch any event when clicked.

**REQ-SIDEBAR-F-011:** The contextual action section shall be removed from the DOM when the page that registered it unmounts.

**REQ-SIDEBAR-C-001:** No domain module shall be imported anywhere inside the sidebar or its context provider.

### 2.4 Hover expand/collapse

**REQ-SIDEBAR-F-012:** The sidebar shall render in a collapsed state (56 px wide) by default with the `expanded` CSS class absent.

**REQ-SIDEBAR-F-013:** The sidebar shall add the `expanded` CSS class on `mouseenter` and shall remove it 200 ms after `mouseleave`.

### 2.5 User profile and sign-out

**REQ-SIDEBAR-F-014:** The sidebar footer shall contain a profile link to `/profile` displaying the signed-in user's name, falling back to `"User"` when no session exists.

**REQ-SIDEBAR-F-015:** The sidebar footer shall contain a "Sign out" button that calls `POST /api/auth/logout` via the api-client, then calls `clearSession()`, and navigates to `/login`. The client session shall be cleared and navigation shall proceed even if the API call fails.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-SIDEBAR-F-001 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-NAV-R01 |
| REQ-SIDEBAR-F-002 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-NAV-R02 |
| REQ-SIDEBAR-F-003 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-ACTIVE-R01, T-SIDEBAR-ACTIVE-R02 |
| REQ-SIDEBAR-F-004 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-CREATE-R01, T-SIDEBAR-CREATE-R02 |
| REQ-SIDEBAR-F-005 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-CREATE-R03 |
| REQ-SIDEBAR-F-006 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-CREATE-R03 |
| REQ-SIDEBAR-F-007 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-CONTEXT-R01, T-SIDEBAR-CONTEXT-R02 |
| REQ-SIDEBAR-F-008 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-CONTEXT-R02, T-SIDEBAR-CONTEXT-R03 |
| REQ-SIDEBAR-F-009 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-CONTEXT-R03 |
| REQ-SIDEBAR-F-010 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-CONTEXT-R04 |
| REQ-SIDEBAR-F-011 | — | No test written |
| REQ-SIDEBAR-C-001 | `app/__tests__/codebase-scan.test.js` | RULE-03 |
| REQ-SIDEBAR-F-012 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-EXPAND-R01 |
| REQ-SIDEBAR-F-013 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-EXPAND-R02, T-SIDEBAR-EXPAND-R03 |
| REQ-SIDEBAR-F-014 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-PROFILE-R01, T-SIDEBAR-PROFILE-R02 |
| REQ-SIDEBAR-F-015 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-LOGOUT-R01, T-SIDEBAR-LOGOUT-R02 |
| REQ-SIDEBAR-F-016 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-CTXNAV-R02, T-SIDEBAR-CTXNAV-R03, T-SIDEBAR-CTXNAV-R04, T-SIDEBAR-CTXNAV-R05, T-SIDEBAR-CTXNAV-R06 |
| REQ-SIDEBAR-F-018 | — | Visual only — no automated test |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-SIDEBAR-{TYPE}-{NNN} format per Guideline 13 |
| 2026-03-12 | REQ-F-006 corrected from 7 to 6 Create options (Pre-Submission removed); REQ-F-015 updated to include apiPost call; traceability table populated with actual test IDs |
| 2026-03-23 | REQ-F-006 rewritten to remove dead create links for Binding Authority Contract, Policy, and Claim until live create routes exist |

---

## 6. Design Notes

### Dependencies

- `lib/auth-session` — `getSession()`, `clearSession()`
- `react-router-dom` — `NavLink`, `useLocation`, `useNavigate`
- Pages that register contextual sections — via `useSidebarSection` hook
