# REQUIREMENTS — Settings Page

**Domain Code:** `SETTINGS`  
**Location:** `domains/settings/components/`  
**Status:** Active — tile grid built; Module Licensing company pages in progress; all other tiles navigate to NotFound (placeholder)  
**Test file:** `settings.test.tsx`

---

## 1. Scope

**In scope:**
- Tile grid layout: responsive 3→2→1 column grid of clickable setting category tiles
- Six tiles, each navigating to a dedicated route
- Role-based tile visibility: Module Licensing tile visible to `internal_admin` only
- Tiles for unbuilt sections navigate to a shared NotFound page
- Module Licensing: company list page + reusable per-company config page (param-driven)
- Module toggling with dependency validation (unchanged from strawman)

**Out of scope (deferred):**
- Account Administration page content
- Product Configuration page content
- Organisation Configuration page content (except the deferred matching rules feature noted below)
- Rating Rules page content
- Data Quality Configuration page content
- Real API calls for module saves (requires org_modules DB migration)
- Audit log display
- Add Company flow (requires OQ-040/OQ-041 resolved — party search modal architecture)

**Deferred feature — Organisation Configuration: Submission Matching Rules**  
Each organisation should be able to define the field combination(s) that identify "the same underlying risk" across multiple submissions (placed by different brokers). These rules are used to auto-suggest related submissions on the Related Submissions tab of the Submission View Page.  
When this feature is built it shall:
- Live at `/settings/organisations/:orgCode/matching-rules` (a sub-page of Organisation Configuration)
- Allow `client_admin` users to add, edit, and delete matching rule sets for their org
- Store rules in a new `org_submission_matching_rules` table (columns: `id`, `org_code`, `field_list` (JSON array of field names), `label`, `is_active`)
- Valid fields for matching: `insuredId`, `insured` (name), `inceptionDate` (year only), `classOfBusiness`, `contractType`
- Be consumed by a future `/api/submissions/:id/suggested-related` endpoint that returns auto-suggested related submissions
- Reference: SubmissionTabs/requirements.md §R09 Future Development note

---

## 1a. Impact Analysis

### UI Components (Block 1 — Tile Grid + Module Licensing)
| Component | Path | Action |
|---|---|---|
| SettingsPage | `frontend/src/settings/SettingsPage.tsx` | Exists — tile grid |
| ModuleLicensingPage | `frontend/src/settings/ModuleLicensingPage.tsx` | Exists |

### UI Components (Batch C)
| Component | Path | Action |
|---|---|---|
| RatingRulesPage | `frontend/src/settings/RatingRulesPage.tsx` | Create |
| RatingRulesDetailPage | `frontend/src/settings/RatingRulesDetailPage.tsx` | Create |
| ProductListPage | `frontend/src/settings/ProductListPage.tsx` | Create |
| ProductConfigPage | `frontend/src/settings/ProductConfigPage.tsx` | Create |
| DataQualitySettingsPage | `frontend/src/settings/DataQualitySettingsPage.tsx` | Create |
| OrganisationDetailPage | `frontend/src/settings/OrganisationDetailPage.tsx` | Create |

### API Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/settings/data-quality` | Load data quality settings |
| PUT | `/api/settings/data-quality` | Save data quality settings |
| GET | `/api/settings/products` | List products |
| POST | `/api/settings/products` | Create product |
| GET | `/api/settings/products/:id` | Fetch product |
| PUT | `/api/settings/products/:id` | Update product |
| DELETE | `/api/settings/products/:id` | Delete product |
| GET | `/api/settings/products/:id/workflow-steps` | List workflow steps |
| POST | `/api/settings/products/:id/workflow-steps` | Create step |
| GET | `/api/rating-schedules` | List rating schedules |
| GET | `/api/rating-schedules/:id` | Fetch schedule |
| POST | `/api/rating-schedules` | Create schedule |
| PUT | `/api/rating-schedules/:id` | Update schedule |
| GET | `/api/rating-schedules/:id/rules` | List rules |
| POST | `/api/rating-rules` | Create rule |
| DELETE | `/api/rating-rules/:id` | Delete rule |
| GET | `/api/organisation-entities` | List orgs |
| POST | `/api/organisation-entities` | Create org |
| PUT | `/api/organisation-entities/:id` | Update org |
| GET | `/api/organisation-entities/:id/hierarchy-config` | Get hierarchy levels |
| POST | `/api/organisation-entities/:id/hierarchy-config` | Save hierarchy levels |
| GET | `/api/organisation-entities/:id/hierarchy-links` | Get hierarchy links |
| POST | `/api/organisation-entities/:id/hierarchy-links` | Save hierarchy links |
| GET | `/api/users` | List users (org assignment) |

