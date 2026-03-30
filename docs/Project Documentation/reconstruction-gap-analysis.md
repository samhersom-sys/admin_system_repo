# Policy Forge — Reconstruction Gap Analysis Plan
**Date:** 2026-03-26  
**Source of truth for backup:** `policy-forge-chat (BackUp)/src/` and `backend/server.js`  
**Target:** `Cleaned/frontend/src/` and `backend/nest/src/`  
**Guideline:** Three-Artifact Rule — Requirements → Tests → Code  
**Requirement format:** `REQ-{DOMAIN}-{FE|BE}-{F|UI|NF}-{NNN}` with "shall" language  

---

## 1. How to Use This Document

> **Three-Artifact Rule (mandatory):** For every batch below:  
> 1. Agree the requirements in this document first.  
> 2. Write tests that verify those requirements.  
> 3. Write the implementation code.  
>  
> No code is written without agreed requirements and written tests.  
> After each batch, stop and confirm before proceeding to the next.

Badge meanings:
- ✅ **Complete** — implemented and tested in cleaned project  
- 🔶 **Partial** — structure exists, specific gap described  
- ❌ **Missing** — no implementation at all in cleaned  

---

## 2. Domain Status Matrix

| # | Domain | Frontend | Backend (NestJS) | Primary Blocker |
|---|--------|----------|-----------------|-----------------|
| 1 | **Auth** | ✅ | ✅ | — |
| 2 | **Shell / AppLayout** | ✅ | N/A | — |
| 3 | **Shared Lib** | ✅ | N/A | OQ-008 (permissions partial) |
| 4 | **Audit Service** | ✅ | 🔶 `detectConcurrentUsers` not wired | — |
| 5 | **Home / Dashboard** | 🔶 Widgets exist; AppHomePage entry route incomplete | ✅ | — |
| 6 | **Submissions** | 🔶 Core pages done; Clearance, BindingAuthority tab, Related tab partial | ✅ | — |
| 7 | **Quotes** | 🔶 Core done; Risk Codes tab missing | ✅ | OQ-003 (financial calcs) |
| 8 | **Parties** | 🔶 List/search done; PartyViewPage missing | ✅ | — |
| 9 | **Search** | 🔶 Components done; SearchPage wrapper context missing | ✅ | — |
| 10 | **Profile** | ❌ Stub only | ❌ | OQ-004 |
| 11 | **Settings** | 🔶 Platform admin done; Rating Rules, Products, Data Quality, Org Hierarchy missing | ❌ | — |
| 12 | **Workflow** | ❌ Stub only | ❌ | — |
| 13 | **Policies** | ❌ Stub only | ❌ | OQ-003, OQ-013 |
| 14 | **Claims** | ❌ Not started | ❌ | — |
| 15 | **Finance** | ❌ Stub only | ❌ | OQ-002, OQ-003 |
| 16 | **Binding Authorities** | ❌ Stub only | ❌ | — |
| 17 | **Reporting** | ❌ Stub only | ❌ | — |
| 18 | **Locations** | ❌ Not started | ❌ | OQ-005 (shared module) |

---

## 3. Implementation Batches

Work is grouped into **batches** of 3–5 domain tasks, ordered by dependency and value delivery.

```
Batch A — Audit completion + Quote & Submission gaps       (unblocked, high value)
Batch B — Parties PartyViewPage + Search polish            (unblocked)
Batch C — Profile + Settings (Rating Rules, Products, Org) (unblocked)
Batch D — Policies (FE + BE)                              (unblocked; OQ-003 in scope)
Batch E — Claims (FE + BE)                                (unblocked)
Batch F — Workflow + Clearance                            (depends on submissions BE)
Batch G — Finance (FE + BE)                               (depends on Policy/Invoice model)
Batch H — Binding Authorities (FE + BE)                   (complex; independent)
Batch I — Reporting / Dashboards (FE + BE)                (independent)
Batch J — Locations (shared module)                       (OQ-005 answered)
```

---

## 4. Domain-by-Domain Requirements

---

### 4.1 Batch A — Audit Service Completion

**Status:** 🔶 `audit.service.ts` is missing `detectConcurrentUsers()`

#### BE Requirements — `backend/nest/src/audit/`

**REQ-AUDIT-BE-F-013:** `AuditService` shall expose a `detectConcurrentUsers(entityType: string, entityId: number, currentUserName: string): Promise<string[]>` method that queries `audit_event` for all records matching `entityType` and `entityId` with action `ILIKE '%Opened%'` or `ILIKE '%Closed%'`, computes a net open count per `user_name`, and returns those where count > 0, excluding `currentUserName`.

**REQ-AUDIT-BE-F-014:** `AuditService.writeEvent()` shall, when `action` contains "Opened", call `detectConcurrentUsers()` before inserting the audit row and include the result as `otherUsersOpen: string[]` in the returned event object.

**REQ-AUDIT-BE-F-015:** `AuditService.writeEvent()` shall de-duplicate within a 10-second window: if an identical `(entityType, entityId, action, userName)` row was inserted in the last 10 seconds, the service shall skip insertion and return `null`.

**Impact Analysis — Audit:**
- **API Impact:** No new endpoints. `POST /api/audit` response shape gains optional `otherUsersOpen: string[]` field.
- **DB Impact:** None — uses existing `audit_event` table.
- **FE Impact:** `useAudit` hook may surface `otherUsersOpen` to display a concurrent-users warning banner.

---

### 4.2 Batch A — Quote Domain Gaps

**Status:** 🔶 — Core QuoteViewPage done; Risk Codes tab at section level is listed as `COVERED - Block 4` in requirements but needs verification; QuoteSectionViewPage needs a Risk Codes tab.

#### FE Requirements — `frontend/src/quotes/`

**REQ-QUO-FE-F-062:** `QuoteSectionViewPage` shall render a **Risk Codes** tab that lists all risk codes associated with the section, with columns: Code, Description, Active flag. *(Backup reference: `QuoteRiskCodes.jsx`)*

**REQ-QUO-FE-F-063:** The Risk Codes tab shall allow the user to add a risk code by typing a code string and clicking "+ Add Risk Code", which calls `POST /api/quotes/:quoteId/sections/:sectionId/risk-codes` with `{ code: string }`. On success the new code appears in the list without page reload.

**REQ-QUO-FE-F-064:** The Risk Codes tab shall allow the user to remove a risk code by clicking a delete icon, which calls `DELETE /api/quotes/:quoteId/sections/:sectionId/risk-codes/:code`. On success the row is removed.

**REQ-QUO-FE-F-065:** Risk code add/delete shall be disabled when the quote is not in Draft status.

**REQ-QUO-FE-F-066:** `QuoteViewPage` shall render a **Copy Quote** sidebar action (FiCopy icon, label "Copy Quote") visible when status is Draft, Quoted, or Bound. Clicking it shall call `POST /api/quotes/:id/copy` and navigate to the new quote's view page on success. On failure a toast notification shall appear with message "Copy failed. Please try again."  *(Already REQ-QUO-FE-F-061 — verify implementation exists and is tested.)*

#### BE Requirements — `backend/nest/src/quotes/`

**REQ-QUO-BE-F-040:** `QuotesController` shall expose `GET /api/quotes/:quoteId/sections/:sectionId/risk-codes` returning `{ data: { code: string, description: string | null }[] }`.

**REQ-QUO-BE-F-041:** `QuotesController` shall expose `POST /api/quotes/:quoteId/sections/:sectionId/risk-codes` accepting `{ code: string }` and returning `201 { data: { code, description } }`. Duplicate codes shall return `409`.

