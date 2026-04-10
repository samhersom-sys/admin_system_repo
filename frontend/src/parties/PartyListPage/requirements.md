# Party List Page — Requirements

**Component:** `PartyListPage`  
**Domain:** Parties (`domains/parties/`)  
**Location:** `domains/parties/components/PartyListPage/`  
**Route:** `/parties`  
**Test file:** `domains/parties/components/PartyListPage/test.tsx`  
**Standard:** Written per [Guideline 13](../../../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Purpose

The Party List Page is the primary party management screen. It provides a searchable, filterable view of all party records for the authenticated user's organisation, and navigates to a dedicated Create Party page for new party creation.

---

## 2. Scope

**In scope:**
- Loading and displaying all parties for the authenticated org
- Filtering by role (All / Insured / Broker / Insurer / Coverholder)
- Live search by party name
- Loading / empty / error states
- Navigating to `/parties/new` (CreatePartyPage) to create a new party

**Out of scope:**
- Party editing and deletion (future)
- Party details view page (future)
- CSV import (future)
- SIC codes / financial fields in the create form (future — available in DB schema)

---

## 3. Requirements

### R01 — Party list display

**REQ-PAR-LIST-R01a:** The page shall call `listParties()` on mount and show a loading indicator (`aria-label="Loading parties"`) while the fetch is in flight.

**REQ-PAR-LIST-R01b:** After a successful fetch returning one or more parties, the page shall render a table with columns NAME, TYPE, CITY, COUNTRY and a row for each party.

**REQ-PAR-LIST-R01c:** When the fetch returns an empty array, the page shall display `"No parties found."`.

**REQ-PAR-LIST-R01d:** When the fetch fails, the page shall display the error message text.

---

### R02 — Role filter

**REQ-PAR-LIST-R02a:** A role dropdown (`aria-label="Filter by role"`) with options All, Insured, Broker, Insurer, Coverholder shall be visible at the top of the page.

**REQ-PAR-LIST-R02b:** Selecting a role shall call `listParties({ type: <role> })` and refresh the list.

**REQ-PAR-LIST-R02c:** Selecting "All types" (empty value) shall call `listParties()` without a type filter.

---

### R03 — Name search

**REQ-PAR-LIST-R03a:** A search input (`aria-label="Search parties"`) shall be visible at the top of the page.

**REQ-PAR-LIST-R03b:** Changing the search input value shall call `listParties({ search: <term> })` and refresh the list.

---

### R04 — Create party navigation

**REQ-PAR-LIST-R04a:** A "New Party" button (`aria-label="New Party"`) shall be visible in the page header. Clicking it shall navigate to `/parties/new` (the CreatePartyPage).

---

### R05 — Row click navigation

**REQ-PAR-LIST-R05a:** Clicking a party row in the grid shall navigate to `/parties/:id` where `:id` is the party's `id` field. The `ResizableGrid` component's `onRowClick` prop shall be used for this navigation.

---

## 4. Traceability

| Requirement ID | Test ID |
|---|---|
| REQ-PAR-LIST-R01a | T-PAR-LIST-R01a |
| REQ-PAR-LIST-R01b | T-PAR-LIST-R01b |
| REQ-PAR-LIST-R01c | T-PAR-LIST-R01c |
| REQ-PAR-LIST-R01d | T-PAR-LIST-R01d |
| REQ-PAR-LIST-R02a | T-PAR-LIST-R02a (implicit render check) |
| REQ-PAR-LIST-R02b | T-PAR-LIST-R02b |
| REQ-PAR-LIST-R02c | T-PAR-LIST-R02c |
| REQ-PAR-LIST-R03a | T-PAR-LIST-R03a (implicit render check) |
| REQ-PAR-LIST-R03b | T-PAR-LIST-R03b |
| REQ-PAR-LIST-R04a | T-PAR-LIST-R04a |
| REQ-PAR-LIST-R05a | T-PAR-LIST-R05a |

---

## 5. Dependencies

- `@/domains/parties/parties` — `listParties`, `Party`, `PartyFilters`
- `react-router-dom` — `useNavigate` (to navigate to `/parties/new` and `/parties/:id`)

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-03-14 | Initial requirements written |
| 2026-07-14 | R04 updated: modal replaced by navigation to CreatePartyPage |
| 2026-04-09 | R05 added: row click navigation to /parties/:id |