### Database Tables
| Table | Impact |
|---|---|
| `org_modules` | CRUD (module licensing) |
| `products` | CRUD |
| `product_workflow_steps` | CRUD |
| `rating_schedules` | CRUD |
| `rating_rules` | CRUD |
| `org_entities` | CRUD |
| `org_hierarchy_config` | CRUD |
| `org_hierarchy_links` | CRUD |
| `data_quality_settings` | Read / update |

### Dependencies
- `@/shared/lib/api-client/api-client` — `get`, `post`, `put`, `del`
- `@/shared/lib/auth-session/auth-session` — `getSession` (role checks)
- `@/shell/SidebarContext` — `useSidebarSection`
- `react-router-dom` — `useNavigate`, `useParams`, `Link`

---

## 2. Requirements

### Settings tile grid

**REQ-SETTINGS-GRID-F-001:** The settings page shall render a responsive tile grid: 3 columns at lg, 2 at md, 1 at sm.

**REQ-SETTINGS-GRID-F-002:** The tile grid shall contain the following tiles, shown only to the stated roles:

| Tile | Route | Visible to |
|------|-------|------------|
| Account Administration | `/settings/account` | `client_admin`, `internal_admin` |
| Product Configuration | `/settings/products` | `client_admin`, `internal_admin` |
| Organisation Configuration | `/settings/organisation` | `client_admin`, `internal_admin` |
| Rating Rules | `/settings/rating-rules` | `client_admin`, `internal_admin` |
| Data Quality Configuration | `/settings/data-quality` | `client_admin`, `internal_admin` |
| Module Licensing | `/settings/module-licensing` | `internal_admin` only |

**REQ-SETTINGS-GRID-F-003:** Each tile shall render: an icon in a rounded grey background, a title, a description, and a right-aligned chevron icon (`FiChevronRight`). Clicking the tile navigates to its route.

**REQ-SETTINGS-GRID-F-004:** The Module Licensing tile must not be rendered for any role other than `internal_admin`.

**REQ-SETTINGS-GRID-F-005:** For roles `client_admin` and `internal_admin`, all five non-platform tiles (Account Administration, Product Configuration, Organisation Configuration, Rating Rules, Data Quality Configuration) must be rendered.

**REQ-SETTINGS-GRID-F-006:** [DELETED — 2026-04-15: Batch C implements real pages for all settings tiles. This placeholder behaviour is fully superseded by REQ-SETTINGS-RATING-F-001, REQ-SETTINGS-PRODUCTS-F-001, REQ-SETTINGS-DQUALITY-F-001, and REQ-SETTINGS-ORG-F-001.]

**REQ-SETTINGS-GRID-F-007:** The previous inline `Organisation Settings` section and inline `Platform Admin` panel are replaced by the tile grid. No inline content remains on the settings index page.

### Platform Admin layer — Module Licensing (internal_admin only)

**REQ-SETTINGS-ADMIN-F-001:** The Module Licensing route (`/settings/module-licensing`) shall render a company list page visible only when `role === 'internal_admin'`.

**REQ-SETTINGS-ADMIN-F-002:** The company list page shall display a table of organisations using `.app-table` / `.table-wrapper` global styling. All headers left-aligned. Checkbox cells centre-aligned.

**REQ-SETTINGS-ADMIN-F-003:** Each cell in the module table shall contain a checkbox reflecting the current enabled state for that org/module combination.

**REQ-SETTINGS-ADMIN-F-004 (dependency guard — enable):** Attempting to enable `module:bordereau-import` for an org that does not have `module:binding-authorities` enabled shall be rejected with an alert message.

**REQ-SETTINGS-ADMIN-F-005 (dependency guard — cascade disable):** Disabling `module:binding-authorities` for an org that has `module:bordereau-import` enabled shall also disable `module:bordereau-import` and display an alert message.

