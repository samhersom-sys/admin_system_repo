# REQUIREMENTS — Quotes Domain (Frontend)

**Domain Code:** `QUO-FE`  
**Location:** `frontend/src/quotes/`  
**Status:** Block 2 agreed — ready for code  
**Test file:** `frontend/src/quotes/__tests__/quotes.test.tsx`  
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Backup Coverage Map

Sources read from `policy-forge-chat (BackUp)/`:
- `src/layouts/AppLayout/.../QuoteViewPage.jsx`
- `src/layouts/AppLayout/.../QuoteDetails.jsx`
- `src/layouts/AppLayout/.../QuoteTabs.jsx`
- `src/layouts/AppLayout/.../QuoteSections.jsx`
- `backend/__tests__/requirements/S06-quotes.test.js`

| # | BackUp Feature | REQ ID | Status |
|---|---|---|---|
| 1 | GET /api/quotes — list all quotes | F-003 | COVERED |
| 2 | Quote list table columns (Reference, Insured, Status, Business Type, Inception, Expiry) | F-004 | COVERED |
| 3 | Reference as navigation link to `/quotes/:id` | F-005 | COVERED |
| 4 | Empty-state message | F-006 | COVERED |
| 5 | Error on GET fail | F-007 | COVERED |
| 6 | Filter by `?submission_id` | F-008 | COVERED |
| 7 | New Quote button → `/quotes/new` | F-002 | COVERED |
| 8 | DELETE /api/quotes/:id | F-023 | NEW |
| 9 | POST /api/quotes — create + navigate to `/quotes/:id` | F-011, F-012 | COVERED |
| 10 | PUT /api/quotes/:id — save changes | F-019 | COVERED |
| 11 | Error on POST/PUT fail | F-013, F-021 | COVERED |
| 12 | Unsaved changes indicator | F-014 | COVERED |
| 13 | Sidebar Save action | F-015 | COVERED |
| 14 | Reference (read-only, auto-generated) | F-017 | COVERED |
| 15 | Status (read-only badge) | F-017 | COVERED |
| 16 | Insured Name — search modal, confirmed/unconfirmed state, red border + Clear button | F-010, F-024 | NEW (F-024) |
| 17 | Submission ID + Reference — linked pair, confirm/clear UX | F-022, F-025 | NEW (F-025) |
| 18 | Year of Account text input | F-026 | NEW |
| 19 | Business Type select (Insurance / Reinsurance) | F-018 | COVERED |
| 20 | Inception Date input | F-017 | COVERED |
| 21 | Inception Time input (HH:MM:SS, step 1s, default 00:00:00) | F-027 | NEW |
| 22 | Expiry Date input (defaults Inception + 365 days) | F-017 | COVERED |
| 23 | Expiry Time input (HH:MM:SS, step 1s, default 23:59:59) | F-027 | NEW |
| 24 | LTA Applicable toggle (checkbox) | F-028 | NEW |
| 25 | LTA Start Date + Time (enabled only when LTA on) | F-028 | NEW |
| 26 | LTA Expiry Date + Time (enabled only when LTA on) | F-028 | NEW |
| 27 | Contract Type select (from `/api/lookups/contractTypes`) | F-029 | NEW |
| 28 | Method of Placement select (from `/api/lookups/methodsOfPlacement`) | F-030 | NEW |
| 29 | Unique Market Reference text input | F-031 | NEW |
| 30 | Renewable indicator select (Yes / No) | F-032 | NEW |
| 31 | Renewal Date input (shown when Renewable = Yes) | F-032 | NEW |
| 32 | Renewal Status select (shown when Renewable = Yes) | F-032 | NEW |
| 33 | Fields editable ONLY when status = Draft; locked when Quoted / Bound / Declined | F-018, F-033 | UPDATED |
| 34 | Locked quote banner (yellow, shown when Quoted / Bound / Declined) | F-033 | NEW |
| 35 | Sidebar section / actions (Save, Mark Quoted, Bind, Decline, Back to Submission) | F-020 | COVERED |
| 36 | Submission reference navigation link → `/submissions/:id` | F-022 | COVERED |
| 37 | Quote Currency input | F-010, F-017 | COVERED |
| 38 | Dirty state detection (snapshot comparison) | C-003 | NEW |
| 39 | Browser Back barrier while dirty (1st press = warning; 2nd press = discard) | C-003 | NEW |
| 40 | Submission back-propagation (sync inceptionDate / expiryDate / contractType to submission) | — | DEFERRED — Block 5 |
| 41 | Quote ↔ sections date sync (bidirectional) | — | DEFERRED — Block 5 |
| 42 | Other-users-open concurrent warning | — | DEFERRED — Block 5 |
| 43 | "Quote Opened" / "Quote Closed" audit event logging | REQ-QUO-FE-F-044 | COVERED — Block 3 |
| 44 | Check notification messages on quote open | — | DEFERRED — Block 5 |
| 45 | Sections tab — section list, add/delete, columns, navigate to section view | REQ-QUO-FE-F-046, F-047 | COVERED — Block 3 remaining |
| 46 | Broker tab — placing broker (search/confirm), surplus lines broker | REQ-QUO-FE-F-048 | COVERED — Block 3 remaining |
| 47 | Additional Insured tab | REQ-QUO-FE-F-049 | COVERED — Block 3 remaining |
| 48 | Financial Summary tab | REQ-QUO-FE-F-050 | COVERED — Block 3 remaining |
| 49 | Audit tab — audit history list | REQ-QUO-FE-F-043 | COVERED — Block 3 |
| 50 | Risk Codes tab (section level) | REQ-QUO-FE-F-056 | COVERED — Block 4 |
| 51 | Section detail view (QuoteSectionViewPage) | REQ-QUO-FE-F-051, F-052, F-053 | COVERED — Block 4 |
| 52 | Section coverages (list, add, edit, delete) | REQ-QUO-FE-F-054 | COVERED — Block 4 |
| 53 | Section deductions | REQ-QUO-FE-F-055 | COVERED — Block 4 |
| 54 | Section participations | REQ-QUO-FE-F-057 | COVERED — Block 4 |
| 55 | Coverage detail page / sub-detail page | — | DEFERRED — Block 5 |
| 56 | Pro-rated gross premium + days-on-cover calculation | REQ-QUO-BE-F-043 | COVERED — Block 4 (server-side) |
| 57 | POST /api/quotes/create-from-submission | — | DEFERRED — Block 5 |
| 58 | GET/POST /api/quotes/:id/audit | REQ-QUO-BE-F-030–F-036 | COVERED — Block 3 |
| 59 | GET /api/quotes/:id/locations | — | DEFERRED — Block 5 |
| 60 | Sections / coverages / participations API endpoints | REQ-QUO-BE-F-037–F-046 | COVERED — Block 3 remaining + Block 4 |

