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
| 30 | Endorsement editor page | F-051 | DEFERRED — Block 3 |
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

**Deferred to Block 3:** Endorsement editor page, Documents page (generate/list/download/preview), Rating Configuration tab on section, BA Section Search Modal.

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

**REQ-BA-FE-F-018:** All editable fields in the BA header panel shall be rendered as inputs only when the BA status is `"Draft"`. When status is `"Active"`, `"Bound"`, `"Expired"`, `"Cancelled"`, or `"Lapsed"`, all fields shall be rendered read-only. The Status field shall always be rendered as a read-only badge (not a select).

**REQ-BA-FE-F-019:** The BA view page shall call `PUT /api/binding-authorities/:id` with changed field values when the user triggers the save action (sidebar `ba:save` event).

**REQ-BA-FE-F-020:** The BA view page shall register a sidebar section titled `Binding Authority` whose allowed items are state-dependent:
- `Save` action — visible when status is `"Draft"`
- `Issue BA` action — visible when status is `"Draft"`, transitions status to `"Active"` (sidebar only — no header button)
- `Endorse Binding Authority` action — visible when status is `"Active"` or `"Bound"` (previously labelled "Create Amendment")
- `Import Bordereaux` action — always visible, opens the `BordereauImportModal` (fires `ba:import-bordereaux` event)
- `Create Bordereau` action — always visible, fires `ba:create-bordereaux` event (FiPlus icon)
- `Documents` link — always visible, navigates to `/binding-authorities/:id/documents`
- `Create Party` link — always visible, navigates to `/parties/new` (§14 — cross-domain party creation from BA context)
- `Renew Binding Authority` link — always visible, fires `ba:renew` event; handler navigates to `/binding-authorities/new` to create a renewal (BackUp: FiRepeat icon)
- `Back to Submission` link — visible when `submission_id` is set

No duplicate status badge shall appear in the header — the status is displayed only in the Contract & Reference section of the details panel (see REQ-BA-FE-F-017, REQ-BA-FE-F-022).

**REQ-BA-FE-F-021:** The BA view page shall render an inline error message on load failure (404 or network error).

**REQ-BA-FE-F-022:** The BA view page shall render the always-visible form above the tab strip in two side-by-side columns. The left column shall contain the **Contract & Reference** `FieldGroup` (Reference, Status, Coverholder, Submission Reference, Year of Account). The right column shall contain the **Dates** `FieldGroup` (Inception Date + Time, Expiry Date + Time, Multi-Year, Renewal Date + Time, Renewal Status).

**REQ-BA-FE-F-023:** The BA view page shall render a `TabsNav` component below the form with **seven** tabs: `{ key: 'sections', label: 'Sections' }`, `{ key: 'financial', label: 'Financial Summary' }`, `{ key: 'transactions', label: 'Transactions' }`, `{ key: 'gpi', label: 'GPI Monitoring' }`, `{ key: 'policies', label: 'Policies' }`, `{ key: 'claims', label: 'Claims' }`, `{ key: 'audit', label: 'Audit' }`. The default active tab shall be `'sections'`. The Transactions tab shall only be rendered when the BA status is NOT `"Draft"` AND there is more than one transaction.

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

**REQ-BA-FE-F-046:** The Transactions tab shall be visible only when the BA status is NOT `"Draft"` AND there is more than one transaction record. It shall fetch `GET /api/binding-authorities/:id/transactions` on first activation (lazy load) and render the returned records in a table.

**REQ-BA-FE-F-047:** The Transactions table shall display columns: Transaction #, Type (Initial, Amendment, Endorsement, Renewal), Status (Draft, Active, Approved, Complete), Effective Date, Description, Created By. The Transaction # shall be a navigation link to the transaction detail view.

**REQ-BA-FE-F-048:** When the BA is `"Active"` or `"Bound"`, a `"+ Create Transaction"` button shall be rendered. Clicking it shall call `POST /api/binding-authorities/:id/transactions` with `{ type: 'Amendment' }` and prepend the returned transaction to the list.

**REQ-BA-FE-F-049:** When the list is empty, the table body shall render `"No transactions found."`. On API failure, an error message shall be shown.

**REQ-BA-FE-F-050:** Each transaction row shall render an inline status update select allowing transitions: Draft → Active → Approved → Complete. Changing the select shall call `PUT /api/binding-authorities/:id/transactions/:transactionId` with `{ status }`.

**REQ-BA-FE-F-051:** An endorsement editor page at `/binding-authorities/:id/endorsements/:endorsementId/edit` shall be available for creating detailed endorsements with effective date, description, and section-level changes. **DEFERRED — Block 3.**

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

---

## 6. Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-BA-001 | Should the Rating Configuration tab (section-level) be included in Block 1 or deferred? Legacy had rating schedule linking. | Open — deferred to Block 3 |
| OQ-BA-002 | Should the Endorsement editor page be a full page or modal-based in the simplified rebuild? | Open — deferred to Block 3 |
| OQ-BA-003 | What status transitions are valid? Legacy had: Draft → Active → Bound → Expired/Cancelled/Lapsed. | Open — confirm with business |
| OQ-BA-004 | Should the Bordereau wizard be included? Legacy had 6 bordereau-related modals. | **Closed — Block 2: partial implementation added (see §5 Bordereaux Import below)** |

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
