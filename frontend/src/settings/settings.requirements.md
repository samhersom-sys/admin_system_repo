# REQUIREMENTS — Settings Page

**Domain Code:** `SETTINGS`  
**Location:** `domains/settings/components/`  
**Status:** Active — tile grid built; Module Licensing company pages in progress; all other tiles navigate to NotFound (placeholder)  
**Test file:** `settings.test.tsx`

---

## 1. Scope

**In scope:**
- Tile grid layout: responsive 3→2→1 column grid of clickable setting category tiles
- Seven tiles, each navigating to a dedicated route
- Role-based tile visibility: Module Licensing tile visible to `internal_admin` only; Dashboard & Reporting tile visible to `client_admin` and `internal_admin`
- Tiles for unbuilt sections navigate to a shared NotFound page
- Module Licensing: company list page + reusable per-company config page (param-driven)
- Module toggling with dependency validation (unchanged from strawman)
- Dashboard & Reporting Settings: manage tenant custom measures (list, create, deactivate)

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
| GET | `/api/measures` | List org measures (dashboard & reporting settings) |
| POST | `/api/measures` | Create tenant measure |
| DELETE | `/api/measures/:id` | Deactivate (soft-delete) tenant measure |

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
| `measure_definitions` | CRUD (tenant measures, Dashboard & Reporting Settings) |

---

## 2. Requirements — Dashboard & Reporting Settings

**REQ-SETTINGS-DASH-F-001** — Settings tile grid MUST include a "Dashboard & Reporting" tile visible to `client_admin` and `internal_admin` users only. It navigates to `/settings/dashboard-reporting`.

**REQ-SETTINGS-DASH-F-002** — The Dashboard & Reporting Settings page MUST load and display all active measures for the authenticated org, split into two sections:
- "Internal Measures" — `created_by_type = 'internal'` (read-only; no delete button)
- "Custom Measures" — `created_by_type = 'tenant'` (editable; deactivate button present)

**REQ-SETTINGS-DASH-F-003** — Each measure row MUST display: label, source, measure type (count / ratio), and for tenant measures a "Deactivate" button.

**REQ-SETTINGS-DASH-F-004** — The page MUST show a loading spinner while the measures list is loading and an error message if the API returns an error. Test IDs: `T-SETTINGS-DASH-R002a` (loading), `T-SETTINGS-DASH-R002b` (error).

**REQ-SETTINGS-DASH-F-005** — "Deactivate" calls `DELETE /api/measures/:id` and removes the row from the list on success. On failure, an error notification is shown. Test IDs: `T-SETTINGS-DASH-R003a` (success), `T-SETTINGS-DASH-R003b` (failure).

**REQ-SETTINGS-DASH-F-006** — An "Add Custom Measure" button opens an inline form. The form requires: Label, Source Key (select from available sources), Measure Type (count). On submit it calls `POST /api/measures`. Test ID: `T-SETTINGS-DASH-R004`.

**REQ-SETTINGS-DASH-F-007** — The internal_admin must also see internal measures listed as read-only with no action buttons. The "Add Custom Measure" button is visible to both `client_admin` and `internal_admin`. Test ID: `T-SETTINGS-DASH-R001`.

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
| REQ-SETTINGS-RATING-F-001 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R01 |
| REQ-SETTINGS-RATING-F-002 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R02 |
| REQ-SETTINGS-RATING-F-003 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R03 |
| REQ-SETTINGS-RATING-F-004 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R04 |
| REQ-SETTINGS-RATING-F-005 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R05 |
| REQ-SETTINGS-RATING-F-006 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R06 |
| REQ-SETTINGS-RATING-F-009 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R09a through R09f |
| REQ-SETTINGS-RATING-F-010 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R09b (updated) |
| REQ-SETTINGS-RATING-F-011 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R10 |
| REQ-SETTINGS-RATING-F-012 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R11a, R11b |
| REQ-SETTINGS-RATING-F-013 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R02 (updated), R12 |
| REQ-SETTINGS-RATING-F-014 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R07 |
| REQ-SETTINGS-RATING-F-015 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R05 (updated) |
| REQ-SETTINGS-RATING-F-016 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R08 |
| REQ-SETTINGS-RATING-F-017 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R03 (updated), R12 (updated) |
| REQ-SETTINGS-RATING-F-018 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R11a (updated), R11b (updated) |
| REQ-SETTINGS-RATING-F-019 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R17 |
| REQ-SETTINGS-RATING-F-020 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R18 |
| REQ-SETTINGS-RATING-F-021 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R19 |
| REQ-SETTINGS-RATING-F-022 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R20 |
| REQ-SETTINGS-RATING-F-023 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R21 |
| REQ-SETTINGS-RATING-F-024 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R22 |
| REQ-SETTINGS-RATING-F-025 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R23 |
| REQ-SETTINGS-RATING-F-026 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R24 |
| REQ-SETTINGS-RATING-F-027 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R25 |
| REQ-SETTINGS-RATING-F-028 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R26 |
| REQ-SETTINGS-RATING-F-029 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R27 |
| REQ-SETTINGS-RATING-F-030 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R28 |
| REQ-SETTINGS-RATING-F-031 | `settings/__tests__/RatingRulesPage.test.tsx` | T-settings-rating-R29, R30 |