---

## 2. Impact Analysis

### Files to create (Block 2)
- `frontend/src/quotes/QuotesListPage/QuotesListPage.tsx`
- `frontend/src/quotes/NewQuotePage/NewQuotePage.tsx`
- `frontend/src/quotes/QuoteViewPage/QuoteViewPage.tsx`
- `frontend/src/quotes/QuoteDetails/QuoteDetails.tsx`
- `frontend/src/quotes/quotes.service.ts`
- `frontend/src/quotes/__tests__/quotes.test.tsx`

### Files to modify
- `frontend/src/main.jsx` — add `/quotes`, `/quotes/new`, `/quotes/:id` routes
- `frontend/src/shell/AppSidebar.tsx` — register sidebar sections for quote pages

### Dependencies
- `@/shared/lib/api-client/api-client` — `get`, `post`, `put`, `del`
- `@/shared/lib/auth-session/auth-session` — `getSession`
- `frontend/src/parties/InsuredSearch/InsuredSearch.tsx` — insured search modal
- `react-router-dom` — `useNavigate`, `useParams`, `useSearchParams`, `Link`
- `@/shell/SidebarContext` — `useSidebarSection`

---

## 3. Scope

**In scope (Block 2):** QuotesListPage (`/quotes`), NewQuotePage (`/quotes/new`), QuoteViewPage (`/quotes/:id`) — full header fields panel including time fields, LTA, Contract Type, Method of Placement, UMR, and Renewal; dirty-state tracking and back-navigation barrier; locked quote banner; DELETE quote action.

**Deferred to Block 3:** All tab content (Sections, Broker, Additional Insured, Financial Summary, Audit, Risk Codes); section/coverage/deduction/participation management; concurrent-user warning; audit event logging; date sync between quote and sections; submission back-propagation; create-from-submission workflow.

**Out of scope:** Pricing engine; bind-to-policy workflow (separate block).

---

## 4. Requirements

### 4.1 QuotesListPage — /quotes

**REQ-QUO-FE-F-001:** The Quotes list page shall render a heading with the text `"Quotes"` without throwing an uncaught JavaScript exception on initial render.

**REQ-QUO-FE-F-002:** The Quotes list page shall render a `"+ New Quote"` button that navigates to `/quotes/new` when clicked.

**REQ-QUO-FE-F-003:** The Quotes list page shall call `GET /api/quotes` on mount, display a loading indicator while the request is in flight, and render the returned records in a table once loading is complete.

**REQ-QUO-FE-F-004:** The Quotes list page table shall display the columns: Reference, Insured, Status, Business Type, Inception Date, Expiry Date.

**REQ-QUO-FE-F-005:** The Reference column shall render each reference as a navigation link to `/quotes/:id` styled in the brand colour (per §14.7 RULE 9).

**REQ-QUO-FE-F-006:** The Quotes list page shall render an empty-state message `"No quotes found."` when the API returns an empty array.

**REQ-QUO-FE-F-007:** The Quotes list page shall render an inline error message when the `GET /api/quotes` call fails.

**REQ-QUO-FE-F-008:** The Quotes list page shall accept an optional `?submission_id=<id>` route query parameter and, when present, pre-filter the displayed quotes to only those belonging to that submission — replacing the page heading with `"Quotes for Submission"`.

**REQ-QUO-FE-F-023:** The Quotes list page shall provide a delete action for each row that calls `DELETE /api/quotes/:id`; on success the row shall be removed from the list. Any in-flight delete shall display a loading state. On failure an inline error message shall be displayed.

