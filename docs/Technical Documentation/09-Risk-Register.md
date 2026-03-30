# TECHNICAL DOCUMENTATION — 09: RISK REGISTER

This register lists every known risk in the migration from the legacy codebase to the new `Cleaned` architecture.  Each risk is rated by likelihood and impact.  The register must be reviewed at every major checkpoint.

---

## Risk Rating Scale

| Rating | Likelihood | Impact |
|--------|-----------|--------|
| Critical | Will almost certainly cause problems if not addressed | System is wrong, broken, or insecure |
| High | Likely to cause problems | Feature fails or data is incorrect |
| Medium | May cause problems | Feature degrades or requires workaround |
| Low | Unlikely but possible | Minor inconvenience |

---

## R-001: No Tenant Scoping on API Routes

- **Rating:** Critical
- **Type:** Security
- **Description:** No API route in the legacy backend filters data by `org_code`.  Any authenticated user can read or write data belonging to any tenant.
- **Why it matters:** Data isolation is the fundamental multi-tenant guarantee.  Without it, the platform is not safe for commercial use with multiple tenants.
- **Mitigation:** Implement tenant middleware before any domain is considered "migrated".  Every route must pass org_code validation before returning or writing data.
- **Status:** Open — not yet addressed
- **Blocks:** All domain migrations
- **Linked OQ:** OQ-008 (permission matrix), OQ-009 (cross-tenant model)

---

## R-002: No Permission Middleware on API Routes

- **Rating:** Critical
- **Type:** Security
- **Description:** No role-based access control exists on any backend API route.  Any authenticated user can perform any action.
- **Why it matters:** Without permissions, a broker could bind policies, a claims handler could modify settings, etc.
- **Mitigation:** Implement permissions middleware as part of Phase 1.
- **Status:** Open
- **Blocks:** All domain migrations
- **Linked OQ:** OQ-008

---

## R-003: Silent Breaking of Context Consumers

- **Rating:** High
- **Type:** Migration
- **Description:** The legacy codebase uses React Context providers for all shared state.  More than 20 files consume `useUser()`, `useSubmissions()`, `useParties()` etc.  Removing a context provider without updating all consumers will silently break features.
- **Mitigation:** Before migrating any context, scan all consumers and document every field/method they use.  Update all consumers as part of the same migration step.
- **Status:** Open
- **Blocks:** Auth, Submissions, Parties, Quotes, Claims migrations
- **Linked OQ:** OQ-021

---

## R-004: Calculations Embedded in Components

- **Rating:** High
- **Type:** Architecture
- **Description:** Business logic (premium calculations, financial view calculations, deduction totals) may be embedded inside React components.  If this logic is not identified before migration, it will remain in the UI layer instead of moving to the domain layer.
- **Mitigation:** Read and analyse `Movement.jsx`, `SectionDeductions.jsx`, `SectionParticipations.jsx`, `premium.js`, `financialViewCalculations.js` before migration.
- **Status:** Open
- **Linked OQ:** OQ-011, OQ-012, OQ-014, OQ-015, OQ-003

---

## R-005: Notification Tenant Scoping Bug

- **Rating:** High
- **Type:** Security / Data Integrity
- **Description:** `notificationContext.jsx` scopes notifications by `user.name` (not `user.id`).  Two users with the same username at different tenants could see each other's notifications.
- **Mitigation:** Change to `user.id` scoping in the new notifications shared service.
- **Status:** Open
- **Blocks:** Notifications shared service migration

---

## R-006: Colour Token Debt Causing UI Inconsistency

- **Rating:** Medium
- **Type:** Technical Debt
- **Description:** ~160 JSX files use bare Tailwind classes instead of `brandClasses` tokens.  Competing `:root` blocks in `Sidebar.css` and `NavbarInternal.css` actively cause incorrect colours in production.
- **Mitigation:**
  1. Fix competing `:root` blocks first (Priority 1 — bug fix)
  2. Migrate colour debt file by file during domain rebuilds (Priority 2)
- **Status:** Open — Priority 1 is a live bug

---

## R-007: Legacy Aliases in User Context

- **Rating:** Medium
- **Type:** Migration
- **Description:** `userContext.jsx` exports `legacyUser` with compatibility aliases (`userName`, `name`, `accountType`).  These aliases obscure the true user object shape and make it unclear what components depend on.
- **Mitigation:** Scan all consumers before migration; document all field usages; update in one coordinated pass.
- **Status:** Open
- **Linked OQ:** OQ-021

---

## R-008: Missing Requirements for Existing Features

- **Rating:** Medium
- **Type:** Migration
- **Description:** Some features visible in the UI have no documented requirements.  If these features are rewritten without first writing requirements, behaviour may change undetected.
- **Known gaps:**
  - Data quality rules (`DataQualityPage.jsx`) — OQ-022
  - My Work Items feature — OQ-023
  - AI chat dock — OQ-018
  - Workspace tab concept — OQ-017
- **Mitigation:** Prioritise requirements writing for all features before migration.
- **Status:** Open

---

## R-009: Duplicate and Stale Files

- **Rating:** Low
- **Type:** Technical Debt
- **Description:** Duplicate `RecentRecords.jsx` files exist.  `dirty.js` has unclear purpose.  Disabled routes in `App.jsx` reference features that may not work.
- **Mitigation:** Confirm and delete duplicates; clarify `dirty.js`; document disabled routes as planned features.
- **Status:** Open

---

## R-010: No Event Bus Exists — Coupling Cannot Be Removed Until It Is Built

- **Rating:** Medium
- **Type:** Architecture
- **Description:** Until the event bus shared service is built, it is impossible to properly decouple domains.  Domain-to-domain coupling from the legacy codebase will persist.
- **Mitigation:** Build the event bus in Phase 1 before any domain migration begins.
- **Status:** Open — Phase 1 dependency

---

## R-011: Seed Data Scattered Across Backend

- **Rating:** Low
- **Type:** Migration
- **Description:** Many `create-*.js` files in the backend are seed/setup scripts.  They are not organised as migrations.  If the migration involves database changes, managing these scripts will be complex.
- **Mitigation:** Organise seed scripts into the `backend/migrations/` and `backend/seed-data/` folders as part of the backend migration pass.
- **Status:** Open

---

## R-012: Locations Schedule Domain Uncertainty

- **Rating:** Medium
- **Type:** Architecture
- **Description:** The locations schedule feature connects to the rating engine and has its own page.  Its domain ownership is unclear.
- **Mitigation:** Resolve OQ-005 before migrating the rating engine or locations schedule.
- **Status:** Open — blocked by OQ-005