---

---

## 3b. Batch C — Rating Rules Pages

> **Business context**
> A rating schedule is a named set of pricing rules that tells the system how to calculate a premium for an insured location. For example, a rule might say "if the country is UK and the postcode starts with SW, apply a 1.5% rate to the sum insured". Administrators configure these schedules in Settings so that when an underwriter rates a location on a quote, the system can apply the correct price automatically — rather than requiring manual calculation for every location.
> Each schedule has an effective date range, so the right schedule is selected automatically based on when the policy incepts. Multiple schedules can exist, each targeting different binding authorities or classes of business.

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
| 5 | Detail: rules table (Field, Operator, Value, Rate %) | REQ-SETTINGS-RATING-F-005 | COVERED |
| 6 | Detail: Add Rule row | REQ-SETTINGS-RATING-F-007 | COVERED |
| 7 | Detail: Delete rule | REQ-SETTINGS-RATING-F-008 | COVERED |
| 8 | Detail: grouped conditions (AND/OR logic operators) | — | DEFERRED — Batch D (complex rule-group logic) |
| 9 | Detail: Versions tab | — | DEFERRED — Batch D |
| 10 | Save button on detail | REQ-SETTINGS-RATING-F-006 | COVERED |
| 11 | Create New Schedule (gap — not in backup UI) | REQ-SETTINGS-RATING-F-009 | COVERED |

### Page Layout — RatingRulesPage

```
┌────────────────────────────────────────────────┐
│  outer: p-6 flex flex-col gap-6                │
├────────────────────────────────────────────────┤
│  Card title="Rating Schedules"                  │  ← unconditional
│    Table: Name | Eff. From | Eff. To | Active  │
│    (click row → detail page)                   │
└────────────────────────────────────────────────┘
```

### Page Layout — RatingRulesDetailPage

```
┌────────────────────────────────────────────────┐
│  outer: p-6 flex flex-col gap-6                │
├────────────────────────────────────────────────┤
│  Card title="Schedule Details"                  │  ← header fields, all editable
│    Name [text] | Eff. From [date] | Eff. To [date] | Active [toggle] │
│    [Save button]                               │
├────────────────────────────────────────────────┤
│  Card title="Rating Rules"                      │  ← one row per rule
│    Table: Field | Operator | Value | Rate % | [delete icon] │
│    [+ Add Rule button]                         │
└────────────────────────────────────────────────┘
```

---

**REQ-SETTINGS-RATING-F-001** — _Access control_

> Rating schedule configuration directly affects how premiums are calculated. Only organisation and platform administrators should be able to view or modify these settings.

The Rating Rules page shall be accessible only to users with the `client_admin` or `internal_admin` role. A user who is not logged in shall be redirected to the login page when they attempt to reach the Rating Rules page.

---

**REQ-SETTINGS-RATING-F-002** — _Viewing the list of rating schedules_

> An administrator needs to see all the rating schedules configured for their organisation at a glance — to understand which are active, find a schedule to edit, or identify whether a schedule is missing or has expired.

When an administrator opens the Rating Rules page, they shall see a list of all rating schedules for their organisation. Each row shall show the schedule's name, the date it becomes effective, the date it expires, and whether it is currently active.

---

**REQ-SETTINGS-RATING-F-003** — _Opening a schedule to view or edit_

> After identifying the right schedule in the list, the administrator needs to be able to open it to review or change its rules.

When an administrator clicks on a schedule row in the list, they shall be taken to the detail page for that schedule.

---

**REQ-SETTINGS-RATING-F-004** — _Viewing and editing a schedule's header details_

