# AI GUIDELINES — SECTION 14: UI COMPONENT AND LAYOUT STANDARDS

This document defines the mandatory rules for page layout, component usage, and sidebar integration across the Policy Forge application.  Every contributor — human or AI — must follow these rules when creating or modifying any front-end page or component.

> **Origin note:** These rules are derived from inconsistencies identified between the legacy `policy-forge-chat (BackUp)` codebase and the new `Cleaned` architecture.  The backup app had no layout guideline, which led to mixed page padding (`p-6` vs `p-8`), inline card-style divs duplicating the `<Card>` component, and contextual sidebar sections missing from view pages.  This guideline closes those gaps permanently.

---

## 14.1  Page Outer Wrapper

Every top-level page component must use **exactly one** of these outer wrapper patterns.  Nothing else is permitted.

| Page Type | Required class string |
|---|---|
| **Form / detail page** (single record) | `p-6 flex flex-col gap-6` |
| **List / overview page** | `p-6 flex flex-col gap-6` |
| **Wide page** (dashboards, reporting) | `p-6` |

> **Full-width rule:** All page types must use the full available content area. `max-w-*` constraints are **forbidden** on page outer wrappers. Content should fill the width that the AppLayout provides. This prevents large whitespace margins on widescreen monitors.

### RULE 1 — Standard padding is `p-6`

```
❌  <div className="p-8">
❌  <div className="p-4">
❌  <div className="p-6 max-w-3xl">                    {/* max-w forbidden — creates excessive whitespace */}
❌  <div className="p-6 space-y-6">                   {/* space-y uses sibling CSS selector — unreliable with conditionals */}
✅  <div className="p-6 flex flex-col gap-6">          {/* form page AND list page */}
✅  <div className="p-6">                               {/* wide page */}
```

> **Why `gap-6` not `space-y-6`:** The dashboard uses `grid gap-6` for consistent 24 px spacing. `gap` is applied by the flex/grid container and always fires regardless of conditional children. `space-y-6` uses a CSS sibling selector (`> :not([hidden]) ~ :not([hidden])`) which can produce inconsistent gaps when conditional React elements are siblings of Cards.

### RULE 2 — Background and height are set by the layout shell

`AppLayout.css` already applies `background: var(--color-gray-50)` and scroll behaviour to the `.app-content` region.  Pages must **not** set their own background or height.

```
❌  <div className="min-h-screen bg-gray-50 p-6">
❌  <div className="h-full bg-white p-6">
✅  <div className="p-6 flex flex-col gap-6">
```

---

## 14.2  Content Surfaces — Use `<Card>`

All content surface areas inside a page must use the shared `<Card>` component from `@/components/Card/component`.  Inline replication of card styles is forbidden.

```
❌  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
❌  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
✅  <Card>...</Card>
✅  <Card title="Submission Details">...</Card>
```

### RULE 3 — Import path is always `@/components/Card/component`

```
import Card from '@/components/Card/component'
```

### RULE 4 — Card `title` prop replaces any section heading inside the Card body

When a Card has a title, the heading is rendered by the Card component itself (`text-sm font-semibold text-gray-900` in the card header bar).  Do **not** add a duplicate `<h2>` or `<p className="font-semibold ...">` at the top of the Card body.

```
❌  <Card>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Submission Details</h2>
      <SubmissionDetails ... />
    </Card>

✅  <Card title="Submission Details">
      <SubmissionDetails ... />
    </Card>
```

---

## 14.4  Sidebar Contextual Sub-Items — Standard Position

When a page registers a contextual sidebar section via `useSidebarSection`, the sub-items **must appear directly beneath the matching top-level nav item**, not as a separate block at the bottom of the sidebar.

This is enforced in `Sidebar.tsx` by rendering the contextual items inside the `NAV_ITEMS.map()` using `React.Fragment`. After each `<NavLink>`, the renderer checks:

```tsx
{section && (location.pathname === to || location.pathname.startsWith(to + '/')) && (
  // inject section items here
)}
```

**Rules:**
- Sub-items must always appear under their parent nav item — never at the end of the nav list.
- The contextual section label (`sidebar-context-title`) is shown only when the sidebar is expanded.
- No other placement is permitted. Any change that moves contextual items elsewhere must be flagged per §1.11 and confirmed.

---

## 14.5  Modal Dialogs — Placement Standard

Modals must be positioned over the **main content area only** — they must not cover the sidebar.

Use `fixed inset-y-0 left-14 right-0` as the overlay container (left-14 = 56px = collapsed sidebar width):