**REQ-SETTINGS-ADMIN-F-006:** The Save button shall be disabled until at least one module state has been changed.

---

## 3. Traceability

| Requirement ID | Test file | Test ID |
|----------------|-----------|--------|
| REQ-SETTINGS-GRID-F-002 | `settings.test.tsx` | T-SETTINGS-GRID-R01 |
| REQ-SETTINGS-GRID-F-003 | `settings.test.tsx` | T-SETTINGS-GRID-R02 |
| REQ-SETTINGS-GRID-F-004 | `settings.test.tsx` | T-SETTINGS-GRID-R03 |
| REQ-SETTINGS-GRID-F-005 | `settings.test.tsx` | T-SETTINGS-GRID-R04 |
| REQ-SETTINGS-ADMIN-F-001 | `settings.test.tsx` | T-SETTINGS-ADMIN-R01 |
| REQ-SETTINGS-ADMIN-F-001 | `settings.test.tsx` | T-SETTINGS-ADMIN-R02 |
| REQ-SETTINGS-ADMIN-F-003 | `settings.test.tsx` | T-SETTINGS-ADMIN-R03 |
| REQ-SETTINGS-ADMIN-F-004 | `settings.test.tsx` | T-SETTINGS-ADMIN-R04 |
| REQ-SETTINGS-ADMIN-F-005 | `settings.test.tsx` | T-SETTINGS-ADMIN-R05 |

---

---

## 3b. Batch C — Rating Rules Pages

> **Backup Coverage Map sources read:**
> - `src/layouts/AppLayout/AppLayoutPages/Settings/RatingRulesPage.jsx`
> - `src/layouts/AppLayout/AppLayoutPages/Settings/RatingRulesDetailPage.jsx`
> - `backend/routes/rating-api.js`

| # | BackUp Feature | Requirement ID | Status |
|---|----------------|----------------|--------|
| 1 | Schedules table (Name, Effective From/To, Active) | REQ-SETTINGS-RATING-F-002 | COVERED |
| 2 | Conflicting Schedules tab | — | DEFERRED — Batch D |
| 3 | Schedule row → drill into detail | REQ-SETTINGS-RATING-F-003 | COVERED |
| 4 | Detail: schedule header (Name, dates, Active) editable | REQ-SETTINGS-RATING-F-004 | COVERED |
| 5 | Detail: rules table (Field, Operator, Value, Rate %, delete) | REQ-SETTINGS-RATING-F-005 | COVERED |
| 6 | Detail: Add Rule row | REQ-SETTINGS-RATING-F-005 | COVERED |
| 7 | Detail: grouped conditions (AND/OR logic operators) | — | DEFERRED — Batch D (complex rule-group logic) |
| 8 | Detail: Versions tab | — | DEFERRED — Batch D |
| 9 | Save button on detail | REQ-SETTINGS-RATING-F-006 | COVERED |

### Page Layout — RatingRulesPage

```
┌────────────────────────────────────────────────┐
│  outer: p-6 flex flex-col gap-6                │
├────────────────────────────────────────────────┤
│  Card title="Rating Schedules"                  │  ← unconditional
│    ResizableGrid: Name | Eff. From | Eff. To | Active | Actions │
│    [+ New Schedule button]                     │
└────────────────────────────────────────────────┘
```

### Page Layout — RatingRulesDetailPage

```
┌────────────────────────────────────────────────┐
│  outer: p-6 flex flex-col gap-6                │
├────────────────────────────────────────────────┤
│  Card title="Schedule Details"                  │  ← unconditional; header fields
│    Name [editable], Eff. From [date], Eff. To [date], Active [toggle] │
│    [Save button]                               │
├────────────────────────────────────────────────┤
│  Card title="Rating Rules"                      │  ← unconditional
│    Table: Field | Operator | Value | Rate % | Actions (delete) │
│    [+ Add Rule row]                            │
└────────────────────────────────────────────────┘
```

**REQ-SETTINGS-RATING-F-001:** A `RatingRulesPage` component shall exist at route `/settings/rating-rules`, accessible only to users with role `client_admin` or `internal_admin`. Unauthenticated users shall be redirected to `/login`.