> An administrator may need to rename a schedule, extend its validity dates, or mark it as inactive — for example, when renewing a schedule for a new underwriting year or retiring a superseded one.

When an administrator opens a schedule's detail page, they shall see the schedule's name, effective-from date, effective-to date, and active status, and shall be able to edit all four values directly on the page.

---

**REQ-SETTINGS-RATING-F-005** — _Viewing the rules that belong to a schedule_

> Each schedule contains one or more rules that define under which conditions a rate applies. An administrator needs to see these rules to understand the current pricing logic and verify it is correct.

When an administrator views a schedule's detail page, they shall see a table of all pricing rules belonging to that schedule. Each row shall show: the location attribute being evaluated (for example: country, postcode, sum insured), the type of comparison being applied (for example: equals, greater than, starts with), the value being matched against, and the premium rate as a percentage.

---

**REQ-SETTINGS-RATING-F-006** — _Saving changes to a schedule's header_

> Edits to a schedule's name, dates, or active status are not applied automatically — the administrator must explicitly confirm them to prevent accidental changes taking effect.

When an administrator edits a schedule's name, dates, or active status and clicks "Save", the changes shall be persisted and a "Schedule saved" confirmation message shall be displayed. If the save fails, an error message shall be shown and the edited values shall be preserved on screen.

---

**REQ-SETTINGS-RATING-F-007** — _Adding a new pricing rule to a schedule_

> An administrator may need to add a new pricing rule — for example, a rule that applies a 2% rate to all UK locations where the sum insured exceeds £1,000,000. Each rule is built by specifying what location attribute to look at, how to compare it, what value to match, and what rate to apply when the condition is met.

When an administrator clicks "+ Add Rule" on a schedule's detail page, they shall be presented with an editable row containing the following inputs:
- **Field** — a dropdown of the location attributes that can be evaluated: postcode, country, subdivision, sum insured, construction type, occupancy, year built
- **Operator** — a dropdown of the comparison types that can be applied: equals (`=`), not equals (`≠`), greater than (`>`), less than (`<`), greater than or equal (`≥`), less than or equal (`≤`), in list (`IN`), starts with, ends with, contains
- **Value** — a free text field for the value to match against
- **Rate %** — a number field for the premium rate to apply when the rule matches

When the administrator confirms the new row, the rule shall be saved and added to the rules table.

---

**REQ-SETTINGS-RATING-F-008** — _Removing a rule from a schedule_

> An administrator may need to remove a rule that is no longer correct — for example, if a territory's pricing has changed and the old rule is being replaced.

When an administrator clicks the delete icon on a rule row, that rule shall be permanently removed from the schedule and shall no longer appear in the rules table.

---

**REQ-SETTINGS-RATING-F-009** — _Creating a new rating schedule_

> An administrator needs to be able to create a new schedule from scratch — for example, when setting up pricing for a new binding authority, a new class of business, or a new underwriting year. Without this, the only way to have a schedule is to import data directly into the database.

The schedules grid shall display a '+' button (FiPlus icon) in the top-left header cell. When an administrator clicks this button, an inline entry row shall appear at the top of the grid with a name field (required). The administrator shall type the new schedule's name and confirm (FiCheck button, or Enter key) to create the schedule. On success, the administrator shall be taken directly to the new schedule's detail page where they can begin adding rules. The '+' button is disabled while the inline row is open; an 'x' (FiX) button in the inline row cancels creation and dismisses the row.

---

**REQ-SETTINGS-RATING-F-010** — _Inline create row includes date fields_

> When creating a new schedule, the administrator should be able to set the effective date range immediately rather than being forced to navigate to the detail page to set them.

The inline create row (opened by clicking the `+` icon) shall include an "Effective From" date input and an "Effective To" date input in addition to the Name field. Both date fields are optional. The `createRatingSchedule` call shall include the dates in the payload when provided. When the user enters Effective From and Effective To has not been manually edited, Effective To shall auto-default to Effective From plus one calendar year. If the user manually edits Effective To, later Effective From edits shall not overwrite the manually entered Effective To value.

---

**REQ-SETTINGS-RATING-F-011** — _Sidebar section: Rating Schedule_

> The sidebar must reflect the current page context and provide quick access to save actions so that users can save without scrolling or searching for a button.

The Rating Rules list page shall register a sidebar section titled "Rating Schedule" with a "Save" action item. The Save item shall be disabled when there is no in-progress inline row with a name entered; it shall be enabled and fire `rating-schedule:save` once the user has typed a name in the inline row. The page shall listen for the `rating-schedule:save` DOM event and trigger schedule creation.

