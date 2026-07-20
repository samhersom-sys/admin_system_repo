# REQUIREMENTS — Policies Domain (Batch D)

**Domain Code:** `POL`
**Location:** `frontend/src/policies/`
**Backend Location:** `backend/nest/src/policies/`
**Status:** Requirements agreed — tests and code pending
**Standard:** Written per [Guideline 13](../../docs/AI%20Guidelines/13-Requirements-Standards.md)
**Batch:** D — [reconstruction-gap-analysis.md §4.8](../../docs/Project%20Documentation/reconstruction-gap-analysis.md)

---

## 1. Scope

**In scope:**
- `PoliciesListPage` at `/policies` — full grid with navigation to policy view
- `PolicyViewPage` at `/policies/:id` — header, status badge, sidebar actions, seven tabs
- `PolicySectionViewPage` at `/policies/:policyId/sections/:sectionId` — section detail with four tabs
- `PolicyEndorsePage` at `/policies/endorse/:id` — endorsement creation wizard
- `PolicyEndorsementPage` at `/policies/:id/endorsements/:endorsementId/edit` — endorsement edit view
- `PolicyCoverageDetailPage` at `/policies/:policyId/sections/:sectionId/coverages/:coverageId` — location schedule breakdown grouped by CoverageType
- `PolicyCoverageSubDetailPage` at `/policies/:policyId/sections/:sectionId/coverages/:coverageId/details/:detailName` — location breakdown by CoverageType + CoverageSubType
- `PolicyTransactionViewPage` at `/policies/:id/transactions/:transactionId` — read-only transaction summary view (BA-style)
- `policies.service.ts` — all API calls for the policies domain
- `policies.module.ts` — barrel export
- NestJS `policies/` module — `PoliciesController` + `PoliciesService`
- Quote-to-Bind: `Issue Policy` sidebar action on `QuoteViewPage` when quote status is `Bound`
- Financial Summary tab: Gross Premium, Net Premium, Commission = Gross minus Net (simple read-only; OQ-003 in scope for deeper calc logic)
- Audit trail: Policy Opened POST on mount, Policy Closed POST on unmount
- Router registration for all policy routes

**Out of scope:**
- Claims tab on `PolicyViewPage` — placeholder only (Batch E)
- Full financial view calculations (Whole/Market/Line premium views) — pending OQ-003 resolution
- Document generation API — referenced in sidebar action; implementation deferred
- Email/notification triggers on status change — Batch H/I

---

## Impact Analysis

### UI / Front-End Impact
- `frontend/src/policies/PolicyViewPage/PolicyViewPage.tsx` — 7-tab view page with sidebar, edit mode, audit lifecycle
- `frontend/src/policies/PolicySectionViewPage/PolicySectionViewPage.tsx` — section detail with 5 tabs (Coverages, Deductions, Risk Codes, Participations, Invoices), movement indicators, full editable header
- `frontend/src/policies/PolicyEndorsePage/PolicyEndorsePage.tsx` — endorsement creation wizard
- `frontend/src/policies/PolicyEndorsementPage/PolicyEndorsementPage.tsx` — endorsement edit (full policy in editable mode)
- `frontend/src/policies/PolicyCoverageDetailPage/PolicyCoverageDetailPage.tsx` — coverage detail with location schedule
- `frontend/src/policies/PolicyCoverageSubDetailPage/PolicyCoverageSubDetailPage.tsx` — coverage sub-detail breakdown
- `frontend/src/policies/PoliciesListPage/PoliciesListPage.tsx` — policy list grid
- `frontend/src/policies/PolicyTransactionViewPage/PolicyTransactionViewPage.tsx` — read-only transaction summary page
- `frontend/src/policies/policies.service.ts` — all API adapters

### API Impact
| Method | Path | Change |
|--------|------|--------|
| GET | `/api/policies` | Existing |
| GET | `/api/policies/:id` | Existing |
| POST | `/api/policies` | Existing |
| PUT | `/api/policies/:id` | Existing |
| GET | `/api/policies/:id/sections` | Existing |
| POST | `/api/policies/:id/sections` | Existing |
| PUT | `/api/policies/:id/sections/:sectionId` | Existing |
| DELETE | `/api/policies/:id/sections/:sectionId` | Existing |
| GET | `/api/policies/:policyId/sections/:sectionId/coverages` | Existing |
| GET | `/api/policies/:policyId/sections/:sectionId/participations` | Existing |
| POST | `/api/policies/:policyId/sections/:sectionId/participations` | Existing |
| GET | `/api/policies/:policyId/invoices` | Existing |
| GET | `/api/policies/:policyId/transactions` | Existing |
| GET | `/api/policies/:id/audit` | Existing |
| POST | `/api/policies/:id/audit` | Existing |
| GET | `/api/policies/:id/endorsements` | Existing |
| POST | `/api/policies/:id/endorsements` | Existing |
| PUT | `/api/policies/:id/endorsements/:endorsementId/issue` | Existing |
| GET | `/api/policies/:policyId/locations` | Existing |
| GET | `/api/policies/:id/transactions/:txId/sections/:sectionId` | New — section snapshot for transaction summary view |

### Database Impact
None — all required tables and columns already exist.

---

## 2. Frontend Requirements

### 2.1 PoliciesListPage

**REQ-POL-FE-F-001:** The system shall expose a `PoliciesListPage` component at route `/policies` that calls `GET /api/policies` on mount and renders the result in a `ResizableGrid` with columns: Reference, Insured, Placing Broker, Class of Business, Inception Date, Expiry Date, Status.

**REQ-POL-FE-F-002:** `PoliciesListPage` shall render a `ResizableGrid` row for each policy where the Reference cell is an anchor navigating to `/policies/:id`.

### 2.2 PolicyViewPage — Entry and Loading

**REQ-POL-FE-F-003:** The system shall expose a `PolicyViewPage` component at route `/policies/:id` that calls `GET /api/policies/:id` on mount, renders a loading indicator while the request is in flight, and renders the policy record when the request resolves.

**REQ-POL-FE-F-004:** `PolicyViewPage` shall render a header card displaying: Reference (large text), Insured name (subtitle), a Status badge colour-coded as Active=green / Expired=grey / Cancelled=red. Below the reference row the header shall be split into labelled groups aligned with Quote structure: **Contract & Reference** (Class of Business, Business Type, New or Renewal, Currency, Placing Broker), **Dates** (Inception Date, Inception Time, Expiry Date, Expiry Time, LTA Applicable indicator), **Contract / Placement** (Contract Type, Method of Placement, Unique Market Reference), and **Renewal** (Renewable indicator, Renewal Date, Renewal Status). Group headings shall use the same `text-xs font-semibold text-gray-500 uppercase tracking-wide` style used on the Binding Authority header.