```tsx
<div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center">
  <div className="absolute inset-0 bg-black/40" onClick={onClose} />
  <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-8">
    {/* modal content */}
  </div>
</div>
```

---

## 14.6  Sidebar Contextual Sections

Every domain page that displays or edits a single record **must** register a contextual sidebar section via `useSidebarSection`.

```tsx
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { FiSave, FiCheckCircle } from 'react-icons/fi'

const SIDEBAR_SECTION: SidebarSection = {
  title: 'Submission',
  items: [
    { label: 'Save', icon: FiSave, event: 'submission:save' },
    { label: 'Submit', icon: FiCheckCircle, event: 'submission:submit' },
  ],
}

export default function SubmissionViewPage() {
  useSidebarSection(SIDEBAR_SECTION)
  // ...
}
```

### RULE 5 — `SIDEBAR_SECTION` must be a module-level constant

Define `SIDEBAR_SECTION` outside the component function so it is a stable reference.  Inline objects inside the component body will cause the sidebar to re-register on every render.

```
❌  export default function MyPage() {
      useSidebarSection({ title: '...', items: [...] })   // creates new object each render
    }

✅  const SIDEBAR_SECTION: SidebarSection = { title: '...', items: [...] }
    export default function MyPage() {
      useSidebarSection(SIDEBAR_SECTION)
    }
```

### RULE 6 — `SidebarActionItem` supports three modes

| Mode | When to use | Required fields |
|---|---|---|
| **Event** | Triggers an action the page handles (Save, Submit, etc.) | `label`, `icon`, `event` |
| **Navigate** | Links to another route (Create Party, New Quote, etc.) | `label`, `icon`, `to` |
| **Sub-menu** | Groups a nested list of event or navigate items (Create) | `label`, `icon`, `children` |

```tsx
// Event item — page listens for this DOM event
{ label: 'Save', icon: FiSave, event: 'submission:save' }

// Navigate item — goes to a route
{ label: 'Create Party', icon: FiUsers, to: '/parties/new' }

// Sub-menu group
{
  label: 'Create',
  icon: FiPlusCircle,
  children: [
    { label: 'Quote', icon: FiFile, to: '/quotes/new' },
    { label: 'Create Party', icon: FiUsers, to: '/parties/new' },
  ],
}
```

### RULE 7 — Submission pages: required sidebar items

The backup app established the canonical sidebar section for submission pages.  These must be preserved in the Cleaned architecture:

**On `/submissions/new`:**
| Item | Type | Action |
|---|---|---|
| Save | Event | `submission:save` |
| Create Party | Navigate | `/parties/new` |
| Quote | Navigate | `/quotes/new` |

**On `/submissions/:id` (view/edit):**
| Item | Type | Action |
|---|---|---|
| Save | Event | `submission:save` |
| Submit | Event | `submission:submit` |
| Decline | Event | `submission:decline` |
| Create (sub-menu) | Sub-menu | — |
| → Quote | Navigate | `/quotes/new` |
| → Binding Authority Contract | Navigate | `/binding-authorities/new` |
| → Create Party | Navigate | `/parties/new` |
| → Claim | Navigate | `/claims/new` |

### RULE 7A — Requirements Govern Sidebar Items

For every page that registers a contextual sidebar section, the page requirements file is the authoritative source of allowed sidebar items.

Rules:

- Do not add an extra sidebar item unless the requirements explicitly allow it.
- When a sidebar contract changes, update the requirements section as a full current-state list, not a partial note.
- When an item is removed from the contract, remove it from code and add a negative test assertion proving it is absent.
- Domain pages must inherit their sidebar contract from their domain requirements unless the requirements explicitly carve the page out.

This rule prevents local page edits from drifting away from the agreed domain contract.

---

## 14.7  Tables — Always Show Column Headers

**RULE 8 — Every table must render its `<thead>` and column headers regardless of whether there are results.**

This applies to every search results panel, list page, audit trail, or any other table in the application. The table structure communicates what information is available. Hiding column headers when the table is empty makes the UI feel broken and prevents users from understanding what they are searching for.

### Mandatory table pattern