---

**REQ-SETTINGS-RATING-F-012** — _Unsaved changes banner_

> If the administrator opens an inline create row, types a name, and then accidentally navigates away, their work will be silently discarded. A visible warning and a browser guard reduce this risk.

When the inline row is open and a schedule name has been typed, the list page shall display an amber unsaved-changes notification banner above the table. The browser's `beforeunload` event shall also be guarded to show a native confirmation dialog. The banner and guard are cleared when the inline row is cancelled or the new schedule is saved.

---

**REQ-SETTINGS-RATING-F-013** — _Column rename and edit icon_

> The column label "Active" is misleading as the table also contains inactive schedules. A pencil icon is the standard affordance for "open and edit" in this application; a chevron offers no clear call to action.

The schedules list table shall rename the "Active" column header to "Status". The first data column (previously showing `FiChevronRight`) shall be left blank. A new final column shall contain a green `FiEdit2` pencil icon button for each row; clicking it navigates to the schedule detail page (`/settings/rating-rules/:id`). The row itself remains clickable as a convenience.

---

**REQ-SETTINGS-RATING-F-014** — _Detail page: effective dates are editable date fields_

> Administrators may need to adjust the validity period of a rating schedule after creation, for example to extend or shorten its active window.

On the Rating Rules detail page, the "Effective From" and "Expiry Date" fields shall be rendered as editable `<input type="date">` controls, allowing the administrator to change the schedule's date range. Changes are staged locally and applied only when the sidebar Save action is triggered.

---

**REQ-SETTINGS-RATING-F-015** — _Detail page: rules table uses app-table style with FiPlus in header_

> Consistency: all grids in this application use the `app-table` / `table-wrapper` style. The standalone "Add Rule" button above the grid should be replaced with the standard `FiPlus` icon in the first column header, matching the Quote Sections pattern.

On the Rating Rules detail page, the rules table shall use `<table className="app-table">` inside `<div className="table-wrapper">`. The separate "Add Rule" button panel above the table shall be removed. A `FiPlus` icon button with `aria-label="Add rule"` shall appear in the first column header `<th>` and trigger the same add-rule action. The empty state message shall read "No rules defined. Click + to create one."

---

**REQ-SETTINGS-RATING-F-016** — _Detail page: sidebar section with Save action_

The Rating Rules detail page shall register a sidebar section titled "Rating Schedule" with a "Save" action that fires `rating-schedule:save`. The page shall listen for that event and trigger `handleSave`.

---

**REQ-SETTINGS-RATING-F-017** — _List page: open records via magnifying glass, not row click_

Records shall be opened by clicking a `FiSearch` icon button (aria-label "Open schedule") in the first column of each data row — matching the standard app navigation pattern. Clicking elsewhere on the row shall not navigate. The `FiEdit2` pencil icon shall be removed.

---

**REQ-SETTINGS-RATING-F-018** — _Unsaved changes: notification panel, not inline banner_

When the inline create row has a name entered (`hasUnsaved === true`), the page shall call `addNotification` with type `'warning'` and a stable id `'rating-unsaved'` to surface the warning in the notification dock. The inline amber banner on the page body shall be removed. When the row is cancelled or saved, `removeNotification('rating-unsaved')` shall be called.

---

**REQ-SETTINGS-RATING-F-019** — _List page: schedule ID column_

The list table shall include an "ID" column displaying the schedule's unique database ID. This allows users to distinguish schedules that share the same name.

---

**REQ-SETTINGS-RATING-F-020** — _Detail page: schedule ID in metadata card_

The schedule metadata card shall display a read-only "Schedule ID" field showing the schedule's unique database ID.

---

**REQ-SETTINGS-RATING-F-021** — _Detail page: title shows schedule name_

The page heading (`<h2>`) shall display the actual schedule name (loaded from the API), not the static text "Rating Schedule".

---

**REQ-SETTINGS-RATING-F-022** — _Detail page: no in-page back arrow_

The in-page back arrow button (`FiArrowLeft`) shall be removed. Navigation back to the list is handled by the global sidebar "Back" button present on all non-home routes.

---

**REQ-SETTINGS-RATING-F-023** — _Detail page: Save is sidebar-only_

The page-level "Save" button at the bottom of the detail page shall be removed. The only Save trigger shall be the sidebar section action (registered via `useSidebarSection`).

---