### 2.3 PolicyViewPage — Sidebar

**REQ-POL-FE-F-005:** `PolicyViewPage` shall render a sidebar containing the following action items: Edit (pen icon, `FiEdit2`), Generate Document (`FiFileText`), Endorse (`FiEdit`), and Audit (`FiClock` — scrolls to Audit tab on click).

### 2.4 PolicyViewPage — Tabs

**REQ-POL-FE-F-006:** `PolicyViewPage` shall render a `TabsNav` component with the following tabs in order: Sections, Broker, Additional Insureds, Financial Summary, Invoices, Transactions, Audit.

### 2.5 Sections Tab

**REQ-POL-FE-F-007:** The Sections tab shall display a `ResizableGrid` with the same column structure and ordering used in Quote Sections for shared fields, plus policy navigation semantics: **Action**, Reference, Class of Business, Inception Date, Effective Date, Expiry Date, Days on Cover, Limit Currency, Limit Amount, Limit Loss Qualifier, Excess Currency, Excess Amount, Excess Loss Qualifier, Sum Insured Currency, Sum Insured, Premium Currency, Gross Gross Premium, Gross Premium, Deductions, Net Premium, Tax Receivable, Annual Rated GP, Annual Rated NP, Written Order %, Signed Order %. The Action column shall provide section navigation to `/policies/:policyId/sections/:sectionId`; header labels and widths shall be consistent with Quote table conventions.

### 2.6 PolicySectionViewPage

**REQ-POL-FE-F-008:** The system shall expose a `PolicySectionViewPage` component at route `/policies/:policyId/sections/:sectionId` that fetches the section record on mount and renders it.

**REQ-POL-FE-F-009:** The Broker tab shall display a Placing Broker field with a `BrokerSearch` component and a Surplus Lines Broker field with a `BrokerSearch` component. Saving shall call `PUT /api/policies/:id` with the updated broker fields.

**REQ-POL-FE-F-010:** The Additional Insureds tab shall display a list of additional insured parties with columns: Name, Role. An "Add Insured" action shall open a party search. Each row shall have a delete icon that removes the insured after a confirmation prompt.

**REQ-POL-FE-F-011:** The Financial Summary tab shall display the following read-only `FieldGroup` rows: Gross Premium (from policy record), Net Premium (from policy record), Commission (calculated client-side as Gross Premium minus Net Premium). No input controls shall be rendered in this tab. *(OQ-003 deferred: full financial view calculations pending resolution.)*

**REQ-POL-FE-F-012:** The Invoices tab shall display a `ResizableGrid` loaded from `GET /api/policies/:policyId/invoices` with columns: Invoice Number, Date, Amount, Status, Due Date.

**REQ-POL-FE-F-013:** The Transactions tab shall display a `ResizableGrid` loaded from `GET /api/policies/:policyId/transactions` with the following columns in order: `#` (computed sequential transaction number), `Type` (`transaction_type` with `sub_type` appended when present, e.g. "Contractual - Mid Term Adjustment"), `Effective Date`, `Status` (colour-coded badge: Draft=amber, Endorsed=green, Cancelled=red, all other statuses=grey), `Created By`, `Created Date`, `Description`, `Actions` (header-less icon column).

The Actions column shall render:
- A pencil icon (`FiEdit2`, `aria-label="Edit endorsement"`) navigating to `/policies/:id/endorsements/:transactionId/edit` when the transaction `status` is `Draft` or `Bound` AND `transaction_type` is `Administrative` or `Contractual`.
- A magnifier icon (`FiSearch`, `aria-label="View transaction"`) navigating to `/policies/:id/transactions/:transactionId` for all other status/type combinations.

The transaction list shall be sorted most-recent-first by computed transaction number. Transaction numbers shall be assigned chronologically: the Initial Transaction (lowest id / earliest created_at) receives number 1; subsequent transactions are numbered in ascending order by `created_at`, `effective_date`, `id`.

**REQ-POL-FE-F-014:** `PolicyViewPage` shall POST `{ action: 'Policy Opened', entityType: 'Policy', entityId: id }` to `POST /api/policies/:id/audit` on initial page load (once per mount), then refresh audit rows so the newly created Opened event appears without manual page reload. The Audit tab shall display an `AuditTable` loaded from `GET /api/policies/:id/audit` and shall refresh data when activated.

**REQ-POL-FE-F-015:** `PolicySectionViewPage` shall display a section details header showing: Section Reference, Class of Business, Inception Date, Expiry Date, Limit fields, Excess fields, and Premium fields. These fields shall be read-only when the parent policy status is `Active` and editable when the status is `Draft`.

**REQ-POL-FE-F-016:** `PolicySectionViewPage` shall render a `TabsNav` with tabs: Coverages, Deductions, Risk Codes, Participations, Invoices. Each tab shall display a `ResizableGrid` matching the equivalent QuoteViewPage section tab column structure.

### 2.11 PolicySectionViewPage — Section Header Fields

**REQ-POL-FE-F-032:** The section details header shall display the following fields in `FieldGroup` sections:

| Field | Label | Type | Editable (Draft) |
|-------|-------|------|-------------------|
| reference | Reference | read-only text | No |
| classOfBusiness | Class of Business | select | Yes |
| inceptionDate | Inception Date | date input | Yes |
| inceptionTime | Inception Time | time input | Yes |
| expiryDate | Expiry Date | date input | Yes |
| expiryTime | Expiry Time | time input | Yes |
| timeBasis | Time Basis | select (Local/UTC) | Yes |
| limitCurrency | Limit Currency | select | Yes |
| limitAmount | Limit Amount | number input | Yes |
| limitQualifier | Limit Qualifier | select (Any One/Aggregate) | Yes |
| excessCurrency | Excess Currency | select | Yes |
| excessAmount | Excess Amount | number input | Yes |
| excessQualifier | Excess Qualifier | select | Yes |
| sumInsuredCurrency | Sum Insured Currency | select | Yes |
| sumInsuredAmount | Sum Insured Amount | number input | Yes |
| premiumCurrency | Premium Currency | select | Yes |
| grossGrossPremium | Gross Gross Premium | number input | Yes |
| grossPremium | Gross Premium | number input | Yes |
| basisForOrder | Basis for Order | number input (%) | Yes |
| writtenOrder | Written Order | number input (%) | Yes |
| signedOrder | Signed Order | number input (%) | Yes |
| annualGross | Annual Gross Premium | number (calculated) | No |
| annualNet | Annual Net Premium | number (calculated) | No |

### 2.12 PolicySectionViewPage — Deductions Tab

