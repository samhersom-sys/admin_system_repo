# TECHNICAL DOCUMENTATION — 04: DOMAIN-SPECIFIC MIGRATION NOTES

This document provides detailed migration notes for each domain, covering hidden logic, assumptions, edge cases, and migration risks discovered during analysis of the legacy codebase.

---

## Domain: `submissions`

### Hidden Logic Found in Legacy Code

**In `submissionsContext.js`:**
- The context enriches submissions with insured party names from `PartiesContext` using two different strategies:
  1. If `insuredId` is known: look up party by `id`
  2. If `insuredId` is missing: fuzzy-match by `insuredName` / `insured` text against parties with `type === 'insured'`
- This enrichment happens inside a `useEffect` that runs whenever `parties` changes
- This is domain logic embedded in state management — it must move to the `submissions` domain

**Migration risk:** The fuzzy name matching has no tests.  If it silently breaks during migration, submission insured names will display incorrectly.  A test must cover this before migration.

### Assumptions in Legacy Code

- Submission `source` field is not consistently populated — some submissions have no `source` (implies manual)
- `insuredName` and `insured` fields appear to be duplicates (legacy naming) — must be consolidated
- The `submissionsContext.js` `enrichSubmission` function is called by multiple consumers — they will all need to be updated

### Workflow Status Values

From the legacy documentation, the workflow stages are:
`unassigned → assigned → in-review → quoted / declined`

The lookup table for these is seeded by `backend/create-workflow-status-lookup.js`.  The migration must preserve these values.

---

## Domain: `quotes`

### Hidden Logic Found in Legacy Code

**In `premium.js` and `financialViewCalculations.js`:**
- Premium calculations exist in utility files not clearly owned by any domain
- Financial view calculations (Whole vs Market vs Line) are imported by both Quote and Policy pages
- These calculations contain business rules that belong in the `quotes` domain (pending OQ-003)

**In `SectionDeductions.jsx` and `SectionParticipations.jsx`:**
- These are named as components but may contain calculation logic
- Need deeper analysis before classifying as domain components vs. UI primitives
- Tracked as OQ-011 and OQ-012

### Known Technical Debt

- `CopySectionsModal.jsx` copies sections — does it copy data only, or apply business rules?
- Quote sections, coverages, and deductions all have independent API endpoints in the backend — confirm these are all present

---

## Domain: `policies`

### Hidden Logic Found in Legacy Code

**In `Movement.jsx`:**
- The `Movement` component is named as a component but may contain financial calculation logic
- Movements represent financial deltas on endorsements
- If `Movement.jsx` runs a calculation, that calculation is domain logic in a component — must be extracted

**In `PolicyEndorsement/`:**
- The endorsement workflow is spread across `PolicyEndorsePage.jsx` and `PolicyEndorsementPage.jsx`
- These appear to represent two different steps of the same workflow
- Must be clarified during migration

### Disabled Routes in Legacy

The following routes are disabled in the legacy `App.jsx` with comments:
- `/policies/create` — marked "disabled create" (uses `AppLayoutPageNotFound`)
- `/policies/renew/:id` — marked "not yet implemented"

These features do not exist yet.  They must be included in the new architecture's requirements as planned features.

---

## Domain: `binding-authorities`

### Complexity Notes

Binding authorities are structurally similar to quotes but with additional concepts:
- Bordereaux transactions (periodic bulk transaction reporting)
- Coverholder participation records
- Document library (stored documents for the BA contract)
- Endorsements on the BA contract itself

The legacy code structure mirrors the Quote pages structure, which suggests the BA was built as a copy of quotes.  During migration, the shared structural patterns (section grids, participation tables, deductions) must be extracted into shared UI primitives rather than duplicated again.

### Seeding Notes

The backend has multiple seeding scripts specifically for BAs:
- `create-ba-initial-transactions.js`
- `create-ba-section-participation-table.js`
- `create-ba-transactions-table.js`

These must be preserved and organised as proper migration/seed files in the new architecture.

---

## Domain: `auth`

### Current Authentication Model

- JWT token stored in `localStorage`
- Token contains user data — no server-side session
- Token validity is not verified on requests (no backend middleware that checks token expiry)
- `userContext.jsx` has a `legacyUser` map that creates compatibility aliases (`userName`, `name`, `accountType`)

### Migration Risk: Legacy Aliases

The `legacyUser` aliases (`userName`, `name`, `accountType`) suggest many components depend on the old user object shape.  When `userContext.jsx` is replaced by the `auth-session` shared service, every consumer must be updated.

**Action:** Before migrating userContext, scan all files that consume `useUser()` and document every field they use.  Tracked as OQ-021.

---

## Domain: `reporting`

### Major Colour Debt

The `AddWidgetModal.jsx` file has 143 hardcoded Tailwind colour violations — the highest of any file.  This file must be fully migrated to use `brandClasses` tokens before it is considered clean.

### Dashboard Widget System

The legacy dashboard system supports configurable widgets with drag-and-drop.  The widget table is seeded by `backend/create-dashboard-widgets-table.js`.  The new architecture must preserve this configurability.

---

## Domain: `notifications`

### Cross-Tenant Risk

The legacy `notificationContext.jsx` loads notifications by `userName` and `orgCode`.  The `orgCode` is taken from `user.orgCode`.  If the user object's `orgCode` is wrong, a user could see notifications from a different tenant.

**This is a tenant-scoping bug.** It is Priority 1 in the Risk Register.

---

## Domain: `settings`

### Field Metadata System

`src/config/fieldMetadata.js` is a large configuration file that defines metadata for every field in the system (label, type, visibility, validation).  The `useFieldMetadata.js` hook uses this to drive form rendering.

This system is powerful and should be preserved.  In the new architecture, field metadata belongs to the `settings` domain and should be fetched from the API (allowing tenant-specific metadata) rather than loaded from a static config file.

---

## Locations Schedule (Status: Unclear)

`src/utils/locationsScheduleApi.js` and the `LocationsSchedulePage` suggest a feature for managing property locations linked to quotes.  It is also connected to the rating engine (`rating-api.js`).  This feature does not clearly belong to any of the domains defined so far.

> **Open question OQ-005:** Should the Location Schedule be part of the `quotes` domain (locations are properties being insured in a quote) or a separate domain?