**REQ-SETTINGS-RATING-F-024** — _Detail page: Group-based rule structure_

Rating rules on the detail page shall be organised into **Groups**. Each group has a name and an overall rate percentage. Within each group, one or more **Conditions** define criteria. The data model on load converts flat API rules (ordered by `group_number`, `sequence_in_group`) into a `RatingGroup[]` hierarchy.

---

**REQ-SETTINGS-RATING-F-025** — _Detail page: Field dropdown with 9 defined options_

The Field column in every condition row shall be a `<select>` populated from `FIELD_OPTIONS`: Postcode, Country, State/Province, Sum Insured, Construction Type, Occupancy, Year Built, Coverage Detail, Coverage Detail Sub-Type.

---

**REQ-SETTINGS-RATING-F-026** — _Detail page: Operator dropdown with 10 defined options_

The Operator column in every condition row shall be a `<select>` populated from `OPERATOR_OPTIONS`: Equals, Not Equals, Greater Than, Less Than, Greater or Equal, Less or Equal, In List, Starts With, Ends With, Contains.

---

**REQ-SETTINGS-RATING-F-027** — _Detail page: Logic column — IF for first condition, AND/OR for subsequent_

The first condition in a group shall display a static **IF** badge. Subsequent conditions shall render an AND/OR `<select>`.

---

**REQ-SETTINGS-RATING-F-028** — _Detail page: Add Group button in table header_

A `FiPlus` icon button with `aria-label="Add group"` in the first column `<th>` shall append a new group (with one default condition) to the list.

---

**REQ-SETTINGS-RATING-F-029** — _Detail page: Add Condition to a group_

Each group header row shall include a `FiPlus` icon button with `aria-label="Add condition"` that appends a new condition to that group.

---

**REQ-SETTINGS-RATING-F-030** — _Detail page: Delete group and delete condition_

Each group header row shall have a `FiTrash2` button (`aria-label="Delete group"`) that removes the entire group. Each condition row shall have a `FiTrash2` button (`aria-label="Delete condition"`) that removes that condition only.

---

**REQ-SETTINGS-RATING-F-031** — _Detail page: Group and condition ordering_

Each group header row shall have `FiChevronUp` (`aria-label="Move group up"`) and `FiChevronDown` (`aria-label="Move group down"`) buttons to reorder groups. Each condition row shall have equivalent buttons (`aria-label="Move condition up"` / `"Move condition down"`) to reorder conditions within their group. First-position buttons shall be disabled.

---

### 3b.1 Page Validation — Iteration 1 (Settings -> Rating Rules)

> This subsection defines Page 1 validation for the first iteration and is intentionally scoped to Settings surfaces only. No quote/policy implementation behavior is changed by this subsection.

**REQ-SETTINGS-RATING-F-032** — _Section-level eligibility for schedule selection_

When an underwriter configures rating schedules, the schedule record shall expose enough metadata to determine whether it is eligible for quote-section selection (active status, effective date range, placement compatibility). Only eligible schedules shall be returned to section-selection consumers.

**REQ-SETTINGS-RATING-F-033** — _Multiple eligible schedules supported_

The Rating Rules model shall permit multiple concurrently active schedules for the same organisation and context. The UI shall clearly distinguish schedules by name and id so users can intentionally choose one when multiple are eligible.

**REQ-SETTINGS-RATING-F-034** — _Version visibility for audit_

The detail view shall expose schedule version context used for downstream rating calculations, including current version number and effective window metadata.

**REQ-SETTINGS-RATING-F-035** — _Rule explainability readiness_

Rules configured in Settings shall provide display-ready fields needed by downstream explain views: field, operator, value, rate percentage, rule order/grouping, and active status.

**REQ-SETTINGS-RATING-F-036** — _Validation data-readiness contract_

The Settings surfaces shall support deterministic first-iteration validation by ensuring at least one schedule can be configured with multiple postcode-driven rules that return different rates for different inputs under the same coverage context.

### Acceptance Criteria — Iteration 1 Page 1

1. At least two schedules may be active concurrently and visible in list/detail views without data collision.
2. Each schedule row shows an id and name sufficient to avoid ambiguity.
3. Detail view exposes version/effective metadata required for transaction audit trails.
4. Rule rows include field/operator/value/rate and maintain deterministic ordering.
5. A configured schedule can represent multiple postcode outcomes with distinct rates for downstream tests.

---

## 3c. Batch C — Products Pages