**REQ-POR-FE-F-033:** The Deductions tab shall display a `ResizableGrid` with columns: Deduction Type, Basis, Rate (%), Amount, Tax Country, Tax State, Tax Type (read-only — auto-resolved from country/state), Override Rate, Override Amount, Party Override. An "Add Deduction" button shall insert a new row. Each row shall have a delete action.

**REQ-POL-FE-F-034:** When Tax Country and Tax State are selected, the system shall look up the applicable tax type and default rate from a tax table. The user may override the rate or amount. The effective deduction amount shall be calculated as `Gross Premium × Rate / 100` unless overridden.

### 2.13 PolicySectionViewPage — Risk Codes Tab

**REQ-POL-FE-F-035:** The Risk Codes tab shall display a `ResizableGrid` with columns: Risk Code (select or manual entry), Description (auto-populated from selected code), Allocation (%). An "Add Risk Code" button shall insert a new row. Each row shall have a delete action. The total Allocation across all rows should be displayed as a footer sum.

### 2.14 PolicySectionViewPage — Movement Indicators

**REQ-POL-FE-F-036:** When viewing a policy that has endorsement transactions, the section header shall display movement delta indicators next to financial fields (Gross Premium, Net Premium, Sum Insured, Written/Signed Order). Each indicator shall show the difference between the current value and the value at the previous transaction baseline. Positive deltas shall display in green; negative in red; zero deltas shall be hidden.

### 2.15 PolicyViewPage — Financial Summary Expanded

**REQ-POL-FE-F-037:** The Financial Summary tab shall display the following `FieldGroup` rows: Gross Premium, Net Premium, Commission (calculated as Gross minus Net), Taxes (read-only, sum of deduction tax amounts), Fees (read-only), Total Due (calculated as Gross Premium minus Commission plus Taxes plus Fees). When no tax or fee data exists, those fields shall display 0.00.

### 2.16 PolicyViewPage — Additional Insureds Expanded

**REQ-POL-FE-F-038:** The Additional Insureds tab shall display a `ResizableGrid` with columns: Name, Relation. An "Add Insured" button shall open an `InsuredSearch` modal. Selecting an insured shall add a row with editable Relation field (defaulting to "Additional Insured"). Each row shall have a delete icon. All changes shall be saved on the sidebar Save action.

### 2.17 PolicyViewPage — Broker Tab Expanded

**REQ-POL-FE-F-039:** The Broker tab shall display: a Placing Broker Name field with `BrokerSearch`, an Insurer field with `InsurerSearch` from the parties domain. Both fields shall be editable. Saving shall call `PUT /api/policies/:id` with updated broker and insurer party IDs.

### 2.18 PolicyViewPage — Policy Details Header Fields

**REQ-POL-FE-F-040:** The `PolicyViewPage` header shall display the following fields in a `FieldGroup` layout:

| Field | Label | Editable |
|-------|-------|----------|
| reference | Reference | No |
| status | Status | Select (Active/Expired/Cancelled) — editable only by admin |
| insured | Insured | No (display name, linked from quote) |
| linkedQuote | Linked Quote | No (reference link to `/quotes/:quoteId`) |
| linkedSubmission | Linked Submission | No (reference link if available) |
| yearOfAccount | Year of Account | Text (editable) |
| inceptionDate | Inception Date | Date input |
| inceptionTime | Inception Time | Time input |
| expiryDate | Expiry Date | Date input |
| expiryTime | Expiry Time | Time input |
| lta | Long Term Agreement | Toggle (Yes/No) |
| ltaExpiryDate | LTA Expiry Date | Date input (visible only when lta=Yes) |

**REQ-POL-FE-F-017:** `PolicyViewPage` shall POST `{ action: 'Policy Closed', entityType: 'Policy', entityId: id }` to `POST /api/policies/:id/audit` in a `useEffect` cleanup function (i.e. when the component unmounts).

### 2.7 Quote-to-Bind: Issue Policy

**REQ-POL-FE-F-018:** `QuoteViewPage` shall display an `Issue Policy` sidebar action item (`FiCheckCircle` icon) when the current quote has status `Bound`. Activating this action shall call `POST /api/policies` with fields derived from the current quote record: `quoteId`, `insured`, `partyIdInsured`, `partyIdPlacingBroker`, `inceptionDate`, `expiryDate`, `grossWrittenPremium`. On a successful `201` response the page shall navigate to `/policies/:id` using the newly created policy's id.

**REQ-POL-FE-F-019:** On successful Issue Policy, `QuoteViewPage` shall display a success notification with the text `Policy {reference} created from Quote {quoteReference}`.

### 2.8 Endorsement Flow

**REQ-POL-FE-F-020:** The system shall expose a `PolicyEndorsePage` component at route `/policies/endorse/:id`. This route shall be declared in the router before the general `/policies/:id` wildcard route to prevent mismatched navigation.

**REQ-POL-FE-F-021:** `PolicyEndorsePage` shall render a form containing: an Endorsement Type dropdown (options: `Mid Term Adjustment`, `Cancellation`), an Effective Date date input (required), and an Endorsement Description textarea (optional). The page shall display the parent policy reference and period as a subtitle.

**REQ-POL-FE-F-022:** When the sidebar `Save` action is activated on `PolicyEndorsePage`, the page shall validate all of the following before making any API call: (a) Effective Date is non-empty; (b) Effective Date falls on or between the policy's `inceptionDate` and `expiryDate`; (c) no existing endorsement transaction has a status other than `Endorsed`. If any condition fails, an error notification shall be shown and no API call shall be made.

**REQ-POL-FE-F-023:** When all validations in REQ-POL-FE-F-022 pass, `PolicyEndorsePage` sidebar Save shall call `POST /api/policies/:id/endorsements` with `{ type, effectiveDate, description }` and on success shall navigate to `/policies/:id/endorsements/:endorsementId/edit` using the newly created endorsement id.

**REQ-POL-FE-F-024:** `PolicyEndorsePage` shall implement dirty tracking: if the user has entered any form value that differs from the initial state, navigating away using the browser back button shall trigger a warning notification with a `Discard` action button. Confirming Discard shall allow navigation; dismissing shall keep the user on the current page.

**REQ-POL-FE-F-025:** The system shall expose a `PolicyEndorsementPage` component at route `/policies/:id/endorsements/:endorsementId/edit`. On mount it shall fetch the policy by `id` via `GET /api/policies/:id` and the endorsement transaction via `GET /api/policies/:id/endorsements`. If the policy is not found it shall render an error message; if the endorsement is not found it shall render an error message; it shall not throw an uncaught exception in either case.