**REQ-SETTINGS-RATING-F-002:** `RatingRulesPage` shall display all rating schedules in a table with columns: Name, Effective From, Effective To, Active. Data is loaded from `GET /api/rating-schedules` on mount.

**REQ-SETTINGS-RATING-F-003:** Clicking a schedule row in `RatingRulesPage` shall navigate to `/settings/rating-rules/:id` where `:id` is the schedule's `id`.

**REQ-SETTINGS-RATING-F-004:** A `RatingRulesDetailPage` component shall exist at route `/settings/rating-rules/:id`. It shall fetch `GET /api/rating-schedules/:id` on mount and display the schedule's Name (editable text), Effective From (editable date), Effective To (editable date), and Active (checkbox toggle) in a details card.

**REQ-SETTINGS-RATING-F-005:** `RatingRulesDetailPage` shall display a rules card showing a table of rating rules loaded from `GET /api/rating-schedules/:id/rules`, with columns: Field, Operator, Value, Rate %, Actions. An "+ Add Rule" button shall append a new editable row with a Field dropdown and Operator dropdown pre-populated with the valid options from the BackUp (`postcode`, `country`, `subdivision`, `sum_insured`, `construction_type`, `occupancy`, `year_built` for fields; `=`, `!=`, `>`, `<`, `>=`, `<=`, `IN`, `STARTS_WITH`, `ENDS_WITH`, `CONTAINS` for operators). Submitting a new row calls `POST /api/rating-rules`. Clicking the delete icon calls `DELETE /api/rating-rules/:id`.

**REQ-SETTINGS-RATING-F-006:** `RatingRulesDetailPage` shall include a "Save" button in the details card that calls `PUT /api/rating-schedules/:id` with the edited header fields and on HTTP 200 displays a toast "Schedule saved".

---

## 3c. Batch C — Products Pages

> **Backup Coverage Map sources read:**
> - `src/layouts/AppLayout/AppLayoutPages/Settings/ProductListPage.jsx`
> - `src/layouts/AppLayout/AppLayoutPages/Settings/ProductConfigPage.jsx`

| # | BackUp Feature | Requirement ID | Status |
|---|----------------|----------------|--------|
| 1 | Product cards grid (Name, Code, Type, LoB, UW Year) | REQ-SETTINGS-PRODUCTS-F-001 | COVERED |
| 2 | New Product modal form | REQ-SETTINGS-PRODUCTS-F-002 | COVERED |
| 3 | Delete product from list | — | DEFERRED — Batch D |
| 4 | Navigate to product detail (click card) | REQ-SETTINGS-PRODUCTS-F-003 | COVERED |
| 5 | General tab: Name, Code (read-only), Type, LoB, UW Year, Active, Description | REQ-SETTINGS-PRODUCTS-F-004 | COVERED |
| 6 | Workflow Steps tab: table of steps with Name, Code, Description, Active, Default | REQ-SETTINGS-PRODUCTS-F-005 | COVERED |
| 7 | Inline add-step form | REQ-SETTINGS-PRODUCTS-F-005 | COVERED |
| 8 | Drag-to-reorder steps | — | DEFERRED — Batch D |
| 9 | Delete step | — | DEFERRED — Batch D |

### Page Layout — ProductListPage

```
┌────────────────────────────────────────────────┐
│  outer: p-6 flex flex-col gap-6                │
├────────────────────────────────────────────────┤
│  [+ New Product button]   (top-right)          │  ← unconditional
├────────────────────────────────────────────────┤
│  Grid of product cards (1 col→2 col→3 col)     │  ← conditional on data loaded
│    Card: Name, Code badge, Type badge, LoB,    │
│           UW Year, Description (2 lines)       │
└────────────────────────────────────────────────┘
│  Modal (conditional on "+ New Product" click)  │
│    Name, Code (auto), Type, LoB, UW Year, Desc │
│    [Cancel] [Create Product]                   │
└────────────────────────────────────────────────┘
```

### Page Layout — ProductConfigPage

