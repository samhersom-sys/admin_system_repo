# Claims Domain — Requirements

## Purpose

The Claims domain provides a complete claims management interface for recording, viewing, and tracking insurance claims against policies. It enables users to view claims, see claim details, manage transactions, and track audit history.

## Scope

**Included:**
- ClaimsListPage: tabular list of all claims with sorting
- ClaimViewPage: detail view with tabs (Details, Transactions, Audit, Policy)
- ClaimCreatePage: form to create a new claim record
- Claims service layer: API adapters and types

**Excluded:**
- Claims adjudication workflow (deferred)
- Claims reserve calculations (deferred — OQ-003)
- Claims settlement payments (deferred — Finance domain)

---

## Requirements

### R01 — Claims List Page

**REQ-CLM-FE-F-001:** `ClaimsListPage` shall exist at route `/claims` and call `GET /api/claims` on mount, displaying all claims in a `ResizableGrid`.
Acceptance criteria:
- Grid is rendered with claims data after fetch completes
- Loading spinner shown while fetching
- Error message displayed on fetch failure

**REQ-CLM-FE-F-002:** The grid shall display columns: Reference, Policy Reference, Insured, Status, Date of Loss, Reported Date, Description. Reference cell shall link to `/claims/:id`.
Acceptance criteria:
- All 7 columns are rendered
- Reference column contains a `<Link>` to the detail page

**REQ-CLM-FE-F-003:** Status column shall display colour-coded badges: Open (blue), In Progress (yellow), Closed (grey), Declined (red).
Acceptance criteria:
- Each status value renders with the correct colour class

**REQ-CLM-FE-F-004:** Grid columns shall be sortable. Default sort: Reference ascending.
Acceptance criteria:
- Clicking a sortable column header toggles sort direction
- Grid rows re-order accordingly

### R02 — Claim View Page

**REQ-CLM-FE-F-010:** `ClaimViewPage` shall exist at route `/claims/:id` and call `getClaim(id)` on mount with loading state.
Acceptance criteria:
- Loading spinner shown while fetch is in flight
- Error message shown on fetch failure
- "Claim not found." shown when claim is null after load

**REQ-CLM-FE-F-011:** The page header shall display: Reference (bold), Status badge (colour-coded), Insured name, Policy Reference.
Acceptance criteria:
- All four header elements are visible after load

**REQ-CLM-FE-F-012:** The sidebar shall contain a single item: "Back to Claims" (FiArrowLeft icon) which navigates to `/claims`.
Acceptance criteria:
- Dispatching `claim:back` event navigates to `/claims`

**REQ-CLM-FE-F-013:** `ClaimViewPage` shall render `TabsNav` with 4 tabs in order: Details, Transactions, Audit, Policy.
Acceptance criteria:
- All 4 tabs are rendered in the specified order

**REQ-CLM-FE-F-014:** The Details tab shall display two `FieldGroup` sections: "Claim Information" (Reference, Claim Number, Status, Policy, Insured, Reported Date) and "Loss Information" (Date of Loss, Description, Loss Type, Claimant Name, Claimant Contact).
Acceptance criteria:
- Both field groups are rendered with correct labels and values

**REQ-CLM-FE-F-015:** The Transactions tab shall lazy-load on first activation via `getClaimTransactions(id)` and display a `ResizableGrid` with columns: Type, Amount, Date, Description, Created By.
Acceptance criteria:
- Transactions are not fetched until the tab is activated
- Grid renders with the correct columns

**REQ-CLM-FE-F-016:** On first Audit tab activation, the page shall POST "Claim Opened" via `postClaimAudit(id, 'Claim Opened')` and load audit history via `getClaimAudit(id)`. `AuditTable` shall render the results.
Acceptance criteria:
- Audit POST fires once on first Audit tab activation
- Audit events are displayed in the AuditTable

**REQ-CLM-FE-F-017:** On unmount, the page shall POST "Claim Closed" via `postClaimAudit(id, 'Claim Closed')`.
Acceptance criteria:
- Cleanup effect fires the close audit event

### R03 — Claim Create Page

**REQ-CLM-FE-F-020:** `ClaimCreatePage` shall exist at route `/claims/create` and render a form for creating a new claim.
Acceptance criteria:
- Page renders at the correct route
- Form contains all required fields

