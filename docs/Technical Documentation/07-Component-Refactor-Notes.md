# TECHNICAL DOCUMENTATION — 07: COMPONENT REFACTOR NOTES

This document describes the refactoring work needed to move legacy UI components into the correct layer of the new architecture.

---

## 7.1  Classification Criteria

Before migrating any component, it must be classified as one of:

| Classification | Criteria | Destination |
|---------------|---------|-------------|
| **UI Primitive** | Domain-agnostic, configurable via props, no business logic | `components/[ComponentName]/` |
| **Domain Component** | Renders data that belongs to a specific domain; may contain display logic for that domain | `domains/[domain]/components/[ComponentName]/` |
| **Page Component** | Assembles other components into a user-facing screen | `app/pages/[path]/` |
| **Layout Component** | Provides navigation structure (navbar, sidebar, layout shells) | `app/layouts/` |

Components that contain both UI structure AND business logic must be **split** before migrating.

---

## 7.2  High-Priority Refactors

### `SectionDeductions.jsx` and `SectionParticipations.jsx`

**Current state:** Both live in `src/components/common/` — suggesting they are treated as shared components.

**Concern:** Deduction and participation calculations (how percentages are applied, how lines are totalled) are domain business rules.  If these calculations live inside the component, the component contains domain logic.

**Required action before migration:**
1. Read both files
2. Identify any calculation logic
3. If calculations exist: extract to `domains/quotes/` and make the component a pure display component
4. Only then classify as primitive vs. domain component

> **Open question OQ-011 / OQ-012**

---

### `Movement.jsx`

**Current state:** Lives in `src/components/common/` — treated as a shared component.

**Concern:** A "movement" is a financial delta associated with a policy endorsement.  This is core policy domain logic.

**Required action:**
1. Read `Movement.jsx`
2. Determine whether it calculates the movement value or only displays it
3. If it calculates: extract calculation to `domains/policies/`
4. If it only displays: consider whether it is a primitive or a domain component

> **Open question OQ-012**

---

### `PolicySectionDetailsHeader.jsx`

**Current state:** Lives in `src/components/policy/` — correctly placed in a domain subfolder in the legacy code.

**Migration path:** Move to `domains/policies/components/PolicySectionHeader/` in the new architecture.  Confirm no domain-external logic.

> **Open question OQ-013**

---

### `CopySectionsModal.jsx`

**Current state:** Lives in `src/components/common/`.

**Concern:** "Copy sections" sounds like a domain operation (duplicate section data within a quote or across quotes).  If the modal triggers domain logic, that logic must be extracted to the domain.

**Required action:**
1. Read `CopySectionsModal.jsx`
2. Determine what "copy" does — is it a UI interaction that calls an API, or does it perform data transformation in the browser?
3. If data transformation: extract to `domains/quotes/`

> **Open question OQ-011**

---

### Search Modal Components (`PartySearchModal*.jsx`, `OrganisationSearchModal.jsx`, etc.)

**Current state:** Multiple search modals live in `src/components/common/`.  There are:
- `PartySearchModalBroker.jsx`
- `PartySearchModalCoverholder.jsx`
- `PartySearchModalInsured.jsx`
- `PartySearchModalInsurer.jsx`
- `OrganisationSearchModal.jsx`
- `SubmissionSearchModal.jsx`
- `QuoteSearchModal.jsx`
- `PolicySearchModal.jsx`
- `RelatedSubmissionSearchModal.jsx`
- `BindingAuthoritySearchModal.jsx` etc.

**Concern:** There are many variations of the same pattern (a searchable modal that returns a selected record).  The search UI is a primitive (`GridSearchableSelect` or `Modal` + `SearchableSelect`).  The data fetching and party-type filtering is domain logic.

**Proposed approach:**
- Extract a generic `SearchModal` primitive component
- Domain-specific search modals become thin wrappers that call the domain's API via `api-client` and use the primitive for the UI

**Required action:** Confirm this approach is correct before any migration.

> **Open question OQ-025:** Should domain-specific search modals be primitives configured by props, or domain components that use primitives internally?

---

### `DateSyncNotification.jsx`

**Current state:** Lives in `src/components/common/`.

**Concern:** The name suggests it notifies the user when a date field is being synchronised.  Is this a UI notification pattern (primitive) or a business rule about date synchronisation (domain logic)?

> **Open question OQ-026:** What exactly does `DateSyncNotification.jsx` do?  Read and classify before migration.

---

## 7.3  Components That Are Clean Primitives (No Significant Refactoring Needed)

These components are already domain-agnostic and can be migrated to `components/[ComponentName]/` with minimal changes:

| Legacy file | New location | Changes needed |
|-------------|-------------|----------------|
| `Modal.jsx` | `components/Modal/` | Add requirements and test files |
| `TabsNav.jsx` | `components/TabsNav/` | Add requirements and test files |
| `SearchableSelect.jsx` | `components/SearchableSelect/` | Merge with `StyledSelect.jsx` |
| `CheckboxSelect.jsx` | `components/CheckboxSelect/` | Add requirements and test files |
| `GridSearchableSelect.jsx` | `components/GridSearchableSelect/` | Add requirements and test files |
| `PageHeader.jsx` | `components/PageHeader/` | Add requirements and test files |
| `FieldGroup.jsx` | `components/FieldGroup/` | Add requirements and test files |
| `MetadataFieldInput.jsx` | `components/MetadataFieldInput/` | Add requirements and test files |
| `AuditTable.jsx` | `components/AuditTable/` | Add requirements and test files |
| `InstallmentsBox.jsx` | `components/InstallmentsBox/` | Add requirements and test files |
| `LoadingSpinner.jsx` | `components/LoadingSpinner/` | Add requirements and test files |
| `ErrorBoundary.jsx` | `components/ErrorBoundary/` | Add requirements and test files |
| `FinancialViewToggle.jsx` | `components/FinancialViewToggle/` | Add requirements and test files |
| `Card.jsx` | `components/Card/` | Add requirements and test files |
| `ResizableGrid.jsx` | `components/ResizableGrid/` | Add requirements and test files; move `tableResizer.js` logic in |

---

## 7.4  Duplicated Components

The following pairs are duplicates and must be consolidated:

| File 1 | File 2 | Action |
|--------|--------|--------|
| `src/components/common/ProtectedRoute.jsx` | `src/components/RequireAuth.jsx` | Consolidate into one in `app/shell/RequireAuth.jsx` |
| `ApplicationHomePage/RecentRecords.jsx` | `home/RecentRecords.jsx` | Consolidate; confirm which is the current version |
| `SearchableSelect.jsx` | `StyledSelect.jsx` | Review both; consolidate into one `SearchableSelect` primitive |

---

## 7.5  Component Colour Debt Summary

The following components have the highest colour debt priority (from AI Guidelines Section 7.4):

| Component | Violation count | Action |
|-----------|----------------|--------|
| `AddWidgetModal.jsx` (Reporting) | 143 violations | Migrate during Reporting domain rebuild |
| `LocationsSchedulePage.jsx` | 111 violations | Migrate during OQ-005 resolution |
| `DashboardFiltersConfigPage.jsx` | 80 violations | Migrate during Reporting domain rebuild |
| `DataQualityPage.jsx` | 62 violations | Migrate during Workflow rebuild |
| `WorkflowPage.jsx` | 60 violations | Migrate during Submissions workflow rebuild |
| `ClearanceWorkflowPage.jsx` | 59 violations | Migrate during Clearance workflow rebuild |

All files use bare Tailwind classes instead of `brandClasses` tokens.  Each rebuild must clean these as part of the migration.