### 4.2 NewQuotePage — /quotes/new

**REQ-QUO-FE-F-009:** The New Quote page shall render a heading with the text `"New Quote"` without throwing an uncaught JavaScript exception on initial render.

**REQ-QUO-FE-F-010:** The New Quote page shall render a form with the following fields: Insured (confirmed via InsuredSearch modal — see REQ-QUO-FE-F-024), Submission Reference (optional — see REQ-QUO-FE-F-025), Business Type (select: Insurance / Reinsurance), Inception Date (date input), Expiry Date (date input, defaults to Inception + 365 days), Quote Currency (text, defaults to `USD`). When the route includes `?submissionId=<id>` or legacy `?submission_id=<id>`, the page shall fetch that submission and prefill the insured selection from the linked submission record before the user saves.

**REQ-QUO-FE-F-011:** The New Quote page shall call `POST /api/quotes` with the form values when the user triggers the save action (sidebar `submission:save` event).

**REQ-QUO-FE-F-012:** The New Quote page shall display a loading state while the `POST /api/quotes` call is in flight and shall navigate to `/quotes/:id` on a successful response.

**REQ-QUO-FE-F-013:** The New Quote page shall display an inline error message and restore the form when the `POST /api/quotes` call fails.

**REQ-QUO-FE-F-014:** The New Quote page shall push a notification via `addNotification` into the NotificationPanel reading `"You have unsaved changes"` when the insured has been selected but the form has not yet been saved. (See REQ-QUO-FE-C-003 for the Back-navigation barrier.)

**REQ-QUO-FE-F-015:** The New Quote page shall register a sidebar section titled `Quote` containing exactly one action item: `Save` (fires `submission:save` event). The New Quote page shall not register `All Quotes`, `Bind Quote`, `Decline Quote`, `Copy Quote`, `Issue Policy`, or `Back to Submission` in its contextual sidebar section.

### 4.3 QuoteViewPage — /quotes/:id

**REQ-QUO-FE-F-016:** The Quote view page shall fetch the quote record via `GET /api/quotes/:id` on mount and display a loading indicator while the request is in flight.

**REQ-QUO-FE-F-017:** The Quote view page shall render the following fields in the quote header details panel: Reference (read-only), Status (read-only badge), Insured (see REQ-QUO-FE-F-024), Submission ID + Reference (see REQ-QUO-FE-F-025), Year of Account (see REQ-QUO-FE-F-026), Business Type (select: Insurance / Reinsurance), Inception Date, Inception Time (see REQ-QUO-FE-F-027), Expiry Date, Expiry Time (see REQ-QUO-FE-F-027), LTA Applicable (see REQ-QUO-FE-F-028), Contract Type (see REQ-QUO-FE-F-029), Method of Placement (see REQ-QUO-FE-F-030), Unique Market Reference (see REQ-QUO-FE-F-031), Renewable / Renewal fields (see REQ-QUO-FE-F-032), Quote Currency.

**REQ-QUO-FE-F-018:** All editable fields in the quote header panel shall be rendered as inputs only when the quote status is `"Draft"`. When status is `"Quoted"`, `"Bound"`, or `"Declined"`, all fields shall be rendered read-only and the locked quote banner (REQ-QUO-FE-F-033) shall be shown.

**REQ-QUO-FE-F-019:** The Quote view page shall call `PUT /api/quotes/:id` with changed field values when the user triggers the save action (sidebar `submission:save` event) and the quote status is `"Draft"`.

**REQ-QUO-FE-F-020:** The Quote view page shall register a sidebar section titled `Quote` whose allowed items are state-dependent as follows:
- `Save` action, visible only when status is `"Draft"`
- `Issue Quote` action, visible only when status is `"Draft"`
- `Bind Quote` action, visible only when status is `"Quoted"`
- `Decline Quote` action, visible when status is not `"Bound"` or `"Declined"`
- `Copy Quote` action, visible in all states including `"Declined"` (see REQ-QUO-FE-F-061)
- `Back to Submission` link, visible when `submission_id` is set

The Quote view page shall not register `All Quotes` or `Issue Policy` in its contextual sidebar section.

**REQ-QUO-FE-F-061:** The Quote view page shall include a `Copy Quote` sidebar action that is visible at all quote statuses (`"Draft"`, `"Quoted"`, `"Bound"`, and `"Declined"`). When triggered, the action shall call `POST /api/quotes/:id/copy`; on a 201 response the page shall navigate to `/quotes/:newId` where `newId` is the `id` field of the returned quote object. On failure the action shall display an inline error notification via `addNotification` and the user shall remain on the current quote page. The returned quote shall always be `status = "Draft"`; declinature reason fields are not carried to the copy. (See OQ-QUO-BE-NE-007.)

**REQ-QUO-FE-F-021:** The Quote view page shall render an inline error message on load failure (404 or network error).

**REQ-QUO-FE-F-022:** The Quote view page shall render the submission reference as a navigation link to `/submissions/:submission_id` when the quote has a linked submission.