**REQ-POL-FE-F-026:** `PolicyEndorsementPage` shall render the full policy detail view in editable mode, pre-populated with the current policy and endorsement field values. The page header shall display the endorsement transaction type, sub-type (if present), and effective date as a subtitle, and shall expose the same policy summary groups used on `PolicyViewPage` (`Contract & Reference`, `Dates`, `Contract / Placement`, `Renewal`) using available policy fields. The tab strip shall contain the following seven tabs in order: **Sections**, **Broker**, **Additional Insureds**, **Financial Summary**, **Invoices**, **Endorsement**, **Audit**. The **Transactions** tab shall **not** appear on this page (matches the BA endorsement pattern — a mid-term adjustment edits the living policy record, it does not browse historical transactions). The **Sections** tab shall expose an add action in the table header (`FiPlus`, title `Add Section`) that creates a section via `POST /api/policies/:id/sections`, refreshes the sections grid, and displays an error notification on failure. The **Endorsement** tab shall contain an Effective Date date input and a Description textarea, both pre-populated from the loaded endorsement record and editable. The **Invoices** tab shall display a placeholder message `"Invoices will be available here."` until the invoices implementation is complete. The **Audit** tab shall load `GET /api/policies/:id/audit` and POST `Policy Opened` on first activation. On component unmount, the page shall POST `Policy Closed` to keep recent activity in sync.

**REQ-POL-FE-F-027:** The sidebar on `PolicyEndorsementPage` shall display an `Issue Endorsement` action (`FiCheckCircle` icon). Activating this action shall call `PUT /api/policies/:id/endorsements/:endorsementId/issue`. On a successful response: the page shall display a success notification; if the endorsement type is `Cancellation` the policy status in the UI shall update to `Cancelled`; otherwise the policy status shall update to `Active`. The page shall then navigate to `/policies/:id`.

**REQ-POL-FE-F-028:** `PolicyEndorsementPage` shall implement dirty tracking equivalent to REQ-POL-FE-F-024: a navigation guard with a `Discard` warning notification is shown when the user navigates away with unsaved policy field changes.

### 2.9 PolicyCoverageDetailPage

**REQ-POL-FE-F-029:** The system shall expose a `PolicyCoverageDetailPage` component at route `/policies/:policyId/sections/:sectionId/coverages/:coverageId`. On mount it shall load: the policy via `GET /api/policies/:policyId`; the section list via `GET /api/policies/:policyId/sections` (finding the matching sectionId); the coverage list via `GET /api/policies/:policyId/sections/:sectionId/coverages` (finding the matching coverageId); and the location schedule via `GET /api/policies/:policyId/locations`. While loading, a loading indicator shall be rendered. If the coverage is not found, the component shall render a `text-red-600` error message `"Coverage not found"`; it shall not throw an uncaught exception.

**REQ-POL-FE-F-030:** `PolicyCoverageDetailPage` shall render a read-only header using `FieldGroup` components displaying: Coverage Reference, Insured (from policy), Coverage name, Sum Insured Currency, Sum Insured Amount, Effective Date, Expiry Date. Below the header a `TabsNav` with a single tab `{ key: 'subdetails', label: 'Coverage Sub-Details' }` shall be rendered.

The Sub-Details tab shall display an `app-table` table with columns: Coverage Detail, Coverage Sub-Details, Number of Locations, Sum Insured. Rows shall be grouped from the location schedule by `CoverageType`, filtered to rows where `CoverageType` is non-empty and `Currency` matches the section's `sumInsuredCurrency` (defaulting to `"GBP"`). Rows shall be sorted alphabetically by Coverage Detail. Each Coverage Detail row shall be clickable, navigating to `/policies/:policyId/sections/:sectionId/coverages/:coverageId/details/:detailName` (where `detailName` is URL-encoded). A totals `<tfoot>` row shall display the aggregate Sum Insured across all groups. When no rows are present, a full-colspan empty state `"No coverage details found."` shall be rendered.

### 2.10 PolicyCoverageSubDetailPage

**REQ-POL-FE-F-031:** The system shall expose a `PolicyCoverageSubDetailPage` component at route `/policies/:policyId/sections/:sectionId/coverages/:coverageId/details/:detailName`. On mount it shall load the same policy, section, and coverage data as REQ-POL-FE-F-029, then filter the location schedule to rows where `CoverageType` matches `decodeURIComponent(detailName)` and `Currency` matches the section's `sumInsuredCurrency`. If the coverage is not found, the component shall render a `text-red-600` error message; it shall not throw.

The component shall render a read-only `FieldGroup` header with: Policy Reference, Section Reference, Class of Business, Coverage name, Coverage Detail (decoded `detailName`), Sum Insured Currency. Below the header, a `TabsNav` with a single tab `{ key: 'locations', label: 'Locations' }` shall be rendered.

The Locations tab shall display an `app-table` with columns: Coverage Sub-Detail, Number of Locations, Sum Insured. Rows shall be grouped by `CoverageSubType` (falling back to `"No Sub-Detail"` when absent), sorted alphabetically with `"No Sub-Detail"` always last. A totals `<tfoot>` row shall display the aggregate Sum Insured. An empty state `"No locations found."` shall be rendered when no rows match.

### 2.19 PolicyTransactionViewPage

**REQ-POL-FE-F-041:** The system shall expose a `PolicyTransactionViewPage` component at route `/policies/:id/transactions/:transactionId`. On mount it shall fetch in parallel: the policy via `GET /api/policies/:id`; the policy sections list via `GET /api/policies/:id/sections`; and all policy transactions via `GET /api/policies/:id/transactions`. While loading, a loading indicator shall be rendered. If the transaction matching `:transactionId` is not found in the transactions list, the component shall render a `text-red-600` error message `"Transaction not found"`; it shall not throw an uncaught exception.

**REQ-POL-FE-F-042:** `PolicyTransactionViewPage` shall render a read-only three-column `FieldGroup` header comprising:
- **Policy Summary:** Reference, Insured, Class of Business, Placing Broker
- **Dates:** Inception Date, Expiry Date, Effective Date (from the transaction record)
- **Transaction Details:** Transaction Number (sequential, computed by `buildTransactionNumberMap`), Type (with `sub_type` appended if present, e.g. "Contractual - Mid Term Adjustment"), Status (coloured badge), Description

The page `h2` heading shall display `Transaction {number}: {transaction_type}` (with `sub_type` appended when present).

**REQ-POL-FE-F-043:** Below the header, `PolicyTransactionViewPage` shall render a `ResizableGrid` with one row per policy section. For each section it shall call `GET /api/policies/:id/transactions/:transactionId/sections/:sectionId` and use the `current` object in the response as the snapshot values for that row. Where a snapshot value is available it shall take precedence over the live section value; live section values shall be used as fallback when no snapshot is available. The columns displayed shall match the Sections tab columns on `PolicyViewPage`: reference, class of business, inception/expiry dates, limit currency/amount/qualifier, excess currency/amount/qualifier, sum insured currency/amount, premium currency, gross gross premium, gross premium, written order, signed order.