**REQ-CLM-FE-F-021:** The form shall contain the following fields: Policy Reference (required, searchable text input), Date of Loss (required, date input), Reported Date (date input), Description (textarea), Loss Type (dropdown: Property Damage, Bodily Injury, Business Interruption, Other), Claimant Name (text input), Claimant Contact (text input).
Acceptance criteria:
- All fields render with correct input types
- Policy Reference and Date of Loss are marked required

**REQ-CLM-FE-F-022:** Validation: Policy Reference and Date of Loss are required. The form shall not submit if either is empty. Validation errors shall appear inline.
Acceptance criteria:
- Submit is prevented when required fields are empty
- Error messages appear next to the relevant fields

**REQ-CLM-FE-F-023:** On valid submission, the form shall call `createClaim(body)` and navigate to `/claims/:id` on success. On failure, a toast error appears.
Acceptance criteria:
- Successful creation navigates to the new claim's view page
- Error toast appears on API failure

**REQ-CLM-FE-F-024:** A "Cancel" button shall navigate back to `/claims`.
Acceptance criteria:
- Cancel button is rendered and navigates correctly

---

## Traceability

| Requirement ID | Test File | Test ID(s) |
|---|---|---|
| REQ-CLM-FE-F-001 | `claims/__tests__/ClaimsListPage.test.tsx` | T-CLM-LIST-R001a, T-CLM-LIST-R001b |
| REQ-CLM-FE-F-002 | `claims/__tests__/ClaimsListPage.test.tsx` | T-CLM-LIST-R002 |
| REQ-CLM-FE-F-003 | `claims/__tests__/ClaimsListPage.test.tsx` | T-CLM-LIST-R003 |
| REQ-CLM-FE-F-004 | `claims/__tests__/ClaimsListPage.test.tsx` | T-CLM-LIST-R004 |
| REQ-CLM-FE-F-010 | `claims/__tests__/ClaimViewPage.test.tsx` | T-CLM-VIEW-R010a, T-CLM-VIEW-R010b |
| REQ-CLM-FE-F-011 | `claims/__tests__/ClaimViewPage.test.tsx` | T-CLM-VIEW-R011 |
| REQ-CLM-FE-F-012 | `claims/__tests__/ClaimViewPage.test.tsx` | T-CLM-VIEW-R012 |
| REQ-CLM-FE-F-013 | `claims/__tests__/ClaimViewPage.test.tsx` | T-CLM-VIEW-R013 |
| REQ-CLM-FE-F-014 | `claims/__tests__/ClaimViewPage.test.tsx` | T-CLM-VIEW-R014 |
| REQ-CLM-FE-F-015 | `claims/__tests__/ClaimViewPage.test.tsx` | T-CLM-VIEW-R015 |
| REQ-CLM-FE-F-016 | `claims/__tests__/ClaimViewPage.test.tsx` | T-CLM-VIEW-R016 |
| REQ-CLM-FE-F-017 | `claims/__tests__/ClaimViewPage.test.tsx` | T-CLM-VIEW-R017 |
| REQ-CLM-FE-F-020 | `claims/__tests__/ClaimCreatePage.test.tsx` | T-CLM-CREATE-R020 |
| REQ-CLM-FE-F-021 | `claims/__tests__/ClaimCreatePage.test.tsx` | T-CLM-CREATE-R021 |
| REQ-CLM-FE-F-022 | `claims/__tests__/ClaimCreatePage.test.tsx` | T-CLM-CREATE-R022 |
| REQ-CLM-FE-F-023 | `claims/__tests__/ClaimCreatePage.test.tsx` | T-CLM-CREATE-R023 |
| REQ-CLM-FE-F-024 | `claims/__tests__/ClaimCreatePage.test.tsx` | T-CLM-CREATE-R024 |

---

## Dependencies

- `@/shared/lib/api-client` — HTTP adapter
- `@/shared/lib/auth-session` — session context
- `@/shared/components/ResizableGrid` — data grid
- `@/shared/components/AuditTable` — audit display
- `@/shared/components/TabsNav` — tab navigation
- `@/shared/components/FieldGroup` — form sections
- `@/shared/Card` — card layout
- `@/shared/LoadingSpinner` — loading state

---

## Change Log

| Date | Change |
|---|---|
| 2026-04-09 | Initial requirements written covering ClaimsListPage, ClaimViewPage, ClaimCreatePage |