**REQ-QUO-FE-F-024:** The Insured field shall use the InsuredSearch modal for selection. Once an insured is selected the field shall show the party name as read-only with a `Clear` button. While a name has been typed but not confirmed via the modal the field shall display a red border and an `"Insured not confirmed — please search and select"` warning; the sidebar Save action shall be disabled until confirmed or cleared.

**REQ-QUO-FE-F-025:** The Submission field shall consist of a Submission ID (numeric, read-only display once linked) and a Submission Reference (text input for search/link). Once a submission is confirmed via search the fields shall show the reference as read-only with a `Clear` button. While a reference has been typed but not confirmed the Submission Reference field shall display a red border and a `"Submission not confirmed — please search and select"` warning.

**REQ-QUO-FE-F-026:** The quote header panel shall include a Year of Account text input that is sent as `yearOfAccount` in `POST /api/quotes` and `PUT /api/quotes/:id` payloads.

**REQ-QUO-FE-F-027:** The Inception Date field shall be accompanied by an Inception Time input (`type="time"`, `step="1"`, default `00:00:00`). The Expiry Date field shall be accompanied by an Expiry Time input (`type="time"`, `step="1"`, default `23:59:59`). Both time values shall be included in API payloads as `inceptionTime` and `expiryTime`.

**REQ-QUO-FE-F-028:** The quote header panel shall include an LTA Applicable checkbox. When unchecked the LTA Start Date, LTA Start Time, LTA Expiry Date, and LTA Expiry Time inputs shall be disabled and their values cleared. When checked the four LTA inputs shall be enabled and shall default to the quote's current inception and expiry date/time values respectively. All four LTA values shall be sent in API payloads as `ltaStartDate`, `ltaStartTime`, `ltaExpiryDate`, `ltaExpiryTime`.

**REQ-QUO-FE-F-029:** The quote header panel shall include a Contract Type `<select>` whose options are loaded from `GET /api/lookups/contractTypes` on mount. The selected value shall be sent as `contractType` in API payloads.

**REQ-QUO-FE-F-030:** The quote header panel shall include a Method of Placement `<select>` whose options are loaded from `GET /api/lookups/methodsOfPlacement` on mount. The selected value shall be sent as `methodOfPlacement` in API payloads.

**REQ-QUO-FE-F-031:** The quote header panel shall include a Unique Market Reference text input. The value shall be sent as `uniqueMarketReference` in API payloads.

**REQ-QUO-FE-F-032:** The quote header panel shall include a Renewable indicator `<select>` (options: `Yes`, `No`). When `Yes` is selected, Renewal Date (date input) and Renewal Status `<select>` (options from `GET /api/lookups/renewalStatuses`) shall become visible and enabled. When `No` is selected both subsidiary fields shall be hidden and their values cleared. All three values shall be sent as `renewableIndicator`, `renewalDate`, `renewalStatus` in API payloads.

**REQ-QUO-FE-F-033:** When the quote status is `"Quoted"`, `"Bound"`, or `"Declined"`, the Quote view page shall display a prominent yellow banner reading `"This quote is locked and cannot be edited"` immediately above the details panel.

### 4.4 Shared / Cross-cutting

**REQ-QUO-FE-C-001:** No component, page, or service in this domain may call `fetch()` or `axios` directly — all API calls must go through `@/shared/lib/api-client/api-client` (`get`, `post`, `put`, `del`).

**REQ-QUO-FE-C-002:** All table header cells shall use Title Case text with no `uppercase` or `tracking-wide` CSS class (per §14.5 RULE 7).

**REQ-QUO-FE-C-003:** Any page in the quotes domain that contains editable fields (NewQuotePage, QuoteViewPage) shall implement dirty-state tracking by comparing current form values against a snapshot taken on load using deterministic serialisation (sorted-key `JSON.stringify` or equivalent). When the user navigates back via the browser Back button while dirty: on the first press, block the navigation (re-push a history entry) and push a notification via `addNotification` reading `"You have unsaved changes — press Back again to discard"`; on a second consecutive back press, remove the listener and allow navigation. The dirty flag and back-navigation listener shall be cleared on a successful save.

### 4.5 QuoteViewPage — Block 3: Tabs, Field Groupings, and Audit

**REQ-QUO-FE-F-034:** The `QuoteViewPage` shall render the complete editable form (all fields from REQ-QUO-FE-F-017 through REQ-QUO-FE-F-032) **unconditionally** — always visible at the top of the page, regardless of the active tab. Below the form, a `TabsNav` component shall be rendered. See **REQ-QUO-FE-F-045** for the authoritative tab set. The active tab shall default to `'sections'` on page load. There is no `'details'` tab.

**REQ-QUO-FE-F-035:** The complete editable form (Quote & Referencing, Insured, Dates, Contract / Placement, Renewal field groups) shall be rendered above the tab strip at all times. It shall not be gated by any tab selection.

**REQ-QUO-FE-F-036:** The always-visible form above the tab strip shall be laid out in two side-by-side columns. The left column shall contain the **Quote & Referencing** `FieldGroup` followed by the **Insured** `FieldGroup`. The right column shall contain the **Dates** `FieldGroup`, the **Contract / Placement** `FieldGroup`, and the **Renewal** `FieldGroup`.