**REQ-POL-FE-F-044:** The sidebar on `PolicyTransactionViewPage` shall display exactly one action: `Back to Policy` (`FiArrowLeft` icon) navigating to `/policies/:id`. No write, issue, or endorse actions shall appear on this page.

---

## 3. Service Layer Requirements

**REQ-POL-FE-S-001:** A `policies.service.ts` file shall exist at `frontend/src/policies/policies.service.ts` and shall export the following functions, each calling the corresponding API endpoint via the `api-client` module: `getPolicies()`, `getPolicy(id)`, `createPolicy(data)`, `updatePolicy(id, data)`, `getPolicySections(policyId)`, `createPolicySection(policyId, input)`, `getPolicySectionDetails(policyId, sectionId)`, `getPolicyInvoices(policyId)`, `getPolicyTransactions(policyId)`, `getPolicyAudit(policyId)`, `postPolicyAudit(policyId, event)`, `getPolicyEndorsements(policyId)`, `createEndorsement(policyId, data)`, `issueEndorsement(policyId, endorsementId)`, `getPolicyCoverages(policyId, sectionId)`, `getPolicyLocations(policyId)`, `getPolicySectionTransaction(policyId, transactionId, sectionId)`.

---

## 4. Backend Requirements

### 4.1 Module Setup

**REQ-POL-BE-F-001:** A NestJS module shall be created at `backend/nest/src/policies/` containing: `policies.module.ts`, `policies.controller.ts`, `policies.service.ts`. The module shall be registered in `app.module.ts`.

### 4.2 List and Detail Endpoints

**REQ-POL-BE-F-002:** `PoliciesController` shall expose `GET /api/policies` (JWT-guarded, orgCode-scoped) returning `{ data: Policy[] }` with fields: id, reference, insured, insured_id, placing_broker, class_of_business, inception_date, expiry_date, status, tenant_id.

**REQ-POL-BE-F-003:** `PoliciesController` shall expose `GET /api/policies/:id` (JWT-guarded, orgCode-scoped) returning `{ data: Policy }` with all policy fields. It shall return `HTTP 404` when no row matches id + orgCode.

### 4.3 Create and Update Endpoints

**REQ-POL-BE-F-004:** `PoliciesController` shall expose `POST /api/policies` (JWT-guarded) accepting `{ submission_id?, quote_id?, insured, inception_date, expiry_date, class_of_business, placing_broker?, gross_premium?, net_premium? }` and returning `HTTP 201 { data: Policy }`. When no `reference` is provided, the endpoint shall auto-assign a reference using the pattern `POL-{id}`.

**REQ-POL-BE-F-005:** `PoliciesController` shall expose `PUT /api/policies/:id` (JWT-guarded, orgCode-scoped) accepting any subset of editable policy fields and returning `{ data: Policy }`. It shall return `HTTP 404` when no row matches id + orgCode.

**REQ-POL-BE-F-012:** When `quote_id` is provided to `POST /api/policies`, `PoliciesController` shall: (a) copy the `quote_currency` field from the referenced quote row to the new policy's `policy_currency` field; (b) update all `location_schedule` rows where `quote_id` matches and `policy_id IS NULL` to set `policy_id = <new policy id>` and `is_bound = TRUE`. Failure of either step shall not cause the policy creation response to fail.

### 4.4 Sections CRUD

**REQ-POL-BE-F-006:** `PoliciesController` shall expose: `GET /api/policies/:id/sections` returning `{ data: PolicySection[] }`; `POST /api/policies/:id/sections` returning `HTTP 201 { data: PolicySection }`; `PUT /api/policies/:id/sections/:sectionId` returning `{ data: PolicySection }`; `DELETE /api/policies/:id/sections/:sectionId` returning `HTTP 204`. All endpoints shall be JWT-guarded and orgCode-scoped.

### 4.5 Section Sub-Resources

**REQ-POL-BE-F-007:** `PoliciesController` shall expose coverages CRUD per section: `GET /api/policies/:policyId/sections/:sectionId/coverages`, `POST /api/policies/:policyId/sections/:sectionId/coverages`, `PUT /api/policies/:policyId/sections/:sectionId/coverages/:coverageId`, `DELETE /api/policies/:policyId/sections/:sectionId/coverages/:coverageId`. All endpoints shall be JWT-guarded.

### 4.6 Audit Endpoints

**REQ-POL-BE-F-008:** `PoliciesController` shall expose `GET /api/policies/:id/audit` returning `{ data: AuditEvent[] }` ordered by `created_at DESC`, and `POST /api/policies/:id/audit` (JWT-guarded) accepting `{ action, entityType, entityId, details? }` and delegating to `AuditService.writeEvent`.

### 4.7 Invoices and Transactions

**REQ-POL-BE-F-009:** `PoliciesController` shall expose `GET /api/policies/:policyId/invoices` returning `{ data: Invoice[] }` for invoices associated with the policy.

**REQ-POL-BE-F-010:** `PoliciesController` shall expose `GET /api/policies/:policyId/transactions` returning `{ data: PolicyTransaction[] }` for transactions associated with the policy, ordered by `effective_date ASC`, with a sequential `number` field assigned chronologically.

### 4.8 Participations

**REQ-POL-BE-F-011:** `PoliciesController` shall expose `GET /api/policies/:policyId/sections/:sectionId/participations` returning `{ data: Participation[] }` and `POST /api/policies/:policyId/sections/:sectionId/participations` accepting a participation record and returning `HTTP 201 { data: Participation }`. Both endpoints shall be JWT-guarded.

### 4.9 Endorsement Endpoints

**REQ-POL-BE-F-013:** `PoliciesController` shall expose `GET /api/policies/:id/endorsements` (JWT-guarded, orgCode-scoped) returning `{ data: PolicyTransaction[] }` — all rows in `policy_transactions` where `policy_id` matches and `transaction_type` is `Endorsement` or `Cancellation`, ordered by `effective_date ASC`.

**REQ-POL-BE-F-014:** `PoliciesController` shall expose `POST /api/policies/:id/endorsements` (JWT-guarded) accepting `{ type: 'Endorsement'|'Cancellation', effectiveDate, description? }` and inserting a row in `policy_transactions` with `status = 'Endorsement Created'`. It shall return `HTTP 201 { data: PolicyTransaction }`.

