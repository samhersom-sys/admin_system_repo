# REQUIREMENTS — Search Page (Frontend)

**Domain Code:** `SEARCH-FE`  
**Location:** `app/features/search/`  
**Status:** Full requirements — tests and implementation follow  
**Test file:** `app/features/search/search.test.tsx`  
**Standard:** Written per [Guideline 13](../../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `SearchPage` (page component at `/search`)
- `SearchForm` (filter bar sub-component)
- `SearchResults` (sortable table + pagination sub-component)

**Out of scope:**
- Saved searches
- Export
- Full-text / fuzzy search

---

## 2. Recommended Approach

**Recommended approach:** Single page at `/search`. On mount (no filters): call `GET /api/search` with no params — backend returns last-opened records per type. Filter changes: rerun the same call with query params. URL param `?type=Submission` pre-selects the type dropdown on arrival.

**Potential flaws:**

1. **Default view empty for new users.** If the user has no audit history, the backend fallback returns records by `createdDate`. This is valid but the page shows "recent" records that the user did not personally open — could be confusing.
   - *Mitigation:* Show a descriptive subtitle: "Records you've recently opened, or the most recently created if none." The backend flaw analysis already documents the fallback.

2. **Stale results after navigation.** When a user opens a record from Search and comes back (browser Back), the Search results will not automatically refresh to reflect the new last-opened order.
   - *Mitigation:* Refetch on every mount (no caching). Acceptable for current scale.

3. **Large result sets in filter mode.** The backend caps filter results at 200 per type, so up to 1,400 rows could arrive in one response. Pagination at 50 rows/page handles this on the frontend.

**Alternatives considered:**

A. **Refresh results in the background (polling).** Adds complexity with negligible user value for this use case.

B. **Cache last results in session storage.** Complicates state management and risks stale data. Rejected.

---

## 3. Requirements

### 3.1 Page (SearchPage)

**REQ-SEARCH-FE-F-001:** The `SearchPage` component shall render without throwing an uncaught exception.

**REQ-SEARCH-FE-F-002:** On mount, the page shall call `GET /api/search` with no filter params and display the returned records.

**REQ-SEARCH-FE-F-003:** When a `?type=<Type>` (single, legacy) or `?types=<Type1>,<Type2>` query param is present in the URL, the page shall pre-select the corresponding record type(s) in the type filter on mount.

**REQ-SEARCH-FE-F-004:** While the API call is in-flight, the page shall display a loading indicator (spinner or skeleton).

**REQ-SEARCH-FE-F-005:** When the API call fails, the page shall display an error message and not crash.

**REQ-SEARCH-FE-F-006:** When the API returns zero results for all types, the page shall display a "No results found" message.

### 3.2 Filter form (SearchForm)

**REQ-SEARCH-FE-F-007:** The filter form shall contain the following fields:
- **Type** — multi-select dropdown with type-to-search; shows a trigger button summarising selected types; opens a panel with a text search input and one labelled checkbox per record type
- **Reference** — text
- **Status** — text
- **Insured** — text (see REQ-SEARCH-FE-F-016 for semantics)
- **Broker** — text (see REQ-SEARCH-FE-F-017 for semantics)
- **Year of Account** — text
- **Inception From / Inception To** — date range
- **Expiry From / Expiry To** — date range
- **Last Opened From / Last Opened To** — date range
- **Created From / Created To** — date range
- **Created By** — text

**REQ-SEARCH-FE-F-008:** The Type filter shall be a multi-select dropdown with a search input. The dropdown panel shall contain one labelled checkbox for each record type: Submission, Quote, Policy, Binding Authority, Party, Claim. When no checkbox is selected, all types are included in the search. The trigger button shall display "All types" when nothing is selected, or a comma-separated list of selected type labels.

**REQ-SEARCH-FE-F-009:** When any filter field changes, the page shall re-fetch from `GET /api/search` with the updated filter params after a 300ms debounce.

**REQ-SEARCH-FE-F-010:** The filter form shall contain a "Clear" button that resets all filters to empty and re-fetches with no params.

### 3.3 Results table (SearchResults)

**REQ-SEARCH-FE-F-011:** The results table shall display the following columns: Record Type, Reference, Status, Insured / Name, Broker, YoA, Inception, Expiry, Last Opened, Created, Created By, Action.

**REQ-SEARCH-FE-F-012:** Each column header shall be clickable to sort the results by that column. Clicking the same column header again shall toggle the sort direction (asc ↔ desc). Default sort: Last Opened descending.

**REQ-SEARCH-FE-F-013:** The results table shall paginate at 50 rows per page. Navigation controls (Previous / Next / page numbers) shall be visible when the result count exceeds 50.

**REQ-SEARCH-FE-F-014:** The Action column shall only render a live "View" link for record types whose detail pages currently exist in the app shell:
   - Submission → `/submissions/:id`
   - Quote → `/quotes/:id`
   For Policy, Binding Authority, Party, and Claim results, the reference shall render as plain text and the Action column shall not render a link until a live detail route exists.

**REQ-SEARCH-FE-F-015:** The page shall display a summary line: "Showing X–Y of Z results". When zero results, the summary line shall display "0 results".

---

### 3.4 Filter semantics

**REQ-SEARCH-FE-F-016 — Insured field:** The Insured field shall filter Submissions, Quotes, Policies, and Binding Authorities by their insured name. For Party records, it shall match parties whose role is NOT Broker (i.e. Insured, Insurer, Coverholder).

**REQ-SEARCH-FE-F-017 — Broker field:** The Broker field shall filter Submissions, Quotes, and Policies by their placing broker name. For Party records, it shall match parties whose name matches AND whose role is Broker.

**REQ-SEARCH-FE-F-018 — Year of Account:** The Year of Account field shall filter Submissions, Quotes, Policies, and Binding Authorities by their `yearOfAccount` value (exact match).

**REQ-SEARCH-FE-F-019 — Last Opened date range:** The Last Opened From / To fields shall filter records by their `lastOpenedDate` (sourced from `audit_event`) within the given range (inclusive).

**REQ-SEARCH-FE-F-020 — Created date range:** The Created From / To fields shall filter records by their `createdDate` within the given range (inclusive).

**REQ-SEARCH-FE-F-021 — Created By:** The Created By field shall filter records by their `createdBy` field (case-insensitive partial match).

**REQ-SEARCH-FE-F-022 — Date Last Opened and Date Created audit fields:** `lastOpenedDate` and `createdDate` shall be present on all six record types as part of the audit trail requirements. Records without existing audit events shall return `null` for `lastOpenedDate`.

---

## 4. Traceability

| Requirement ID | Test file | Test ID |
|----------------|-----------|---------|
| REQ-SEARCH-FE-F-001 | `search.test.tsx` | T-SEARCH-FE-R01 |
| REQ-SEARCH-FE-F-002 | `search.test.tsx` | T-SEARCH-FE-R02 |
| REQ-SEARCH-FE-F-003 | `search.test.tsx` | T-SEARCH-FE-R03 |
| REQ-SEARCH-FE-F-004 | `search.test.tsx` | T-SEARCH-FE-R04 |
| REQ-SEARCH-FE-F-005 | `search.test.tsx` | T-SEARCH-FE-R05 |
| REQ-SEARCH-FE-F-006 | `search.test.tsx` | T-SEARCH-FE-R06 |
| REQ-SEARCH-FE-F-007 | `search.test.tsx` | T-SEARCH-FE-R07 |
| REQ-SEARCH-FE-F-008 | `search.test.tsx` | T-SEARCH-FE-R08 |
| REQ-SEARCH-FE-F-009 | `search.test.tsx` | T-SEARCH-FE-R09 |
| REQ-SEARCH-FE-F-010 | `search.test.tsx` | T-SEARCH-FE-R10 |
| REQ-SEARCH-FE-F-011 | `search.test.tsx` | T-SEARCH-FE-R11 |
| REQ-SEARCH-FE-F-012 | `search.test.tsx` | T-SEARCH-FE-R12 |
| REQ-SEARCH-FE-F-013 | `search.test.tsx` | T-SEARCH-FE-R13 |
| REQ-SEARCH-FE-F-014 | `search.test.tsx` | T-SEARCH-FE-R14 |
| REQ-SEARCH-FE-F-015 | `search.test.tsx` | T-SEARCH-FE-R15 |
| REQ-SEARCH-FE-F-016 | `search.test.tsx` | T-SEARCH-FE-R16 |
| REQ-SEARCH-FE-F-017 | `search.test.tsx` | T-SEARCH-FE-R17 |
| REQ-SEARCH-FE-F-018 | `search.test.tsx` | T-SEARCH-FE-R18 |
| REQ-SEARCH-FE-F-019 | `search.test.tsx` | — (backend integration) |
| REQ-SEARCH-FE-F-020 | `search.test.tsx` | — (backend integration) |
| REQ-SEARCH-FE-F-021 | `search.test.tsx` | — (backend integration) |
| REQ-SEARCH-FE-F-022 | `search.test.tsx` | — (backend integration) |

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Stub formatted per Guideline 13 |
| 2026-03-13 | Full requirements written |
| 2026-03-14 | F-003 updated for multi-type URL param; F-007/F-008 updated for multi-select checkbox type filter; F-011 column heading updated; F-016–F-022 added (insured/broker semantics, YoA, last opened range, created range, created by, audit fields) |
| 2026-03-23 | Corrected Quote result navigation to the live route `/quotes/:id` and removed dead Search result links for domains without implemented detail pages |