**REQ-QUO-FE-F-037:** The **Quote & Referencing** `FieldGroup` shall contain, in order: Reference (read-only display), Status badge, Submission ID (read-only, populated when a submission is linked) + Linked Submission Reference (search/confirm/clear — see REQ-QUO-FE-F-025), Year of Account input, Business Type select.

**REQ-QUO-FE-F-038:** The **Insured** `FieldGroup` shall contain a single field: Insured Name (InsuredSearch modal with search and clear — see REQ-QUO-FE-F-024).

**REQ-QUO-FE-F-039:** The **Dates** `FieldGroup` shall contain, in order: Inception Date + Inception Time as a paired row, Expiry Date + Expiry Time as a paired row, LTA Applicable checkbox, LTA Start Date + LTA Start Time as a paired row (rendered only when LTA Applicable is `true`), LTA Expiry Date + LTA Expiry Time as a paired row (rendered only when LTA Applicable is `true`).

**REQ-QUO-FE-F-040:** The **Contract / Placement** `FieldGroup` shall contain, in order: Contract Type select, Method of Placement select, Unique Market Reference text input.

**REQ-QUO-FE-F-041:** The **Renewal** `FieldGroup` shall contain, in order: Renewable select (options: `Yes`, `No`), Renewal Date input (rendered only when Renewable is `Yes`), Renewal Status select (rendered only when Renewable is `Yes`).

**REQ-QUO-FE-F-042:** ~~Superseded by REQ-QUO-FE-F-046.~~ The Sections tab shall display a coming-soon placeholder until F-046 (real Sections grid) is implemented. The placeholder text `"Sections coming soon"` shall be shown within a styled card.

**REQ-QUO-FE-F-043:** The `QuoteViewPage` shall display the `AuditTable` component populated with the audit history returned by `useAudit` when the active tab is `'audit'`. The `getAudit()` call shall be triggered the first time the Audit tab is selected.

**REQ-QUO-FE-F-044:** The `QuoteViewPage` shall use the `useAudit` hook (see `SHARED-AUDIT` requirements) with `{ entityType: 'Quote', entityId: quote.id, trackVisits: true }` so that a `"Quote Opened"` event is posted on page mount and a `"Quote Closed"` event is posted on page unmount, once the quote id is known.

---

### 4.6 QuoteViewPage — Block 3 Remaining: Expanded Tab Set, Sections List, Broker, Additional Insured, Financial Summary

**REQ-QUO-FE-F-045:** The `QuoteViewPage` `TabsNav` component shall contain **five** tabs in this order: `{ key: 'sections', label: 'Sections' }`, `{ key: 'brokers', label: 'Brokers' }`, `{ key: 'additional-insureds', label: 'Additional Insureds' }`, `{ key: 'financial-summary', label: 'Financial Summary' }`, `{ key: 'audit', label: 'Audit' }`. There is no `'details'` tab. The active tab shall default to `'sections'` on page load. The `TABS` constant shall be defined at module level with these five entries. Tab data-testid values shall therefore be `tab-sections`, `tab-brokers`, `tab-additional-insureds`, `tab-financial-summary`, `tab-audit`.

**REQ-QUO-FE-F-046:** The Sections tab shall load section data on page mount (not gated by tab selection) and render the returned records in an `app-table` table wrapped in `table-wrapper`. The table shall display the following columns: Reference (linked to `/quotes/:id/sections/:sectionId` per §14.7 RULE 9), Class of Business, Inception Date, Expiry Date, Limit, Gross Premium, and an optional Delete action column when the quote is Draft. The `<thead>` and column headers shall always be visible regardless of whether there are results (per §14.7 RULE 8). When the array is empty, the `<tbody>` shall render a single row with `"No sections found."` spanning all columns. While loading, a loading indicator shall be visible above the table. On load failure, an inline error message with a Retry button shall be shown.

**REQ-QUO-FE-F-047:** When the quote status is `"Draft"`, the Sections tab shall render an `"+ Add Section"` button that calls `POST /api/quotes/:id/sections`. On a 201 response the returned section shall be prepended to the grid without a full reload. Each section row shall have a delete button that calls `DELETE /api/quotes/:id/sections/:sectionId`; on a 204 response the row shall be removed from the grid. Both actions shall be hidden when the quote is not `"Draft"`.

**REQ-QUO-FE-F-048:** The Broker tab shall display two sub-sections labelled **Placing Broker** and **Surplus Lines Broker**. Each sub-section shall use the project's existing `BrokerSearch` component (from `@/parties/BrokerSearch/BrokerSearch`) for broker search and selection. Once a broker is confirmed via the `BrokerSearch` modal, the Broker Name shall be shown read-only with a `Clear` button. The Placing Broker sub-section shall additionally include a **Broker Contact** text input. All broker values shall be stored in the quote's `payload` JSONB field under keys `placingBrokerId`, `placingBrokerName`, `placingBrokerContact`, `surplusLinesBrokerId`, `surplusLinesBrokerName`. The sidebar **Save** action (fires `submission:save`) shall call `PUT /api/quotes/:id` with `{ payload: { ...currentPayload, ...updatedBrokerFields } }`. All fields shall be editable only when quote status is `"Draft"`; when locked, the names shall be rendered as plain read-only text.