```tsx
// ✅ CORRECT — column headers always visible
<div className="table-wrapper overflow-x-auto">
  <table className="app-table w-full">
    <thead>
      <tr>
        <th>NAME</th>
        <th>TYPE</th>
        <th>CITY</th>
      </tr>
    </thead>
    <tbody>
      {items.length === 0 ? (
        <tr>
          <td colSpan={3} className="text-center text-gray-400 italic py-4">
            No results found.
          </td>
        </tr>
      ) : (
        items.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.type}</td>
            <td>{item.city}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

// ❌ FORBIDDEN — hides column structure
{items.length === 0 ? (
  <p>No results found.</p>
) : (
  <table>...</table>
)}
```

### Key rules

- The **loading state** may replace the table entirely with a loading indicator.
- The **error state** may replace the table entirely with an error message.
- The **empty state** (zero results after a successful load) **must** show the table with its full `<thead>` and a single colspan row in the `<tbody>` carrying the "No results" message.
- The "No results" row must use `colSpan={n}` where `n` equals the number of columns.
- Empty-state text pattern: `No {items} found.` — e.g. `No parties found.`, `No audit events recorded.`, `No results found.`
- A test asserting that the table is present must NOT be conditional on results being present.

---

## 14.8  Replacing Placeholder Panes

When a tab, pane, or panel moves from stub status to functional status, the placeholder UI must be removed in the same change.

Rules:

- Do not leave generic copy such as `Coming soon`, `Not yet available`, or `This section is under construction` once real controls are present.
- The first functional version must expose a concrete empty state, loading state, and error state where applicable.
- The corresponding test file must assert that the placeholder text is absent after the feature goes live.
- If one subsection remains deferred, label that subsection specifically instead of keeping a page-wide placeholder.

This prevents half-migrated panes that show real data and obsolete stub messaging at the same time.

### RULE 9 — Table Row Navigation: Reference-as-link pattern

The primary trigger for navigating from any list or results table to a detail record is a clickable **Reference** cell.

- Style the reference cell with `text-brand-600 hover:text-brand-800 font-medium`.
- Render it as an `<a>` (or `<Link>`) pointing to the record URL.
- Do **NOT** add a separate "Action" or "View" button column — it is redundant, wastes a column, and creates inconsistent UX. The reference link IS the navigation.

```tsx
// ✅ CORRECT — reference cell navigates
{ key: 'reference', label: 'Reference', render: r => (
  <a href={`/submissions/${r.id}`} className="text-brand-600 hover:text-brand-800 font-medium">
    {r.reference ?? '—'}
  </a>
) }

// ❌ FORBIDDEN — separate Action column
<th>Action</th>
...
<td><button onClick={() => navigate(`/submissions/${r.id}`)}>View</button></td>
```

---

## 14.5  Common Violations Checklist

When reviewing any front-end file, flag and correct:

| Violation | Fix |
|---|---|
| `p-8` on a page outer div | Change to `p-6` |
| `max-w-*` on any page outer wrapper | Remove entirely — all pages must fill available width |
| `min-h-screen` on a page div | Remove — AppLayout handles height |
| `bg-gray-50` on a page div | Remove — AppLayout.css sets background |
| `bg-white rounded-lg border border-gray-200` on a bare `<section>` or `<div>` | Replace with `<Card>` component |
| `bg-white rounded-lg border border-gray-200 shadow-sm` inline div | Replace with `<Card>` |
| `<h2>` inside Card body for section title | Move text to `<Card title="...">` prop |
| Missing `useSidebarSection` on a record view/edit page | Add the appropriate section per Rule 7 |
| `SIDEBAR_SECTION` defined inside the component function | Move to module level (exception: dynamic items depending on runtime state are permitted inline) |
| Empty table renders `<p>No results</p>` without `<table>` + `<thead>` | Apply Rule 8 empty-table pattern |
| Inline Save / Back / Cancel buttons on a form or create page | Register `useSidebarSection` with Save (event) + Back (navigate) items; remove inline buttons |
| Form field label in sentence case (`Email address`, `Additional notes`) | Rewrite label text as Title Case |
| Column header or button stored as ALL CAPS (`REFERENCE`, `TYPE`, `sign in`) | Rewrite as Title Case in source; no `text-transform` workaround |
| Filter form rows use different `grid-cols-*` counts | Normalise all rows to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` |
| Separate "View"/"Action" button column in a results table | Remove column; style the Reference cell as a link per Rule 9 |

---

## 14.8  Sidebar Actions — Save and Back on Form / Create / Detail Pages

**RULE 9 — Every create, edit, and record-detail page MUST surface its primary Save and Back/Cancel actions as contextual sidebar items. Inline Save, Back, or Cancel buttons rendered inside the page body are forbidden on these page types.**

### Rationale
Consistent action placement reduces cognitive load. The sidebar always contains "what can I do here" so users never hunt for Save or Back inside the page body. This also keeps page bodies focused on data, not chrome.

### Page types this rule applies to
- Create pages (e.g. Create Party, New Submission)
- Edit / detail pages (e.g. Submission View, Party detail)
- Any page whose primary purpose is viewing or modifying a single record

### Page types this rule does NOT apply to
- Search / list pages (actions belong in table row or top-bar)
- Dashboard pages
- Report / read-only display pages with no editable state

### Required implementation pattern

```tsx
import { FiSave, FiArrowLeft } from 'react-icons/fi'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'

