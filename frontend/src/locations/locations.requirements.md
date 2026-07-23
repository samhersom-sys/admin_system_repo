# Requirements — Locations Schedule

**Domain:** LOC — Locations Schedule
**Requirement format:** REQ-LOC-FE-F-NNN (Frontend, Functional)
**Actor:** Underwriter / Administrator

---

## 1. Overview

The Locations Schedule is an embeddable tab component (`LocationsScheduleTab`) that attaches to Quote and Policy view pages. It stores a structured list of insured locations for a given record and maintains a full version history of all imports and edits.

---

## 2. Backup Coverage Map

| # | Backup feature | Requirement | Status |
|---|---------------|-------------|--------|
| 1 | Load schedule on mount | F-001 | COVERED |
| 2 | Display rows in grid | F-002 | COVERED |
| 3 | CSV import | F-003 | COVERED |
| 4 | Version selector + revert | F-004 | COVERED |
| 5 | Loading / error states | F-005 | COVERED |
| 6 | Add row / delete row / save manually | F-006 | COVERED — Block 2 |
| 7 | Previously Included Locations tab | F-007 | COVERED — Block 2 |
| 8 | Inline country/state dropdowns (API lookups) | — | DEFERRED — Block 3 |
| 9 | Coverage type / sub-type columns | — | DEFERRED — Block 3 |
| 10 | Multi-currency totals | — | DEFERRED — Block 3 |
| 11 | Movement comparison vs previous version | — | DEFERRED — Block 3 |
| 12 | Row grouping by country / state | — | DEFERRED — Block 3 |
| 13 | Rate and annual premium columns | — | DEFERRED — Block 3 |

---

## 3. Functional Requirements

### 3.1 Load on Mount

> **Business context**
> When an underwriter opens a Quote or Policy, the Locations Schedule tab should immediately show whatever locations are already on record — with no extra clicks needed.

**REQ-LOC-FE-F-001:** On mount, `LocationsScheduleTab` shall call `GET /api/locations-schedule/imports?entityType=<entityType>&entityId=<entityId>`. If one or more imports are returned, the most recent shall be set as the active import and its `payload.rows` displayed. `GET /api/locations-schedule/imports/<id>/versions` shall also be called to populate the version history.

---

### 3.2 Schedule Grid Display

> **Business context**
> Underwriters need to see all insured locations clearly laid out in a sortable, scrollable grid so they can verify coverage at a glance.

**REQ-LOC-FE-F-002:** The Schedule tab shall render location rows in a table using the `app-table` CSS class. The following columns shall be present:

| Column header | Field key | Notes |
|--------------|-----------|-------|
| Location | `location` | |
| Address | `address` | |
| City | `city` | |
| State | `state` | |
| Country | `country` | |
| Postcode | `postcode` | |
| Sum Insured | `sumInsured` | |

When no imports have been recorded the table shall display the empty message `"No locations. Import a CSV to get started."`.

---

### 3.3 CSV Import

> **Business context**
> The primary way to load locations is via a CSV export from the insured's property database. The import must be instant, must not lose the existing version history, and must show clear success/failure feedback.

**REQ-LOC-FE-F-003:** An **Import CSV** button (FiUpload icon) shall be permanently visible in the schedule toolbar. When clicked, it shall open a native file picker filtered to `.csv` files. On file selection:
1. The CSV shall be parsed: the first row is treated as column headers, subsequent rows as data.
2. The parsed rows shall be posted to `POST /api/locations-schedule/import` with the current `entityType` and `entityId`.
3. On success, the notification `"Locations schedule imported successfully"` (type `success`) shall be shown and the schedule reloaded.
4. On failure, an error notification shall be shown.

---

### 3.4 Version Selector and Revert

> **Business context**
> Underwriters may need to roll back to a previous version of the schedule — for example after an incorrect import.

**REQ-LOC-FE-F-004:** When two or more versions exist, a version dropdown (`<select aria-label="Select version">`) shall appear in the schedule toolbar. Changing the selected version shall call `POST /api/locations-schedule/imports/<id>/revert/<versionNumber>`, reload the schedule, and show a success notification. While the revert is in progress a `"Reverting…"` indicator shall be visible. When only one version exists the dropdown shall not render.

---

### 3.5 Loading and Error States

> **Business context**
> Feedback during data fetching and on failure prevents underwriters from thinking the page is broken.