**REQ-QUO-FE-F-049:** The Additional Insured tab shall render a table of additional insured entries sourced from `quote.payload.additionalInsured` (an array of `{ name: string }` objects, defaulting to `[]`). Each row shall display a name text input and, when the quote is `"Draft"`, a remove button. A `"+ Add"` button in the table header shall append a blank `{ name: '' }` row. The sidebar **Save** action shall call `PUT /api/quotes/:id` with `{ payload: { ...currentPayload, additionalInsured: [...rows] } }`. When the list is empty the table body shall render a single row with `"No additional insured parties listed."` spanning all columns. When the quote is not `"Draft"`, the tab is fully read-only (no add or remove controls).

**REQ-QUO-FE-F-050:** The Financial Summary tab shall render three numeric inputs: **Gross Premium**, **Net Premium**, and **Commission**, all with `type="number"` and `step="0.01"`. Values shall be sourced from `quote.payload.financials?.grossPremium`, `.netPremium`, `.commission`, defaulting to `""` when absent. The sidebar **Save** action shall call `PUT /api/quotes/:id` with `{ payload: { ...currentPayload, financials: { grossPremium, netPremium, commission } } }`. All three inputs shall be `disabled` when the quote status is not `"Draft"`.

---

### 4.7 QuoteSectionViewPage — Block 4: Section Detail with Coverages, Deductions, Risk Codes, Participations

**REQ-QUO-FE-F-051:** The application shall include a **`QuoteSectionViewPage`** component rendered at the route `/quotes/:id/sections/:sectionId`. On mount it shall call `GET /api/quotes/:id` and `GET /api/quotes/:id/sections` in parallel, then resolve the matching section from the list. A loading indicator shall be shown while requests are in flight. If the quote or section cannot be resolved, the page shall render `"Section not found"` with a back link to `/quotes/:id`.

**REQ-QUO-FE-F-052:** The `QuoteSectionViewPage` shall display a section details header form containing the following fields, grouped in two columns using `FieldGroup` components: **Left column** — Reference (read-only), Class of Business (select from `GET /api/lookups/classOfBusiness`), Inception Date + Inception Time, Expiry Date + Expiry Time, Days on Cover (read-only, computed as `max(0, Math.ceil((expiryDate − inceptionDate) / 86400000))`). **Right column** — Limit Currency + Limit Amount + Limit Loss Qualifier, Excess Currency + Excess Amount + Excess Loss Qualifier, Sum Insured Currency + Sum Insured Amount, Premium Currency, Annual Gross Premium, Annual Net Premium, Written Order %, Signed Order %. All editable fields shall be inputs when the parent quote status is `"Draft"` and read-only plain text otherwise.

**REQ-QUO-FE-F-053:** The `QuoteSectionViewPage` shall render a **Save** sidebar action that calls `PUT /api/quotes/:id/sections/:sectionId` with the changed header fields. An error message shall be shown inline on failure.

**REQ-QUO-FE-F-054:** The `QuoteSectionViewPage` shall display a `TabsNav` immediately below the section details form, containing four tabs in this order: `{ key: 'coverages', label: 'Coverages' }`, `{ key: 'deductions', label: 'Deductions' }`, `{ key: 'riskCodes', label: 'Risk Codes' }`, `{ key: 'participations', label: 'Participations' }`. The default active tab shall be `coverages`.

**REQ-QUO-FE-F-055:** The **Coverages** tab shall, on the `QuoteSectionViewPage` mount, call `GET /api/quotes/:id/sections/:sectionId/coverages` and render the returned records in an `app-table` table wrapped in `table-wrapper`. Columns: Reference, Coverage Name, Effective Date, Expiry Date, Annual Gross Premium, Annual Net Premium, Limit Currency, Limit Amount, and an optional Delete action column when the section is editable. The `<thead>` shall always be rendered (per §14.7 RULE 8). When the list is empty, the `<tbody>` shall render a single colspan row with `"No coverages found."`. When the section is editable, an **`"+ Add Coverage"`** button shall call `POST /api/quotes/:id/sections/:sectionId/coverages` and prepend the returned coverage to the table. Each row shall have a delete button that calls `DELETE /api/quotes/:id/sections/:sectionId/coverages/:coverageId`.

**REQ-QUO-FE-F-056:** The **Deductions** tab shall display a list of custom fee/tax rows sourced from `section.payload.taxOverrides || []`. Each row shall expose: Country (text input), Deduction Type (`select`: `Tax` | `Fee`), Basis (text input, e.g. `Gross`), Rate % (number input, 0–100), Computed Amount (read-only, `taxablePremium × rate / 100` where `taxablePremium` defaults to `section.grossPremium`), and a remove button. When the section is editable, a **`"+ Add Deduction"`** button appends a blank row. Changes are saved by the sidebar Save action when it calls `PUT /api/quotes/:id/sections/:sectionId` with `payload: { ...section.payload, taxOverrides: [...rows] }`. A totals row at the bottom shall display the sum of all computed amounts.