**REQ-QUO-BE-F-042:** `QuotesController` shall expose `DELETE /api/quotes/:quoteId/sections/:sectionId/risk-codes/:code` returning `204` on success, `404` if not found.

**REQ-QUO-BE-F-043:** `QuotesController` shall expose `POST /api/quotes/:id/copy` that duplicates the quote record and all child sections/coverages/deductions, assigns a new reference, sets status to Draft, and returns `201 { data: { id: number, reference: string } }`.

**Impact Analysis — Quote Risk Codes + Copy:**
- **FE Impact:** QuoteSectionViewPage gains Risk Codes tab. Sidebar gains Copy button.
- **API Impact:** 4 new endpoints (risk-codes CRUD + copy).
- **DB Impact:** Requires `quote_section_risk_codes` table: `(id, quote_section_id FK, code TEXT, description TEXT)`.

---

### 4.3 Batch A — Submission Domain Gaps

**Status:** 🔶 Core SubmissionsPage, NewSubmissionPage, SubmissionViewPage done; Clearance sub-workflow missing; BindingAuthority tab on SubmissionViewPage is a stub in cleaned.

#### FE Requirements — `frontend/src/submissions/`

**REQ-SUB-FE-F-030:** `SubmissionTabs` shall render a **"Binding Authority Contracts"** tab when `contractType === 'Binding Authority Contract'` that displays a grid of linked BA contracts with columns: Reference, Name, Status. Each row shall link to `/binding-authorities/:id`.

**REQ-SUB-FE-F-031:** `SubmissionTabs` **Related Submissions** tab shall render a `ResizableGrid` with columns: Reference, Insured, Placing Broker, Status, Inception Date. Each Reference cell shall link to `/submissions/:id`. The tab shall call `GET /api/submissions/:id/related` to load data. Empty state: "No related submissions found."

**REQ-SUB-FE-F-032:** A **Clearance** button shall appear in the SubmissionViewPage header action bar when `status === 'Clearance'`. Clicking it shall navigate to `/workflow/clearance/:id`.

**REQ-SUB-FE-F-033:** `SubmissionsPage` (list) shall support filtering by status via a dropdown containing: All, New, Clearance, Quoted, Bound, Declined. The filter shall be applied client-side against loaded records.

**REQ-SUB-FE-F-034:** `SubmissionsPage` shall display a count badge next to the "Submissions" heading showing the total record count from the current filtered view.

#### BE Requirements — `backend/nest/src/submissions/`

**REQ-SUB-BE-F-020:** `SubmissionsController` shall expose `GET /api/submissions/:id/related` returning `{ data: RelatedSubmission[] }` where related submissions share the same `insured_id` or `insured` string, excluding the current record. Limit 50, ordered by `created_at DESC`.

**REQ-SUB-BE-F-021:** `SubmissionsController` shall expose `GET /api/submissions/:id/binding-authorities` returning `{ data: { id, reference, name, status }[] }` for BA contracts linked to that submission.

**Impact Analysis — Submission Gaps:**
- **FE Impact:** SubmissionTabs gets Related and BA tabs completed; clearance button added.
- **API Impact:** 2 new endpoints.
- **DB Impact:** None (existing tables).

---

### 4.4 Batch B — Parties: PartyViewPage

**Status:** ❌ No party detail view in cleaned. Backup has PartyViewPage with 6 tabs. `CreatePartyPage` at `/parties/new` already exists in cleaned.

> **Note — PartyListPage tests:** The existing `PartyListPage.test.tsx` suite is failing because `PartyListPage` uses `useNotifications()` but the test wrapper does not provide `NotificationProvider`. Fixing the test wrapper (adding `NotificationProvider`) is part of this batch.

#### FE Requirements — `frontend/src/parties/`

**REQ-PAR-FE-F-020:** The system shall expose a `PartyViewPage` component at route `/parties/:id` that fetches `GET /api/parties/:id` on mount and displays the party record. It shall redirect to `/parties` if the response returns 404.

**REQ-PAR-FE-F-021:** `PartyViewPage` shall display a sidebar section titled "Party" with items: Back (navigates to `/parties`), Edit (fires `party:save`-equivalent to toggle edit mode), Save (visible only when editing, calls PUT), Cancel (visible only when editing).

**REQ-PAR-FE-F-022:** `PartyViewPage` shall render a `TabsNav` with six tabs in order: **Details**, **Submissions**, **Quotes**, **Policies**, **Claims**, **Entities**, **Audit**.

**REQ-PAR-FE-F-023:** The **Details** tab shall display party fields arranged in four named `FieldGroup` sections:
- **Core Information:** Name (required), Type/Role (required, dropdown: `Insured`, `Broker`, `Insurer`, `Coverholder`), Email, Phone.
- **Address:** Address Line 1 (required), Address Line 2, Address Line 3, City, State/County, Postcode/ZIP, Country (required), Region.
- **Classification:** SIC Standard (toggle: `US SIC (1987)` / `UK SIC (2007)`), SIC Code (`SearchableSelect` — selecting a code auto-populates SIC Description), SIC Description (`SearchableSelect` — selecting a description auto-populates SIC Code). The option list changes when SIC Standard changes.
- **Workforce & Financials:** Wage Roll (number), Number of Employees (integer), Annual Revenue (number).

**REQ-PAR-FE-F-024:** The **Details** tab shall be read-only by default. When the user activates edit mode the fields become editable. Saving calls `PUT /api/parties/:id`. On success a toast confirms the save and the form returns to read-only. On error a toast error appears and the form retains the unsaved values.

**REQ-PAR-FE-F-024a:** Before calling `PUT /api/parties/:id` the component shall validate: Name is non-empty; Type is not blank; Address Line 1 is non-empty; Country is non-empty. Validation errors shall appear inline on the relevant fields and the API shall not be called.

**REQ-PAR-FE-F-025:** The **Entities** tab shall display a `ResizableGrid` of party entities loaded from `GET /api/parties/:id/entities` with columns: Name, Type (`entity_type`), Code (`entity_code`), Reference, Notes. Each row shall have an Edit icon that puts that row into inline edit mode with Save/Cancel controls per row. A "+ Add Entity" button shall append a new blank inline-editable row. Saving a new row calls `POST /api/parties/:id/entities`; saving an existing row calls `PUT /api/parties/:id/entities/:entityId`. Delete calls `DELETE /api/parties/:id/entities/:entityId` with a `confirm()` prompt (no modal). Empty state: "No entities found."

**REQ-PAR-FE-F-026:** On first mount of `PartyViewPage` for an existing party (id ≠ `new`), the page shall POST `{ action: 'Party Opened', entityType: 'Party', entityId: id }` to `POST /api/parties/:id/audit`. The **Audit** tab shall display the `AuditTable` component loaded from `GET /api/parties/:id/audit`.

**REQ-PAR-FE-F-027:** `PartyListPage` shall include a row link on the reference/name column that navigates to `/parties/:id`. The test wrapper for `PartyListPage.test.tsx` shall include `NotificationProvider` to resolve the pre-existing `useNotifications` error.

**REQ-PAR-FE-F-028:** `PartyViewPage` shall be registered in the application router at path `/parties/:id`.

**REQ-PAR-FE-F-029:** The **Submissions** tab shall display a `ResizableGrid` loaded lazily (on first tab selection) from `GET /api/parties/:id/submissions` with columns: Reference (link to `/submissions/:id`), Insured, Status, Inception Date. Empty state: "No related submissions found."

**REQ-PAR-FE-F-030:** The **Quotes** tab shall display a `ResizableGrid` loaded lazily from `GET /api/parties/:id/quotes` with columns: Reference (link to `/quotes/:id`), Insured, Status, Inception Date. Empty state: "No related quotes found."