```
┌────────────────────────────────────────────────┐
│  outer: p-6 flex flex-col gap-6                │
├────────────────────────────────────────────────┤
│  TabsNav: [General | Workflow Steps]           │  ← unconditional
├────────────────────────────────────────────────┤
│  General tab (default):                        │
│    Card: Name, Code (RO), Type, LoB, UW Year,  │
│           Active, Description + [Save] button  │
├────────────────────────────────────────────────┤
│  Workflow Steps tab:                           │
│    Card: Table #, Name, Code, Active, Default  │
│    Inline add-step form at bottom of table     │
└────────────────────────────────────────────────┘
```

**REQ-SETTINGS-PRODUCTS-F-001:** A `ProductListPage` component shall exist at route `/settings/products`, loading products from `GET /api/settings/products` on mount and rendering each product as a card showing: Name, Code, Product Type (badge), Line of Business, and Underwriting Year.

**REQ-SETTINGS-PRODUCTS-F-002:** `ProductListPage` shall include a "+ New Product" button that opens a modal with fields: Name (required text), Code (auto-generated from Name, required), Product Type (dropdown: `open_market` / `delegated`), Line of Business (text), Underwriting Year (number), Description (textarea). Submitting the form calls `POST /api/settings/products` and on HTTP 201 closes the modal, refreshes the list, and shows a toast "Product created".

**REQ-SETTINGS-PRODUCTS-F-003:** Clicking a product card in `ProductListPage` shall navigate to `/settings/products/:id`.

**REQ-SETTINGS-PRODUCTS-F-004:** A `ProductConfigPage` component shall exist at route `/settings/products/:id`. It shall display a "General" tab with fields: Name (editable), Code (read-only), Product Type (dropdown), Line of Business (text), Underwriting Year (number), Active (toggle), Description (textarea). A "Save" button calls `PUT /api/settings/products/:id`; on HTTP 200 a toast "Product saved" appears.

**REQ-SETTINGS-PRODUCTS-F-005:** `ProductConfigPage` shall display a "Workflow Steps" tab showing steps loaded from `GET /api/settings/products/:id/workflow-steps` in a table with columns: #, Step Name, Code, Description, Active, Default. An inline "+ Add Step" row at the bottom of the table accepts: Step Name (required), Code (auto-generated), Description, Active (checkbox), Default (checkbox). Submitting the inline row calls `POST /api/settings/products/:id/workflow-steps`.

---

## 3d. Batch C — Data Quality Settings Page

> **Backup Coverage Map sources read:**
> - `src/layouts/AppLayout/AppLayoutPages/Settings/DataQualitySettingsPage.jsx`

| # | BackUp Feature | Requirement ID | Status |
|---|----------------|----------------|--------|
| 1 | Validation Rules section (4 toggles) | REQ-SETTINGS-DQUALITY-F-002 | COVERED |
| 2 | Severity Settings section (dropdown) | REQ-SETTINGS-DQUALITY-F-003 | COVERED |
| 3 | Monitoring section (autoCheck, email notif, notif email) | REQ-SETTINGS-DQUALITY-F-004 | COVERED |
| 4 | Save button | REQ-SETTINGS-DQUALITY-F-001 | COVERED |

### Page Layout — DataQualitySettingsPage

```
┌────────────────────────────────────────────────┐
│  outer: p-6 flex flex-col gap-6                │
├────────────────────────────────────────────────┤
│  Card title="Validation Rules"                  │  ← unconditional
│    Toggle: Enable BA Section Date Validation   │
│    Toggle: Enable Quote Mandatory Fields       │
│    Toggle: Enable Policy Mandatory Fields      │
│    Toggle: Exclude Draft Status                │
├────────────────────────────────────────────────┤
│  Card title="Severity Settings"                 │  ← unconditional
│    Severity Threshold [dropdown: low/med/high] │
├────────────────────────────────────────────────┤
│  Card title="Monitoring"                        │  ← unconditional
│    Toggle: Auto Check on Save                  │
│    Toggle: Email Notifications                 │
│    [conditional] Notification Email [input]    │
├────────────────────────────────────────────────┤
│  [Save Settings button]                        │  ← unconditional
└────────────────────────────────────────────────┘
```

**REQ-SETTINGS-DQUALITY-F-001:** A `DataQualitySettingsPage` component shall exist at route `/settings/data-quality`. It shall load current settings from `GET /api/settings/data-quality` on mount. A "Save Settings" button shall call `PUT /api/settings/data-quality` with the current settings state and on HTTP 200 display a toast "Settings saved".

