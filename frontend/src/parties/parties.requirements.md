# REQUIREMENTS — Parties Domain

**Domain Code:** `PAR-DOM`  
**Location:** `frontend/src/parties/`  
**Status:** In progress  
**Standard:** Written per [Guideline 13](../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `Party`, `CreatePartyInput`, `PartyEntity` TypeScript type definitions
- Service layer: `listParties`, `getParty`, `createParty`, `updateParty`, entity CRUD, audit, related records
- `PartyViewPage` with 7 tabs: Details, Entities, Audit, Submissions, Quotes, Policies, Claims
- `InsurerSearch` — search modal for insurer-type parties
- `CoverholderSearch` — search modal for coverholder-type parties
- Dirty state tracking and unsaved-changes guard

**Out of scope:**
- `PartyListPage` — covered by `PartyListPage/requirements.md`
- `CreatePartyPage` — covered by `CreatePartyPage/requirements.md`
- `BrokerSearch` — covered by `BrokerSearch/requirements.md`
- `InsuredSearch` — covered by `InsuredSearch/requirements.md`
- Party deletion (future)
- Permission checks (handled by the backend)
- Role-based field visibility (belongs to the settings domain)

---

## Impact Analysis

### UI / Front-End Impact
- `frontend/src/parties/PartyViewPage/PartyViewPage.tsx` — view/edit page: header card, 7 tabs, sidebar, edit mode with dirty tracking
- `frontend/src/parties/InsurerSearch/InsurerSearch.tsx` — new search modal (same pattern as BrokerSearch)
- `frontend/src/parties/CoverholderSearch/CoverholderSearch.tsx` — new search modal (same pattern as BrokerSearch)
- `frontend/src/parties/parties.service.ts` — add `getParty`, `getPartyPolicies`; no removals

### API Impact
| Method | Path | Change |
|--------|------|--------|
| GET | `/api/parties` | Existing — no change |
| GET | `/api/parties/:id` | Existing — consumed by `getParty` |
| POST | `/api/parties` | Existing — no change |
| PUT | `/api/parties/:id` | Existing — no change |
| GET | `/api/parties/:id/entities` | Existing — no change |
| POST | `/api/parties/:id/entities` | Existing — no change |
| PUT | `/api/parties/:id/entities/:entityId` | Existing — no change |
| DELETE | `/api/parties/:id/entities/:entityId` | Existing — no change |
| GET | `/api/parties/:id/audit` | Existing — no change |
| POST | `/api/parties/:id/audit` | Existing — no change |
| GET | `/api/parties/:id/submissions` | Existing — no change |
| GET | `/api/parties/:id/quotes` | Existing — no change |
| GET | `/api/parties/:id/policies` | Existing — no change |

### Database Impact
None — all required tables and columns already exist.

---

## 2. Requirements

### 2.1 Type definitions

**REQ-PAR-DOM-F-001:** The domain shall export a `Party` TypeScript interface with the mandatory fields `id` (number), `name` (string), `type` (string), and `orgCode` (string), and the following optional fields: `email` (string), `phone` (string), `addressLine1` (string), `addressLine2` (string), `addressLine3` (string), `city` (string), `state` (string), `postcode` (string), `country` (string), `region` (string), `wageRoll` (number), `numberEmployees` (number), `annualRevenue` (number), `sicStandard` (string), `sicCode` (string), `sicDescription` (string), `reference` (string), `createdBy` (string), `createdDate` (string).

**REQ-PAR-DOM-F-002:** The `Party` interface shall be exported from `domains/parties/index.ts`.

**REQ-PAR-DOM-F-003:** The domain shall export a `CreatePartyInput` TypeScript interface with the required fields `name` (string), `type` (string), `orgCode` (string), and `createdBy` (string).

### 2.2 listParties

**REQ-PAR-DOM-F-004:** The `listParties(filters?)` function shall call `GET /api/parties` via `@/lib/api-client` and shall return a `Party[]` on a 2xx response.

**REQ-PAR-DOM-F-005:** The `listParties(filters?)` function shall accept an optional `type` filter and shall forward it as a `?type=<value>` query parameter to the API when provided.

**REQ-PAR-DOM-F-006:** The `listParties(filters?)` function shall accept an optional `search` filter and shall forward it as a `?search=<value>` query parameter to the API when provided.

**REQ-PAR-DOM-F-007:** The `listParties(filters?)` function shall accept an optional `orgCode` filter and shall forward it as a `?orgCode=<value>` query parameter to the API when provided.

**REQ-PAR-DOM-F-008:** The `listParties(filters?)` function shall throw an `Error` on any non-2xx HTTP response.

### 2.3 createParty

**REQ-PAR-DOM-F-009:** The `createParty(input)` function shall call `POST /api/parties` via `@/lib/api-client` with a JSON body containing `name`, `type`, `orgCode`, and `createdBy`, and shall return the persisted `Party` (including the server-assigned `id`) on a 2xx response.

**REQ-PAR-DOM-F-010:** The `createParty(input)` function shall throw on any non-201 response.

### 2.4 getParty

**REQ-PAR-DOM-F-020:** The route `/parties/:id` shall render `PartyViewPage`. On mount it shall call `getParty(id)` and display a `LoadingSpinner` while the request is in flight.

**REQ-PAR-DOM-F-021:** When the policy loads, `PartyViewPage` shall render a `Card` header containing the party name, reference, and type.

**REQ-PAR-DOM-F-022:** The page shall register a contextual sidebar section via `useSidebarSection` with title "Party" and items: Back, Edit, Save, Cancel.

**REQ-PAR-DOM-F-023:** The page shall render a `TabsNav` with 7 tabs in order: Details, Entities, Audit, Submissions, Quotes, Policies, Claims.

### 2.5 Details tab

**REQ-PAR-DOM-F-024:** The Details tab (default) shall render 4 `FieldGroup` sections: "Core Information", "Address", "Classification", "Workforce & Financials". In read-only mode, fields display plain text; in edit mode, input elements.

**REQ-PAR-DOM-F-025:** Clicking "Edit" in the sidebar shall switch to edit mode. "Save" shall call `updateParty(id, patch)` and transition back to read-only mode. "Cancel" shall discard changes and return to read-only mode.

**REQ-PAR-DOM-F-026:** Validation on save: Name, Type, AddressLine1, and Country are required. On failure, inline error classes shall be applied and save shall be prevented.

### 2.6 Entities tab

**REQ-PAR-DOM-F-027:** The Entities tab shall call `getPartyEntities(id)` and render a `ResizableGrid` with columns: Name, Type, Code, Reference, Notes; plus an Add (+) button and inline delete.

### 2.7 Audit tab

**REQ-PAR-DOM-F-028:** The Audit tab shall call `getPartyAudit(id)` and display an `AuditTable`. On first activation of the Audit tab, it shall POST a "Party Opened" audit event via `postPartyAudit`.

### 2.8 Submissions & Quotes tabs

**REQ-PAR-DOM-F-029:** The Submissions tab shall call `getPartySubmissions(id)` on first activation and render a `ResizableGrid` displaying related submissions.

**REQ-PAR-DOM-F-030:** The Quotes tab shall call `getPartyQuotes(id)` on first activation and render a `ResizableGrid` displaying related quotes.

### 2.9 Policies tab (placeholder)

**REQ-PAR-DOM-F-031:** The Policies tab shall show placeholder text "Coming soon" until the Claims domain is integrated.

### 2.10 updateParty

**REQ-PAR-DOM-F-032:** The `updateParty(id, patch)` function shall call `PUT /api/parties/:id` via `@/lib/api-client` and return the updated `Party` on a 2xx response.

### 2.11 Entity CRUD

**REQ-PAR-DOM-F-033:** `getPartyEntities(id)` shall call `GET /api/parties/:id/entities` and return `PartyEntity[]`.

**REQ-PAR-DOM-F-034:** `createPartyEntity(partyId, input)` shall call `POST /api/parties/:id/entities`.

**REQ-PAR-DOM-F-035:** `updatePartyEntity(partyId, entityId, patch)` shall call `PUT /api/parties/:id/entities/:entityId`.

**REQ-PAR-DOM-F-036:** `deletePartyEntity(partyId, entityId)` shall call `DELETE /api/parties/:id/entities/:entityId`.

### 2.12 Audit service

**REQ-PAR-DOM-F-037:** `getPartyAudit(id)` shall call `GET /api/parties/:id/audit` and return `AuditEvent[]`.

**REQ-PAR-DOM-F-038:** `postPartyAudit(id, event)` shall call `POST /api/parties/:id/audit`.

### 2.13 Related records service

**REQ-PAR-DOM-F-039:** `getPartySubmissions(id)` shall call `GET /api/parties/:id/submissions`.

**REQ-PAR-DOM-F-040:** `getPartyQuotes(id)` shall call `GET /api/parties/:id/quotes`.

### 2.14 Unmount audit

**REQ-PAR-DOM-F-041:** On unmount, `PartyViewPage` shall POST a "Party Closed" audit event (best-effort, fire-and-forget).

### 2.15 Service — getParty

**REQ-PAR-DOM-F-011:** The `getParty(id)` function shall call `GET /api/parties/:id` via `@/shared/lib/api-client` and return a single `Party` object on a 2xx response.

**REQ-PAR-DOM-F-012:** The `getParty(id)` function shall throw an `Error` on any non-2xx response.

### 2.16 Service — getPartyPolicies

**REQ-PAR-DOM-F-013:** The `getPartyPolicies(id)` function shall call `GET /api/parties/:id/policies` via `@/shared/lib/api-client` and return an array on a 2xx response.

### 2.17 Details Tab — Core Information Fields

**REQ-PAR-DOM-F-042:** The "Core Information" `FieldGroup` shall contain these fields in order:

| Field key | Label | Input type | Required on save | Editable |
|-----------|-------|------------|------------------|----------|
| `name` | Name | text input (`aria-label="Name"`) | Yes | Yes |
| `type` | Type | select (`aria-label="Type"`) with options: Insured, Broker, Insurer, Coverholder | Yes | Yes |
| `email` | Email | text input (`aria-label="Email"`) | No | Yes |
| `phone` | Phone | text input (`aria-label="Phone"`) | No | Yes |

### 2.18 Details Tab — Address Fields

**REQ-PAR-DOM-F-043:** The "Address" `FieldGroup` shall contain these fields in order:

| Field key | Label | Input type | Required on save | Editable |
|-----------|-------|------------|------------------|----------|
| `addressLine1` | Address Line 1 | text input (`aria-label="Address Line 1"`) | Yes | Yes |
| `addressLine2` | Address Line 2 | text input (`aria-label="Address Line 2"`) | No | Yes |
| `city` | City | text input (`aria-label="City"`) | No | Yes |
| `state` | State / Province | text input (`aria-label="State"`) | No | Yes |
| `postcode` | Postcode | text input (`aria-label="Postcode"`) | No | Yes |
| `country` | Country | text input (`aria-label="Country"`) | Yes | Yes |
| `region` | Region | text input (`aria-label="Region"`) | No | Yes |

### 2.19 Details Tab — Classification Fields

**REQ-PAR-DOM-F-044:** The "Classification" `FieldGroup` shall contain these fields in order:

| Field key | Label | Input type | Required on save | Editable |
|-----------|-------|------------|------------------|----------|
| `sicStandard` | SIC Standard | select with options: `US SIC (1987)`, `UK SIC (2007)` — stored values `US SIC`, `UK SIC` | No | Yes |
| `sicCode` | SIC Code | text input | No | Yes |
| `sicDescription` | SIC Description | text input (interim — will become auto-populated SearchableSelect when OQ-002 is resolved) | No | Yes |

### 2.20 Details Tab — Workforce & Financials Fields

**REQ-PAR-DOM-F-045:** The "Workforce & Financials" `FieldGroup` shall contain these fields in order:

| Field key | Label | Input type | Required on save | Editable |
|-----------|-------|------------|------------------|----------|
| `wageRoll` | Wage Roll | number input (`aria-label="Wage Roll"`) | No | Yes |
| `numberEmployees` | Number of Employees | number input (`aria-label="Number of Employees"`) | No | Yes |
| `annualRevenue` | Annual Revenue | number input (`aria-label="Annual Revenue"`) | No | Yes |

### 2.21 Details Tab — Edit Mode Transitions

**REQ-PAR-DOM-F-046:** Listening for the `party:save` DOM custom event shall validate the form (per F-026), call `updateParty(id, formData)` with all changed fields, and on success transition the page back to read-only mode with the updated values.

**REQ-PAR-DOM-F-047:** Listening for the `party:cancel` DOM custom event shall discard all unsaved changes and restore the original party values, transitioning the page back to read-only mode.

### 2.22 Details Tab — Dirty State Tracking

**REQ-PAR-DOM-F-048:** In edit mode, the page shall compare current form values against the original party data. When differences exist (dirty state), a `beforeunload` event handler shall warn the user about unsaved changes if they attempt to close or navigate away.

**REQ-PAR-DOM-F-049:** When the form is dirty and the user triggers the `party:cancel` event, unsaved changes shall be discarded without an additional confirmation dialog.

### 2.23 Entities Tab — Inline Editing

**REQ-PAR-DOM-F-050:** An "Add" button (`aria-label="Add entity"`) shall be visible above the entities grid. Clicking it shall insert a new empty row into the grid with editable cells for Name, Type, Code, Reference, and Notes.

**REQ-PAR-DOM-F-051:** Each entity row shall have a delete button. Clicking delete on a persisted entity shall call `deletePartyEntity(partyId, entityId)` and remove the row. Clicking delete on an unsaved new row shall remove it locally.

**REQ-PAR-DOM-F-052:** In edit mode, existing entity rows shall be editable inline. Clicking a cell shall convert it to an input field. Changes are held locally until the user saves.

**REQ-PAR-DOM-F-053:** When entity changes exist (new rows or modified rows), the `party:save` event shall call `createPartyEntity` for each new entity and `updatePartyEntity` for each modified entity.

### 2.24 Policies Tab

**REQ-PAR-DOM-F-054:** The Policies tab shall call `getPartyPolicies(id)` on first activation and render a `ResizableGrid` with columns: Reference, Status, Inception Date, Expiry Date, Insured.

### 2.25 Claims Tab (Placeholder)

**REQ-PAR-DOM-F-055:** The Claims tab shall show placeholder text "Coming soon" until the Claims domain is integrated.

### 2.26 InsurerSearch Component

**REQ-PAR-DOM-F-060:** `InsurerSearch` shall render a read-only trigger input with `aria-label="Search insurer"` and a search icon button with `aria-label="Search parties"`.

**REQ-PAR-DOM-F-061:** Clicking the trigger input or the search button shall open a modal dialog with `role="dialog"` and `aria-label="Select insurer"`.

**REQ-PAR-DOM-F-062:** On modal open, the component shall call `listParties({ type: 'Insurer' })` and render results in a `ResizableGrid` with columns: Name, Address, City, Postcode.

**REQ-PAR-DOM-F-063:** A search input in the modal shall call `listParties({ type: 'Insurer', search: query })` and update the results as the user types.

**REQ-PAR-DOM-F-064:** When no results match, the modal shall display "No insurer parties found."

**REQ-PAR-DOM-F-065:** Clicking a result row shall call `onSelect(party)` with the full `Party` object and close the modal.

**REQ-PAR-DOM-F-066:** Pressing `Escape` or clicking the close button (`aria-label="Close"`) shall close the modal without making a selection.

**REQ-PAR-DOM-F-067:** When the `selectedParty` prop is provided, the trigger input shall display `selectedParty.name`.

### 2.27 CoverholderSearch Component

**REQ-PAR-DOM-F-070:** `CoverholderSearch` shall render a read-only trigger input with `aria-label="Search coverholder"` and a search icon button with `aria-label="Search parties"`.

**REQ-PAR-DOM-F-071:** Clicking the trigger input or button shall open a modal dialog with `role="dialog"` and `aria-label="Select coverholder"`.

**REQ-PAR-DOM-F-072:** On modal open, the component shall call `listParties({ type: 'Coverholder' })` and render results in a `ResizableGrid` with columns: Name, Address, City, Postcode.

**REQ-PAR-DOM-F-073:** A search input in the modal shall filter results via `listParties({ type: 'Coverholder', search: query })`.

**REQ-PAR-DOM-F-074:** When no results match, the modal shall display "No coverholder parties found."

**REQ-PAR-DOM-F-075:** Clicking a result row shall call `onSelect(party)` with the full `Party` object and close the modal.

**REQ-PAR-DOM-F-076:** Pressing `Escape` or clicking the close button (`aria-label="Close"`) shall close the modal without making a selection.

**REQ-PAR-DOM-F-077:** When the `selectedParty` prop is provided, the trigger input shall display `selectedParty.name`.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-PAR-DOM-F-001 | `parties/parties.service.test.ts` | T-PAR-SVC-R001 |
| REQ-PAR-DOM-F-002 | `parties/parties.service.test.ts` | T-PAR-SVC-R002 |
| REQ-PAR-DOM-F-003 | `parties/parties.service.test.ts` | T-PAR-SVC-R003 |
| REQ-PAR-DOM-F-004 | `parties/parties.service.test.ts` | T-PAR-SVC-R004 |
| REQ-PAR-DOM-F-005 | `parties/parties.service.test.ts` | T-PAR-SVC-R005 |
| REQ-PAR-DOM-F-006 | `parties/parties.service.test.ts` | T-PAR-SVC-R006 |
| REQ-PAR-DOM-F-007 | `parties/parties.service.test.ts` | T-PAR-SVC-R007 |
| REQ-PAR-DOM-F-008 | `parties/parties.service.test.ts` | T-PAR-SVC-R008 |
| REQ-PAR-DOM-F-009 | `parties/parties.service.test.ts` | T-PAR-SVC-R009 |
| REQ-PAR-DOM-F-010 | `parties/parties.service.test.ts` | T-PAR-SVC-R010 |
| REQ-PAR-DOM-F-011 | `parties/parties.service.test.ts` | T-PAR-SVC-R011 |
| REQ-PAR-DOM-F-012 | `parties/parties.service.test.ts` | T-PAR-SVC-R012 |
| REQ-PAR-DOM-F-013 | `parties/parties.service.test.ts` | T-PAR-SVC-R013 |
| REQ-PAR-DOM-F-020 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R020 |
| REQ-PAR-DOM-F-021 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R021 |
| REQ-PAR-DOM-F-022 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R022 |
| REQ-PAR-DOM-F-023 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R023 |
| REQ-PAR-DOM-F-024 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R024 |
| REQ-PAR-DOM-F-025 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R025 |
| REQ-PAR-DOM-F-026 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R026 |
| REQ-PAR-DOM-F-027 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R027 |
| REQ-PAR-DOM-F-028 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R028 |
| REQ-PAR-DOM-F-029 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R029 |
| REQ-PAR-DOM-F-030 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R030 |
| REQ-PAR-DOM-F-032 | `parties/parties.service.test.ts` | T-PAR-SVC-R032 |
| REQ-PAR-DOM-F-033 | `parties/parties.service.test.ts` | T-PAR-SVC-R033 |
| REQ-PAR-DOM-F-034 | `parties/parties.service.test.ts` | T-PAR-SVC-R034 |
| REQ-PAR-DOM-F-035 | `parties/parties.service.test.ts` | T-PAR-SVC-R035 |
| REQ-PAR-DOM-F-036 | `parties/parties.service.test.ts` | T-PAR-SVC-R036 |
| REQ-PAR-DOM-F-037 | `parties/parties.service.test.ts` | T-PAR-SVC-R037 |
| REQ-PAR-DOM-F-038 | `parties/parties.service.test.ts` | T-PAR-SVC-R038 |
| REQ-PAR-DOM-F-039 | `parties/parties.service.test.ts` | T-PAR-SVC-R039 |
| REQ-PAR-DOM-F-040 | `parties/parties.service.test.ts` | T-PAR-SVC-R040 |
| REQ-PAR-DOM-F-041 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R041 |
| REQ-PAR-DOM-F-042 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R042 |
| REQ-PAR-DOM-F-043 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R043 |
| REQ-PAR-DOM-F-044 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R044, T-PAR-VIEW-R044b, T-PAR-VIEW-R044c |
| REQ-PAR-DOM-F-045 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R045 |
| REQ-PAR-DOM-F-046 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R046 |
| REQ-PAR-DOM-F-047 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R047 |
| REQ-PAR-DOM-F-048 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R048 |
| REQ-PAR-DOM-F-049 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R049 |
| REQ-PAR-DOM-F-050 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R050 |
| REQ-PAR-DOM-F-051 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R051 |
| REQ-PAR-DOM-F-052 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R052 |
| REQ-PAR-DOM-F-053 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R053 |
| REQ-PAR-DOM-F-054 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R054 |
| REQ-PAR-DOM-F-055 | `parties/PartyViewPage/__tests__/PartyViewPage.test.tsx` | T-PAR-VIEW-R055 |
| REQ-PAR-DOM-F-060 | `parties/InsurerSearch/__tests__/InsurerSearch.test.tsx` | T-PAR-INSURER-R060 |
| REQ-PAR-DOM-F-061 | `parties/InsurerSearch/__tests__/InsurerSearch.test.tsx` | T-PAR-INSURER-R061 |
| REQ-PAR-DOM-F-062 | `parties/InsurerSearch/__tests__/InsurerSearch.test.tsx` | T-PAR-INSURER-R062 |
| REQ-PAR-DOM-F-063 | `parties/InsurerSearch/__tests__/InsurerSearch.test.tsx` | T-PAR-INSURER-R063 |
| REQ-PAR-DOM-F-064 | `parties/InsurerSearch/__tests__/InsurerSearch.test.tsx` | T-PAR-INSURER-R064 |
| REQ-PAR-DOM-F-065 | `parties/InsurerSearch/__tests__/InsurerSearch.test.tsx` | T-PAR-INSURER-R065 |
| REQ-PAR-DOM-F-066 | `parties/InsurerSearch/__tests__/InsurerSearch.test.tsx` | T-PAR-INSURER-R066 |
| REQ-PAR-DOM-F-067 | `parties/InsurerSearch/__tests__/InsurerSearch.test.tsx` | T-PAR-INSURER-R067 |
| REQ-PAR-DOM-F-070 | `parties/CoverholderSearch/__tests__/CoverholderSearch.test.tsx` | T-PAR-COVER-R070 |
| REQ-PAR-DOM-F-071 | `parties/CoverholderSearch/__tests__/CoverholderSearch.test.tsx` | T-PAR-COVER-R071 |
| REQ-PAR-DOM-F-072 | `parties/CoverholderSearch/__tests__/CoverholderSearch.test.tsx` | T-PAR-COVER-R072 |
| REQ-PAR-DOM-F-073 | `parties/CoverholderSearch/__tests__/CoverholderSearch.test.tsx` | T-PAR-COVER-R073 |
| REQ-PAR-DOM-F-074 | `parties/CoverholderSearch/__tests__/CoverholderSearch.test.tsx` | T-PAR-COVER-R074 |
| REQ-PAR-DOM-F-075 | `parties/CoverholderSearch/__tests__/CoverholderSearch.test.tsx` | T-PAR-COVER-R075 |
| REQ-PAR-DOM-F-076 | `parties/CoverholderSearch/__tests__/CoverholderSearch.test.tsx` | T-PAR-COVER-R076 |
| REQ-PAR-DOM-F-077 | `parties/CoverholderSearch/__tests__/CoverholderSearch.test.tsx` | T-PAR-COVER-R077 |

---

## 4. Open Questions

- OQ-001: Should `listParties` support pagination? Deferred — not needed for search modal use case.
- OQ-002: Should SIC code editing use a SearchableSelect with auto-complete from US/UK SIC data sets? Requirements F-044 specify editable select + text input. Confirm during implementation.
- OQ-003: Should the Claims tab remain placeholder or be deferred entirely? Requirements F-055 specify placeholder.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-PAR-DOM-{TYPE}-{NNN} format per Guideline 13 |
| 2026-04-05 | Comprehensive update: added Impact Analysis, field-level specifications (F-042 to F-045), getParty/getPartyPolicies service functions (F-011 to F-013), edit mode transitions (F-046, F-047), dirty state tracking (F-048, F-049), entity inline editing (F-050 to F-053), Policies tab with real data (F-054), Claims tab placeholder (F-055), InsurerSearch component (F-060 to F-067), CoverholderSearch component (F-070 to F-077). Updated traceability table. Updated tabs from 6 to 7 (added Claims). |

---

## 6. Design Notes

### Dependencies

- `@/shared/lib/api-client` — HTTP adapter
- `@/shared/lib/auth-session` — session context (orgCode, userId)
- `@/shared/components/Card` — header card
- `@/shared/components/TabsNav` — tab navigation
- `@/shared/components/ResizableGrid` — data grids
- `@/shared/components/AuditTable` — audit display
- `@/shared/components/FieldGroup` — form sections
- `@/shared/components/LoadingSpinner` — loading state

### PartyViewPage Form State

```typescript
interface FormState {
  name: string
  type: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  city: string
  state: string
  postcode: string
  country: string
  region: string
  wageRoll: string
  numberEmployees: string
  annualRevenue: string
  sicStandard: string
  sicCode: string
  sicDescription: string
}
```