**REQ-QUO-FE-F-057:** The **Risk Codes** tab shall display a resizable grid of risk-code split rows sourced from `section.payload.riskSplits || []`. Each row exposes: Risk Code (select from `GET /api/lookups/riskCodes`, or free-text input when the lookup returns an empty array), Allocation % (number input, 0–100, step 0.01). When editable, a **`"+ Add"`** button appends a blank row; a delete button on each row removes it. A totals row shall display the sum of all Allocation % values. Changes are saved via the sidebar Save action via `PUT /api/quotes/:id/sections/:sectionId` with the updated payload.

**REQ-QUO-FE-F-058:** The **Participations** tab shall, on its first activation, call `GET /api/quote-sections/:sectionId/participations` and render the returned rows in an `app-table` table wrapped in `table-wrapper`. Columns: Market Name, Written Line %, Signed Line %, Role, Reference, Notes, and Delete action column when editable. The `<thead>` shall always be rendered (per §14.7 RULE 8). When the list is empty, the `<tbody>` shall render a single colspan row with `"No participations found."`. When the section is editable: rows may be added, deleted, and edited inline — market name is a text input. A **`"Save Participations"`** button shall validate that the sum of Written Line % equals `100 ± 0.0001` **and** the sum of Signed Line % equals `100 ± 0.0001`; if either validation fails, an inline error message shall be shown and the save shall be blocked. On passing validation the button calls `POST /api/quote-sections/:sectionId/participations` with `{ participations: [...rows] }` and replaces local state with the returned list.

**REQ-QUO-FE-F-059:** The `QuoteSectionViewPage` shall implement the same dirty-state tracking and back-navigation barrier as `QuoteViewPage` (§4.4 REQ-QUO-FE-C-003): snapshot section header fields on load; compare on change; on first back press — block navigation and push `"You have unsaved changes — press Back again to discard"` via `addNotification`; on second consecutive back press — allow navigation.

**REQ-QUO-FE-F-060:** The route `/quotes/:id/sections/:sectionId` shall be registered in `frontend/src/main.jsx`.

---

## 5. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-QUO-FE-F-001 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-list-R01 |
| REQ-QUO-FE-F-002 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-list-R02 |
| REQ-QUO-FE-F-003 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-list-R03 |
| REQ-QUO-FE-F-004 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-list-R04 |
| REQ-QUO-FE-F-005 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-list-R05 |
| REQ-QUO-FE-F-006 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-list-R06 |
| REQ-QUO-FE-F-007 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-list-R07 |
| REQ-QUO-FE-F-008 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-009 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-new-R01 |
| REQ-QUO-FE-F-010 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-new-R02 |
| REQ-QUO-FE-F-011 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-new-R03 |
| REQ-QUO-FE-F-012 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-new-R03 |
| REQ-QUO-FE-F-013 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-new-R04 |
| REQ-QUO-FE-F-014 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-new-R05 |
| REQ-QUO-FE-F-015 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-016 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-view-R01 |
| REQ-QUO-FE-F-017 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-view-R02 |
| REQ-QUO-FE-F-018 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-view-R03 |
| REQ-QUO-FE-F-019 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-view-R04 |
| REQ-QUO-FE-F-020 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-061 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-view-R27, R28, R29 (pending — Stage 2) |
| REQ-QUO-FE-F-021 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-view-R05 |
| REQ-QUO-FE-F-022 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-view-R06 |
| REQ-QUO-FE-F-023 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-024 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-025 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-026 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-027 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-028 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-029 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-030 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-031 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-032 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-033 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-C-001 | code review | — |
| REQ-QUO-FE-C-002 | code review | — |
| REQ-QUO-FE-C-003 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-034 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-035 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-036 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-037 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-038 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-039 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-040 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-041 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-042 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-043 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-view-R24, R25 |
| REQ-QUO-FE-F-044 | `frontend/src/quotes/__tests__/quotes.test.tsx` | T-quotes-view-R26 |
| REQ-QUO-FE-F-045 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-046 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-047 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-048 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-049 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-050 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-051 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-052 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-053 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-054 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-055 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-056 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-057 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-058 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-059 | `frontend/src/quotes/__tests__/quotes.test.tsx` | pending |
| REQ-QUO-FE-F-060 | code review | — |

---

## 6. Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-QUO-001 | Are the LTA fields (F-028) confirmed in scope for Block 2, or deferred to Block 3 alongside the Sections tab? | Closed — Yes, in scope for Block 2 |
| OQ-QUO-002 | The requirements include a standalone QuotesListPage at `/quotes` (F-001–F-008). Is this correct, or should quotes only be accessible via a Submission? | Closed — confirmed; standalone QuotesListPage at `/quotes` exists. A report/export of quotes (e.g. a reporting-style quote listing) is separate and out of scope for this domain. |
| OQ-QUO-003 | Are Renewal fields (F-032) confirmed in scope for Block 2? | Closed — Yes, in scope for Block 2 |
| OQ-QUO-004 | Is the Browser Back dirty-state barrier required for Block 2, and should it use the NotificationPanel (`addNotification`) rather than a custom banner? | Closed — Yes; must use NotificationPanel; applies to any quote page with unsaved editable fields (see C-003) |
| OQ-QUO-005 | What lookup endpoint serves Renewal Statuses — is it `/api/lookups/renewalStatuses` as used in the BackUp? | Closed — confirmed as `/api/lookups/renewalStatuses` |