**REQ-SETTINGS-DQUALITY-F-002:** The Validation Rules card shall display four labelled toggle switches: "Enable BA Section Date Validation", "Enable Quote Mandatory Fields", "Enable Policy Mandatory Fields", "Exclude Draft Status". Each toggle maps to a boolean field in the settings payload (`enableBASectionDateValidation`, `enableQuoteMandatoryFields`, `enablePolicyMandatoryFields`, `excludeDraftStatus`).

**REQ-SETTINGS-DQUALITY-F-003:** The Severity Settings card shall display a "Severity Threshold" dropdown with options: `low`, `medium`, `high`.

**REQ-SETTINGS-DQUALITY-F-004:** The Monitoring card shall display two toggles: "Auto Check on Save" and "Email Notifications". When "Email Notifications" is enabled, a text input "Notification Email" shall appear beneath it; when disabled, the email input shall be hidden.

---

## 3e. Batch C — Organisation Detail Page

> **Backup Coverage Map sources read:**
> - `src/layouts/AppLayout/AppLayoutPages/Settings/OrganisationDetailPage.jsx`
> - `src/layouts/AppLayout/AppLayoutPages/Settings/OrganisationDetailPage/InformationTab.jsx`
> - `src/layouts/AppLayout/AppLayoutPages/Settings/OrganisationDetailPage/HierarchyTab.jsx`
> - `src/layouts/AppLayout/AppLayoutPages/Settings/OrganisationDetailPage/HierarchyLevelsTable.jsx`
> - `src/layouts/AppLayout/AppLayoutPages/Settings/OrganisationDetailPage/HierarchyLinksTable.jsx`
> - `src/layouts/AppLayout/AppLayoutPages/Settings/OrganisationDetailPage/UsersTab.jsx`

| # | BackUp Feature | Requirement ID | Status |
|---|----------------|----------------|--------|
| 1 | Info tab: entityName (editable text + FiSearch to open party modal) | REQ-SETTINGS-ORG-F-003 | COVERED |
| 2 | Info tab: entityCode (editable text + FiSearch to open party modal) | REQ-SETTINGS-ORG-F-003 | COVERED |
| 3 | Info tab: isActive (checkbox) | REQ-SETTINGS-ORG-F-003 | COVERED |
| 4 | Info tab: description (textarea) | REQ-SETTINGS-ORG-F-003 | COVERED |
| 5 | Info tab: Linked Parties chips (add via OrganisationSearchModal, remove with ×) | REQ-SETTINGS-ORG-F-004 | COVERED |
| 6 | Users tab: list of all org users with assignment checkboxes | REQ-SETTINGS-ORG-F-005 | COVERED |
| 7 | Hierarchy tab: Levels sub-table (Level dropdown, Description, add/edit/delete) | REQ-SETTINGS-ORG-F-006 | COVERED |
| 8 | Hierarchy tab: Links sub-table (Parent/Child dropdowns, Description, filters, add/edit/delete, self-link + duplicate guards) | REQ-SETTINGS-ORG-F-007 | COVERED |
| 9 | Hierarchy tab: visual tree rendering from level+link data | REQ-SETTINGS-ORG-F-008 | COVERED |
| 10 | Save: PUT org + users + POST hierarchy-config + POST hierarchy-links | REQ-SETTINGS-ORG-F-009 | COVERED |
| 11 | New Organisation mode (`id === "new"` → POST, navigate to `/settings` on success) | REQ-SETTINGS-ORG-F-010 | COVERED |

### Page Layout — OrganisationDetailPage

