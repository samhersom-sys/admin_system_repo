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

## 2. Requirements

### Settings tile grid

**REQ-SETTINGS-GRID-F-001:** The settings page shall render a responsive tile grid: 3 columns at lg, 2 at md, 1 at sm.

**REQ-SETTINGS-GRID-F-002:** The tile grid shall contain the following tiles, shown only to the stated roles:

| Tile | Route | Visible to |
|------|-------|------------|
| Account Administration | `/settings/account` | `client_admin`, `internal_admin` |
| Product Configuration | `/settings/products` | `client_admin`, `internal_admin` |
| Organisation Configuration | `/settings/organisations` | `client_admin`, `internal_admin` |
| Rating Rules | `/settings/rating-rules` | `client_admin`, `internal_admin` |
| Data Quality Configuration | `/settings/data-quality` | `client_admin`, `internal_admin` |
| Module Licensing | `/settings/module-licensing` | `internal_admin` only |

**REQ-SETTINGS-GRID-F-003:** Each tile shall render: an icon in a rounded grey background, a title, a description, and a right-aligned chevron icon (`FiChevronRight`). Clicking the tile navigates to its route.

**REQ-SETTINGS-GRID-F-004:** The Module Licensing tile must not be rendered for any role other than `internal_admin`.

**REQ-SETTINGS-GRID-F-005:** For roles `client_admin` and `internal_admin`, all five non-platform tiles (Account Administration, Product Configuration, Organisation Configuration, Rating Rules, Data Quality Configuration) must be rendered.

**REQ-SETTINGS-GRID-F-006:** Tiles for unbuilt sections (`/settings/account`, `/settings/products`, `/settings/organisations`, `/settings/rating-rules`, `/settings/data-quality`) shall navigate to a shared NotFound page.

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
