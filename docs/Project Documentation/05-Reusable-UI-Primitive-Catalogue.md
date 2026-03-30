# PROJECT DOCUMENTATION — 05: REUSABLE UI PRIMITIVE CATALOGUE

This document lists all reusable UI primitive components in the new architecture.  These components live in `/components/` and are domain-agnostic.  They render structure and interactions only.  They contain no domain logic.

---

## What Makes a Component a Primitive?

A UI primitive:

- Renders structure, layout, or an interaction pattern
- Has no knowledge of what domain data means
- Receives all content and behaviour through props
- Can be used in any domain, workflow, or page context
- Has its own requirements file, test file, and component file

---

## How to Read This Document

Each entry includes:

- **Purpose** — What interaction or layout pattern it provides
- **Props (summary)** — The configuration it accepts
- **Domain-agnostic check** — What would break if a domain were hardcoded into it
- **Legacy equivalent** — Where the closest version currently lives

---

## Component: `SectionGrid`

**Purpose:** Render a grid of named sections (e.g. quote sections, BA sections) with selection and navigation support.

**Props summary:**
- `sections: Section[]` — array of section objects to render
- `onSelectSection: (id) => void` — callback when a section is clicked
- `selectedSectionId?: string` — currently selected section

**Domain-agnostic check:** The component does not know what a "section" means to the Quotes domain or the BA domain.  It receives data as props.

**Legacy equivalent:** Embedded within `QuoteSectionViewPage.jsx` and `BindingAuthoritySectionViewPage.jsx` — currently duplicated rather than shared.

---

## Component: `ResizableGrid`

**Purpose:** Render a data table with resizable columns.

**Props summary:**
- `columns: ColumnDef[]`
- `rows: Row[]`
- `onRowClick?: (row) => void`

**Legacy equivalent:** `src/components/common/ResizableGrid.jsx`

---

## Component: `Modal`

**Purpose:** Display content in an overlay modal with backdrop and close controls.

**Props summary:**
- `isOpen: boolean`
- `onClose: () => void`
- `title?: string`
- `children: ReactNode`
- `size?: 'sm' | 'md' | 'lg' | 'xl'`

**Legacy equivalent:** `src/components/common/Modal.jsx`

---

## Component: `TabsNav`

**Purpose:** Render a horizontal tab navigation bar.

**Props summary:**
- `tabs: Tab[]` — `{ id, label, disabled? }`
- `activeTab: string`
- `onTabChange: (id) => void`

**Legacy equivalent:** `src/components/common/TabsNav.jsx`

---

## Component: `SearchableSelect`

**Purpose:** Render a dropdown with text search capability.

**Props summary:**
- `options: Option[]` — `{ value, label }`
- `value: string | null`
- `onChange: (value) => void`
- `placeholder?: string`
- `isDisabled?: boolean`

**Legacy equivalent:** `src/components/common/SearchableSelect.jsx`, `src/components/common/StyledSelect.jsx`

---

## Component: `CheckboxSelect`

**Purpose:** Render a multi-item selection using checkboxes.

**Props summary:**
- `options: Option[]`
- `selectedValues: string[]`
- `onChange: (values) => void`

**Legacy equivalent:** `src/components/common/CheckboxSelect.jsx`

---

## Component: `GridSearchableSelect`

**Purpose:** Render a searchable dropdown with a grid/table view for complex record selection.

**Legacy equivalent:** `src/components/common/GridSearchableSelect.jsx`

---

## Component: `PageHeader`

**Purpose:** Render a consistent page heading with title, subtitle, and optional action area.

**Props summary:**
- `title: string`
- `subtitle?: string`
- `actions?: ReactNode`

**Legacy equivalent:** `src/components/common/PageHeader.jsx`

---

## Component: `FieldGroup`

**Purpose:** Render a labelled group of form fields in a consistent layout.

**Props summary:**
- `label: string`
- `children: ReactNode`
- `required?: boolean`

**Legacy equivalent:** `src/components/common/FieldGroup.jsx`

---

## Component: `MetadataFieldInput`

**Purpose:** Render a form input driven entirely by field metadata configuration (label, type, validation, visibility).

**Props summary:**
- `metadata: FieldMetadata`
- `value: unknown`
- `onChange: (value) => void`
- `readOnly?: boolean`

**Domain-agnostic check:** The component renders whatever field type the metadata specifies.  It does not know whether the field is on a submission, quote, or policy.

**Legacy equivalent:** `src/components/fields/MetadataFieldInput.jsx`

---

## Component: `AuditTable`

**Purpose:** Render a read-only table of change history entries.

**Props summary:**
- `entries: AuditEntry[]`

**Legacy equivalent:** `src/components/common/AuditTable.jsx`

---

## Component: `InstallmentsBox`

**Purpose:** Display premium instalment schedules for a section.

**Legacy equivalent:** `src/components/common/InstallmentsBox.jsx`

---

## Component: `LoadingSpinner`

**Purpose:** Render a loading indicator while data is being fetched.

**Legacy equivalent:** `src/components/LoadingSpinner.jsx`

---

## Component: `ErrorBoundary`

**Purpose:** Catch React rendering errors and display a fallback UI.

**Legacy equivalent:** `src/components/common/ErrorBoundary.jsx`

---

## Component: `SearchableFieldList`

**Purpose:** Render a searchable list of configurable fields (used in report and dashboard configuration).

**Legacy equivalent:** `src/components/common/SearchableFieldList.jsx`

---

## Component: `FinancialViewToggle`

**Purpose:** Render a toggle between Whole, Market, and Line financial views.

**Props summary:**
- `currentView: 'whole' | 'market' | 'line'`
- `onChange: (view) => void`

**Legacy equivalent:** `src/components/common/FinancialViewToggle.jsx`

---

## Component: `Card`

**Purpose:** Render a styled content card container.

**Legacy equivalent:** `src/components/Card.jsx`

---

## Components Still to Be Identified

The following legacy components need further analysis to determine whether they are domain-agnostic primitives or domain-specific components:

| Legacy file | Question |
|-------------|----------|
| `CopySectionsModal.jsx` | Is section-copying domain logic or UI interaction? |
| `DateSyncNotification.jsx` | Is date sync a domain rule or a UI notification? |
| `Movement.jsx` | Does this contain policy domain logic? |
| `PolicySectionDetailsHeader.jsx` | Is this a domain component or a primitive? |
| `SectionDeductions.jsx` | Does this contain deduction calculation logic? |
| `SectionParticipations.jsx` | Does this contain participation calculation logic? |

These are tracked as open questions OQ-011 to OQ-016 in `Technical Documentation/08-Open-Questions.md`.