```
┌──────────────────────────────────────────────────────────────────────┐
│  outer: p-6 flex flex-col gap-6                                      │
├──────────────────────────────────────────────────────────────────────┤
│  Page heading: "New Organisation" or "Edit Organisation"             │  ← unconditional
│  TabsNav: [Organisation Information | Organisation Hierarchy |       │  ← unconditional
│            Assigned Users]                                           │
├──────────────────────────────────────────────────────────────────────┤
│  Organisation Information tab (default):                             │
│    Card:                                                             │
│      Org Name [text + FiSearch icon] (required)                      │
│      Org Code [text + FiSearch icon]                                 │
│      Active   [checkbox]                                             │
│      Linked Parties chips [+ party via modal]                        │
│      Description [textarea]                                          │
├──────────────────────────────────────────────────────────────────────┤
│  Organisation Hierarchy tab:                                         │
│    Card "Hierarchy Levels":                                          │
│      Table: Level (name) | Description | Actions (edit/delete)       │
│      Add/Edit form: Level [dropdown] | Description | [Add/Update]    │
│    Card "Hierarchy Links":                                           │
│      Filters: Parent Level [select] | Child Level [select]           │
│      Table: Parent Level | Child Level | Description | Actions       │
│      Add/Edit form: Parent [select] | Child [select] | Description   │
│    Hierarchy tree (read-only visual, derived from levels+links)      │
├──────────────────────────────────────────────────────────────────────┤
│  Assigned Users tab:                                                 │
│    Card: one checkbox per user: <username> (<email>)                 │
│           checked = assigned to this org                             │
└──────────────────────────────────────────────────────────────────────┘
```