// Must be at MODULE level — not inside the component function
const SIDEBAR_SECTION: SidebarSection = {
  title: 'Party',           // domain noun — "Party", "Submission", "Quote" etc.
  items: [
    { label: 'Back',  icon: FiArrowLeft, to: '/parties' },   // navigate item
    { label: 'Save',  icon: FiSave,      event: 'party:save' }, // event item
  ],
}

export default function CreatePartyPage() {
  const navigate = useNavigate()
  useSidebarSection(SIDEBAR_SECTION)   // registers contextual sidebar section

  // Listen for the Save event dispatched by the sidebar
  const handleSave = useCallback(async () => {
    // ... save logic ...
  }, [/* deps */])

  useEffect(() => {
    window.addEventListener('party:save', handleSave)
    return () => window.removeEventListener('party:save', handleSave)
  }, [handleSave])

  return (
    // NO <button>Save</button>, NO <button>Back</button>, NO <button>Cancel</button> here
    <div>
      {/* form fields only */}
    </div>
  )
}
```

### Event naming convention

Custom event names use the format `<domain>:<action>` (all lowercase, colon separator):

| Domain | Action | Event name |
|---|---|---|
| Party | save | `party:save` |
| Submission | save | `submission:save` |
| Quote | save | `quote:save` |
| Binding Authority | save | `ba:save` |

### Rules

1. `SIDEBAR_SECTION` must be declared at **module level** (not inside the component function) so it is referentially stable across renders.
2. The save `event` string in `SIDEBAR_SECTION` must match the string passed to `window.addEventListener` exactly.
3. The listener must be registered in a `useEffect` that depends on the `useCallback`-wrapped handler (to avoid stale closures).
4. No `<button>` that navigates "back" or triggers "save" / "cancel" may appear in the component's JSX return.
5. Every such page must have a test that calls `mockUseSidebarSection.mock.calls[0][0]` and asserts the correct sidebar section structure.

### Testing pattern

```tsx
const mockUseSidebarSection = jest.fn()
jest.mock('@/shell/SidebarContext', () => ({
  useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
}))

it('registers sidebar section with Back and Save items', () => {
  renderPage()
  const section = mockUseSidebarSection.mock.calls[0]?.[0]
  expect(section.title).toBe('Party')
  expect(section.items).toContainEqual(expect.objectContaining({ label: 'Back', to: '/parties' }))
  expect(section.items).toContainEqual(expect.objectContaining({ label: 'Save', event: 'party:save' }))
})

it('calls save handler when party:save event fires', async () => {
  renderPage()
  act(() => { window.dispatchEvent(new CustomEvent('party:save')) })
  // assert save was triggered
})
```

---

## 14.9  Viewport-Responsive Layout

**RULE 10 — Page layouts shall adapt to available viewport width. Fixed narrow `max-width` constraints on form or content pages are forbidden. Content must scale usefully between 1024 px and 1920 px.**

### Problem

Hardcoding `max-w-2xl` (672 px) on a full-page form means the content occupies roughly a third of a 1920 px screen and looks broken on any wide display. AppLayout is already fluid — page bodies must be too.

### Required layout approach

Use a `useWindowSize` hook (from `@/lib/hooks/useWindowSize`) when JS-side layout decisions are needed. For most cases, Tailwind responsive classes alone are sufficient.

#### Viewport breakpoint guidance

| Viewport width | Recommended layout |
|---|---|
| < 768 px (`sm`) | Single column, full width |
| 768–1023 px (`md`) | Single column, full width |
| 1024–1279 px (`lg`) | Two column grid (`lg:grid-cols-2`) |
| ≥ 1280 px (`xl`) | Two or three column grid (`xl:grid-cols-3`) |

#### Required pattern for form / create pages

```tsx
// Correct — responsive, no hard max-width cap
<div className="p-6 space-y-6">
  <h1 className="text-xl font-semibold text-gray-900">Create Party</h1>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card title="Required Details">
      {/* required fields */}
    </Card>
    <Card title="Address">
      {/* optional address fields */}
    </Card>
  </div>