**REQ-POL-BE-F-015:** `PoliciesController` shall expose `PUT /api/policies/:id/endorsements/:endorsementId/issue` (JWT-guarded) which shall: update the endorsement `policy_transactions` row `status` to `Endorsed`; update the parent policy `status` to `Cancelled` if `transaction_type = 'Cancellation'`, or to `Active` otherwise. It shall return `{ data: { policy, endorsement } }`. It shall return `HTTP 404` if the endorsement does not exist or belongs to a different policy.

**REQ-POL-BE-F-016:** `PoliciesController` shall expose `GET /api/policies/:id/transactions/:txId/sections/:sectionId` (JWT-guarded, orgCode-scoped) returning `{ data: { current: PolicySection, previous: PolicySection | null, movements: Record<string, number> } }`. The `current` object shall contain the policy section field values snapshotted at the time of transaction `txId`. The `previous` object shall contain the equivalent snapshot from the directly preceding transaction, or `null` if `txId` is the first transaction. The `movements` object shall contain the numeric delta between `current` and `previous` for each applicable financial field. It shall return `HTTP 404` if the section or transaction does not exist or belongs to a different policy.

---

## 4. Coverage Date/Time Delta Requirements (Policy + Policy Detail)

1. **REQ-POL-FE-F-050:** Policy sections and policy coverage detail views shall display `Effective Date`, `Effective Time`, `Expiry Date`, and `Expiry Time` fields with the same labels and formats used on quote coverage surfaces. Acceptance criteria: all four fields are rendered in both policy grid/list and policy detail views when data is available.
2. **REQ-POL-FE-F-051:** UI defaults shall be applied for new policy coverage and policy coverage-detail entries when values are missing: effective date from parent level, expiry date from parent inception plus one year where parent expiry is missing, effective time default `00:00:00` unless parent-level value exists, and expiry time default `23:59:59` unless overridden. Acceptance criteria: creating a new row without manual date/time input pre-populates all four values according to precedence.
3. **REQ-POL-FE-F-052:** Grid and detail surfaces shall stay aligned by reusing canonical API values; edits saved from either surface shall appear identically on the other surface after refresh. Acceptance criteria: edit-on-grid then open-detail shows matching values, and edit-on-detail then open-grid shows matching values.
4. **REQ-POL-FE-F-053:** `policies.service.ts` and page DTO mappings shall accept optional coverage and coverage-detail date/time fields (`effectiveDate`, `effectiveTime`, `expiryDate`, `expiryTime`) and shall not fail when legacy API responses omit those fields. Acceptance criteria: TypeScript types compile and policy pages render legacy records with missing fields without runtime exceptions.
5. **REQ-POL-FE-F-054:** Quote-to-policy issue behavior shall preserve quote coverage and coverage-detail date/time values in the first policy render; frontend formatting shall not alter server-provided persisted values. Acceptance criteria: immediately after issuing a policy from quote, displayed non-null date/time values match quote source values.
6. **REQ-POL-FE-F-055:** Non-functional constraints shall include tenant-safe rendering, compatibility-window support for mixed old/new payload shapes, and rollback-safe fallbacks for absent fields. Acceptance criteria: tenant data boundaries remain unchanged in UI behavior and rollback/missing-field scenarios show defaults or blank-safe rendering instead of crashes.

---

## 5. Router Requirements

**REQ-POL-FE-C-001:** The application router shall register `PoliciesListPage` at path `/policies`, `PolicyViewPage` at path `/policies/:id`, and `PolicySectionViewPage` at path `/policies/:policyId/sections/:sectionId`. The `/policies/:id` route shall be matched only after `/policies/new` when a new-policy creation form is added in a future batch.

**REQ-POL-FE-C-002:** The application router shall register `PolicyEndorsePage` at path `/policies/endorse/:id` and `PolicyEndorsementPage` at path `/policies/:id/endorsements/:endorsementId/edit`. Both routes shall be declared before the general `/policies/:id` route to prevent the wildcard segment from matching endorsement paths.

**REQ-POL-FE-C-003:** The application router shall register `PolicyCoverageDetailPage` at path `/policies/:policyId/sections/:sectionId/coverages/:coverageId` and `PolicyCoverageSubDetailPage` at path `/policies/:policyId/sections/:sectionId/coverages/:coverageId/details/:detailName`. Both routes shall be declared after `/policies/:policyId/sections/:sectionId`.

**REQ-POL-FE-C-004:** The application router shall register `PolicyTransactionViewPage` at path `/policies/:id/transactions/:transactionId`. This route shall be declared after the endorsement routes and after the coverage detail routes, but still within the authenticated layout, ensuring the `:transactionId` segment is not captured by the general `/policies/:id` wildcard.

---

## 6. Traceability