**REQ-PAR-FE-F-031:** The **Policies** tab and **Claims** tab shall each display a "coming soon" placeholder. These will be implemented in Batch D (Policies) and Batch E (Claims) respectively.

#### BE Requirements — `backend/nest/src/parties/`

**REQ-PAR-BE-F-010:** `PartiesController` shall expose `GET /api/parties/:id` (JWT-guarded, orgCode-scoped) returning the party row with all fields: `id, reference, name, role, email, phone, addressLine1, addressLine2, addressLine3, city, state, postcode, country, region, wageRoll, numberEmployees, annualRevenue, sicStandard, sicCode, sicDescription, createdDate`. It shall return `404` when no row matches id + orgCode.

**REQ-PAR-BE-F-011:** `PartiesController` shall expose `PUT /api/parties/:id` (JWT-guarded, orgCode-scoped) accepting any subset of the party fields and returning the updated row. It shall return `404` when no row matches id + orgCode. The `orgCode` field shall not be updatable by the caller.

**REQ-PAR-BE-F-012a:** `PartiesController` shall expose `GET /api/parties/:id/entities` returning an array of active entities (`active = true`) for the party, ordered by name ascending. Columns returned: `id, name, entity_type, entity_code, reference, notes`.

**REQ-PAR-BE-F-012b:** `PartiesController` shall expose `POST /api/parties/:id/entities` accepting `{ name (required), entity_type (default "Syndicate"), entity_code?, reference?, notes? }` and returning the created row with `HTTP 201`. It shall return `400` when `name` is absent or blank.

**REQ-PAR-BE-F-012c:** `PartiesController` shall expose `PUT /api/parties/:id/entities/:entityId` accepting any subset of entity fields and returning the updated row. It shall return `404` when the entity does not exist or does not belong to the party.

**REQ-PAR-BE-F-012d:** `PartiesController` shall expose `DELETE /api/parties/:id/entities/:entityId` which sets `active = false` on the entity (soft delete) and returns `HTTP 204`. It shall return `404` when the entity does not exist or does not belong to the party.

**REQ-PAR-BE-F-013a:** `PartiesController` shall expose `GET /api/parties/:id/audit` returning the audit history for the party ordered by `created_at DESC`.

**REQ-PAR-BE-F-013b:** `PartiesController` shall expose `POST /api/parties/:id/audit` accepting `{ action, details? }` (JWT-guarded) and delegating to `AuditService.writeEvent`.

**REQ-PAR-BE-F-014:** `PartiesController` shall expose `GET /api/parties/:id/submissions` returning submissions where the party's `name` matches the submission's `insured` or `placing_broker` fields, scoped to the caller's `orgCode`, ordered by `created_at DESC`.

**REQ-PAR-BE-F-015:** `PartiesController` shall expose `GET /api/parties/:id/quotes` returning quotes where the party's `name` matches the quote's `insured` or `placing_broker` fields, scoped to the caller's `orgCode`, ordered by `created_at DESC`.