> **Backup Coverage Map sources read:**
> - `src/layouts/AppLayout/AppLayoutPages/Settings/ProductListPage.jsx`
> - `src/layouts/AppLayout/AppLayoutPages/Settings/ProductConfigPage.jsx`

| # | BackUp Feature | Requirement ID | Status |
|---|----------------|----------------|--------|
| 1 | Product table grid (ID, Name, Code, Type, LoB, UW Year, Status) | REQ-SETTINGS-PRODUCTS-F-001 | COVERED |
| 2 | Inline add-product row in table header | REQ-SETTINGS-PRODUCTS-F-002 | COVERED |
| 3 | Delete product from list | — | DEFERRED — Batch D |
| 4 | Navigate to product detail (open action) | REQ-SETTINGS-PRODUCTS-F-003 | COVERED |
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
│  Header: Product Configuration                  │  ← unconditional
├────────────────────────────────────────────────┤
│  Products table                                │  ← conditional on data loaded
│    Header + add button in first column         │
│    Columns: ID, Name, Code, Type, LoB, UW Year,│
│             Status                              │
│    Row action: Open product                     │
└────────────────────────────────────────────────┘
│  Inline row (conditional on + click)           │
│    Name, Code, Type, LoB, UW Year              │
│    [Create] [Cancel]                            │
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

**REQ-SETTINGS-PRODUCTS-F-001:** A `ProductListPage` component shall exist at route `/settings/products`, loading products and product categories from the settings API on mount and rendering products in a table with columns: ID, Name, Code, Product Catagory, Line of Business, Underwriting Year, Status.

**REQ-SETTINGS-PRODUCTS-F-002:** `ProductListPage` shall include an add-product action in the table header that reveals an inline create row with fields: Name (required text), Code (auto-generated from Name, required), Product Catagory (dropdown populated from org categories), Line of Business (text), Underwriting Year (number). Confirming the row calls `POST /api/settings/products`; on HTTP 201 the row is hidden, list is refreshed/updated, and a toast "Product created" is shown.

**REQ-SETTINGS-PRODUCTS-F-003:** Each product row in `ProductListPage` shall include an "Open product" action that navigates to `/settings/products/:id`.

**REQ-SETTINGS-PRODUCTS-F-004:** A `ProductConfigPage` component shall exist at route `/settings/products/:id`. It shall display a top-level `Product Details` tab with fields: Name (editable), Code (editable), Product Catagory (dropdown populated from org categories), Class of Business (dropdown), Year of Account (number), Active (toggle), Description (textarea). The page Save action shall be provided from the sidebar and shall call `PUT /api/settings/products/:id`; on HTTP 200 a toast "Product saved" appears.

**REQ-SETTINGS-PRODUCTS-F-005:** `ProductConfigPage` shall display a drilldown grid under `Product Details` that follows a `Section -> Coverage -> Coverage Element` flow. The initial grid shall list sections. Clicking a section shall open a coverage grid for that section. Clicking a coverage shall open a coverage-element grid. The grids shall use the same app-table / table-wrapper presentation style as quote section pages.

**REQ-SETTINGS-PRODUCTS-F-006:** The coverage-element grid in `ProductConfigPage` shall render editable rows for coverage element defaults and include an add-row action. The page shall preserve the selected drilldown path until the user navigates back.

**REQ-SETTINGS-PRODUCTS-F-007:** `ProductConfigPage` shall display an `Audit` tab that loads product audit history from `GET /api/audit/Product/:id` on first activation and renders it in the shared `AuditTable` component.

**REQ-SETTINGS-PRODUCTS-F-008:** A `ProductCategoriesPage` component shall exist at route `/settings/product-catagories`. It shall load org-scoped product categories from `GET /api/settings/product-categories`, render a table with category name and the count of products assigned to each category, and allow inline creation of a new category.

**REQ-SETTINGS-PRODUCTS-F-009:** `ProductCategoriesPage` shall call `POST /api/settings/product-categories` to create a category. Newly created categories shall be available to the Product Catagory filters and product editor dropdowns after refresh.

**REQ-SETTINGS-PRODUCTS-F-010:** `ProductCategoriesPage` shall call `DELETE /api/settings/product-categories/:id` to remove a category. The delete action shall be disabled or rejected when the category still has one or more products assigned.

**REQ-SETTINGS-PRODUCTS-F-011:** `ProductListPage` and `ProductConfigPage` shall register a sidebar action labelled `Create Product Catagory` that navigates to `/settings/product-catagories`.

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