| Requirement ID | Description | Test ID |
|----------------|-------------|---------|
| REQ-POL-FE-F-001 | PoliciesListPage at `/policies`, GET on mount, ResizableGrid | T-POL-FE-F-R001 |
| REQ-POL-FE-F-002 | Reference cell links to `/policies/:id` | T-POL-FE-F-R002 |
| REQ-POL-FE-F-003 | PolicyViewPage at `/policies/:id`, loading state | T-POL-FE-F-R003 |
| REQ-POL-FE-F-004 | Header: Reference, Status badge, Insured; Quote-aligned groups: Contract & Reference, Dates, Contract / Placement, Renewal | T-POL-FE-F-R004, T-POL-FE-F-R004e |
| REQ-POL-FE-F-005 | Sidebar: Edit, Generate Document, Endorse, Audit | T-POL-FE-F-R005 |
| REQ-POL-FE-F-006 | TabsNav with 7 tabs in order | T-POL-FE-F-R006 |
| REQ-POL-FE-F-007 | Sections tab ResizableGrid quote-parity columns/order including Action, Effective Date, Days on Cover, Tax Receivable | T-POL-FE-F-R007 |
| REQ-POL-FE-F-008 | PolicySectionViewPage at `/policies/:policyId/sections/:sectionId` | T-POL-FE-F-R008 |
| REQ-POL-FE-F-009 | Broker tab: BrokerSearch fields, PUT on save | T-POL-FE-F-R009 |
| REQ-POL-FE-F-010 | Additional Insureds tab: list, add, delete with confirmation | T-POL-FE-F-R010 |
| REQ-POL-FE-F-011 | Financial Summary: Gross, Net, Commission=Gross-Net, read-only | T-POL-FE-F-R011 |
| REQ-POL-FE-F-012 | Invoices tab ResizableGrid from GET invoices | T-POL-FE-F-R012 |
| REQ-POL-FE-F-013 | Transactions tab: sequential #, type+sub_type, status badge, Created By/Date, action routing (edit vs view) | T-POL-FE-F-R013, T-POL-FE-F-R013b |
| REQ-POL-FE-F-014 | Policy Opened POST on page mount + audit refresh; Audit tab displays/refreshes history | T-POL-FE-F-R014, T-POL-FE-F-R014b |
| REQ-POL-FE-F-015 | Section details header, editable for Draft / read-only for Active | T-POL-FE-F-R015 |
| REQ-POL-FE-F-016 | PolicySectionViewPage TabsNav: Coverages, Deductions, Participations | T-POL-FE-F-R016 |
| REQ-POL-FE-F-017 | Policy Closed POST on unmount (useEffect cleanup) | T-POL-FE-F-R017 |
| REQ-POL-FE-F-018 | QuoteViewPage Issue Policy action when quote status = Bound | T-POL-FE-F-R018 |
| REQ-POL-FE-F-019 | Issue Policy success notification with reference | T-POL-FE-F-R019 |
| REQ-POL-FE-F-020 | PolicyEndorsePage at `/policies/endorse/:id` | T-POL-FE-F-R020 |
| REQ-POL-FE-F-021 | Endorsement form: type dropdown, effective date, description | T-POL-FE-F-R021 |
| REQ-POL-FE-F-022 | Endorsement Save validation: date required, within period, no open endorsement | T-POL-FE-F-R022 |
| REQ-POL-FE-F-023 | Endorsement Save calls POST and navigates to edit page | T-POL-FE-F-R023 |
| REQ-POL-FE-F-024 | PolicyEndorsePage dirty-tracking navigation guard | T-POL-FE-F-R024 |
| REQ-POL-FE-F-025 | PolicyEndorsementPage at endorsement edit route, loads policy + endorsement | T-POL-FE-F-R025 |
| REQ-POL-FE-F-026 | PolicyEndorsementPage: 7 tabs (no Transactions), policy summary parity groups, Sections add action, Endorsement fields, Invoices placeholder, audit open/close lifecycle | T-POL-FE-F-R026, T-POL-FE-F-R026a, T-POL-FE-F-R026d, T-POL-FE-F-R026e |
| REQ-POL-FE-F-027 | Issue Endorsement calls PUT issue, updates status, navigates | T-POL-FE-F-R027 |
| REQ-POL-FE-F-028 | PolicyEndorsementPage dirty-tracking navigation guard | T-POL-FE-F-R028 |
| REQ-POL-FE-S-001 | policies.service.ts exports all API functions incl. createPolicySection, endorsement functions, and getPolicySectionTransaction | T-POL-FE-S-R001 |
| REQ-POL-BE-F-001 | NestJS module created, registered in app.module.ts | T-POL-BE-R001 |
| REQ-POL-BE-F-002 | GET /api/policies returns scoped Policy[] | T-POL-BE-R002 |
| REQ-POL-BE-F-003 | GET /api/policies/:id returns Policy or 404 | T-POL-BE-R003 |
| REQ-POL-BE-F-004 | POST /api/policies returns 201 Policy, auto-ref POL-{id} | T-POL-BE-R004 |
| REQ-POL-BE-F-005 | PUT /api/policies/:id returns Policy or 404 | T-POL-BE-R005 |
| REQ-POL-BE-F-006 | Sections CRUD endpoints | T-POL-BE-R006 |
| REQ-POL-BE-F-007 | Coverages CRUD endpoints | T-POL-BE-R007 |
| REQ-POL-BE-F-008 | GET + POST /api/policies/:id/audit | T-POL-BE-R008 |
| REQ-POL-BE-F-009 | GET /api/policies/:policyId/invoices | T-POL-BE-R009 |
| REQ-POL-BE-F-010 | GET /api/policies/:policyId/transactions with sequential numbers | T-POL-BE-R010 |
| REQ-POL-BE-F-011 | Participations GET + POST | T-POL-BE-R011 |
| REQ-POL-BE-F-012 | POST /api/policies with quoteId: copy currency + bind location_schedule | T-POL-BE-R012 |
| REQ-POL-BE-F-013 | GET /api/policies/:id/endorsements | T-POL-BE-R013 |
| REQ-POL-BE-F-014 | POST /api/policies/:id/endorsements returns 201 Endorsement Created | T-POL-BE-R014 |
| REQ-POL-BE-F-015 | PUT /api/policies/:id/endorsements/:id/issue updates status + policy | T-POL-BE-R015 |
| REQ-POL-FE-C-001 | Router: /policies, /policies/:id, /policies/:policyId/sections/:sectionId | T-POL-FE-C-R001 |
| REQ-POL-FE-C-002 | Router: endorsement routes declared before /policies/:id wildcard | T-POL-FE-C-R002 |
| REQ-POL-FE-F-029 | PolicyCoverageDetailPage at coverage route, loads policy/section/coverage/locations | T-POL-FE-F-R029 |
| REQ-POL-FE-F-030 | CoverageDetailPage header + Sub-Details tab grouped by CoverageType, clickable rows | T-POL-FE-F-R030 |
| REQ-POL-FE-F-031 | PolicyCoverageSubDetailPage at detail route, grouped by CoverageSubType, Locations tab | T-POL-FE-F-R031 |
| REQ-POL-FE-F-032 | Section header: 22 editable fields (dates, times, currency triads, orders) | T-POL-FE-F-R032 |
| REQ-POL-FE-F-033 | Deductions tab: type, basis, rate, amount, tax country/state, overrides | T-POL-FE-F-R033 |
| REQ-POL-FE-F-034 | Deduction tax lookup and rate calculation | T-POL-FE-F-R034 |
| REQ-POL-FE-F-035 | Risk Codes tab: code select, description, allocation % | T-POL-FE-F-R035 |
| REQ-POL-FE-F-036 | Movement delta indicators on section header financial fields | T-POL-FE-F-R036 |
| REQ-POL-FE-F-037 | Financial Summary expanded: Gross, Net, Commission, Taxes, Fees, Total Due | T-POL-FE-F-R037 |
| REQ-POL-FE-F-038 | Additional Insureds: Name+Relation columns, InsuredSearch add, delete, save | T-POL-FE-F-R038 |
| REQ-POL-FE-F-039 | Broker tab: BrokerSearch + InsurerSearch fields | T-POL-FE-F-R039 |
| REQ-POL-FE-F-040 | Policy header: ref, status, insured, linked quote/sub, YoA, dates+times, LTA | T-POL-FE-F-R040 |
| REQ-POL-FE-C-003 | Router: coverage detail routes registered after sections route | T-POL-FE-C-R003 |
| REQ-POL-FE-F-041 | PolicyTransactionViewPage at transaction route, loads policy/sections/transactions in parallel, not-found error | T-POL-FE-F-R026b, T-POL-FE-F-R026c |
| REQ-POL-FE-F-042 | Transaction view: 3-column summary header, h2 heading | T-POL-FE-F-R026b |
| REQ-POL-FE-F-043 | Transaction view: section snapshot grid via getSectionTransaction endpoint | T-POL-FE-F-R026b |
| REQ-POL-FE-F-044 | Transaction view sidebar: Back to Policy only | (visual — no dedicated test) |
| REQ-POL-BE-F-016 | GET /api/policies/:id/transactions/:txId/sections/:sectionId returns snapshot | (Layer 2 deferred) |
| REQ-POL-FE-C-004 | Router: PolicyTransactionViewPage route registered | (implied by T-POL-FE-F-R026b route render) |
| REQ-POL-FE-F-045 | PolicyEndorsementPage posts 'Endorsement Opened' audit event on mount (entityType: 'PolicyEndorsement', entityId: endorsementId) | T-POL-ENDORSE-R045 |
| REQ-POL-FE-F-046 | PolicyEndorsementPage posts 'Endorsement Closed' audit event on unmount | (deferred — unmount test has race conditions) |
| REQ-POL-FE-F-047 | PolicyEndorsementPage Audit tab fetches events from GET /api/audit/PolicyEndorsement/:endorsementId | T-POL-ENDORSE-R047 |
| REQ-POL-FE-F-048 | PolicyEndorsementPage handleIssue posts 'Endorsement Issued' to /api/audit/event after successful issue | T-POL-ENDORSE-R048 |
| REQ-POL-FE-F-049 | If endorsement.transaction_type === 'Cancellation', handleIssue also cross-posts 'Policy Cancelled' to policy audit | T-POL-ENDORSE-R049 |
| REQ-POL-FE-F-050 | Policy coverage surfaces render Effective/Expiry date+time fields with quote parity labels | pending — Stage coverage-datetime |
| REQ-POL-FE-F-051 | Policy coverage defaults applied from parent precedence with 00:00:00/23:59:59 fallbacks | pending — Stage coverage-datetime |
| REQ-POL-FE-F-052 | Grid/detail alignment for policy coverage date/time values | pending — Stage coverage-datetime |
| REQ-POL-FE-F-053 | policies.service.ts DTO compatibility for optional date/time fields | pending — Stage coverage-datetime |
| REQ-POL-FE-F-054 | Issue-to-policy first render preserves quote date/time values | pending — Stage coverage-datetime |
| REQ-POL-FE-F-055 | Tenant-safe, compatibility-window, rollback-safe frontend behavior | pending — Stage coverage-datetime |