---

## 7. Change Log

| Date | Change |
|------|--------|
| 2026-06-08 | Full requirements written — Quotes FE Block 2 (replaces stub) |
| 2026-06-09 | Rewritten from BackUp source: Backup Coverage Map added (60 rows); F-023 to F-034 added for BackUp header fields and behaviours; Impact Analysis added; F-017 / F-018 updated to match BackUp field list and lock semantics; C-001 import path corrected; traceability table paths corrected; duplicate sections removed; Design Notes paths corrected; Status updated |
| 2026-03-19 | All OQs closed: F-028 (LTA) and F-032 (Renewal) confirmed Block 2; F-034 promoted to C-003; F-014 updated to use addNotification; OQ-002 confirmed (standalone QuotesListPage at /quotes, report-style listing is out of scope); OQ-005 confirmed |
| 2026-03-19 | Block 3 requirements added (§4.5): REQ-QUO-FE-F-034 to F-044 — TabsNav integration, two-column FieldGroup layout (Details tab), Sections placeholder, Audit tab with AuditTable and useAudit lifecycle events |
| 2026-03-20 | Block 3 remaining requirements added (§4.6): REQ-QUO-FE-F-045 to F-050 — expanded TabsNav (6 tabs), Sections list ResizableGrid with add/delete, Broker tab (BrokerSearch), Additional Insured tab, Financial Summary tab; backup coverage map rows 40-60 statuses updated |
| 2026-03-20 | Block 4 requirements added (§4.7): REQ-QUO-FE-F-051 to F-060 — QuoteSectionViewPage with section details header, Coverages/Deductions/Risk Codes/Participations tabs, dirty-state back barrier, route registration |
| 2026-03-20 | Layout correction: F-034 and F-035 corrected — form is always visible above the tab strip (matching BackUp pattern); Details tab removed; default tab changed to sections; F-036 updated to remove Details-tab language; F-042 superseded by F-046; F-045 corrected to 5 tabs with no Details tab. Violated guideline §1.1 (invented Details tab pattern not in BackUp). |
| 2026-03-25 | F-020 amended to include Copy Quote sidebar item for Draft/Quoted/Bound states; REQ-QUO-FE-F-061 added — Copy Quote action, POST /api/quotes/:id/copy, navigate to new quote on success. Retroactive fix for §03 violation (code preceded requirement). |
| 2026-03-25 | F-020 and F-061 amended — Copy Quote visible at all statuses including Declined (corrected; QuoteViewPage already showed Copy for all statuses). Declinature reason not copied to new Draft. T-quotes-view-R27/R28/R29 designated for Stage 2. |

---

## 8. Design Notes

### Dependencies
- `frontend/src/quotes/quotes.service.ts` — `listQuotes`, `getQuote`, `createQuote`, `updateQuote`, `deleteQuote`
- `@/shared/lib/api-client/api-client` — `get`, `post`, `put`, `del`
- `@/shared/lib/auth-session/auth-session` — `getSession`
- `frontend/src/parties/InsuredSearch/InsuredSearch.tsx` — insured search and confirm modal
- `react-router-dom` — `useNavigate`, `useParams`, `useSearchParams`, `Link`
- `@/shell/SidebarContext` — `useSidebarSection`

### Status badge colours
| Status | Tailwind class |
|---|---|
| Draft | `bg-gray-100 text-gray-700` |
| Quoted | `bg-blue-100 text-blue-800` |
| Bound | `bg-green-100 text-green-800` |
| Declined | `bg-red-100 text-red-700` |

### Lookup endpoints
| Field | Endpoint |
|---|---|
| Contract Type | `GET /api/lookups/contractTypes` |
| Method of Placement | `GET /api/lookups/methodsOfPlacement` |
| Renewal Status | `GET /api/lookups/renewalStatuses` |

### BackUp behaviour notes (for implementors)
- **Dirty state:** The BackUp uses `stableStringify` (deterministic JSON serialisation) to snapshot form values on load and compare on change. Implement equivalent logic (e.g. `JSON.stringify` with sorted keys) rather than a flat equality check.
- **Back barrier:** The BackUp uses `window.history.pushState` + a `popstate` listener. On first `popstate`: re-push a history entry to keep the user on the page and show the warning notification. On second consecutive `popstate`: remove the listener and allow navigation.
- **Expiry auto-default:** When Inception Date is set or changed and Expiry Date is empty (or equals the previous Inception + 365), auto-set Expiry Date to new Inception + 365 days.
- **LTA defaults:** When LTA Applicable is toggled ON, auto-populate LTA Start Date/Time from the current Inception Date/Time and LTA Expiry Date/Time from the current Expiry Date/Time.
- **Inception/Expiry times:** Default Inception Time to `00:00:00` and Expiry Time to `23:59:59` when not otherwise set.