</div>

// Wrong — caps width at 672 px on any screen
<div className="p-6 max-w-2xl mx-auto">
```

#### When to use the `useWindowSize` hook

Use `useWindowSize` when:
- You need to imperatively hide/show UI elements based on pixel breakpoints (e.g. collapse a sidebar below 900 px)
- You are building a resizable panel or drag-to-resize feature
- Tailwind responsive classes cannot express the logic (e.g. dynamic grid column counts driven by data)

Do NOT use `useWindowSize` to duplicate what Tailwind responsive classes already handle.

### `useWindowSize` hook API

```tsx
import { useWindowSize } from '@/lib/hooks/useWindowSize'

const { width, height } = useWindowSize()
// width and height always reflect current window.innerWidth / innerHeight
// updates automatically on window resize
```

### Common violations

| Violation | Fix |
|---|---|
| `max-w-2xl mx-auto` on a form page container | Remove `max-w-*`; use `grid grid-cols-1 lg:grid-cols-2 gap-6` on the card row |
| Hardcoded `width: 800px` inline style | Remove; use Tailwind responsive classes |
| Content that does not reflow below 1024 px | Test at 375 px, 768 px, 1440 px |

---

## 14.10  Text Capitalisation Standard

All user-visible text follows a two-tier capitalisation scheme.

| Tier | Apply to | Pattern | Examples |
|---|---|---|---|
| **Title Case** | Page headings, card titles, column headers, button labels, form field labels, nav items, tab labels, modal headings | Every significant word capitalised | `Email Address`, `Inception Date`, `Create Submission`, `Sign In`, `Recent Activity` |
| **Sentence case** | Body paragraphs, inline descriptions, placeholder text, error and validation messages, toast notifications, empty-state messages, ARIA strings on icon-only controls, secondary link text | First word + proper nouns only | `Unable to load recent activity.`, `Enter your password`, `Forgot password?` |

### Title Case definition

Capitalise every word **except**: articles (a, an, the), coordinating conjunctions under 5 letters (and, but, or, nor, for), and short prepositions (in, on, of, to, at, by, up).  
Always capitalise the first and last word in the string regardless of part of speech.  
Parenthetical qualifiers such as `(optional)` and `(required)` always stay lowercase.

Correct: `Year of Account`, `Insured / Name`, `Sign In`, `Additional Notes (optional)`

### Acronyms and abbreviations

Acronyms and abbreviations retain their standard capitalisation form regardless of tier. Do not rewrite them to match the surrounding case rule.

Correct: `YTD GWP`, `BA Contract`, `UMR`, `LOB`, `NTU`  
Wrong: `Ytd Gwp`, `ytd gwp`, `Ba Contract`

### No CSS text-transform shortcut

Do **not** use `text-transform: uppercase` or `text-transform: lowercase` as a substitute for writing text correctly in source.  
Column header strings, button labels, and field labels must be Title Case **in the source code**, not CSS-shouted into all caps.

---

## 14.11  Filter Form Grid Consistency

All multi-field filter and search forms must use a consistent responsive grid for **every filter row** in the form:

```
grid-cols-2 sm:grid-cols-3 lg:grid-cols-4
```

### Rationale

Different `grid-cols-*` counts on different rows within the same form cause fields to misalign vertically — labels and inputs no longer form visual columns, making the form look broken even if each row is individually correct.

### Rules

- Every filter row in the same form must share the **same** column count at every breakpoint.
- The standard is **4 columns at `lg`**, 3 at `sm`, 2 at base (mobile).
- Do **not** use `lg:grid-cols-5` or other non-standard counts in filter forms unless every other row in the same form uses the same count.
- If a row has fewer than 4 fields, either leave unused grid cells empty or merge the last field with `sm:col-span-2` — but do **not** change the row's `grid-cols-*` value.

```tsx
// ✅ CORRECT — all rows use the same grid
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
  <TextFilter /> <TextFilter /> <TextFilter /> <SelectFilter />
</div>
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
  <DateFilter /> <DateFilter /> <DateFilter /> <DateFilter />
</div>

// ❌ FORBIDDEN — mismatched column counts
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">  {/* row 1 = 5 cols */}
  ...
</div>
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">  {/* row 2 = 4 cols */}
  ...
</div>
```