**Impact Analysis — PartyViewPage:**
- **FE Impact:** New `PartyViewPage.tsx`; router registration at `/parties/:id`; PartyListPage row link + test wrapper fix.
- **API Impact:** `GET/PUT /api/parties/:id`, entity CRUD sub-routes, audit sub-routes, submissions/quotes sub-routes (6 new endpoint groups).
- **DB Impact:** All columns already exist. `party_entities` table schema: `(id SERIAL PK, party_id INT FK → party.id CASCADE, name TEXT NOT NULL, reference VARCHAR(100), entity_code VARCHAR(50), entity_type VARCHAR(50) DEFAULT 'Syndicate', notes TEXT, active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. No new migrations needed.

---

### 4.5 Batch B — Search Polish

**Status:** ✅ **COMPLETE** — `frontend/src/search/index.tsx` (`SearchPage`), `SearchForm.tsx`, and `SearchResults.tsx` are fully implemented in the cleaned project. Search is not a stub.

**What exists:**
- `SearchPage` (index.tsx): 300 ms debounced input, calls `GET /api/search?q=…&type=…`, flattens multi-entity response (`submissions`, `quotes`, `policies`, `bindingAuthorities`, `parties`, `claims`), passes results + loading state to `SearchResults`.
- `SearchForm.tsx`: Controlled text input with entity-type filter dropdown.
- `SearchResults.tsx`: `ResizableGrid` with sort, pagination (50 rows/page), entity-type badge. Rows are clickable and navigate to entity view pages.

**Remaining gap (auto-resolves as later batches add pages):**
The `recordUrl()` helper in `SearchResults.tsx` returns `null` for entity types whose view pages do not yet exist: `Party` (resolves in B1 PartyViewPage), `Policy` (Batch D), `BindingAuthority` (Batch H), `Claim` (Batch E). No code change is required here; each batch must ensure their view page path matches what `recordUrl()` expects (`/parties/:id`, `/policies/:id`, `/binding-authorities/:id`, `/claims/:id`).

#### Requirements (retained for traceability — all already satisfied)

**REQ-SRCH-FE-F-010:** ✅ `SearchPage` exposed at route `/search`, rendering `SearchForm` and `SearchResults`.

**REQ-SRCH-FE-F-011:** ✅ `SearchPage` maintains query, filter, results, and loading state; passes them to child components.

**REQ-SRCH-FE-F-012:** ✅ `SearchForm` calls the page's debounced onChange handler; supports `?type=` filter.

**REQ-SRCH-FE-F-013:** ✅ `SearchResults` shows `LoadingSpinner` while loading; shows "No results found." when results are empty after a search.

**REQ-SRCH-FE-F-014:** ✅ Each row displays entity type badge, reference, description/name, status and navigates to the entity detail page (where the page exists).

**Impact Analysis — Search:**
- **FE Impact:** None required. Implementation is complete.
- **API Impact:** None.
- **DB Impact:** None.

---

### 4.6 Batch C — Profile Page

**Status:** ❌ Stub only. OQ-004 says: treat as simple read/update form page, not part of the auth domain.

#### FE Requirements — `frontend/src/profile/`

**REQ-PROF-FE-F-001:** The system shall expose a `ProfilePage` component at route `/profile` that fetches `GET /api/auth/me` and displays the authenticated user's profile.

**REQ-PROF-FE-F-002:** `ProfilePage` shall display fields: Full Name (editable), Email (read-only, used as login identifier), Role (read-only), and Organisation (read-only).

**REQ-PROF-FE-F-003:** The user shall be able to save name changes via `PUT /api/auth/profile` accepting `{ name: string }`, returning `{ data: { id, name, email, role } }`.

**REQ-PROF-FE-F-004:** `ProfilePage` shall include a **Change Password** section with fields: Current Password, New Password, Confirm New Password. Submitting calls `POST /api/auth/change-password` with `{ currentPassword, newPassword }`. On `401` response the message "Current password is incorrect" shall appear. On success a toast "Password changed successfully" appears.

**REQ-PROF-FE-F-005:** New Password field shall enforce: minimum 8 characters, at least one upper-case letter, at least one digit. Validation errors shall appear inline before the API call is made.

#### BE Requirements

**REQ-PROF-BE-F-001:** `AuthController` shall expose `PUT /api/auth/profile` (JWT-guarded) accepting `{ name: string }` and returning `{ data: { id, name, email, role } }`.

**REQ-PROF-BE-F-002:** `PUT /api/auth/profile` shall validate that `name` is non-empty and at most 100 characters; return `400` with `{ error: "Name is required" }` if blank.

**Impact Analysis — Profile:**
- **FE Impact:** `ProfilePage.tsx` replaces stub; Sidebar shows user's name from session.
- **API Impact:** 1 new endpoint (`PUT /api/auth/profile`).
- **DB Impact:** Verify `user` table has `name` column (it does per entity).

---

### 4.7 Batch C — Settings: Rating Rules, Products, Data Quality, Org Hierarchy

**Status:** 🔶 `PlatformAdminPanel`, `CompanyConfigPage`, `CompanyListPage` exist. Missing: RatingRules management, Product configuration, Data Quality settings, Organisation Hierarchy/Detail.

#### FE Requirements — `frontend/src/settings/`

**REQ-SET-FE-F-010:** `SettingsPage` shall serve as the settings navigation page at route `/settings`, rendering cards/links for: Rating Rules, Products, Data Quality, Organisation, Account Administration.

**REQ-SET-FE-F-011:** A `RatingRulesPage` shall exist at `/settings/rating-rules` displaying all rating rule groups in a table with columns: Name, Basis, Class of Business, Active. Clicking a row navigates to `/settings/rating-rules/:id`.

**REQ-SET-FE-F-012:** `RatingRulesDetailPage` at `/settings/rating-rules/:id` shall display the rule name (editable), class of business, rating basis (dropdown), and a grid of rate bands with columns: Min Value, Max Value, Rate, Action (delete). An "+ Add Band" button shall append a new editable row.

**REQ-SET-FE-F-013:** A `ProductListPage` shall exist at `/settings/products` displaying products in a table with columns: Name, Class of Business, Active toggle. Clicking a row navigates to `/settings/products/:id`.

**REQ-SET-FE-F-014:** `ProductConfigPage` at `/settings/products/:id` shall display product details: Name, Description, Class of Business, and a workflow steps list with drag-to-reorder. Each step has: Name, Description, Responsible Role, Estimated Days.

**REQ-SET-FE-F-015:** A `DataQualitySettingsPage` shall exist at `/settings/data-quality` displaying a list of entity fields with toggle switches to enable/disable data quality checks per field. Saving calls `PUT /api/settings/data-quality`.

**REQ-SET-FE-F-016:** An `OrganisationDetailPage` shall exist at `/settings/organisation` with three tabs: Information, Users, Hierarchy.
- **Information tab:** Org Name, Address, Contact Email — editable, saved via `PUT /api/organisation-entities/:id`.
- **Users tab:** Grid of users with columns: Name, Email, Role, Last Login. Action: resend invite / change role.
- **Hierarchy tab:** Two sub-tables — Hierarchy Levels (Code, Name, Parent Code) and Hierarchy Links (From Level, To Level, Relationship Type).

#### BE Requirements — NestJS settings module

**REQ-SET-BE-F-001:** Create `backend/nest/src/settings/settings.module.ts`, `settings.controller.ts`, `settings.service.ts`.

**REQ-SET-BE-F-002:** `SettingsController` shall expose `GET /api/settings/data-quality` returning `{ data: FieldQualityConfig[] }` and `PUT /api/settings/data-quality` accepting the same shape.

**REQ-SET-BE-F-003:** `SettingsController` shall expose `GET /api/settings/products`, `GET /api/settings/products/:id`, `POST /api/settings/products`, `PUT /api/settings/products/:id`, `DELETE /api/settings/products/:id`.

**REQ-SET-BE-F-004:** `SettingsController` shall expose product workflow step endpoints: `GET /api/settings/products/:id/workflow-steps`, `POST /api/settings/products/:id/workflow-steps`, `PUT /api/settings/workflow-steps/:id`, `DELETE /api/settings/workflow-steps/:id`, `PUT /api/settings/products/:id/workflow-steps-reorder`.

**REQ-SET-BE-F-005:** A `RatingApiController` or equivalent shall expose the Rating Rules API endpoints already present in the backup's `rating-api.js` router, migrated to NestJS.

**Impact Analysis — Settings:**
- **FE Impact:** New pages: SettingsPage hub, RatingRulesPage, RatingRulesDetailPage, ProductListPage, ProductConfigPage, DataQualitySettingsPage, OrganisationDetailPage.
- **API Impact:** Settings module (data-quality, products, workflow-steps); Rating Rules endpoints migration.
- **DB Impact:** Use existing tables: `product`, `workflow_step`, `data_quality_settings`, `rating_rule`, `organisation_entity`, `hierarchy_level`, `hierarchy_link`.

---

### 4.8 Batch D — Policies Domain

**Status:** ❌ Frontend stub only. No backend NestJS module.

#### FE Requirements — `frontend/src/policies/`

**REQ-POL-FE-F-001:** The system shall expose a `PoliciesListPage` at route `/policies` displaying all policies in a `ResizableGrid` with columns: Reference, Insured, Placing Broker, Class of Business, Inception Date, Expiry Date, Status. Each Reference links to `/policies/:id`.

**REQ-POL-FE-F-002:** `PoliciesListPage` shall include a `+ Bind Policy` button (visible only when accessed from a quote context) that navigates to the new-policy creation form.

**REQ-POL-FE-F-003:** A `PolicyViewPage` shall exist at route `/policies/:id` that fetches `GET /api/policies/:id` and displays the policy record.

**REQ-POL-FE-F-004:** `PolicyViewPage` shall display a header with: Reference, Status badge (colour-coded: Active=green, Expired=grey, Cancelled=red), Insured name, Class of Business, Inception/Expiry dates.

**REQ-POL-FE-F-005:** `PolicyViewPage` shall render a sidebar with actions: Edit (pen icon), Generate Document (FiFileText), Endorse (FiEdit), and Audit (FiClock — scrolls to Audit tab).

**REQ-POL-FE-F-006:** `PolicyViewPage` shall render a `TabsNav` with tabs: **Sections**, **Broker**, **Additional Insureds**, **Financial Summary**, **Invoices**, **Transactions**, **Audit**.

**REQ-POL-FE-F-007:** The **Sections** tab shall display a `ResizableGrid` matching the sections grid structure of QuoteViewPage (22 columns: Reference, Class of Business, Inception, Expiry, Limit currency/amount/loss-qualifier, Excess currency/amount/loss-qualifier, Sum Insured currency/amount, Premium currency/Gross Gross Premium/Gross Premium/Deductions/Net Premium/Annual Gross/Annual Net/Written Order/Signed Order, plus Actions column with FiSearch navigate + FiTrash2 delete). Add Section: FiPlus in the actions `<th>` column header.

**REQ-POL-FE-F-008:** A `PolicySectionViewPage` shall exist at `/policies/:policyId/sections/:sectionId` with tabs: Details, Coverages, Deductions, Participations.

**REQ-POL-FE-F-009:** The **Broker** tab shall display Placing Broker (with `BrokerSearch` component) and Surplus Lines Broker (with `BrokerSearch` component). Save via `PUT /api/policies/:id`.

**REQ-POL-FE-F-010:** The **Additional Insureds** tab shall display a list of additional insured parties with columns: Name, Role. Add insured: opens `InsuredSearch`. Remove: delete icon with confirmation.

**REQ-POL-FE-F-011:** The **Financial Summary** tab shall display: Gross Premium, Net Premium, Commission (read-only calculated field = Gross − Net), as `FieldGroup` rows. *(OQ-003 resolution required for full financial view calculations.)*

**REQ-POL-FE-F-012:** The **Invoices** tab shall display a `ResizableGrid` of policy invoices with columns: Invoice Number, Date, Amount, Status (Unpaid/Paid), Due Date.

**REQ-POL-FE-F-013:** The **Transactions** tab shall display a `ResizableGrid` of policy transactions with columns: Transaction Date, Type, Amount, Reference.

**REQ-POL-FE-F-014:** The **Audit** tab shall display `AuditTable` loading from `GET /api/policies/:id/audit`. On first open: POST `{ action: 'Policy Opened', entityType: 'Policy', entityId: id }`.

**REQ-POL-FE-F-015:** A `PolicySectionViewPage` shall be registered at `/policies/:policyId/sections/:sectionId` displaying the section details header (Section Reference, Class of Business, dates, limits/excess/premium fields — read-only for Active policies, editable for Draft).

**REQ-POL-FE-F-016:** The `PolicySectionViewPage` shall render tabs: **Coverages**, **Deductions**, **Participations**. Each tab shall display a `ResizableGrid` matching the equivalent quote section tab structure.

**REQ-POL-FE-F-017:** `PolicyViewPage` shall write a `Policy Closed` audit event when the component unmounts (via `useEffect` cleanup calling `POST /api/policies/:id/audit`).

#### BE Requirements — `backend/nest/src/policies/`

**REQ-POL-BE-F-001:** Create `policies.module.ts`, `policies.controller.ts`, `policies.service.ts` following the module pattern.

**REQ-POL-BE-F-002:** `PoliciesController` shall expose `GET /api/policies` returning `{ data: Policy[] }` with fields: id, reference, insured, insured_id, placing_broker, class_of_business, inception_date, expiry_date, status, tenant_id.

**REQ-POL-BE-F-003:** `PoliciesController` shall expose `GET /api/policies/:id` returning `{ data: Policy }` with all fields.

**REQ-POL-BE-F-004:** `PoliciesController` shall expose `POST /api/policies` accepting `{ submission_id, quote_id, insured, inception_date, expiry_date, class_of_business, ... }` and returning `201 { data: Policy }`.

**REQ-POL-BE-F-005:** `PoliciesController` shall expose `PUT /api/policies/:id` for editable fields.

**REQ-POL-BE-F-006:** `PoliciesController` shall expose sections CRUD: `GET /api/policies/:id/sections`, `POST /api/policies/:id/sections`, `PUT /api/policies/:id/sections/:sectionId`, `DELETE /api/policies/:id/sections/:sectionId`.

**REQ-POL-BE-F-007:** `PoliciesController` shall expose coverages CRUD per section: `GET|POST|PUT|DELETE /api/policies/:policyId/sections/:sectionId/coverages/:coverageId?`.

**REQ-POL-BE-F-008:** `PoliciesController` shall expose `GET /api/policies/:id/audit` and `POST /api/policies/:id/audit`.

**REQ-POL-BE-F-009:** `PoliciesController` shall expose `GET /api/policies/:policyId/invoices` returning `{ data: Invoice[] }`.

**REQ-POL-BE-F-010:** `PoliciesController` shall expose `GET /api/policies/:policyId/transactions` returning `{ data: Transaction[] }`.

**REQ-POL-BE-F-011:** `PoliciesController` shall expose `GET /api/policies/:policyId/sections/:sectionId/participations` and `POST /api/policies/:policyId/sections/:sectionId/participations`.

**Impact Analysis — Policies:**
- **FE Impact:** New domain folder `policies/` with PoliciesListPage, PolicyViewPage, PolicySectionViewPage and all tab components.
- **API Impact:** Full policies module — ~14 endpoints.
- **DB Impact:** Verify `policy`, `policy_section`, `policy_section_coverage`, `policy_section_deduction`, `policy_section_participation`, `invoice`, `policy_transaction` tables.

---

### 4.9 Batch E — Claims Domain

**Status:** ❌ Not started. Backup has ClaimViewPage, ClaimDetails, ClaimFinancials, ClaimTransactions, ClaimAudit, ClaimCreatePage.

#### FE Requirements — `frontend/src/claims/` *(new domain folder)*

**REQ-CLM-FE-F-001:** Create `claims/` domain folder with `claims.module.ts`, `claims.requirements.md`.

**REQ-CLM-FE-F-002:** A `ClaimsListPage` shall exist at `/claims` displaying a `ResizableGrid` with columns: Reference, Policy Reference, Insured, Date of Loss, Status, Reserve Amount.

**REQ-CLM-FE-F-003:** A `ClaimViewPage` shall exist at `/claims/:id` fetching `GET /api/claims/:id` and displaying: Reference (header), Status badge, Policy Reference (linked), Insured, Date of Loss, Date Reported.

**REQ-CLM-FE-F-004:** `ClaimViewPage` shall render a `TabsNav` with tabs: **Details**, **Financials**, **Transactions**, **Audit**.

**REQ-CLM-FE-F-005:** The **Details** tab shall display fields: Description of Loss, Type of Loss (dropdown: Property Damage, Bodily Injury, Business Interruption, Other), Location of Loss, Claimant Name, Claimant Contact.

**REQ-CLM-FE-F-006:** The **Financials** tab shall display: Reserve Amount (editable), Paid to Date (read-only from transactions sum), Outstanding Reserve (calculated = Reserve − Paid).

**REQ-CLM-FE-F-007:** The **Transactions** tab shall display a `ResizableGrid` with columns: Date, Type (Reserve Movement / Payment / Recovery), Amount, Description, Created By. Add transaction button calls `POST /api/claims/:id/transactions`.

**REQ-CLM-FE-F-008:** The **Audit** tab shall display `AuditTable` loading from `GET /api/claims/:id/audit`. On first open: POST `{ action: 'Claim Opened', entityType: 'Claim', entityId: id }`.

**REQ-CLM-FE-F-009:** A `ClaimCreatePage` shall exist at `/claims/new` or accessible via `+ New Claim` button on the claims list. It shall include fields: Policy Reference (searchable), Date of Loss (date picker), Date Reported, Description of Loss, Type of Loss. On submit calls `POST /api/claims`.

#### BE Requirements — `backend/nest/src/claims/` *(new module)*

**REQ-CLM-BE-F-001:** Create `claims.module.ts`, `claims.controller.ts`, `claims.service.ts`.

**REQ-CLM-BE-F-002:** `ClaimsController` shall expose `GET /api/claims` returning `{ data: Claim[] }`.

**REQ-CLM-BE-F-003:** `ClaimsController` shall expose `GET /api/claims/:id` returning `{ data: Claim }`.

**REQ-CLM-BE-F-004:** `ClaimsController` shall expose `POST /api/claims` accepting `{ policy_id, date_of_loss, date_reported, description, loss_type, claimant_name, claimant_contact }` returning `201 { data: Claim }`.

**REQ-CLM-BE-F-005:** `ClaimsController` shall expose `PUT /api/claims/:id` for editable claim fields.

**REQ-CLM-BE-F-006:** `ClaimsController` shall expose `GET /api/claims/:id/transactions` and `POST /api/claims/:id/transactions` accepting `{ type, amount, description, date }`.

**REQ-CLM-BE-F-007:** `ClaimsController` shall expose `GET /api/claims/:id/audit` and `POST /api/claims/:id/audit`.

**Impact Analysis — Claims:**
- **FE Impact:** New `claims/` domain folder with ~4 components.
- **API Impact:** Claims module — ~7 endpoints.
- **DB Impact:** `claim` table: `(id, reference, policy_id FK, status, date_of_loss, date_reported, description, loss_type, claimant_name, claimant_contact, reserve_amount, tenant_id)`. `claim_transaction` table: `(id, claim_id FK, type, amount, description, date, created_by)`.

---

### 4.10 Batch F — Workflow Domain

**Status:** ❌ Stub only. Backup has WorkflowPage, ClearanceWorkflowPage, DataQualityPage, WorkflowDirectoryPage.

#### FE Requirements — `frontend/src/workflow/`

**REQ-WRK-FE-F-001:** A `WorkflowPage` shall exist at `/workflow` rendering navigation cards for: Clearance, Data Quality, My Work Items, Workflow Directory.

**REQ-WRK-FE-F-002:** A `ClearanceWorkflowPage` shall exist at `/workflow/clearance` displaying submissions pending clearance in a `ResizableGrid` with columns: Reference, Insured, Placing Broker, Date Submitted, Potential Duplicates count. Each row's "Review" action navigates to `/workflow/clearance/:id`.

**REQ-WRK-FE-F-003:** The clearance review page at `/workflow/clearance/:id` shall display the submission's details panel on the left and a list of potential duplicate records on the right (Reference, Match Score, Record Type). Actions: Clear (confirm unique), Mark as Duplicate (confirm duplicate).

**REQ-WRK-FE-F-004:** A `DataQualityPage` shall exist at `/workflow/data-quality` displaying records failing data quality checks in a `ResizableGrid` with columns: Entity Type, Reference, Field, Issue Description. Each row links to the entity's view page.

**REQ-WRK-FE-F-005:** A `WorkflowDirectoryPage` shall exist at `/workflow/directory` listing all active workflow processes (submissions in clearance, quotes pending review, etc.) grouped by workflow type.

**REQ-WRK-FE-F-006:** A `MyWorkItemsPage` shall exist at `/my-work-items` displaying all records assigned to the current user in a `ResizableGrid` with columns: Type, Reference, Description, Due Date, Priority. Each row links to the relevant entity view page.

#### BE Requirements — `backend/nest/src/workflow/` *(new module)*

**REQ-WRK-BE-F-001:** Create `workflow.module.ts`, `workflow.controller.ts`, `workflow.service.ts`.

**REQ-WRK-BE-F-002:** `WorkflowController` shall expose `GET /api/workflow/submissions` returning `{ data: WorkflowSubmission[] }` — submissions with `status = 'Clearance'`.

**REQ-WRK-BE-F-003:** `WorkflowController` shall expose `POST /api/clearance/check/:id` that runs duplicate detection against the submissions table, returning `{ data: { matches: PotentialDuplicate[] } }`.

**REQ-WRK-BE-F-004:** `WorkflowController` shall expose `POST /api/clearance/:id/clear` setting submission status to `Quoted` pipeline entry, `POST /api/clearance/:id/confirm-duplicate` marking as duplicate.

**REQ-WRK-BE-F-005:** `WorkflowController` shall expose `GET /api/my-work-items` (JWT-guarded) returning records assigned to the requesting user across all entity types.

**REQ-WRK-BE-F-006:** `WorkflowController` shall expose `GET /api/workflow/data-quality` returning records failing configured data quality checks.

**Impact Analysis — Workflow:**
- **FE Impact:** WorkflowPage, ClearanceWorkflowPage, DataQualityPage, WorkflowDirectoryPage, MyWorkItemsPage.
- **API Impact:** Workflow module — ~7 endpoints. Clearance endpoints already exist in backup migration path.
- **DB Impact:** No new tables required; uses `submission` status transitions and existing `data_quality_settings`.

---

### 4.11 Batch G — Finance Domain

**Status:** ❌ Stub only. Backup has FinancePage (nav), InvoicesPage, PaymentsPage (Cash Batching), TrialBalancePage.

> **OQ-002 (Answered):** Invoice ownership is the `invoices` shared module. Finance *consumes* invoices.  
> **OQ-003 (Open — partially blocks Financial calculations):** Financial view calcs (Whole/Market/Line premium views) not yet assigned.

#### FE Requirements — `frontend/src/finance/`

**REQ-FIN-FE-F-001:** A `FinancePage` shall exist at `/finance` rendering navigation cards for: Invoices, Payments / Cash Batching, Trial Balance.

**REQ-FIN-FE-F-002:** An `InvoicesPage` shall exist at `/finance/invoices` displaying all invoices in a `ResizableGrid` with columns: Invoice Number, Entity (Policy/BA), Reference, Date, Amount (currency + value), Status (Unpaid/Paid/Overdue). Status "Overdue" renders in red.

**REQ-FIN-FE-F-003:** Invoices shall be filterable by: Status (All | Unpaid | Paid | Overdue), Date Range (from/to date pickers). Filters applied client-side.

**REQ-FIN-FE-F-004:** A `CashBatchingPage` shall exist at `/finance/cash-batching` displaying unallocated payment records in a `ResizableGrid` with columns: Payment Date, Reference, Amount, Bank Account. Each row has an "Allocate" action.

**REQ-FIN-FE-F-005:** A `CashBatchingCreatePage` shall exist at `/finance/cash-batching/new` with fields: Payment Date (date picker), Amount (numeric), Bank Account (dropdown), Reference (text), Notes (textarea). Submits via `POST /api/finance/payments`.

**REQ-FIN-FE-F-006:** A `TrialBalancePage` shall exist at `/finance/trial-balance` displaying the trial balance report in a grouped table: Account Code, Account Name, Debit, Credit, Net. A "Run as of Date" date picker triggers `GET /api/finance/trial-balance?asOf=YYYY-MM-DD`.

#### BE Requirements — `backend/nest/src/finance/` *(new module)*

**REQ-FIN-BE-F-001:** Create `finance.module.ts`, `finance.controller.ts`, `finance.service.ts`.

**REQ-FIN-BE-F-002:** `FinanceController` shall expose `GET /api/finance/invoices` with query params `status?` and `from?/to?` (date strings), returning `{ data: Invoice[] }`.

**REQ-FIN-BE-F-003:** `FinanceController` shall expose `GET /api/finance/payments` returning unallocated payments and `POST /api/finance/payments` for new payment records.

**REQ-FIN-BE-F-004:** `FinanceController` shall expose `GET /api/finance/trial-balance?asOf=YYYY-MM-DD` returning `{ data: TrialBalanceLine[] }`.

**Impact Analysis — Finance:**
- **FE Impact:** FinancePage hub, InvoicesPage, CashBatchingPage, CashBatchingCreatePage, TrialBalancePage.
- **API Impact:** Finance module — ~5 endpoints.
- **DB Impact:** `invoice` table (shared with policies via FK), `payment` table: `(id, date, amount, bank_account, reference, notes, allocated_to_invoice_id FK nullable)`.

---

### 4.12 Batch H — Binding Authorities Domain

**Status:** ❌ Stub only. The backup contains the largest domain in terms of file count.

#### FE Requirements — `frontend/src/binding-authorities/`

**REQ-BA-FE-F-001:** A `BindingAuthoritiesListPage` shall exist at `/binding-authorities` displaying all BA contracts in a `ResizableGrid` with columns: Reference, Name, Coverholder, Inception Date, Expiry Date, Status. Each Reference links to `/binding-authorities/:id`.

**REQ-BA-FE-F-002:** A `BindingAuthorityViewPage` shall exist at `/binding-authorities/:id` fetching `GET /api/binding-authorities/:id` and displaying a header with: Reference, Name, Status badge, Coverholder, Inception/Expiry dates.

**REQ-BA-FE-F-003:** `BindingAuthorityViewPage` shall render a `TabsNav` with tabs: **Details**, **Sections**, **Transactions**, **Documents**, **Financial Summary**, **GPI Monitoring**, **Associated Policies**, **Associated Claims**, **Audit**.

**REQ-BA-FE-F-004:** The **Details** tab shall display BA core fields in a `FieldGroup`: Contract Reference, Name, Coverholder (party search), Lead Insurer (party search), Class of Business, Inception Date, Expiry Date, Maximum Limit, Territory/Jurisdiction.

**REQ-BA-FE-F-005:** The **Sections** tab shall display a `ResizableGrid` of BA sections with columns: Reference, Class of Business, Inception, Expiry, Maximum Limit, Status. FiPlus in actions `<th>` to add section; FiSearch + FiTrash2 per row.

**REQ-BA-FE-F-006:** A `BindingAuthoritySectionViewPage` shall exist at `/binding-authorities/:baId/sections/:sectionId` with tabs: **Details**, **Coverage**, **Rating Configuration**, **GPI Monitoring**, **Authorized Risk Codes**, **Participations**.

**REQ-BA-FE-F-007:** The **Coverage** tab shall display a list of coverage lines with columns: Type, Sublimit, Deductible. Add/Edit/Delete actions.

**REQ-BA-FE-F-008:** The **Authorized Risk Codes** tab shall display a list of approved risk codes. Add code: text input + confirm. Remove: delete icon. API: `GET|POST|DELETE /api/binding-authority-sections/:sectionId/authorized-risk-codes/:code?`.

**REQ-BA-FE-F-009:** The **Participations** tab shall display a grid of syndicate/insurer participations with columns: Syndicate/Insurer, Written Line %, Signed Line %.

**REQ-BA-FE-F-010:** The **Transactions** tab on `BindingAuthorityViewPage` shall display all BA-level transactions in a `ResizableGrid` with columns: Date, Type, Amount, Reference, Description. Add transaction: inline form.

**REQ-BA-FE-F-011:** The **Documents** tab shall display a list of generated documents with columns: Document Name, Type, Date Generated, Actions (Download). A "+ Generate Document" button triggers the document generation API.

**REQ-BA-FE-F-012:** A **Bordereau Import** flow shall be accessible from the Documents tab or via action button. It shall present a wizard with steps: (1) Select File, (2) Map Columns, (3) Confirm Import. API: `POST /api/bordereaux/import`.

**REQ-BA-FE-F-013:** The **GPI Monitoring** tab shall display a summary of Gross Premium Income metrics vs. authority limits in a table: Metric, Authority Limit, Actual, Variance, % Used.

**REQ-BA-FE-F-014:** The **Financial Summary** tab shall display: Total Premium Written, Total Commission, Total Net Premium, grouped by currency.

**REQ-BA-FE-F-015:** The **Audit** tab shall display `AuditTable` loading from `GET /api/binding-authorities/:id/audit`. On first open: POST `{ action: 'Binding Authority Opened' }`.

**REQ-BA-FE-F-016:** An `EndorsementPage` for binding authorities shall exist at `/binding-authorities/:id/endorsements/new`, displaying an endorsement form with: Endorsement Type, Effective Date, Description, affected sections picker.

#### BE Requirements — `backend/nest/src/binding-authorities/` *(new module)*

**REQ-BA-BE-F-001:** Create `binding-authorities.module.ts`, `binding-authorities.controller.ts`, `binding-authorities.service.ts`.

**REQ-BA-BE-F-002:** `BindingAuthoritiesController` shall expose `GET /api/binding-authorities`, `GET /api/binding-authorities/:id`, `POST /api/binding-authorities`, `PUT /api/binding-authorities/:id`.

**REQ-BA-BE-F-003:** `BindingAuthoritiesController` shall expose sections CRUD: `GET|POST /api/binding-authorities/:id/sections` and `PUT /api/binding-authority-sections/:sectionId`.

**REQ-BA-BE-F-004:** `BindingAuthoritiesController` shall expose `GET|POST /api/binding-authority-sections/:sectionId/authorized-risk-codes` and `DELETE /api/binding-authority-sections/:sectionId/authorized-risk-codes/:code`.

**REQ-BA-BE-F-005:** `BindingAuthoritiesController` shall expose `GET|POST /api/binding-authority-sections/:sectionId/participations`.

**REQ-BA-BE-F-006:** `BindingAuthoritiesController` shall expose `GET|POST|PUT /api/binding-authorities/:id/transactions` and `GET|POST /api/binding-authorities/:id/audit`.

**REQ-BA-BE-F-007:** `BindingAuthoritiesController` shall expose `POST /api/binding-authorities/:id/documents/generate`, `GET /api/binding-authorities/:id/documents`, `GET /api/binding-authority/documents/:docId/download`.

**REQ-BA-BE-F-008:** `BindingAuthoritiesController` shall expose `POST /api/bordereaux/import` accepting a file upload (multipart) and returning `{ data: { imported: number, skipped: number, errors: string[] } }`.

**Impact Analysis — Binding Authorities:**
- **FE Impact:** New domain with ~8 page components and multiple tab components.
- **API Impact:** Binding authorities module — ~18+ endpoints.
- **DB Impact:** `binding_authority`, `ba_section`, `ba_section_coverage`, `ba_section_participation`, `ba_section_authorized_risk_code`, `ba_transaction`, `ba_document` tables. (Most exist in backup migration scripts.)

---

### 4.13 Batch I — Reporting Domain

**Status:** ❌ Stub only. Backup has full dashboard builder and report runner.

#### FE Requirements — `frontend/src/reporting/`

**REQ-REP-FE-F-001:** A `ReportingPage` shall exist at `/reporting` rendering navigation cards for: Dashboards, Reports.

**REQ-REP-FE-F-002:** A `DashboardsListPage` shall exist at `/reporting/dashboards` displaying user dashboards in a grid of cards with: Name, description, thumbnail preview, Last Modified date. Actions: Open, Edit, Delete, Share.

**REQ-REP-FE-F-003:** A `DashboardViewPage` shall exist at `/reporting/dashboards/:id` displaying the dashboard widgets in a draggable/resizable grid layout. Each widget renders one of: Chart (bar/line/pie), Metric (single KPI value + trend), Table (data table with column config), Text (free text/markdown).

**REQ-REP-FE-F-004:** A `DashboardCreatePage` shall exist at `/reporting/dashboards/new` providing: Name field, Description field, Template selector (blank, or one of the predefined templates), Submit button → `POST /api/report-templates`.

**REQ-REP-FE-F-005:** A `DashboardConfigurePage` shall exist at `/reporting/dashboards/:id/configure` allowing: add widget (via `AddWidgetModal`), edit widget properties (via `WidgetGeneralTab`), configure widget filters (via `WidgetFilterModal`), reorder widgets via drag handles.

**REQ-REP-FE-F-006:** `AddWidgetModal` shall offer four widget types: Chart, Metric, Table, Text. Selecting one appends a default widget config to the dashboard.

**REQ-REP-FE-F-007:** Widget filter configuration shall support field-based filters: field name, operator (equals, contains, greater than, less than, between), value.

**REQ-REP-FE-F-008:** A `ReportsPage` shall exist at `/reporting/reports` listing saved report templates in a table with columns: Name, Last Run Date, Schedule (if any), Actions (Run, Edit, Delete, Share).

**REQ-REP-FE-F-009:** A `ReportCreatePage` shall exist at `/reporting/reports/new` with fields: Name, Description, Entity Type (dropdown: Submissions, Quotes, Policies, Claims, Parties), Field selector (multi-select from entity schema), Filter builder (field + operator + value rows), Sort (field + direction).

**REQ-REP-FE-F-010:** A `ReportRunPage` shall exist at `/reporting/reports/:id/run` displaying the report output as a paginated data table. A "Export CSV" button calls `GET /api/report-executions/:id?format=csv`.

**REQ-REP-FE-F-011:** A `ShareModal` component shall allow sharing a dashboard or report with specific users or user roles by email or role name. Calls `POST /api/report-templates/:id/shares`.

#### BE Requirements — `backend/nest/src/reporting/` *(new module)*

**REQ-REP-BE-F-001:** Create `reporting.module.ts`, `reporting.controller.ts`, `reporting.service.ts`.

**REQ-REP-BE-F-002:** `ReportingController` shall expose `GET|POST|PUT|DELETE /api/report-templates` and `GET /api/report-templates/:id`.

**REQ-REP-BE-F-003:** `ReportingController` shall expose `GET|POST|PUT|DELETE /api/report-templates/:dashboardId/widgets`.

**REQ-REP-BE-F-004:** `ReportingController` shall expose `POST /api/report-executions` (execute a report template, returning row data) and `GET /api/report-executions/:reportTemplateId`.

**REQ-REP-BE-F-005:** `ReportingController` shall expose `GET|POST|DELETE /api/report-templates/:id/shares`.

**REQ-REP-BE-F-006:** `ReportingController` shall expose `POST /api/dashboards/widgets/data` accepting `{ widgetConfig, filters }` and returning `{ data: any[] }` computed from the appropriate DB query.

**Impact Analysis — Reporting:**
- **FE Impact:** New domain with ~9 page/modal components.
- **API Impact:** Reporting module — ~12 endpoints.
- **DB Impact:** `report_template`, `report_widget`, `report_execution`, `report_share` tables (exist in backup migration scripts).

---

### 4.14 Batch J — Locations (Shared Module)

**Status:** ❌ Not started. OQ-005 answered: Locations is a shared module at `shared/locations/`.

#### FE Requirements — `frontend/src/shared/locations/`

**REQ-LOC-FE-F-001:** A `LocationsGrid` shared component shall display a list of locations in a `ResizableGrid` with columns: Reference, Street Address, City, State/Province, Country, Postcode, Latitude, Longitude, Occupancy Type, Construction Type, Year Built, Sum Insured.

**REQ-LOC-FE-F-002:** `LocationsGrid` shall accept an `entityType` and `entityId` prop and call `GET /api/locations-schedule/imports?entityType=:entityType&entityId=:entityId` for data.

**REQ-LOC-FE-F-003:** A "Import CSV" button shall trigger file selection and call `POST /api/locations-schedule/import` (multipart). On success the grid refreshes.

**REQ-LOC-FE-F-004:** The grid shall support versioning: a version selector dropdown calls `GET /api/locations-schedule/imports/:id/versions`. "Revert to Version" calls `POST /api/locations-schedule/imports/:id/revert/:versionNumber`.

**REQ-LOC-FE-F-005:** `LocationsGrid` shall be embedded in `QuoteSectionViewPage` and `PolicySectionViewPage` when the section's class of business has `requiresLocationsSchedule = true`.

#### BE Requirements — Existing backend (locations already partially in backup)

**REQ-LOC-BE-F-001:** `LocatiosController` (or add to shared routes) shall expose `POST /api/locations-schedule/import`, `GET /api/locations-schedule/imports`, `PUT /api/locations-schedule/imports/:id`, `GET /api/locations-schedule/imports/:id/versions`, `POST /api/locations-schedule/imports/:id/revert/:versionNumber`, `GET /api/locations-schedule/imports/:id/historical`.

---

## 5. Shared Component Gaps

| Component | Status | Gap |
|-----------|--------|-----|
| `CopySectionsModal` | ❌ | Backup has modal for copying sections from one record to another; OQ-011 (domain logic check) still open |
| `Movement` | ❌ | Backup shows policy/endorsement movement calculations; OQ-012 (display-only vs calculate) still open |
| `PolicySectionDetailsHeader` | ❌ | OQ-013 (domain-specific vs reusable primitive) still open |
| `SectionDeductions` | ❌ | OQ-014 (calculation logic check) still open |
| `SectionParticipations` | ❌ | OQ-015 (calculation logic check) still open |
| Application Home / Dashboard widgets | 🔶 | `ApplicationHomePage.jsx` entry in backup uses `KpiCards`, `CumulativeGwpChart`, `GwpChart`, `RecentRecords` wired to real API data; cleaned has 5 widgets but integration with real API needs verification |
| Notifications | ✅ | `NotificationDock` + `notifications.ts` complete |
| Workspace Tabs | ❌ | Backup has workspace context (OQ-017 answered: preserve); not implemented in cleaned |

---

## 6. Open Questions Relevant to This Plan

| OQ | Status | Blocks |
|----|--------|--------|
| OQ-003 | Open | Full financial calculations (Policies FE §4.8, Finance §4.11) |
| OQ-004 | Open (recommend: simple form, not auth domain) | Profile §4.6 |
| OQ-008 | Open | Permission matrix for all role-based guards |
| OQ-011 | Open | CopySectionsModal shared component |
| OQ-012 | Open | Movement component |
| OQ-013 | Open | PolicySectionDetailsHeader |
| OQ-014–016 | Open | SectionDeductions, SectionParticipations |

> **Recommendation for OQ-004:** Treat Profile as a thin page in the `profile/` domain (no business logic). Calls `GET /api/auth/me` and `PUT /api/auth/profile`. Proceed without waiting for formal resolution.

---

## 7. Routing Registration Checklist

All new pages require registration in the application router (typically `frontend/src/shell/AppLayout.tsx` or a dedicated `routes.tsx`). Verify the following paths are registered as each batch is completed:

| Path | Component | Batch |
|------|-----------|-------|
| `/parties/:id` | `PartyViewPage` | B |
| `/search` | `SearchPage` | B |
| `/profile` | `ProfilePage` | C |
| `/settings` | `SettingsPage` | C |
| `/settings/rating-rules` + `/:id` | `RatingRulesPage`, `RatingRulesDetailPage` | C |
| `/settings/products` + `/:id` | `ProductListPage`, `ProductConfigPage` | C |
| `/settings/data-quality` | `DataQualitySettingsPage` | C |
| `/settings/organisation` | `OrganisationDetailPage` | C |
| `/policies` | `PoliciesListPage` | D |
| `/policies/:id` | `PolicyViewPage` | D |
| `/policies/:policyId/sections/:sectionId` | `PolicySectionViewPage` | D |
| `/claims` + `/claims/:id` + `/claims/new` | Claim pages | E |
| `/workflow` + sub-routes | Workflow pages | F |
| `/my-work-items` | `MyWorkItemsPage` | F |
| `/finance` + sub-routes | Finance pages | G |
| `/binding-authorities` + sub-routes | BA pages | H |
| `/reporting` + sub-routes | Reporting pages | I |

---

## 8. Sidebar Navigation Verification

The `Sidebar.tsx` in cleaned must expose navigation links for all implemented domains. Check that these nav items are correctly wired after each batch:

| Nav Item | Route | Batch |
|----------|-------|-------|
| Submissions | `/submissions` | ✅ Done |
| Quotes | `/quotes` | ✅ Done |
| Parties | `/parties` | ✅ Done |
| Search | `/search` | B |
| Policies | `/policies` | D |
| Claims | `/claims` | E |
| Workflow | `/workflow` | F |
| My Work Items | `/my-work-items` | F |
| Finance | `/finance` | G |
| Binding Authorities | `/binding-authorities` | H |
| Reporting | `/reporting` | I |
| Settings | `/settings` | C |

---

## 9. Change Log

| Date | Change |
|------|--------|
| 2026-03-26 | Initial gap analysis created from backup vs cleaned comparison |