---

## 7. Open Questions

**OQ-003 (Open):** Financial view calculations ownership (Whole/Market/Line premium views). Commission = Gross minus Net is confirmed for MVP. Full resolution required before multi-line financial views can be implemented.

---

## 8. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Stub created |
| 2026-04-04 | Full Batch D requirements written. PolicySectionViewPage included. OQ-003 simplified to Commission = Gross minus Net. |
| 2026-04-04 | Added Quote-to-Bind (REQ-POL-FE-F-018/019, REQ-POL-BE-F-012) and Endorsement Flow (REQ-POL-FE-F-020-028, REQ-POL-BE-F-013-015, REQ-POL-FE-C-002) based on backup analysis. Scope updated. |
| 2026-04-04 | Added PolicyCoverageDetailPage (REQ-POL-FE-F-029, F-030) and PolicyCoverageSubDetailPage (REQ-POL-FE-F-031, REQ-POL-FE-C-003). Service updated with getPolicyCoverages() and getPolicyLocations(). Scope updated. Location schedule uses GET /api/policies/:policyId/locations. |
| 2026-04-05 | Gap-closing update: added Impact Analysis section. Added section header field-level detail (F-032), deductions tab with tax calc (F-033, F-034), risk codes tab (F-035), movement indicators (F-036), expanded financial summary (F-037), expanded additional insureds (F-038), expanded broker tab with InsurerSearch (F-039), policy header field detail (F-040). Updated PolicySectionViewPage tabs from 3 to 5 (added Risk Codes, Invoices). |
| 2026-04-29 | REQ-POL-FE-F-004 updated — header restructured with Contract & Reference / Dates column headings (aligned with BA). REQ-POL-FE-F-026 rewritten — PolicyEndorsementPage now renders full 7-tab layout (Sections, Broker, Additional Insureds, Financial Summary, Invoices placeholder, Endorsement, Audit); Transactions tab excluded per BA endorsement pattern. REQ-QUO-FE-F-035/036/037 rename "Quote & Referencing" → "Contract & Reference" (cross-domain in quotes.requirements.md). |
| 2026-04-29 | Quote parity update: REQ-POL-FE-F-004 expanded to include Contract / Placement and Renewal fields (plus times/LTA indicator) in Policy header. Endorsement parity update: REQ-POL-FE-F-026 expanded with Sections add action (`FiPlus` -> `POST /api/policies/:id/sections`) and endorsement audit lifecycle (`Policy Opened` on first Audit activation, `Policy Closed` on unmount). REQ-POL-FE-S-001 expanded with `createPolicySection(policyId, input)`. |
| 2026-04-29 | Parity refinement: REQ-POL-FE-F-007 updated to enforce Quote-aligned section table column order/labels (including Effective Date, Days on Cover, Tax Receivable, Action). REQ-POL-FE-F-014 updated to require immediate audit refresh after posting `Policy Opened` so the entry is visible in the active tab. |
| 2026-04-29 | Audit lifecycle refinement: REQ-POL-FE-F-014 moved `Policy Opened` audit post to page mount so open/close events are paired even when users never click the Audit tab. Audit tab remains read/display with refresh on activation. |
| 2026-04-29 | BA-style policy transaction UX: rewrote REQ-POL-FE-F-013 (transaction tab columns, status badge, action routing); added REQ-POL-FE-F-041–044 (PolicyTransactionViewPage); updated REQ-POL-FE-S-001 (added getPolicySectionTransaction); added REQ-POL-BE-F-016 (section snapshot endpoint); added REQ-POL-FE-C-004 (router entry). Updated scope, Impact Analysis, and traceability table. Entry backfilled to comply with Three-Artifact Rule — code was written before requirements in error. |
| 2026-05-01 | Endorsement audit coverage: added REQ-POL-FE-F-045–049. PolicyEndorsementPage now posts Endorsement Opened/Closed/Issued audit events and cross-posts Policy Cancelled when a cancellation endorsement is issued. Audit tab fetches from GET /api/audit/PolicyEndorsement/:endorsementId. Backend VALID_ENTITY_TYPES updated to include 'PolicyEndorsement'. |
| 2026-07-10 | Coverage date/time delta added: REQ-POL-FE-F-050–055 for policy coverage and coverage-detail field visibility, defaults, grid/detail alignment, service DTO compatibility, issue-flow parity, and non-functional compatibility constraints. |