**REQ-LOC-FE-F-005:** While `getLocationsImports` is resolving, a loading spinner shall be rendered. If the call rejects, a `role="alert"` element shall be shown containing the error message, and `addNotification` shall be called with type `error`.

---

### 3.6 Inline Row Add, Delete, and Save

> **Business context**
> Sometimes individual locations need to be added or removed without a full CSV re-import — for example when a single new building is added to the schedule mid-term. Underwriters need a quick, in-page way to make that edit and save it immediately.

**REQ-LOC-FE-F-006:** The locations table shall support manual row management:

- **Add row (F-006a):** The first header cell (`<th>`) shall contain a `+` button (FiPlus icon, `aria-label="Add row"`). Clicking it shall insert an inline entry row at the top of the table body. The inline row shall contain one `<input>` per column with matching `aria-label` attributes (e.g. `"Location"`, `"Address"`, etc.), a confirm button (FiCheck, `aria-label="Confirm add row"`) and a cancel button (FiX, `aria-label="Cancel add row"`). The confirm button shall be disabled when the `Location` field is empty.

- **Delete row (F-006b):** Each data row shall contain a delete button (FiTrash2, `aria-label="Delete row"`). Clicking it shall remove the row from the local grid immediately without an API call.

- **Pending changes indicator (F-006c):** After any add or delete, a `"Unsaved changes"` badge shall be visible in the toolbar.

- **Save (F-006d):** A **Save** button (FiSave icon) shall appear in the toolbar when unsaved changes exist. Clicking it shall call `PUT /api/locations-schedule/imports/<importId>` with `{ rows: <currentRows> }`. On success, `"Schedule saved."` (type `success`) shall be notified and the unsaved-changes indicator shall be cleared. On failure, an error notification shall be shown and the save state rolled back.

- **No active import (F-006e):** If no import record exists yet (first-time load with no prior data), the Save button and inline-add form shall be disabled. The Import CSV flow must be used first to create the import record.

---

### 3.7 Previously Included Locations Tab

> **Business context**
> When a location is deleted from the current schedule, underwriters need to be able to see what locations were previously covered — for audit purposes and to quickly re-add a location if it was removed in error.

**REQ-LOC-FE-F-007:** `LocationsScheduleTab` shall render two internal tab buttons above the schedule grid:

- **"Schedule"** (default active tab): shows the current schedule content (F-001 through F-006).
- **"Previously Included"**: when selected, shall call `GET /api/locations-schedule/imports/<importId>/historical` and display the returned rows in a read-only `app-table` with the same columns as the main schedule. While loading, `"Loading previously included locations…"` shall be shown. When the result is empty, `"No previously included locations."` shall be shown. The tab content shall be loaded lazily (only on first click). On API failure, `addNotification('Could not load historical locations.', 'error')` shall be called. When no import record exists, the "Previously Included" tab shall be disabled.

---

## 4. Block 2 — Rating Schedule Integration (REQ-LOC-FE-F-008 to F-015)

> Block 2 activates when the quote has sections. Coverage rows link a location to a section and
> carry a rating schedule selection + calculated premium.

### 4.1 Hierarchical Grid Display

**REQ-LOC-FE-F-008:** When the Locations tab is active the schedule grid MUST render a
hierarchical, collapsible structure:
- **Level 1 row** — Country header (chevron toggle, spans all columns, shows country name +
  row count)
- **Level 2 row** — State/Subdivision header (chevron toggle under each country)
- **Level 3 row** — Individual data rows (location fields + coverage fields)

Collapsed countries/states hide their child rows. An **Expand All / Collapse All** pair of
buttons MUST appear in the toolbar.

**REQ-LOC-FE-F-009:** Data rows MUST include the following columns:
Country, State, Address 1, Address 2, Address 3, City, Zip, Section, Coverage Type,
Coverage Sub-Type, Currency, Sum Insured, Rate %, Annual Rated Gross Premium.

### 4.2 Section and Coverage dropdowns

**REQ-LOC-FE-F-010:** The **Section** cell MUST show a `<select>` populated from
`GET /api/quotes/:id/sections` displaying `<reference> — <class_of_business>`.
The value stored is `section_id`.

**REQ-LOC-FE-F-011:** The **Coverage Type** cell MUST show a `<select>` populated from
the lookup of active coverage types (from `GET /api/lookups/coverageDetailTypes` or static list).
The **Coverage Sub-Type** cell filters to sub-types for the selected Coverage Type.

