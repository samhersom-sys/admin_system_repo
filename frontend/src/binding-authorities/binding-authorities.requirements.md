# REQUIREMENTS — Binding Authorities Domain (Frontend)

**Domain Code:** `BA-FE`  
**Location:** `frontend/src/binding-authorities/`  
**Status:** Full requirements written — pending tests  
**Test file:** `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx`  
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Backup Coverage Map

Sources read from `policy-forge-chat (BackUp)/`:
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityViewPage.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityDetails.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityTabs.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthoritySections.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthoritySectionViewPage.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityTransactions.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityFinancialSummary.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityGpiMonitoring.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityAssociatedPolicies.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityAssociatedClaims.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityAudit.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthoritySectionCoverage.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthoritySectionParticipations.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthoritySectionAuthorizedRiskCodes.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthoritySectionGPIMonitoring.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthoritySectionRatingConfiguration.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityEndorsementPage.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityDocumentsPage.jsx`
- `src/layouts/AppLayout/.../BindingAuthority/BindingAuthorityBordereauWizard.jsx`
- `backend/__tests__/requirements/S09-binding-authorities.test.js`

| # | BackUp Feature | REQ ID | Status |
|---|---|---|---|
| 1 | GET /api/binding-authorities — list all BAs | F-003 | COVERED |
| 2 | BA list table columns (Reference, Coverholder, Status, Inception, Expiry, YoA) | F-004 | COVERED |
| 3 | Reference as navigation link to `/binding-authorities/:id` | F-005 | COVERED |
| 4 | Empty-state message | F-006 | COVERED |
| 5 | Error on GET fail | F-007 | COVERED |
| 6 | New BA button → `/binding-authorities/new` | F-002 | COVERED |
| 7 | POST /api/binding-authorities — create + navigate | F-011, F-012 | COVERED |
| 8 | PUT /api/binding-authorities/:id — save changes | F-019 | COVERED |
| 9 | Coverholder search modal (CoverholderSearch) | F-024 | COVERED |
| 10 | Status field (select: Draft, Active, Bound, Expired, Cancelled, Lapsed) | F-017 | COVERED |
| 11 | Inception/Expiry Date + Time fields | F-017, F-027 | COVERED |
| 12 | Year of Account | F-026 | COVERED |
| 13 | Multi-Year checkbox | F-028 | COVERED |
| 14 | Renewal Date/Time + Renewal Status | F-029 | COVERED |
| 15 | Sections tab — section grid with add/delete | F-031, F-032 | COVERED |
| 16 | Financial Summary tab — premium/commission | F-041, F-042 | COVERED |
| 17 | Transactions tab — endorsement/amendment list | F-046, F-047 | COVERED |
| 18 | GPI Monitoring tab — gross premium income limit bars | F-056, F-057 | COVERED |
| 19 | Associated Policies tab | F-061, F-062 | COVERED |
| 20 | Associated Claims tab | F-066 | COVERED (placeholder) |
| 21 | Audit tab — audit trail | F-069, F-070 | COVERED |
| 22 | Section detail — coverage, participations, risk codes | F-073–F-085 | COVERED |
| 23 | Section GPI monitoring | F-086 | COVERED |
| 24 | Section Rating Configuration | F-087 | DEFERRED — Block 3 |
| 25 | BA Opened / BA Closed audit events | F-071 | COVERED |
| 26 | Dirty state + back barrier | C-003 | COVERED |
| 27 | Documents page (generate, list, download) | — | DEFERRED — Block 3 |
| 28 | Document preview page | — | DEFERRED — Block 3 |
| 29 | Bordereau wizard (create, config, import, export) | — | DEFERRED — Block 4 |
| 30 | Endorsement flow (endorse page + editor page) | F-051, F-123–F-132 | PROMOTED — Block 2.2 |
| 31 | BA Search Modal (reusable) | F-091–F-098 | COVERED |
| 32 | BA Section Search Modal | — | DEFERRED — Block 3 |

---

## 2. Impact Analysis

### Files to create (Block 1)
- `frontend/src/binding-authorities/BAListPage/BAListPage.tsx`
- `frontend/src/binding-authorities/NewBAPage/NewBAPage.tsx`
- `frontend/src/binding-authorities/BAViewPage/BAViewPage.tsx`
- `frontend/src/binding-authorities/BADetails/BADetails.tsx`
- `frontend/src/binding-authorities/BATabs/BATabs.tsx`
- `frontend/src/binding-authorities/BASectionViewPage/BASectionViewPage.tsx`
- `frontend/src/binding-authorities/BASearchModal/BASearchModal.tsx`
- `frontend/src/binding-authorities/binding-authorities.service.ts`
- `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx`

### Files to modify
- `frontend/src/main.jsx` — add routes: `/binding-authorities`, `/binding-authorities/new`, `/binding-authorities/:id`, `/binding-authorities/:id/sections/:sectionId`
- `frontend/src/shell/AppSidebar.tsx` — register sidebar sections for BA pages

### Dependencies
- `@/shared/lib/api-client/api-client` — `get`, `post`, `put`, `del`
- `@/shared/lib/auth-session/auth-session` — `getSession`
- `@/shared/hooks/useAudit` — audit lifecycle events
- `@/parties/CoverholderSearch/CoverholderSearch.tsx` — coverholder search modal
- `@/parties/InsurerSearch/InsurerSearch.tsx` — insurer search modal (section participations)
- `react-router-dom` — `useNavigate`, `useParams`, `Link`
- `@/shell/SidebarContext` — `useSidebarSection`

### API Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/binding-authorities` | List all BAs |
| POST | `/api/binding-authorities` | Create new BA |
| GET | `/api/binding-authorities/:id` | Fetch single BA |
| PUT | `/api/binding-authorities/:id` | Update BA |
| GET | `/api/binding-authorities/:id/sections` | List sections |
| POST | `/api/binding-authorities/:id/sections` | Create section |
| PUT | `/api/binding-authority-sections/:sectionId` | Update section |
| GET | `/api/binding-authority-sections/:sectionId/participations` | Get participations |
| POST | `/api/binding-authority-sections/:sectionId/participations` | Save participations |
| GET | `/api/binding-authority-sections/:sectionId/authorized-risk-codes` | Get authorized risk codes |
| POST | `/api/binding-authority-sections/:sectionId/authorized-risk-codes` | Add risk code |
| DELETE | `/api/binding-authority-sections/:sectionId/authorized-risk-codes/:code` | Remove risk code |
| GET | `/api/binding-authorities/:id/transactions` | List transactions |
| POST | `/api/binding-authorities/:id/transactions` | Create transaction |
| PUT | `/api/binding-authorities/:id/transactions/:transactionId` | Update transaction |
| GET | `/api/policies?binding_authority_id=:id` | Associated policies |
| POST | `/api/audit/event` | Audit events |

### Database Tables
| Table | Impact |
|---|---|
| `binding_authorities` | CRUD |
| `binding_authority_sections` | CRUD |
| `binding_authority_transactions` | CRUD |
| `binding_authority_section_participation` | CRUD |
| `audit_events` | Insert |

---

## 3. Scope

**In scope (Block 1):** BAListPage (`/binding-authorities`), NewBAPage (`/binding-authorities/new`), BAViewPage (`/binding-authorities/:id`) with full header fields, 7-tab layout (Sections, Financial Summary, Transactions, GPI Monitoring, Policies, Claims, Audit), BASectionViewPage (`/binding-authorities/:id/sections/:sectionId`) with 4-tab layout (Coverage, Participations, Authorized Risk Codes, GPI Monitoring), BASearchModal reusable component, dirty-state tracking and back barrier, audit lifecycle events.

**In scope (Block 2.2):** 8-tab BAViewPage (Bordereaux tab added), Bordereaux tab ResizableGrid with Run/Edit/Delete per row, BordereauRunPage (illustrative output + Export), BAEndorsePage (endorsement creation form with Administrative/Contractual type picker), BAEndorsementPage (full editable BA view during endorsement + Issue Endorsement action). Cannot endorse a Draft BA.