**REQ-SETTINGS-ORG-F-001:** An `OrganisationDetailPage` component shall exist at routes `/settings/organisation` (loads current user's org via `orgCode` from JWT) and `/settings/organisation/new` (new organisation form). On existing-org mount it shall call `GET /api/organisation-entities?code=<orgCode>` to load the existing org, resolve its numeric `id`, then call `GET /api/organisation-entities/:id/hierarchy-config` and `GET /api/organisation-entities/:id/hierarchy-links` to populate the hierarchy state. For the new route, no load calls are made.

**REQ-SETTINGS-ORG-F-002:** `OrganisationDetailPage` shall render three tabs via `TabsNav`: "Organisation Information", "Organisation Hierarchy", "Assigned Users". The default active tab shall be "Organisation Information".

**REQ-SETTINGS-ORG-F-003:** The Organisation Information tab shall contain a `Card` with the following fields: Organisation Name (required editable text with a `FiSearch` icon button), Organisation Code (editable text with a `FiSearch` icon button), Active (checkbox), Description (textarea). The `FiSearch` button opens an `OrganisationSearchModal` that populates the name/code and adds the selected party to the Linked Parties list.

**REQ-SETTINGS-ORG-F-004:** The Organisation Information tab shall display a "Linked Parties" section rendered as chips (party name + `×` remove button). Parties are added by selecting from the `OrganisationSearchModal`. A party already in the list shall not be added again. Clicking `×` removes the party from the list.

**REQ-SETTINGS-ORG-F-005:** The Assigned Users tab shall display a `Card` listing all users loaded from `GET /api/users`. Each user is shown as a labelled checkbox with `<username> (<email>)`. Checked state means the user is assigned to this organisation. The assignment array is submitted as part of the Save action in `REQ-SETTINGS-ORG-F-009`.

**REQ-SETTINGS-ORG-F-006:** The Organisation Hierarchy tab shall contain a "Hierarchy Levels" `Card`. It shall display a table of levels currently assigned to this org (columns: Level Name, Description, Actions edit/delete). Below the table an add/edit form provides a Level dropdown (populated from `GET /api/organisation-hierarchy`) and a Description field, with an "Add Hierarchy Level" button. Attempting to add a duplicate level shall be rejected with a notification. Deleting a level shall also remove all hierarchy links that reference that level's id.

**REQ-SETTINGS-ORG-F-007:** The Organisation Hierarchy tab shall contain a "Hierarchy Links" `Card`. Two filter dropdowns (Parent Level, Child Level — populated from the currently assigned org hierarchy levels) filter the displayed links. The table shows: Parent Level Name, Child Level Name, Description, Actions (edit/delete). Below: an add/edit form with Parent Level and Child Level dropdowns and Description. Guard rules: self-link (parentId = childId) and duplicate link (same pair already exists) shall each be rejected with a notification.

**REQ-SETTINGS-ORG-F-008:** Below the Hierarchy Links card the Hierarchy tab shall render a read-only hierarchy tree. Root nodes are levels that are not a child in any link. Each node is rendered with `└─` connectors and 24 px indent per depth level. If no levels or links are defined the message "No hierarchy structure defined. Add hierarchy links to create relationships." is shown.

**REQ-SETTINGS-ORG-F-009:** The Save action (sidebar item `organisation:save` event) shall: validate that Organisation Name is non-empty; call `POST /api/organisation-entities` (new) or `PUT /api/organisation-entities/:id` (edit) with `{ entityName, entityCode, isActive, description, users: assignedUsers }`; on HTTP 200/201 call `POST /api/organisation-entities/:orgId/hierarchy-config` with the level list followed by `POST /api/organisation-entities/:orgId/hierarchy-links` with links mapped to config IDs; display toast "Organisation created successfully" or "Organisation updated successfully"; then navigate to `/settings`.

**REQ-SETTINGS-ORG-F-010:** For the `/settings/organisation/new` route the page heading shall be "New Organisation" and form fields shall be empty. The Save action shall POST to `POST /api/organisation-entities` and navigate to `/settings` on success.

---

## 3f. Batch C — Settings Backend Module (NestJS)

**REQ-SETTINGS-BE-F-001:** A `SettingsModule` shall be created at `backend/nest/src/settings/` with files `settings.module.ts`, `settings.controller.ts`, `settings.service.ts`. It shall be registered in `app.module.ts`.

**REQ-SETTINGS-BE-F-002:** `SettingsController` shall expose `GET /api/settings/data-quality` and `PUT /api/settings/data-quality`. Both endpoints shall be decorated with `@UseGuards(JwtAuthGuard)` and shall scope results by `req.user.orgCode`. The GET endpoint returns `{ data: DataQualityConfig }`. The PUT endpoint accepts the same shape and returns `{ data: DataQualityConfig }`.

**REQ-SETTINGS-BE-F-003:** `SettingsController` shall expose `GET /api/settings/products`, `GET /api/settings/products/:id`, `POST /api/settings/products`, `PUT /api/settings/products/:id`, `DELETE /api/settings/products/:id`. All endpoints shall be decorated with `@UseGuards(JwtAuthGuard)` and shall scope results by `req.user.orgCode`.

**REQ-SETTINGS-BE-F-004:** `SettingsController` shall expose workflow step endpoints under products: `GET /api/settings/products/:id/workflow-steps`, `POST /api/settings/products/:id/workflow-steps`, `PUT /api/settings/workflow-steps/:step_id`, `DELETE /api/settings/workflow-steps/:step_id`. All endpoints shall be decorated with `@UseGuards(JwtAuthGuard)`.

**REQ-SETTINGS-BE-F-005:** A `RatingSchedulesController` within `SettingsModule` shall expose: `GET /api/rating-schedules`, `GET /api/rating-schedules/:id`, `POST /api/rating-schedules`, `PUT /api/rating-schedules/:id`, `GET /api/rating-schedules/:id/rules`, `POST /api/rating-rules`, `PUT /api/rating-rules/:id`, `DELETE /api/rating-rules/:id`. These endpoints migrate the existing `backend/routes/rating-api.js` Express routes to NestJS and shall be decorated with `@UseGuards(JwtAuthGuard)`. Org-scoping applies to schedules via `req.user.orgCode`.

---

## 4. Open Questions

| ID | Question |
|----|----------|
| OQ-040 | Parties address book architecture — single vs multi-tenant |
| OQ-041 | Reusable party search modal location |
| OQ-042 | Multi-tenant integrity — non-overridable settings |
| OQ-043 | Table data formatting standards |

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Stub created |
| 2026-03-13 | Expanded with Platform Admin module management strawman requirements |
| 2026-03-13 | Replaced inline layout with tile grid requirements; added Module Licensing company list requirements; removed old REQ-SETTINGS-F-001 (Organisation Settings heading no longer presented inline) |
| 2026-04-15 | Batch C: added §3b–3f (Rating Rules, Products, Data Quality, Organisation, Settings BE module). Deleted REQ-SETTINGS-GRID-F-006 (superseded by real page implementations). Updated Organisation tile route from `/settings/organisations` → `/settings/organisation`. |
| 2026-04-05 | Impact Analysis section (1a) added — UI components, 24 API endpoints, 9 DB tables, dependencies. |