### 4.3 Rating Schedule selector + Calculate

**REQ-LOC-FE-F-012:** Each coverage data row MUST have a **Rating Schedule** dropdown
populated from `GET /api/rating-schedules` (active schedules only).
The selected `rating_schedule_id` is stored in the coverage row.

**REQ-LOC-FE-F-013:** Each coverage data row MUST have a **Calculate** button. Clicking it
MUST call `POST /api/rating/calculate-location` with the coverage row ID and rating schedule ID.
On success the Rate % and Annual Rated Gross Premium cells MUST refresh in state without a full
reload.

**REQ-LOC-FE-F-014:** A **Calculate All** button in the tab header MUST call
`POST /api/rating/calculate-quote` with `{ quoteId }` and reload all location rows on completion.

### 4.4 Save Version

**REQ-LOC-FE-F-015:** A **Save Version** button MUST appear in the toolbar (enabled only when
`editable = true`). Clicking it sends
`POST /api/locations-schedule/imports/:quoteId/save-version`. On success a success notification
is shown and the Versions sub-tab list is refreshed.

### 4.5 Normalised CRUD (Block 2 replaces JSONB-only save)

**REQ-LOC-FE-F-016:** Adding a row MUST call `POST /api/quotes/:id/locations/rows` to persist
to the `locations` table. A follow-up `POST /api/quotes/:id/locations/rows/:locationId/coverages`
MUST create the initial coverage row.

**REQ-LOC-FE-F-017:** Editing a location field (address, city, country, state, zip) MUST call
`PUT /api/quotes/:id/locations/rows/:locationId` after the field loses focus (on-blur persist).

**REQ-LOC-FE-F-018:** Editing a coverage field (section, coverage type, sub-type, currency, SI)
MUST call `PUT /api/quotes/:id/locations/rows/:locationId/coverages/:coverageId` on-blur.

**REQ-LOC-FE-F-019:** The delete action on a data row MUST call
`DELETE /api/quotes/:id/locations/rows/:locationId/coverages/:coverageId` (for single coverage
rows) or `DELETE /api/quotes/:id/locations/rows/:locationId` (removes location + all coverages).

### 4.6 Policy Locations tab

**REQ-LOC-FE-F-020:** A **"Locations"** tab MUST be added to `PolicyViewPage` between
"Financial Summary" and "Audit".

**REQ-LOC-FE-F-021:** The Policy Locations tab renders a read-only version of the schedule
from `GET /api/policies/:id/locations` (`policy_location_rows` view).
All inputs are disabled and no add/delete/calculate controls are shown.

---

## 5. Traceability

| Requirement | Component | Test IDs |
|-------------|-----------|----------|
| F-001 | `LocationsScheduleTab` | T-LOC-TAB-R01a, R01b, R01c |
| F-002 | `LocationsScheduleTab` | T-LOC-TAB-R02a, R02b, R02c |
| F-003 | `LocationsScheduleTab` | T-LOC-TAB-R03a, R03b, R03c |
| F-004 | `LocationsScheduleTab` | T-LOC-TAB-R04a, R04b |
| F-005 | `LocationsScheduleTab` | T-LOC-TAB-R05a, R05b, R05c |
| F-006 | `LocationsScheduleTab` | T-LOC-TAB-R06a–h |
| F-007 | `LocationsScheduleTab` | T-LOC-TAB-R07a–e |
| F-008 | `LocationsScheduleTab` | T-LOC-TAB-R08a, R08b |
| F-009 | `LocationsScheduleTab` | T-LOC-TAB-R09a |
| F-010 | `LocationsScheduleTab` | T-LOC-TAB-R10a |
| F-011 | `LocationsScheduleTab` | T-LOC-TAB-R11a |
| F-012 | `LocationsScheduleTab` | T-LOC-TAB-R12a |
| F-013 | `LocationsScheduleTab` | T-LOC-TAB-R13a, R13b |
| F-014 | `LocationsScheduleTab` | T-LOC-TAB-R14a |
| F-015 | `LocationsScheduleTab` | T-LOC-TAB-R15a |
| F-016–019 | `LocationsScheduleTab` | T-LOC-TAB-R16–R19 |
| F-020–021 | `PolicyViewPage` | T-LOC-POL-R20a, R21a |