**In scope (Block 2.3):** Transaction system rebuild — Initial Transaction auto-created on BA first save; Contractual sequence numbers (1, 2, 3… BA-scoped); one open unissued endorsement per Endorsement Type; transaction status lifecycle (`Draft` / `Bound` / `Issued`); Transactions tab upgraded to ResizableGrid with new column set (Seq #, Sub Type, Transaction Status, Effective Date, Created Date, Created By — Amount/Currency removed); Add Transaction button removed; BATransactionViewPage (read-only historical view); BAEndorsementPage expanded to full 7-tab layout (all tabs except Transactions) with endorsement header block (Transaction #, Effective Date, Description, Type, Sub Type); backend schema extensions (`sub_type VARCHAR(100)`, `details JSONB` on `binding_authority_transactions`); BATransaction interface updated.

**Deferred to Block 3:** Documents page (generate/list/download/preview), Rating Configuration tab on section, BA Section Search Modal.

**Deferred to Block 4:** Bordereau wizard (create, configure, import, export formats).

**Out of scope:** Pricing engine; bind-to-policy workflow (separate block).

---

## 4. Requirements

### 4.1 BAListPage — /binding-authorities

**REQ-BA-FE-F-001:** The Binding Authorities list page shall render a heading with the text `"Binding Authorities"` without throwing an uncaught JavaScript exception on initial render.

**REQ-BA-FE-F-002:** The Binding Authorities list page shall render a `"+ New Binding Authority"` button that navigates to `/binding-authorities/new` when clicked.

**REQ-BA-FE-F-003:** The Binding Authorities list page shall call `GET /api/binding-authorities` on mount, display a loading indicator while the request is in flight, and render the returned records in a table once loading is complete.

**REQ-BA-FE-F-004:** The Binding Authorities list page table shall display the columns: Reference, Coverholder, Status, Inception Date, Expiry Date, Year of Account.

**REQ-BA-FE-F-005:** The Reference column shall render each reference as a navigation link to `/binding-authorities/:id` styled in the brand colour (per §14.7 RULE 9).

**REQ-BA-FE-F-006:** The Binding Authorities list page shall render an empty-state message `"No binding authorities found."` when the API returns an empty array.

**REQ-BA-FE-F-007:** The Binding Authorities list page shall render an inline error message when the `GET /api/binding-authorities` call fails.

**REQ-BA-FE-F-008:** The Binding Authorities list page shall accept an optional `?submission_id=<id>` route query parameter and, when present, pre-filter the displayed BAs to only those belonging to that submission — replacing the page heading with `"Binding Authorities for Submission"`.

### 4.2 NewBAPage — /binding-authorities/new

**REQ-BA-FE-F-009:** The New Binding Authority page shall render a heading with the text `"New Binding Authority"` without throwing an uncaught JavaScript exception on initial render.

**REQ-BA-FE-F-010:** The New Binding Authority page shall render a form with the following fields: Coverholder (confirmed via CoverholderSearch modal — see REQ-BA-FE-F-024), Inception Date (date input), Expiry Date (date input, defaults to Inception + 365 days), Year of Account (text input).

**REQ-BA-FE-F-011:** The New BA page shall call `POST /api/binding-authorities` with the form values when the user triggers the save action (sidebar `ba:save` event).

**REQ-BA-FE-F-012:** The New BA page shall display a loading state while the `POST /api/binding-authorities` call is in flight and shall navigate to `/binding-authorities/:id` on a successful response.

**REQ-BA-FE-F-013:** The New BA page shall display an inline error message and restore the form when the `POST /api/binding-authorities` call fails.

**REQ-BA-FE-F-014:** The New BA page shall push a notification via `addNotification` reading `"You have unsaved changes"` when the coverholder has been selected but the form has not yet been saved.

**REQ-BA-FE-F-015:** The New BA page shall register a sidebar section titled `Binding Authority` containing exactly one action item: `Save` (fires `ba:save` event).

### 4.3 BAViewPage — /binding-authorities/:id

**REQ-BA-FE-F-016:** The BA view page shall fetch the BA record via `GET /api/binding-authorities/:id` on mount and display a loading indicator while the request is in flight.

**REQ-BA-FE-F-017:** The BA view page shall render the following fields in the BA header details panel: Reference (read-only), Status (read-only badge — **not** a select; status transitions are managed exclusively through sidebar workflow actions), Coverholder (CoverholderSearch modal — see REQ-BA-FE-F-024), Submission Reference (read-only link when linked — see REQ-BA-FE-F-025), Year of Account (text input — see REQ-BA-FE-F-026), Inception Date, Inception Time (see REQ-BA-FE-F-027), Expiry Date, Expiry Time (see REQ-BA-FE-F-027), Multi-Year (checkbox — see REQ-BA-FE-F-028), Renewal Date + Time + Renewal Status (see REQ-BA-FE-F-029).

**REQ-BA-FE-F-018:** All editable fields in the BA header panel shall be rendered as inputs only when the BA status is `"Draft"`. When status is `"Active"`, `"Bound"`, `"Expired"`, `"Cancelled"`, or `"Lapsed"`, all fields shall be rendered read-only (plain text or non-interactive display). The Status field shall always be rendered as a read-only badge regardless of status. To make changes to a non-Draft BA, the user must create an Endorsement (see REQ-BA-FE-F-123).

**REQ-BA-FE-F-019:** The BA view page shall call `PUT /api/binding-authorities/:id` with changed field values when the user triggers the save action (sidebar `ba:save` event).

**REQ-BA-FE-F-020:** The BA view page shall register a sidebar section titled `Binding Authority` whose allowed items are state-dependent:
- `Save` action — visible when status is `"Draft"`
- `Issue Binding Authority` action — visible when status is `"Draft"`, calls `PUT /api/binding-authorities/:id` with `{ status: 'Active' }` (sidebar only — no header button)
- `Endorse Binding Authority` action — visible when status is `"Active"`; navigates to `/binding-authorities/endorse/:id` (see REQ-BA-FE-F-123). The endorsement creation page captures endorsement type (Administrative / Contractual), effective date, and description before creating the transaction.
- `Import Bordereaux` action — always visible, opens the `BordereauImportModal` (fires `ba:import-bordereaux` event)
- `Configure Bordereau` action — visible **only when status is `"Draft"`**, fires `ba:configure-bordereau` event (FiSettings icon); opens `BordereauConfigModal` *(amended — Block 2.2)*. When the BA is not Draft, this item is hidden on `BAViewPage`; it remains accessible via the `BAEndorsementPage` sidebar (see REQ-BA-FE-F-130).
- `Documents` link — always visible, navigates to `/binding-authorities/:id/documents`
- `Create Party` link — always visible, navigates to `/parties/new` (§14 — cross-domain party creation from BA context)
- `Renew Binding Authority` link — always visible, fires `ba:renew` event; handler navigates to `/binding-authorities/new` to create a renewal (BackUp: FiRepeat icon)
- `Back to Submission` link — visible when `submission_id` is set

The `Create Bordereau` sidebar item is **removed**. Bordered configuration is managed via the Bordereaux tab on the BA view page.

No duplicate status badge shall appear in the header — the status is displayed only in the Contract & Reference section of the details panel (see REQ-BA-FE-F-017, REQ-BA-FE-F-022).

**REQ-BA-FE-F-021:** The BA view page shall render an inline error message on load failure (404 or network error).

**REQ-BA-FE-F-022:** The BA view page shall render the always-visible form above the tab strip in two side-by-side columns. The left column shall contain the **Contract & Reference** `FieldGroup` (Reference, Status, Coverholder, Submission Reference, Year of Account). The right column shall contain the **Dates** `FieldGroup` (Inception Date + Time, Expiry Date + Time, Multi-Year, Renewal Date + Time, Renewal Status).

**REQ-BA-FE-F-023:** The BA view page shall render a `TabsNav` component below the form with **eight** tabs in this exact order: `{ key: 'sections', label: 'Sections' }`, `{ key: 'financial', label: 'Financial Summary' }`, `{ key: 'transactions', label: 'Transactions' }`, `{ key: 'gpi', label: 'GPI Monitoring' }`, `{ key: 'policies', label: 'Policies' }`, `{ key: 'claims', label: 'Claims' }`, `{ key: 'bordeaux', label: 'Bordereaux' }`, `{ key: 'audit', label: 'Audit' }`. The default active tab shall be `'sections'`. The Transactions tab shall only be rendered when the BA status is NOT `"Draft"` AND there is more than one transaction. The tab key remains `'bordeaux'` for backward compat; the visible label is `'Bordereaux'` (correct French plural).

#### 4.3.1 Header Field Details

**REQ-BA-FE-F-024:** The Coverholder field shall use the CoverholderSearch modal for selection. Once a coverholder is selected the field shall show the party name as read-only with a `Clear` button. While a name has been typed but not confirmed via the modal the field shall display a red border and a `"Coverholder not confirmed — please search and select"` warning; the sidebar Save action shall be disabled until confirmed or cleared.

**REQ-BA-FE-F-025:** When the BA has a linked submission (`submission_id` is set), the Submission Reference field shall render the reference as a navigation link to `/submissions/:submission_id`.

**REQ-BA-FE-F-026:** The BA header panel shall include a Year of Account text input sent as `yearOfAccount` in API payloads.

**REQ-BA-FE-F-027:** The Inception Date field shall be accompanied by an Inception Time input (`type="time"`, `step="1"`, default `00:00:00`). The Expiry Date field shall be accompanied by an Expiry Time input (`type="time"`, `step="1"`, default `23:59:59`). Both time values shall be included in API payloads as `inceptionTime` and `expiryTime`.

**REQ-BA-FE-F-028:** The BA header panel shall include a Multi-Year checkbox. When checked, Renewal Date, Renewal Time, and Renewal Status fields shall be visible and enabled. When unchecked, those fields shall be hidden and their values cleared. The value shall be sent as `isMultiYear` in API payloads.

**REQ-BA-FE-F-029:** When Multi-Year is checked, the BA header shall display Renewal Date (date input), Renewal Time (time input, step=1), and Renewal Status (select from `GET /api/lookups/renewalStatuses`). Values sent as `renewalDate`, `renewalTime`, `renewalStatus`.

**REQ-BA-FE-F-030:** ~~REMOVED — Defect 8.~~ The locked banner is no longer displayed. Status is shown as a read-only badge in the header (see REQ-BA-FE-F-017). No separate banner is required.

### 4.4 BAViewPage — Sections Tab

**REQ-BA-FE-F-031:** The Sections tab shall load section data via `GET /api/binding-authorities/:id/sections` on page mount (not gated by tab selection) and render the returned records using the shared `ResizableGrid` component (from `@/shared/components/ResizableGrid/ResizableGrid`). The grid shall be sortable and columns shall be resizable. The grid shall display the following columns: Reference (linked to `/binding-authorities/:id/sections/:sectionId`), Class of Business, Inception Date, Expiry Date, Time Basis (`time_basis` field), Days on Cover (`days_on_cover` field), Currency (`currency` field), Written Premium Limit (`written_premium_limit` field), and an Actions column (with delete button when Draft). Default sort shall be by Reference ascending. When the array is empty, the grid shall render `"No sections found."`. Deferred columns (Block 3): Effective Date, financial view columns, GPI Limit Currency.

**REQ-BA-FE-F-032:** When the BA status is `"Draft"`, the Sections tab shall render a compact `FiPlus` icon-only button (`title="Add Section"`, 32×32px, brand-600 background, white icon) that triggers an inline add row. When clicked, a new inline edit row shall appear below the table. Confirming calls `POST /api/binding-authorities/:id/sections`; on a 201 response the returned section shall be prepended to the grid. Each section row shall have a delete button that calls `DELETE /api/binding-authority-sections/:sectionId`; on a 204 response the row shall be removed. Both actions shall be hidden when the BA is not `"Draft"`. The FiPlus trigger is hidden when an inline add row is already open.

**REQ-BA-FE-F-033:** While sections are loading, a loading indicator shall be visible above the table. On load failure, an inline error message with a Retry button shall be shown.

### 4.5 BAViewPage — Financial Summary Tab

**REQ-BA-FE-F-041:** The Financial Summary tab shall render six numeric display fields: **Gross Premium**, **Net Premium**, **Commission**, **Taxes**, **Fees**, and **Total Due**. Values shall be computed from section-level financials aggregated across all sections. Fields shall be read-only display.

**REQ-BA-FE-F-042:** The Financial Summary tab shall render a per-section breakdown table with columns: Section Reference, Gross Premium, Net Premium, Commission. A totals row at the bottom shall display the sum across all sections.

### 4.6 BAViewPage — Transactions Tab

**REQ-BA-FE-F-046:** The Transactions tab shall be visible only when the BA status is NOT `"Draft"` AND there is more than one transaction record. An `"Initial Transaction"` is automatically created when the BA is first saved (see REQ-BA-FE-F-134) and counts toward the total; accordingly, the tab only becomes visible once at least one endorsement also exists (total transactions > 1) AND the BA has been Issued. It shall fetch `GET /api/binding-authorities/:id/transactions` on first activation (lazy load) and render the returned records using `ResizableGrid` (see REQ-BA-FE-F-139).

**REQ-BA-FE-F-047:** The Transactions tab shall render the transaction list using the shared `ResizableGrid` component (matching the Sections tab styling; `storageKey = "table-widths-ba-transactions"`). Columns and default widths: Transaction # (80 px, sortable), Seq # (70 px, sortable — Contractual transactions only; blank for all other types), Type (150 px, sortable), Sub Type (160 px, sortable), Transaction Status (140 px, sortable), Effective Date (140 px, sortable), Created Date (140 px, sortable), Created By (160 px, sortable), Description (200 px, non-sortable), Actions (100 px, non-sortable). Default sort: Transaction # descending (most recent first). The `Amount` and `Currency` columns are removed entirely and shall not appear. See REQ-BA-FE-F-140 for the Actions column behaviour.

**REQ-BA-FE-F-048:** The Transactions tab shall NOT contain an `"Add Transaction"` or `"Create Transaction"` button. All transactions are created exclusively through: (a) the endorsement creation flow (`BAEndorsePage`) or (b) automatically as an Initial Transaction on BA first save (see REQ-BA-FE-F-134). Any previously rendered Add Transaction button and associated modal are removed.

**REQ-BA-FE-F-049:** When the list is empty, the table body shall render `"No transactions found."`. On API failure, an error message shall be shown.

**REQ-BA-FE-F-050:** Transaction status shall NOT be updated via an inline select on the Transactions tab. Status transitions are managed exclusively through workflow actions: (a) `Bind Endorsement` on `BAEndorsementPage` changes status from `'Draft'` to `'Bound'`; (b) `Issue Endorsement` on `BAEndorsementPage` changes status from `'Bound'` to `'Issued'`; (c) `Issue Binding Authority` on `BAViewPage` auto-issues the Initial Transaction (see REQ-BA-FE-F-135). No inline status select or dropdown shall be rendered on transaction rows.

**REQ-BA-FE-F-051 (PROMOTED — Block 2.2):** The endorsement flow is now in scope. See REQ-BA-FE-F-123 through REQ-BA-FE-F-132 for the full specification.

### 4.7 BAViewPage — GPI Monitoring Tab

**REQ-BA-FE-F-056:** The GPI Monitoring tab shall display a summary of Gross Premium Income limits versus actuals for the BA contract. For each section that has a `grossPremiumIncomeLimit` set in its payload, the tab shall render a progress bar showing `actualGrossPremium / grossPremiumIncomeLimit × 100%` with a numeric label showing both values.

**REQ-BA-FE-F-057:** The progress bar shall be coloured green when utilisation is below 80%, amber when between 80% and 100%, and red when above 100% (over-limit).

**REQ-BA-FE-F-058:** A totals row shall display the aggregated GPI limit and aggregated actual premium across all sections, with a corresponding progress bar.

**REQ-BA-FE-F-059:** When no sections have a GPI limit set, the tab shall render `"No GPI limits configured for this binding authority."`.

### 4.8 BAViewPage — Policies Tab

**REQ-BA-FE-F-061:** The Policies tab shall fetch `GET /api/policies?binding_authority_id=:id` on first activation (lazy load) and render the returned records in a table.

**REQ-BA-FE-F-062:** The table shall display columns: Reference (linked to `/policies/:id` per §14.7 RULE 9), Insured, Status, Inception Date, Expiry Date.

**REQ-BA-FE-F-063:** When the list is empty, the table body shall render `"No policies linked to this binding authority."`. On API failure, an error message shall be shown.

### 4.9 BAViewPage — Claims Tab

**REQ-BA-FE-F-066:** The Claims tab shall render `"Claims — coming soon."` as placeholder text. When the Claims domain is built, this tab shall display claims associated with the BA.

### 4.10 BAViewPage — Audit Tab

**REQ-BA-FE-F-069:** The Audit tab shall display the `AuditTable` component populated with the audit history when the active tab is `'audit'`. The audit data shall be fetched the first time the Audit tab is selected.

**REQ-BA-FE-F-070:** The audit table shall display columns: Date, Action, User. When no audit events exist, the table shall render `"No audit events recorded."`. On fetch failure, the error message shall be displayed.

**REQ-BA-FE-F-071:** The BA view page shall use the `useAudit` hook with `{ entityType: 'Binding Authority', entityId: ba.id, trackVisits: true }` so that a `"Binding Authority Opened"` event is posted on page mount and a `"Binding Authority Closed"` event is posted on page unmount, once the BA id is known. Both calls shall be best-effort.

### 4.11 BASectionViewPage — /binding-authorities/:id/sections/:sectionId

**REQ-BA-FE-F-073:** The application shall include a `BASectionViewPage` component rendered at route `/binding-authorities/:id/sections/:sectionId`. On mount it shall call `GET /api/binding-authorities/:id` and `GET /api/binding-authorities/:id/sections` in parallel, then resolve the matching section from the list. A loading indicator shall be shown while requests are in flight. If the section cannot be resolved, the page shall render `"Section not found"` with a back link to `/binding-authorities/:id`.

**REQ-BA-FE-F-074:** The section details header form shall display the following fields, grouped in two columns using `FieldGroup` components:

**Left column — Section Info:**
| Field | Type | Editable (Draft) | aria-label |
|---|---|---|---|
| Reference | text (read-only) | No | `Section Reference` |
| Class of Business | select (from `GET /api/lookups/classOfBusiness`) | Yes | `Class of Business` |
| Time Basis | select (Claims-Made, Occurrence, Manifest) | Yes | `Time Basis` |
| Effective Date | date | Yes | `Effective Date` |
| Effective Time | time (step=1) | Yes | `Effective Time` |
| Expiry Date | date | Yes | `Expiry Date` |
| Expiry Time | time (step=1) | Yes | `Expiry Time` |
| Days on Cover | number (read-only, computed) | No | `Days on Cover` |

**Right column — Financial:**
| Field | Type | Editable (Draft) | aria-label |
|---|---|---|---|
| Limit Currency | select (GBP, USD, EUR) | Yes | `Limit Currency` |
| Limit Amount | number (step=0.01) | Yes | `Limit Amount` |
| Excess Currency | select | Yes | `Excess Currency` |
| Excess Amount | number (step=0.01) | Yes | `Excess Amount` |
| Sum Insured Currency | select | Yes | `Sum Insured Currency` |
| Sum Insured | number (step=0.01) | Yes | `Sum Insured` |
| Premium Currency | select | Yes | `Premium Currency` |
| Gross Premium Income Limit | number (step=0.01) | Yes | `Gross Premium Income Limit` |

All editable fields shall be inputs when the parent BA status is `"Draft"` and read-only plain text otherwise.

**REQ-BA-FE-F-075:** The `BASectionViewPage` shall render a **Save** sidebar action that calls `PUT /api/binding-authority-sections/:sectionId` with the changed header fields. An error message shall be shown inline on failure.

**REQ-BA-FE-F-076:** The `BASectionViewPage` shall render a `TabsNav` below the section details form with **four** tabs: `{ key: 'coverage', label: 'Coverage' }`, `{ key: 'participations', label: 'Participations' }`, `{ key: 'risk-codes', label: 'Authorized Risk Codes' }`, `{ key: 'gpi', label: 'GPI Monitoring' }`. The default active tab shall be `'coverage'`.

#### 4.11.1 Coverage Tab

**REQ-BA-FE-F-077:** The Coverage tab shall display a read-only summary card showing: Limit Currency + Limit Amount, Excess Currency + Excess Amount, Sum Insured Currency + Sum Insured, Time Basis, Days on Cover. These values are sourced from the section header fields and update reactively when the header form changes.

#### 4.11.2 Participations Tab

**REQ-BA-FE-F-078:** The Participations tab shall fetch `GET /api/binding-authority-sections/:sectionId/participations` on first activation and render the returned rows in a table with columns: Insurer (name), Insurer Party ID, Share % (6 decimal places), and a Delete action column when editable.

**REQ-BA-FE-F-079:** When the BA is `"Draft"`, rows may be added and deleted inline. An `"+ Add Participation"` button shall open the InsurerSearch modal; selecting an insurer shall add a new row with `sharePercentage` defaulting to `0`. Each row shall have a delete button.

**REQ-BA-FE-F-080:** A `"Save Participations"` button shall validate that the sum of Share % equals `100 ± 0.0001`; if validation fails, an inline error message shall be shown and the save shall be blocked. On passing validation the button shall call `POST /api/binding-authority-sections/:sectionId/participations` with `{ participations: [...rows] }` and replace local state with the returned list.

**REQ-BA-FE-F-081:** When the list is empty, the table body shall render `"No participations found."`. On API failure, an error message shall be shown.

#### 4.11.3 Authorized Risk Codes Tab

**REQ-BA-FE-F-082:** The Authorized Risk Codes tab shall fetch `GET /api/binding-authority-sections/:sectionId/authorized-risk-codes` on first activation and render the returned codes in a table with columns: Risk Code, Description.

**REQ-BA-FE-F-083:** When the BA is `"Draft"`, an `"+ Add Risk Code"` button shall present a select dropdown populated from `GET /api/lookups/riskCodes`. Selecting a code shall call `POST /api/binding-authority-sections/:sectionId/authorized-risk-codes` with `{ code }` and prepend the returned code to the list.

**REQ-BA-FE-F-084:** Each risk code row shall have a delete button (visible when Draft) that calls `DELETE /api/binding-authority-sections/:sectionId/authorized-risk-codes/:code` and removes the row on success.

**REQ-BA-FE-F-085:** When the list is empty, the table body shall render `"No authorized risk codes."`. On API failure, an error message shall be shown.

#### 4.11.4 Section GPI Monitoring Tab

**REQ-BA-FE-F-086:** The Section GPI Monitoring tab shall display the section's GPI Limit (`written_premium_limit`) with currency, Actual Gross Premium (populated from bordereau data when available), and a colour-coded usage percentage progress bar. The colour rules from REQ-BA-FE-F-057 apply (green below 80%, amber 80–100%, red above 100%). When no GPI limit is set for this section (`written_premium_limit` is null), the tab shall render `"No GPI limit configured for this section. Set a Written Premium Limit on the Coverage tab to enable GPI monitoring."`. **[Block 3 — actual premium aggregation from bordereau data is deferred; placeholder 0 is shown until that integration is built.]**

### 4.12 BASearchModal — Reusable BA Search and Link Modal

**REQ-BA-FE-F-091:** The application shall include a `BASearchModal` component at `frontend/src/binding-authorities/BASearchModal/BASearchModal.tsx` that is a reusable modal for searching and selecting an existing BA record. It shall accept props: `isOpen: boolean`, `onClose: () => void`, `onSelect: (ba: BindingAuthority) => void`, and an optional `excludeIds?: number[]`.

**REQ-BA-FE-F-092:** When `isOpen` is `true`, the `BASearchModal` shall call `GET /api/binding-authorities` on mount and display a loading indicator with the text `"Loading binding authorities…"`.

**REQ-BA-FE-F-093:** On a successful API response, the `BASearchModal` shall render a text input for filtering and a results table with columns: Reference, Coverholder, Status, Inception Date, Expiry Date.

**REQ-BA-FE-F-094:** The text input shall filter the displayed list client-side across `reference`, `coverholder`, and `status` fields simultaneously (case-insensitive substring match).

**REQ-BA-FE-F-095:** When the `excludeIds` prop is provided, the modal shall remove any BA whose `id` is in `excludeIds` from displayed results before applying the text filter.

**REQ-BA-FE-F-096:** Clicking a row shall call `onSelect` with the full BA object and call `onClose` to dismiss the modal.

**REQ-BA-FE-F-097:** The modal shall render `"No binding authorities found."` when filtered results are empty.

**REQ-BA-FE-F-098:** The modal shall render the API error message when the fetch fails. Clicking Cancel or the backdrop shall call `onClose` without invoking `onSelect`.

### 4.13 Shared / Cross-cutting

**REQ-BA-FE-C-001:** No component, page, or service in this domain may call `fetch()` or `axios` directly — all API calls must go through `@/shared/lib/api-client/api-client` (`get`, `post`, `put`, `del`).

**REQ-BA-FE-C-002:** All table header cells shall use Title Case text with no `uppercase` or `tracking-wide` CSS class (per §14.5 RULE 7).

**REQ-BA-FE-C-003:** Any page in the BA domain that contains editable fields (NewBAPage, BAViewPage, BASectionViewPage) shall implement dirty-state tracking by comparing current form values against a snapshot taken on load using deterministic serialisation. When the user navigates back via the browser Back button while dirty: on the first press, block the navigation and push a notification via `addNotification` reading `"You have unsaved changes — press Back again to discard"`; on a second consecutive back press, allow navigation. The dirty flag and back-navigation listener shall be cleared on a successful save.

**REQ-BA-FE-C-004:** Days on Cover (section fields) shall be computed as `max(0, Math.ceil((expiryDate − effectiveDate) / 86400000))`.

### 4.14 Security

**REQ-BA-FE-S-001:** The BA pages shall not be accessible without a valid authenticated session; requests without a session shall be redirected to `/login` via the `ProtectedRoute` wrapper in `main.jsx`.

**REQ-BA-FE-S-002:** The BA view page shall not call `PUT /api/binding-authorities/:id` when the BA is in a locked state (non-Draft), even if the save event is dispatched programmatically.

---

## 5. Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-BA-FE-F-001 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-002 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-003 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-004 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-005 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-006 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-007 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-008 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-009 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-010 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-011 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-012 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-013 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-014 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-015 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-016 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-017 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-018 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-019 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-020 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-021 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-022 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-023 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-024 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-025 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-026 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-027 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-028 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-029 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-030 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-031 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-032 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-033 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-041 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-042 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-046 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-047 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-048 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-049 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-050 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-056 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-057 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-058 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-059 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-061 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-062 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-063 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-066 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-069 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-070 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-071 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-073 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-074 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-075 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-076 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-077 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-078 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-079 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-080 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-081 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-082 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-083 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-084 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-085 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-086 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-091 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-092 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-093 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-094 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-095 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-096 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-097 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-098 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-C-001 | code review | — |
| REQ-BA-FE-C-002 | code review | — |
| REQ-BA-FE-C-003 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-C-004 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-S-001 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-S-002 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-112 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-113 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-114 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-115 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-116 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-117 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | done |
| REQ-BA-FE-F-118 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | done |
| REQ-BA-FE-F-119 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | done |
| REQ-BA-FE-F-120 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | done |
| REQ-BA-FE-F-121 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | done |
| REQ-BA-FE-F-122 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | done |
| REQ-BA-FE-F-122a | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-122b | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-123 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-124 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-125 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-126 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-127 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-128 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-129 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-130 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-131 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-132 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-133 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-134 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-135 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-136 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-137 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-138 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-139 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-140 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-141 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-142 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-143 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-144 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |
| REQ-BA-FE-F-145 | `frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx` | pending |

---

## 6. Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-BA-001 | Should the Rating Configuration tab (section-level) be included in Block 1 or deferred? Legacy had rating schedule linking. | Open — deferred to Block 3 |
| OQ-BA-002 | Should the Endorsement editor page be a full page or modal-based in the simplified rebuild? | **Closed — Block 2.2: full page (BAEndorsementPage) modelled on PolicyEndorsementPage. Two pages: BAEndorsePage (creation form) + BAEndorsementPage (edit view).** |
| OQ-BA-003 | What status transitions are valid? Legacy had: Draft → Active → Bound → Expired/Cancelled/Lapsed. | **Closed — 2026-04-21: endorsement transaction lifecycle is Draft → Bound → Issued. Binding authority contract status remains a separate field.** |
| OQ-BA-004 | Should the Bordereau wizard be included? Legacy had 6 bordereau-related modals. | **Closed — Block 2: partial implementation added (see §5 Bordereaux Import below)** |
| OQ-BA-050 | What data source drives the BordereauRunPage output? Is it live DB data filtered by BA, or always illustrative until a data pipeline is built? | **Open — raised 2026-04-17. See 08-Open-Questions.md OQ-050.** |
| OQ-BA-051 | Should the Effective Date on BAEndorsePage be constrained to future dates, or can backdated endorsements be created? | **Open — raised 2026-04-17. See 08-Open-Questions.md OQ-051.** |

---

## 5. Bordereaux Import — Block 2 Addition

This section covers the `BordereauImportModal` 4-step wizard added to the GPI Monitoring tab of `BAViewPage`, and the `bordereauValidations` shared utility used by the wizard. The backend `POST /api/bordereaux/import` endpoint is covered by `backend/nest/src/binding-authorities/bordereaux.requirements.md`.

### REQ-BA-FE-F-101 — Import Bordereaux button

The **GPI Monitoring** tab of `BAViewPage` shall include an **"Import Bordereaux"** button that opens the `BordereauImportModal`. The button shall only be rendered when the user is on the GPI Monitoring tab; it shall not appear on other tabs.

Acceptance criteria:
- The button renders in the GPI Monitoring tab header area.
- Clicking the button opens the `BordereauImportModal`.
- The button is not rendered on any other tab.

### REQ-BA-FE-F-102 — Step 1: Setup (type, subtype, data type, file upload)

Step 1 of the wizard shall allow the user to select: **Bordereaux type** (Risk / Claims), **sub-type** (Premium / Adjustment / ... inferred from type), **data type** (Risk / Policy), and upload a **spreadsheet file** (`.xlsx` or `.csv`). The step shall validate that all fields are filled and a file is selected before allowing progression to Step 2.

Acceptance criteria:
- All four controls are present on Step 1.
- The "Next" button is disabled until type, subtype, data type, and file are all selected.
- Accepting `.xlsx` and `.csv` file types only.

### REQ-BA-FE-F-103 — Step 2: Column mapping with auto-hints and localStorage persistence

Step 2 shall parse the uploaded file using the XLSX library (loaded from CDN as `window.XLSX`), detect column headers from the first row, and present a mapping interface. Each source column may be mapped to a target field from the canonical field list. Auto-hint logic shall pre-populate mappings using fuzzy header matching. Mappings shall be persisted to and restored from `localStorage` using the key `ba:{id}:import:{type}:{subtype}:{datatype}:mapping`.

Acceptance criteria:
- Columns from the spreadsheet appear as selectable source headers.
- Auto-hints pre-populate recognisable columns.
- The "Next" button is always enabled (column mapping is optional; the user may proceed with an empty mapping).
- On re-opening the modal with the same BA + configuration, the previous mapping is restored from `localStorage`.

### REQ-BA-FE-F-104 — Step 3: Preview and validation

Step 3 shall display the first 5 normalised rows as a preview table and run `validateRows()` from `bordereauValidations`. Each validation issue shall be displayed with its severity (error / warning), row number, field, and message. The user may proceed to Step 4 (import) even when warnings are present; errors do not block progression in the current implementation but must be visible.

Acceptance criteria:
- Up to 5 preview rows are displayed in a table.
- Each row from `validateRows()` with `severity: 'error'` is displayed with the error message.
- Each row from `validateRows()` with `severity: 'warning'` is displayed with the warning message.
- An "Import" button on Step 3 submits the data.

### REQ-BA-FE-F-105 — Step 4: Confirmation (done state)

After a successful `POST /api/bordereaux/import` response, the modal shall advance to Step 4 and display a success message including the counts of created policies, sections, coverages, and transactions from the response. The modal shall include a "Close" button that dismisses it.

Acceptance criteria:
- Step 4 renders after a 2xx response.
- Created counts (policies, sections, coverages, transactions) are visible.
- The modal closes when the "Close" button is clicked.
- On close, a `ba:gpi-actuals-updated` custom event is dispatched on `window`.

### REQ-BA-FE-F-106 — bordereauValidations: value normalisation

`normalizeValue(targetKey, raw)` shall return the canonical string for a known mapping key, or the trimmed raw string for unmapped keys.
- For `policyTxn.transactionType`, the following aliases shall map to their canonical values: `N`/`NB`/`NEW` → `New Business`; `R`/`RN`/`RNL`/`REN` → `Renewal`; `E`/`END` → `Endorsement`; `C`/`CAN` → `Cancellation`. The comparison shall be case-insensitive.
- `null` or `undefined` shall return `''`.

Acceptance criteria:
- `normalizeValue('policyTxn.transactionType', 'NB')` returns `'New Business'`.
- `normalizeValue('policyTxn.transactionType', 'ren')` returns `'Renewal'`.
- `normalizeValue('other.field', 'foo')` returns `'foo'`.
- `normalizeValue('policyTxn.transactionType', null)` returns `''`.

### REQ-BA-FE-F-107 — bordereauValidations: parseNumber

`parseNumber(raw)` shall strip commas and whitespace from the input, parse to float, and return the numeric value. It shall return `0` for null, undefined, empty string, and non-numeric input.

Acceptance criteria:
- `parseNumber('1,234.56')` returns `1234.56`.
- `parseNumber('')` returns `0`.
- `parseNumber(null)` returns `0`.
- `parseNumber('abc')` returns `0`.
- `parseNumber('  500 ')` returns `500`.

### REQ-BA-FE-F-108 — bordereauValidations: validateRows — COB validation

When `validateRows()` is called with a `context.classesOfBusiness` array, each row whose `section.classOfBusiness` (or `policy.classOfBusiness`) value does not match any item in the provided list (case-insensitive) shall produce an `'invalid-cob'` error issue.

Acceptance criteria:
- A row with a COB not in the list produces an issue with `type: 'invalid-cob'` and `severity: 'error'`.
- A row with a COB present in the list (case-insensitive match) produces no COB issue.
- When no COB field is present on a row, no COB issue is raised.

### REQ-BA-FE-F-109 — bordereauValidations: validateRows — transaction type check

A row whose `policyTxn.transactionType` after normalisation is not one of `'New Business'`, `'Renewal'`, `'Endorsement'`, `'Cancellation'` shall produce an `'invalid-txn-type'` error issue.

Acceptance criteria:
- `'Unknown'` transaction type produces `type: 'invalid-txn-type'` with `severity: 'error'`.
- `'New Business'` produces no transaction type issue.
- A row with no `policyTxn.transactionType` produces no transaction type issue.

### REQ-BA-FE-F-110 — bordereauValidations: validateRows — negative premium check

A row whose `section.grossPremium` (or `policy.grossPremium`) parses to a negative number shall produce a `'negative-premium'` error issue.

Acceptance criteria:
- `section.grossPremium = '-100'` produces `type: 'negative-premium'` with `severity: 'error'`.
- `section.grossPremium = '0'` produces no negative-premium issue.
- Missing gross premium field is treated as `0` and produces no issue.

### REQ-BA-FE-F-111 — bordereauValidations: validateRows — per-policy sum check

After processing all rows, when the sum of `section.grossPremium` (or `policy.grossPremium`) across all rows for a single `policy.reference` is less than zero, a `'policy-premium-below-zero'` warning issue shall be raised for that policy reference.

Acceptance criteria:
- Two rows with the same `policy.reference`, one with premium `-200` and one with `100`, produce a `'policy-premium-below-zero'` warning.
- Two rows with the same `policy.reference` that sum to `0` or above produce no such warning.
- `severity` is `'warning'` (not `'error'`) for per-policy sum issues.

---

## 6. Open Questions

| Date | Change |
|------|--------|
| 2026-03-11 | Stub formatted per Guideline 13 |
| 2026-04-05 | Full requirements written from BackUp source. 72 functional + 4 constraint + 2 security REQs added. Backup Coverage Map (32 rows). Impact Analysis. 4 pages: BAListPage, NewBAPage, BAViewPage, BASectionViewPage. 7 tabs on BAViewPage, 4 tabs on BASectionViewPage. BASearchModal reusable component. Documents/Bordereau/Endorsement deferred to Blocks 3–4. |
| 2026-05-22 | §5 Bordereaux Import (Block 2) added — REQ-BA-FE-F-101 to F-111. Covers: Import Bordereaux button (F-101), 4-step wizard steps (F-102–F-105), and bordereauValidations utility (F-106–F-111). OQ-BA-004 closed. Open questions OQ-030, OQ-031, OQ-032 raised in 08-Open-Questions.md. Retroactive compliance with Three-Artifact Rule acknowledged. |
| 2026-05-22 | Defect fixes: F-017 updated — Status now read-only badge (not select) per Defect 6. F-018 updated — removed locked-banner cross-reference per Defect 8. F-020 updated — renamed "Create Amendment" to "Endorse Binding Authority" (Defect 9), added "Import Bordereaux" sidebar item (Defect 12), clarified "Issue BA" is sidebar-only (Defect 5). F-030 removed — locked banner no longer displayed (Defect 8). F-031 updated — sections tab now uses ResizableGrid with sort/resize (Defect 4). |
| 2026-04-21 | Endorsement workflow reset to business-approved lifecycle. F-020 updated — Endorse Binding Authority visible only for Active BAs. F-047 updated — Transactions tab column renamed to Transaction Status. F-050 updated — workflow actions now Bind Endorsement (Draft → Bound), Issue Endorsement (Bound → Issued), and Issue Binding Authority auto-issues the Initial Transaction. F-124 updated — endorsement creation allowed only for Active BAs. F-125/F-137 updated — same-type open unissued endorsement means status Draft or Bound. F-129/F-130/F-136 updated — Bound endorsement is read-only with Issue action available; Issued endorsement is terminal and redirects to view page. F-135/F-142/F-144 updated — terminal status renamed from Endorsed/Active to Issued. OQ-BA-003 closed. |
| 2026-04-17 | Block 2.2: F-018 updated — locked when non-Draft (all fields locked, not just visual). F-020 updated — "Create Bordereau" sidebar item removed; "Endorse Binding Authority" now navigates to BAEndorsePage (type picker Added). F-023 updated — 8 tabs (added Bordereaux). F-051 promoted from DEFERRED to Block 2.2 spec. F-116 updated — no longer after "Create Bordereau". F-122 expanded (ResizableGrid, Run button, Run page). New reqs: F-122a, F-122b, F-123–F-132 (Endorsement flow). OQ-BA-002 closed. OQ-BA-050–OQ-BA-051 raised. |
| 2026-04-17 | Block 2.2 (amendment): F-020 updated — "Configure Bordereau" changed from always-visible to Draft-only on BAViewPage; remains accessible via BAEndorsementPage sidebar. F-124 updated — Endorsement Sub Type field added (right of Endorsement Type; locked when Administrative). F-126 updated — subType included in createBATransaction payload (omitted when Administrative). F-130 updated — Configure Bordereau added to BAEndorsementPage sidebar. F-133 added — Endorsement Sub Type locking and reset behaviour. |
| 2026-04-17 | Block 2.3: Transaction system. F-046 updated — Initial Transaction counts toward threshold; tab visible only when >1 transaction AND non-Draft. F-047 replaced — ResizableGrid; new columns (Seq #, Sub Type, Status, Created Date, Created By; Amount and Currency removed). F-048 replaced — Add Transaction button removed. F-050 replaced — inline status select removed; status via workflow actions only. F-125 updated — open endorsement check scoped to same Endorsement Type. F-126 updated — transaction status changed from 'Endorsement Created' to 'Draft'. F-129 updated — 7 tabs only (Transactions tab excluded during endorsement edit). New: F-134 (Initial Transaction on BA save), F-135 (auto-Endorsed on Issue), F-136 (status lifecycle), F-137 (one open per type — backend), F-138 (Contractual sequence number — backend), F-139 (ResizableGrid upgrade), F-140 (row actions View/Edit), F-141 (BATransactionViewPage), F-142 (details snapshot on Endorse), F-143 (BAEndorsementPage full tab rebuild), F-144 (endorsement header block), F-145 (BATransaction interface). |

---

## 5.2 Bordereau Create Modal & Configuration Modal (Block 2.1 Addition)

The `BordereauCreateModal` exists as code promoted from Block 4. The `BordereauConfigModal` is new. Neither had requirements written; this section formalises them retroactively and prospectively per Three-Artifact Rule.

### REQ-BA-FE-F-112 — BordereauCreateModal: fields and rendering

The `BordereauCreateModal` component at `frontend/src/binding-authorities/BordereauCreateModal/BordereauCreateModal.tsx` shall open when the BAViewPage intercepts the `ba:create-bordereaux` event (wired to `bordereauCreateOpen` state). The modal shall present: **Category** (radio buttons: Risk, Claims, ELTO, PoolRe, Aggregation; defaults to Risk), **Data Type** (radio buttons: Transactional, Restating; defaults to Transactional), **Month** (select 01–12, defaults to current month), **Year** (text input, defaults to current year string). A ✕ close button shall dismiss the modal.

Acceptance criteria:
- All four controls are present when modal is open.
- Category defaults to `'Risk'`; Data Type defaults to `'Transactional'`.
- Month defaults to the current month formatted as two digits (e.g. `'04'`); Year defaults to the current year as a string.
- The ✕ button calls `onClose`.

### REQ-BA-FE-F-113 — BordereauCreateModal: saved format loading

On open, the modal shall attempt to read `localStorage` key `ba:{bindingAuthorityId}:bordereau:formats` and parse it as a `SavedFormat[]`. If the result is non-empty, a **"Use Saved Format"** select shall be rendered with options for each format (displaying name, category, dataType). Selecting a format shall populate Category and Data Type radio selections from the stored format values.

Acceptance criteria:
- When no saved formats exist the "Use Saved Format" select is not rendered.
- When saved formats exist, selecting one updates Category and Data Type.
- A malformed localStorage value is silently ignored (no error thrown).

### REQ-BA-FE-F-114 — BordereauCreateModal: Download CSV

A **"Download CSV"** button shall resolve the column header list for the effective category in priority order: (1) saved format attributes when a format is selected; (2) per-BA attributes from `localStorage` key `ba:{id}:bordereau:{category}:attributes`; (3) global defaults from `localStorage` key `bordereau:defaults:{category}`; (4) hard-coded `DEFAULT_ATTRS` for the category. The button shall generate a single-row CSV (header row only) and trigger a browser file download named `Bordereau-{baId}-{category}-{dataType}-{year}-{month}.csv`. No API call is made.

Acceptance criteria:
- Clicking the button triggers a browser download (anchor element created and clicked).
- The filename matches the pattern with the selected values.
- The CSV content is exactly the resolved column header labels separated by commas.

### REQ-BA-FE-F-115 — BordereauCreateModal: reset on close

When `isOpen` transitions from `true` to `false`, all form fields shall reset to their defaults after a 100 ms timeout: Category → `'Risk'`, Data Type → `'Transactional'`, Month → current month, Year → current year, selected format index → `−1`.

Acceptance criteria:
- After close and re-open, all fields show default values.

---

### REQ-BA-FE-F-116 — BAViewPage: Configure Bordereau sidebar item

The BAViewPage sidebar section shall include a **Configure Bordereau** action item (FiSettings icon, event `ba:configure-bordereau`), always visible, positioned after "Import Bordereaux" and before "Documents" in the sidebar item list (the "Create Bordereau" sidebar item was removed in Block 2.2 — see REQ-BA-FE-F-020). The BAViewPage shall listen for this event and open the `BordereauConfigModal`.

Acceptance criteria:
- "Configure Bordereau" item appears in the BAViewPage sidebar.
- Dispatching `ba:configure-bordereau` on `window` sets `bordereauConfigOpen` state to `true`.
- `BordereauConfigModal` is rendered with `isOpen={bordereauConfigOpen}` and passed the current `baId`.

### REQ-BA-FE-F-117 — BordereauConfigModal: 4-step wizard component

The `BordereauConfigModal` component at `frontend/src/binding-authorities/BordereauConfigModal/BordereauConfigModal.tsx` shall be a **4-step wizard** for creating or editing bordereau configurations. Props: `isOpen: boolean`, `onClose?: () => void`, `bindingAuthorityId?: string | number | null`, `editConfig?: BordereauConfig | null`, `onSaved?: (config: BordereauConfig) => void`. The component returns `null` when `isOpen` is `false`. A close button (×) shall call `onClose`. A step indicator shall display all four step names (Setup, Fields, Order, Preview) with the active step highlighted. The wizard heading shall read **"Add Bordereau"** (or **"Edit Bordereau"** when `editConfig` is provided). The overlay shall use `fixed inset-y-0 left-14 right-0` (not `inset-0`) so the sidebar remains visible. The outer element shall carry `data-testid="bordereau-config-modal"`. It shall export a `BordereauConfig` interface: `{ id, name, type, dataStyle, fields, createdAt }`.

Acceptance criteria:
- Renders heading "Add Bordereau" and step indicator with "1. Setup" visible when `isOpen` is `true`.
- Returns `null` when `isOpen` is `false`.
- Close button calls `onClose`.

### REQ-BA-FE-F-118 — BordereauConfigModal: Step 1 — Setup

**Step 1 (Setup)** shall contain:
- A required free-text **Name** input (placeholder: e.g. "Q1 2025 Risk Bordereau"). The **Next** button shall be disabled while the name is empty.
- A **"Bordereau Type"** `FieldGroup` with **6 radio buttons**: Risk, Claims, Paid, ELTO, Pool Re Terrorism, Aggregation. Default is Risk. Each radio carries an `aria-label` equal to its short name (e.g. `Claims`, `Paid`).
- A **"Data Style"** `FieldGroup` with 2 radio buttons: **Transactional** (rows = individual transactions) and **Restating** (rows = cumulative positions). Default is Transactional.

Changing the type resets the field selection (Step 2) to the type’s full default set.

Acceptance criteria:
- Step 1 renders 8 radios total (6 type + 2 data style) and 1 text input for the name.
- Next button is disabled when name is empty; enabled once a name is typed.
- Clicking the Claims radio on Step 1 then navigating to Step 2 shows 8 attribute checkboxes.

### REQ-BA-FE-F-119 — BordereauConfigModal: attribute checkbox sets

The available attributes per type (label → key) are:

| Type | Attributes (label — key) |
|---|---|
| Risk | Policy Reference — `policy.reference`, Insured Name — `policy.insuredName`, Inception Date — `policy.inceptionDate`, Expiry Date — `policy.expiryDate`, Section Reference — `section.reference`, Class of Business — `section.classOfBusiness`, Time Basis — `section.timeBasis`, Section Premium Currency — `section.premiumCurrency`, Section Gross Premium — `section.grossPremium`, Coverage Reference — `coverage.reference`, Coverage Limit — `coverage.limitAmount`, Coverage Limit Currency — `coverage.limitCurrency` |
| Claims | Claim Reference — `claim.reference`, Loss Date — `claim.lossDate`, Claim Status — `claim.status`, Paid Amount — `claimTxn.paidAmount`, Transaction Currency — `claimTxn.currency`, Transaction Date — `claimTxn.transactionDate`, Policy Reference — `policy.reference`, Insured Name — `policy.insuredName` |
| ELTO | Policy Reference — `policy.reference`, Insured Name — `policy.insuredName`, Employer Name — `elto.employerName`, Employer ERN — `elto.employerERN`, Employer Address — `elto.employerAddress`, Inception Date — `policy.inceptionDate`, Expiry Date — `policy.expiryDate` |
| PoolRe | Policy Reference — `policy.reference`, Risk Address — `risk.address`, Postcode — `risk.postcode`, Occupancy — `risk.occupancy`, Pool Re Code — `risk.poolReCode`, Premium Currency — `section.premiumCurrency`, Gross Premium — `section.grossPremium`, Sum Insured Currency — `coverage.limitCurrency`, Sum Insured — `coverage.limitAmount` |
| Aggregation | Territory — `agg.territory`, Class of Business — `agg.classOfBusiness`, Count of Risks — `agg.countRisks`, Total Sum Insured — `agg.totalSumInsured`, Total Gross Premium — `agg.totalGrossPremium` |

Acceptance criteria:
- Selecting Risk shows exactly 12 checkboxes with the labels above.
- Each checkbox is independently togglable.
- Checking and unchecking is reflected immediately in local state.

### REQ-BA-FE-F-120 — BordereauConfigModal: Step 3 — Field Order

**Step 3 (Order)** shall show a `FieldGroup` titled **"Field Order"** containing an ordered list (`<ol>`) of all selected fields. Each row shows a sequential number, the field label, and Up/Down arrow buttons (`aria-label="Move {label} up/down"`). The first item’s Up button is disabled; the last item’s Down button is disabled.

The footer shows a **Back** button (returns to Step 2) and a **Next** button (advances to Step 4).

Acceptance criteria:
- Step 3 shows the Field Order group with field labels as list items.
- Clicking the Up arrow button for the second field swaps it with the first.
- Back button returns to Step 2 (Fields).

### REQ-BA-FE-F-121 — BordereauConfigModal: Step 4 — Preview and Add

**Step 4 (Preview)** shall show a scrollable table preview of the configured bordereau using **illustrative data** (hardcoded sample values per type). Column headers are the labels of the selected fields in the configured order.

The footer shows a **Back** button and an **Add** button (or **Save** when editing). Clicking **Add/Save** shall:
1. Call `onSaved(config)` with the full `BordereauConfig` object — the parent (`BAViewPage`) is responsible for persisting the config to the DB via `createBordereauConfig` / `updateBordereauConfig`.
2. Call `onClose()`.

No `addNotification` is called. No localStorage write is performed by the modal.

Acceptance criteria:
- Step 4 shows a `<table>` with a column header matching the first selected field label ("Policy Reference" for Risk).
- Clicking "Add" calls both `onSaved` and `onClose`.

### REQ-BA-FE-F-122 — BAViewPage: Bordereaux tab and configuration table

BAViewPage shall include a **"Bordereaux"** tab (tab key `'bordeaux'`, visible label `'Bordereaux'`, added between the Claims and Audit tabs). The tab content shall render a `ResizableGrid` component styled identically to the Sections tab grid. On mount, the page shall call `GET /api/binding-authorities/:id/bordereau-configs` and populate the grid from the response. Grid columns: **Name** (sortable, 220 px default), **Type** (sortable, 150 px), **Data Style** (sortable, 120 px), **Fields** (count — non-sortable, 70 px), **Created** (sortable, 110 px), **Actions** (non-sortable, 140 px).

An **"Add Bordereau"** button above the grid opens `BordereauConfigModal` in create mode; on save, calls `POST /api/binding-authorities/:id/bordereau-configs`. The Edit action opens the modal with `editConfig` pre-populated; on save, calls `PUT /api/binding-authorities/:id/bordereau-configs/:configId`. The Delete action calls `DELETE /api/binding-authorities/:id/bordereau-configs/:configId` and removes the row from state.

The `ba:configure-bordereau` sidebar event continues to open `BordereauConfigModal` in create mode directly.

Acceptance criteria:
- The tab button label reads `'Bordereaux'` (not `'Bordeaux'`).
- When the API returns a config, switching to the Bordereaux tab shows its name in the ResizableGrid.
- Clicking Delete removes the row from the grid.
- Empty state reads `"No bordereau configurations yet."`

### REQ-BA-FE-F-122a — Bordereaux tab: Run button per row

The Actions column of the Bordereaux grid shall include a green **Run** button (FiPlay icon, `aria-label="Run {name}"`) for each row. Clicking Run shall navigate to `/binding-authorities/:id/bordereaux/:configId/run`, passing the `BordereauConfig` as route state.

Acceptance criteria:
- Each row has a button with `aria-label` matching `"Run {bordereau name}"`.
- Clicking Run navigates to the correct run URL.
- No endorsement transaction is created on config save or edit.

### REQ-BA-FE-F-122b — BordereauRunPage

The system shall expose a `BordereauRunPage` component at route `/binding-authorities/:id/bordereaux/:configId/run`. The config shall be loaded from route state first (passed by `navigate` from BAViewPage — fast path requiring no extra API call); if absent, it shall fall back to `GET /api/binding-authorities/:id/bordereau-configs` and find the matching `config_id`. The page shall display a heading with the bordereau name and type, render an illustrative output table (column headers = configured fields, one illustrative data row), and present an **Export** button in the page header that triggers a CSV download named `{name}-{YYYY-MM-DD}.csv`. localStorage is not used by this page.

Acceptance criteria:
- Page renders without error when config is supplied via route state.
- An `Export` button is present.
- Clicking Export triggers a file download.
- If the config cannot be found (API returns empty, no route state), renders `"Bordereau configuration not found."`

---

## 5.3 Endorsement Flow — Block 2.2 Addition

### REQ-BA-FE-F-123 — BAEndorsePage

**REQ-BA-FE-F-123:** The system shall expose a `BAEndorsePage` component at route `/binding-authorities/endorse/:id`. This route shall be declared in the router **before** the general `/binding-authorities/:id` wildcard to prevent mismatched navigation. On mount the page shall fetch the BA via `GET /api/binding-authorities/:id` and display the BA reference and status as a subtitle.

Acceptance criteria:
- Component renders heading `"Create Endorsement"` without throwing.
- Route `/binding-authorities/endorse/:id` resolves to `BAEndorsePage`, not `BAViewPage`.

**REQ-BA-FE-F-124:** `BAEndorsePage` shall render a form containing:
- **Endorsement Type** select with two options: `Administrative` and `Contractual`. Default: `Administrative`.
- **Endorsement Sub Type** select (to the immediate right of Endorsement Type, in the same row) with two options: `Mid Term Adjustment` and `Cancellation`. Default: `Mid Term Adjustment`. See REQ-BA-FE-F-133 for locking behaviour.
- **Effective Date** date input (required).
- **Description** textarea (optional, placeholder `"Describe the reason for this endorsement…"`).

The page shall display the parent BA reference, current status, and contract period (inception–expiry) as contextual information. The form shall render only when the BA status is `"Active"`. If the BA status is `"Draft"` the page shall render an error: `"Endorsements cannot be created on a Draft binding authority. Issue the binding authority first."` and shall not render the form. If the BA status is any non-Active terminal state (for example `"Cancelled"`, `"Expired"`, or `"Lapsed"`) the page shall render an error stating that endorsements cannot be created for that BA status and shall not render the form.

Acceptance criteria:
- Two endorsement type options are present: Administrative and Contractual.
- An Endorsement Sub Type select is present with options Mid Term Adjustment and Cancellation.
- An Effective Date input and Description textarea are present.
- When BA is Draft, the form is replaced with an error message.
- When BA is not Active, the form is not rendered.

**REQ-BA-FE-F-125:** When the sidebar Save action (event `ba:endorse-save`) is triggered on `BAEndorsePage`, the page shall validate: (a) Effective Date is non-empty; (b) Effective Date falls on or between the BA's `inception_date` and `expiry_date`; (c) no existing transaction for this BA has `status IN ('Draft', 'Bound')` AND `type` equal to the selected Endorsement Type (one open unissued endorsement per type is permitted — Administrative and Contractual may coexist as separate open endorsements). If any condition fails, an error notification is shown and no API call is made.

Acceptance criteria:
- Missing effective date shows error notification.
- Out-of-range date shows error notification.
- Existing open endorsement of the same type shows error notification.
- An existing open endorsement of a different type does NOT block creation.

**REQ-BA-FE-F-126:** When all validations pass, `BAEndorsePage` sidebar Save shall call `POST /api/binding-authorities/:id/transactions` with `{ type: endorsementType, subType: endorsementSubType, effectiveDate, description, status: 'Draft' }`. The `subType` field shall be omitted from the payload when `endorsementType` is `'Administrative'` (sub type is locked and has no meaningful value in that state). On a 201 response the page shall navigate to `/binding-authorities/:id/endorsements/:transactionId/edit`.

Acceptance criteria:
- Successful save navigates to the endorsement edit page.
- Created transaction has `status: 'Draft'`.

**REQ-BA-FE-F-127:** `BAEndorsePage` shall implement dirty tracking equivalent to REQ-BA-FE-C-003: if any form value differs from empty initial state, pressing browser Back shows a warning notification; a second back press allows navigation.

**REQ-BA-FE-F-133:** The Endorsement Sub Type select on `BAEndorsePage` shall be **disabled (locked)** when the Endorsement Type is `"Administrative"`. When the Endorsement Type is `"Contractual"`, the Sub Type select shall be enabled and the user may choose between `Mid Term Adjustment` and `Cancellation`. The locked state shall visually indicate the field is inactive (disabled attribute applied). The Sub Type value shall reset to `"Mid Term Adjustment"` whenever the type changes away from `"Contractual"`.

Acceptance criteria:
- Sub Type select is disabled when type is Administrative.
- Sub Type select is enabled when type is Contractual.
- Sub Type options are: `Mid Term Adjustment` and `Cancellation`.

### REQ-BA-FE-F-128 — BAEndorsementPage

**REQ-BA-FE-F-128:** The system shall expose a `BAEndorsementPage` component at route `/binding-authorities/:id/endorsements/:endorsementId/edit`. On mount it shall fetch the BA via `GET /api/binding-authorities/:id` and its transactions via `GET /api/binding-authorities/:id/transactions`, resolving the endorsement by `endorsementId`. Error states: BA not found → `"Binding authority not found."`; endorsement not found → `"Endorsement not found."`

Acceptance criteria:
- Renders without error when both BA and endorsement exist.
- Shows error message (no crash) when either is missing.

**REQ-BA-FE-F-129:** `BAEndorsementPage` shall render the full BA detail view with **all tabs except Transactions** (Sections, Financial Summary, GPI Monitoring, Policies, Claims, Bordereaux, Audit — 7 tabs total). A `Draft` endorsement shall render in **editable mode**, applying the same editability rules as Draft status. A `Bound` endorsement shall render the same page in **read-only mode**: fields remain visible but inputs are disabled and section mutations are unavailable. Fields are pre-populated from the current BA field values. A page subtitle shall show the endorsement type and effective date. The Transactions tab is excluded — nesting transactions within an open endorsement is not permitted. See REQ-BA-FE-F-143 for the full tab rebuild specification and REQ-BA-FE-F-144 for the endorsement-specific header block above the BA fields.

Acceptance criteria:
- Header fields are rendered as inputs for a Draft endorsement.
- Header fields are rendered read-only or disabled for a Bound endorsement.
- Subtitle shows endorsement type and effective date.
- All seven tabs except Transactions are present.
- The Transactions tab is not rendered on BAEndorsementPage.

**REQ-BA-FE-F-130:** The sidebar on `BAEndorsementPage` shall be state-dependent and shall include `Configure Bordereau` (FiSettings icon, event `ba:configure-bordereau`) in all endorsement states. While the endorsement transaction status is `Draft`, the sidebar shall also include `Save Endorsement` (FiSave icon, event `ba:endorse-save`) and `Bind Endorsement` (FiCheckCircle icon, event `ba:bind-endorsement`). Save calls `PUT /api/binding-authorities/:id` with current field values and `PUT /api/binding-authorities/:id/transactions/:endorsementId` with the editable transaction fields. Bind calls `PUT /api/binding-authorities/:id/transactions/:endorsementId` with `{ status: 'Bound' }` and leaves the user on `BAEndorsementPage` in read-only mode. While the endorsement transaction status is `Bound`, the sidebar shall replace Save/Bind with `Issue Endorsement` (FiCheckCircle icon, event `ba:issue-endorsement`). Issue calls `PUT /api/binding-authorities/:id/transactions/:endorsementId` with `{ status: 'Issued' }` and navigates to `/binding-authorities/:id`. The `Configure Bordereau` item in the endorsement sidebar allows the user to manage bordereau configurations while editing the endorsed BA, matching the same behaviour as on `BAViewPage` in Draft status.

Acceptance criteria:
- A Draft endorsement sidebar contains Save Endorsement, Bind Endorsement, and Configure Bordereau.
- A Bound endorsement sidebar contains Issue Endorsement and Configure Bordereau, but not Save Endorsement.
- Binding endorsement sets transaction status to `'Bound'`.
- Issuing endorsement sets transaction status to `'Issued'`.
- After issue, navigation lands on BA view.

**REQ-BA-FE-F-131:** `BAEndorsementPage` shall implement dirty tracking per REQ-BA-FE-C-003 with alert text `"Unsaved endorsement edits — press Back again to discard."`

**REQ-BA-FE-F-132:** All BA fields on `BAEndorsementPage` default to the current BA snapshot values (not values from the prior endorsed transaction).

---

## 5.4 Transaction System — Block 2.3 Addition

### REQ-BA-FE-F-134 — Opening transaction on BA first save

**REQ-BA-FE-F-134 (Backend):** When `POST /api/binding-authorities` is called, the server shall atomically insert both the BA record and an opening transaction in `binding_authority_transactions` with: `type = 'Initial Transaction'`, `status = 'Draft'`, `effective_date = inception_date` (from the request body), `created_by` from the authenticated session, all other fields (`amount`, `currency`) null. Database schema: the `binding_authority_transactions` table requires two new columns — `sub_type VARCHAR(100)` and `details JSONB` — to be added via migration script before this feature is deployed.

Acceptance criteria:
- After a successful `POST /api/binding-authorities`, `GET /api/binding-authorities/:id/transactions` returns exactly one transaction with `type = 'Initial Transaction'` and `status = 'Draft'`.
- The transaction's `effective_date` matches the BA's `inception_date`.

### REQ-BA-FE-F-135 — Opening transaction auto-Issued on BA Issue

**REQ-BA-FE-F-135 (Backend):** When `PUT /api/binding-authorities/:id` is called with `{ status: 'Active' }`, the server shall update the `'Initial Transaction'` for this BA from `status = 'Draft'` to `status = 'Issued'`, and store a `details` JSON snapshot of the BA's current field values (`coverholder_id`, `year_of_account`, `inception_date`, `expiry_date`) at that moment.

Acceptance criteria:
- After issuing a BA, the Initial Transaction has `status = 'Issued'`.
- The transaction's `details` column contains the BA field values at the time of issue.

### REQ-BA-FE-F-136 — Transaction status lifecycle

**REQ-BA-FE-F-136:** The transaction status lifecycle is `'Draft'` → `'Bound'` → `'Issued'`. `'Issued'` is the terminal/issued state — non-editable and shown with a view-only icon in the Transactions tab.
- Endorsement created via BAEndorsePage → `status = 'Draft'` (green FiEdit2 pencil visible).
- "Bind Endorsement" sidebar action → `status = 'Bound'`; form fields immediately become **read-only** and the Save and Bind sidebar actions are hidden; only `Issue Endorsement` remains available.
- `Issue Endorsement` sidebar action → calls `PUT .../transactions/:transactionId` with `{ status: 'Issued' }`; on success navigates back to BAViewPage.

**Backend enforcement (REQ-BA-FE-F-136 Backend):** The backend shall enforce: (a) an `'Issued'` transaction is fully immutable — any `PUT .../transactions/:transactionId` request (regardless of which fields are in the body) shall return `409 Conflict`; (b) only `'Draft'` or `'Bound'` transactions may have their field values updated via PUT.

**Frontend enforcement (REQ-BA-FE-F-136 Frontend — edit guard):** `BAEndorsementPage` shall check the loaded endorsement's `status` before rendering the edit form. If `status` is `'Issued'`, the page shall immediately redirect to the transaction view page (`/binding-authorities/:id/transactions/:endorsementId`). A `'Bound'` endorsement renders the page in **read-only mode**: all form inputs are disabled, and only the Issue action is available in the sidebar. A `'Draft'` endorsement renders the full editable form.

**Note on BA status vs. endorsement status**: The binding authority contract status (`ba.status`) and the endorsement transaction status (`endorsement.status`) are entirely independent fields. A BA may be `'Active'` (issued and live) while an endorsement on that BA is `'Draft'` (awaiting issue). These must be displayed separately to avoid confusion.

Acceptance criteria:
- `PUT /api/binding-authorities/:id/transactions/:transactionId` with any body on an `'Issued'` transaction returns 409.
- `PUT .../transactions/:transactionId` with valid fields on a Draft or Bound transaction returns 200.
- BAEndorsementPage `Bind Endorsement` calls updateBATransaction with `{ status: 'Bound' }` and leaves the user on BAEndorsementPage.
- BAEndorsementPage `Issue Endorsement` calls updateBATransaction with `{ status: 'Issued' }` and navigates to BAViewPage.
- BAEndorsementPage loaded with a `'Draft'` endorsement renders the full editable form.
- BAEndorsementPage loaded with a `'Bound'` endorsement renders the form in read-only mode: all inputs are disabled, Save and Bind are absent from the sidebar, only Issue remains.
- BAEndorsementPage loaded with an `'Issued'` endorsement redirects immediately to the transaction view page.

### REQ-BA-FE-F-137 — One open endorsement per Endorsement Type (backend enforcement)

**REQ-BA-FE-F-137 (Backend):** `POST /api/binding-authorities/:id/transactions` shall return `400` with `{ error: 'An open [type] endorsement already exists for this binding authority' }` if a transaction already exists for this BA with the same `type` (Administrative or Contractual) and `status IN ('Draft', 'Bound')`. Administrative and Contractual may each have one open unissued endorsement simultaneously; two open Administrative or two open Contractual endorsements are not permitted.

Acceptance criteria:
- Creating a second open unissued Administrative endorsement on the same BA returns 400.
- Creating a second open unissued Contractual endorsement on the same BA returns 400.
- Creating one open unissued Administrative and one open unissued Contractual on the same BA returns 201 for both.

### REQ-BA-FE-F-138 — Contractual sequence number (backend computed)

**REQ-BA-FE-F-138 (Backend):** `GET /api/binding-authorities/:id/transactions` shall return a computed `sequence_number` field on each transaction row. For `'Contractual'`-type transactions: assign 1, 2, 3… in ascending `effective_date` order (BA-scoped counter). For all other types (`'Initial Transaction'`, `'Administrative'`): `sequence_number = null`. The counter is scoped to the BA — two different BAs may each have a Contractual endorsement with `sequence_number = 1`.

Acceptance criteria:
- Three Contractual transactions on BA-1 are returned with `sequence_number` values 1, 2, 3 in effective-date order.
- An Administrative transaction on the same BA returns `sequence_number = null`.
- A Contractual transaction on BA-2 independently receives `sequence_number = 1`.

### REQ-BA-FE-F-139 — Transactions tab: upgrade to ResizableGrid

**REQ-BA-FE-F-139 (Frontend):** The Transactions tab shall replace the current plain HTML table with the shared `ResizableGrid` component (same pattern as the Sections tab, `storageKey = "table-widths-ba-transactions"`). Default sort: Transaction # descending. Empty-state text `"No transactions found."` unchanged.

Acceptance criteria:
- The ResizableGrid renders with `storageKey="table-widths-ba-transactions"`.
- The plain HTML table is removed.
- Column headers are sortable.

### REQ-BA-FE-F-140 — Transaction row actions

**REQ-BA-FE-F-140 (Frontend):** The Actions column in the Transactions tab ResizableGrid shall render:
- `status = 'Draft'`: green `FiEdit2` icon button (`aria-label="Edit endorsement"`, `className="text-green-600 hover:text-green-800"`) navigating to `/binding-authorities/:id/endorsements/:transactionId/edit`.
- `status = 'Bound'`: amber `FiEdit2` icon button (`aria-label="View bound endorsement"`, `className="text-amber-500 hover:text-amber-700"`) navigating to `/binding-authorities/:id/endorsements/:transactionId/edit` where the page renders read-only with Issue available.
- `status = 'Issued'` or any other non-editable status: green `FiSearch` icon button (`aria-label="View transaction"`, `className="text-green-600 hover:text-green-800"`) navigating to `/binding-authorities/:id/transactions/:transactionId`.

No other action buttons shall appear on transaction rows.

Acceptance criteria:
- An Issued transaction row renders a green View button that navigates to the view URL.
- A Draft transaction row renders a green Edit button that navigates to the endorsement edit URL.
- A Bound transaction row renders an amber button that navigates to the endorsement edit URL.
- Draft and Bound rows do not show a transaction View button; Issued rows do not show an Edit button.

### REQ-BA-FE-F-141 — BATransactionViewPage (read-only historical view)

**REQ-BA-FE-F-141 (Frontend):** The system shall expose a `BATransactionViewPage` component at route `/binding-authorities/:id/transactions/:transactionId`. On mount it shall fetch `GET /api/binding-authorities/:id` and `GET /api/binding-authorities/:id/transactions`, then resolve the transaction by `transactionId`. The page shall render:

- A read-only endorsement header block (Transaction #, Type, Sub Type — if Contractual, Status badge, Effective Date).
- All BA header fields in **read-only mode** populated from the transaction's `details` JSON snapshot (fall back to the current BA field values if `details` is absent).
- All tabs except Transactions (Sections, Financial Summary, GPI Monitoring, Policies, Claims, Bordereaux, Audit) in **read-only mode**, sourced from current BA data. Section-level movement values are deferred to a subsequent block.
- Sidebar: single item `"Back to Binding Authority"` (navigates to `/binding-authorities/:id`).

Error states: BA not found → `"Binding authority not found."`; transaction not found → `"Transaction not found."`.

Acceptance criteria:
- Renders without error when both BA and transaction exist.
- Shows `"Transaction not found."` when `transactionId` does not resolve.
- All BA header fields are rendered as read-only plain text (no inputs).
- Sidebar contains only `"Back to Binding Authority"`.

### REQ-BA-FE-F-142 — Transaction details snapshot on Endorse

**REQ-BA-FE-F-142 (Backend):** When `PUT /api/binding-authorities/:id/transactions/:transactionId` is called with `{ status: 'Issued' }`, the server shall read the current BA record and write the following fields into the transaction's `details` JSONB column: `coverholder_id`, `year_of_account`, `inception_date`, `expiry_date`, `status` (BA status at that moment). Section-level movement values are deferred to a subsequent block — the `details` snapshot covers BA-level header fields only for Block 2.3.

Acceptance criteria:
- After issuing a transaction, `GET /api/binding-authorities/:id/transactions` returns the transaction with a `details` object containing `coverholder_id`, `year_of_account`, `inception_date`, `expiry_date`.

### REQ-BA-FE-F-143 — BAEndorsementPage: full tab rebuild (highest priority)

**REQ-BA-FE-F-143 (Frontend — highest priority in Block 2.3):** `BAEndorsementPage` shall render the same full-tab layout as `BAViewPage` with all tabs except Transactions (Sections, Financial Summary, GPI Monitoring, Policies, Claims, Bordereaux, Audit — 7 tabs). When the endorsement status is `Draft`, each tab shall apply the same editability rules as Draft status: sections are addable/deletable, participations are editable, risk codes are addable/deletable, bordereau configurations are manageable. When the endorsement status is `Bound`, the same tabs remain visible but render in read-only mode. The page shall reuse the same tab components and data-loading patterns already in `BAViewPage`, scoped to the current `baId`. Data saved per tab (sections, participations, etc.) uses the existing section/participation endpoints unchanged.

Acceptance criteria:
- All seven tabs except Transactions are present and renderable on BAEndorsementPage.
- The Transactions tab is not rendered.
- No regression on existing tests for BAEndorsementPage (T-BA-FE-F-R128, R129, R130, R131, R132).

### REQ-BA-FE-F-144 — BAEndorsementPage: endorsement header block

**REQ-BA-FE-F-144 (Frontend):** `BAEndorsementPage` shall display an endorsement-specific header block at the top of the page, above the standard BA header fields. The block shall contain:
- **Transaction Number**: read-only integer (1-based position of this transaction in the BA's transaction history, derived from the transactions list).
- **Transaction Effective Date**: editable date input (pre-populated from `transaction.effective_date`). Both `Save Endorsement` and `Issue Endorsement` shall include this in their `PUT .../transactions/:transactionId` payloads as `effective_date`.
- **Endorsement Description**: editable textarea (pre-populated from `transaction.description`). Both save actions shall include this in transaction payloads as `description`.
- **Endorsement Type**: read-only label (value from `transaction.type` — Administrative or Contractual).
- **Sub Type**: read-only label (value from `transaction.sub_type`; rendered only when type = Contractual).
- **Endorsement Status**: read-only status badge showing the endorsement transaction's own lifecycle state (`transaction.status` — Draft, Bound, or Issued), using the same `TX_STATUS_CLASSES` badge style as the Transactions tab. This field is distinct from the binding authority's "Status" field (shown in Column 1) which reflects the contract-level status. Displaying both prevents confusion between the BA contract status (e.g. 'Active') and the endorsement's draft state (e.g. 'Draft').

Acceptance criteria:
- Transaction Number is visible as a read-only value.
- Effective Date input is present and pre-populated.
- Description textarea is present and pre-populated.
- Endorsement Type and Sub Type are shown as read-only labels (not inputs).
- Transaction Effective Date and Description are included in `PUT .../transactions/:transactionId` payloads on both Save and Issue actions.
- An "Endorsement Status" badge is visible in the Endorsement Details column showing the transaction's current status (e.g. 'Draft') using a coloured pill badge.
- When the endorsement status is 'Draft', the badge uses yellow/amber styling (same as TX_STATUS_CLASSES['Draft']).
- When the endorsement status is 'Bound', the badge uses orange styling.
- When the endorsement status is 'Issued', the badge uses green styling.

### REQ-BA-FE-F-145 — Add section during Contractual endorsement

**REQ-BA-FE-F-145 (Frontend):** When `BAEndorsementPage` is displaying a **Contractual** endorsement, the Sections tab shall render a compact `FiPlus` icon-only button (matching the style on `BAViewPage — REQ-BA-FE-F-032`) that opens an inline add row. Confirming calls `POST /api/binding-authorities/:id/sections`; on success the new section is prepended to the grid. The `FiPlus` button is **hidden** for Administrative endorsements. Each section row shall have delete available (same rule as Draft on BAViewPage).

Acceptance criteria:
- Sections tab shows the `FiPlus` button when `endorsement.type === 'Contractual'`.
- Sections tab does NOT show the `FiPlus` button when `endorsement.type === 'Administrative'`.
- Confirming the inline row calls `POST /api/binding-authorities/:id/sections` and prepends the returned section.

### REQ-BA-FE-F-146 — Coverholder field on BAEndorsementPage uses search modal

**REQ-BA-FE-F-146 (Frontend):** The Coverholder field on `BAEndorsementPage` shall use `CoverholderSearchModal` for selection, identical to the implementation on `BAViewPage` (REQ-BA-FE-F-024). The field shall be a `readOnly` text input showing the current coverholder name, with a `FiSearch` button to open the modal and a `FiX` clear button. Free-text editing of the coverholder name directly is not permitted.

Acceptance criteria:
- The Coverholder field on BAEndorsementPage is a `readOnly` input (not a free-text input).
- The search button opens `CoverholderSearchModal`.
- Selecting a party from the modal updates the coverholder name and id.

---

### REQ-BA-FE-F-147 — BATransaction interface update

**REQ-BA-FE-F-145 (Frontend):** The `BATransaction` TypeScript interface in `binding-authorities.service.ts` shall be updated to: `id: number`, `binding_authority_id: number`, `type?: string | null`, `sub_type?: string | null`, `status?: string | null`, `effective_date?: string | null`, `date?: string | null`, `description?: string | null`, `created_by?: string | null`, `sequence_number?: number | null`, `details?: Record<string, unknown> | null`. The `amount: number | null` and `currency: string | null` fields shall be removed from the interface.

Acceptance criteria:
- TypeScript compiles without error when `amount` and `currency` are omitted from a `BATransaction` object.
- TypeScript compiles without error when `sub_type`, `status`, `sequence_number`, and `details` are accessed on a `BATransaction` object.

---

## 8. Design Notes

### Dependencies
- `frontend/src/binding-authorities/binding-authorities.service.ts` — `listBAs`, `getBA`, `createBA`, `updateBA`
- `@/shared/lib/api-client/api-client` — `get`, `post`, `put`, `del`
- `@/shared/lib/auth-session/auth-session` — `getSession`
- `@/parties/CoverholderSearch/CoverholderSearch.tsx` — coverholder search modal
- `@/parties/InsurerSearch/InsurerSearch.tsx` — insurer search for participations
- `@/shared/hooks/useAudit` — audit lifecycle events

### Status badge colours
| Status | Tailwind class |
|---|---|
| Draft | `bg-gray-100 text-gray-700` |
| Active | `bg-green-100 text-green-800` |
| Bound | `bg-blue-100 text-blue-800` |
| Expired | `bg-orange-100 text-orange-700` |
| Cancelled | `bg-red-100 text-red-700` |
| Lapsed | `bg-yellow-100 text-yellow-800` |

### GPI colour thresholds
| Utilisation | Colour |
|---|---|
| < 80% | Green (`bg-green-500`) |
| 80%–100% | Amber (`bg-amber-500`) |
| > 100% | Red (`bg-red-500`) |

### Lookup endpoints
| Field | Endpoint |
|---|---|
| Class of Business | `GET /api/lookups/classOfBusiness` |
| Renewal Status | `GET /api/lookups/renewalStatuses` |
| Risk Codes | `GET /api/lookups/riskCodes` |
| Currencies | `GET /api/lookups/currencies` |

### BackUp behaviour notes (for implementors)
- **Transactions visibility:** The Transactions tab only appears when the BA is issued (non-Draft) AND has >1 transaction record (the Initial transaction exists but is not shown alone).
- **Section Days on Cover:** Computed as `max(0, Math.ceil((expiryDate − effectiveDate) / 86400000))`.
- **Participations:** Share % uses 6 decimal places to accommodate Lloyd's syndicate-level splits.
- **GPI actuals:** Legacy stored actuals in localStorage under `ba:${id}:gpi:actuals`. The rebuild shall source actuals from the API.

---

## 7. Block 2 Impact Analysis

### IAR-BA-001: Endorsement lifecycle reset to Draft → Bound → Issued
**Change:** BAEndorsementPage now treats `Draft` as editable, `Bound` as read-only with Issue available, and `Issued` as terminal/view-only. Transactions tab labels and row actions align to the same lifecycle.
**Affected files:** BAEndorsementPage.tsx, inding-authorities.requirements.md, __tests__/binding-authorities.test.tsx
**Risk:** Low — additive change, prevents unintended edits after binding, aligns with transaction lifecycle.

### IAR-BA-002: Amount/currency removed from BA transactions
**Change:** Stripped mount/currency from NestJS createTransaction/updateTransaction payload JSONB; cleaned BATransaction interface; NestJS unit tests updated.
**Affected files:** inding-authorities.service.ts (NestJS), inding-authorities.spec.ts, a-transaction.entity.ts
**Risk:** Low — these fields were never surfaced in the UI; payload-only metadata.

### IAR-BA-003: Migration 103 consolidated into base migrations 015/016
**Change:** Columns coverholder_id, updated_at added to migration 015; line_size, written_premium_limit, currency added to migration 016. Transaction columns mount, currency, date removed entirely. Migration 103 deleted.
**Affected files:** db/migrations/015-create-binding-authorities-table.js, db/migrations/016-create-binding-authority-sections-table.js, package.json (db:migrate script)
**Risk:** Medium for DBs already past migration 103 — columns already exist; ADD COLUMN IF NOT EXISTS guards apply.

### IAR-BA-004: Dead Express backend removed
**Change:** Deleted ackend/server.js, ackend/db.js, ackend/routes/, ackend/__tests__/, ackend/middleware/. CI workflow updated to run NestJS unit tests.
**Affected files:** .github/workflows/ci.yml, package.json (test:backend script)
**Risk:** Low — NestJS is the live backend; Express was unreferenced dead code.

### IAR-BA-005: Bordereau configs moved from localStorage to DB
**Change:** New table inding_authority_bordereau_configs (migration 112). BAViewPage loads configs via GET /api/binding-authorities/:id/bordereau-configs on mount; saves via POST/PUT/DELETE. BordereauConfigModal no longer writes the compat localStorage key. BordereauRunPage loads config from route state (fast path) or API fallback — localStorage not used.
**Affected files:** db/migrations/112-create-binding-authority-bordereau-configs-table.js, ackend/nest/src/entities/ba-bordereau-config.entity.ts, inding-authorities.service.ts (NestJS), inding-authorities.controller.ts (NestJS), inding-authorities.module.ts (NestJS), inding-authorities.service.ts (frontend), BAViewPage.tsx, BordereauConfigModal.tsx, BordereauRunPage.tsx, __tests__/binding-authorities.test.tsx
**Risk:** Existing browser-stored configs will not be migrated automatically (one-time data loss for localStorage-only data). Users must recreate configs after deployment.

### IAR-BA-006: Block 2 pages added (new files)
- BordereauConfigModal/BordereauConfigModal.tsx — 4-step wizard for bordereau config (REQ-BA-FE-F-117 to F-121)
- BordereauRunPage/BordereauRunPage.tsx — illustrative run output with CSV export (REQ-BA-FE-F-122b)
- BAEndorsePage/BAEndorsePage.tsx — endorsement creation form (REQ-BA-FE-F-123 to F-127)
- BAEndorsementPage/BAEndorsementPage.tsx — full endorsement editor (REQ-BA-FE-F-128 to F-133)
- BATransactionViewPage/BATransactionViewPage.tsx — read-only transaction history view (REQ-BA-FE-F-141)

**Modified files (Block 2.1/2.2/2.3):**
- BAViewPage.tsx — Bordereaux tab, 8-tab layout, BA-level bordereau config table
- main.jsx — routes for new Block 2 pages
- inding-authorities.service.ts (frontend) — bordereau config API functions, transaction API functions, BATransaction interface updated
- db/migrations/017-create-binding-authority-transactions-table.js — sub_type, details JSONB columns
**Risk:** Low to medium — all new pages; no existing routes modified beyond additions.
