# AI GUIDELINES — SECTION 7: BRAND COLOUR AND DESIGN TOKEN STANDARDS

This document defines the mandatory rules for colour usage across the Policy Forge application.  Every contributor — human or AI — must follow these rules when creating or modifying any front-end file.

> **Note:** This is the updated standard for the new `Cleaned` architecture.  It preserves all rules from the legacy `07-Brand-Colour-Standards.md` and adds new guidance relevant to the domain-driven, component-primitive architecture.

---

## 7.1  Single Source of Truth

| Layer | File | Role |
|-------|------|------|
| **JS tokens** | `lib/design-tokens/brandColors.ts` | Canonical values — every colour used anywhere in the app must originate here. |
| **CSS bridge** | `lib/design-tokens/global.css` `:root` block | Mirrors every JS token as a CSS custom property so `.css` files can consume them. |
| **Tailwind map** | `brandClasses` exported from `lib/design-tokens/brandClasses.ts` | Pre-built Tailwind class strings for buttons, badges, text tiers, table cells etc. |

> **Architecture note:** Design token files live in `lib/design-tokens/` — they are `lib/` (framework-agnostic shared utilities), not `src/styles/`, not `shared/`.  Using the wrong import path is a build-breaking error (see RULE 11).

---

## 7.2  Colour Categories

| Category | JS path | CSS var pattern | Example |
|----------|---------|-----------------|---------|
| Brand primary | `brandColors.primary.*` | `--color-brand*` | `#56c8b1` |
| Secondary | `brandColors.secondary.*` | `--color-secondary*` | `#3b82f6` |
| Neutral scale | `brandColors.neutral[50–900]` | `--color-gray-*` | `#374151` |
| Semantic | `brandColors.success / warning / error / info` | `--color-success` etc. | `#10b981` |
| Semantic light | `brandColors.statusLight.*` | `--status-*` | `#d1fae5` |
| Table chrome | `brandColors.table.*` | `--table-*` | `#111826` |
| Sidebar chrome | `brandColors.sidebar.*` | `--sidebar-*` | `#111826` |
| UI one-offs | `brandColors.ui.*` | `--ui-*` | `#000e13` |
| Chart | `brandColors.chart.*` | `--chart-*` | palette array |
| State | `brandColors.state.*` | `--state-*` | `#fef3c7` |

The `CHROME_TEXT` constant drives sidebar text, table header text, and sort-icon arrows.  Its CSS equivalent is `--color-chrome-text`.

---

## 7.3  Mandatory Rules

### RULE 1 — No hardcoded hex in JSX or JS (except `brandColors.ts`)

```
❌  style={{ backgroundColor: '#111826' }}
✅  style={{ backgroundColor: brandColors.table.headerBg }}
```

Any `#RRGGBB` / `#RGB` literal outside `brandColors.ts` is a violation.

### RULE 2 — No hardcoded hex in CSS (except `global.css :root`)

```
❌  .sidebar { background: #3e424b; }
✅  .sidebar { background: var(--sidebar-bg); }
```

The `:root` block in `global.css` is the only place where literal hex values appear in CSS.  All other selectors must use `var(--…)`.

### RULE 3 — Use `brandClasses` Tailwind tokens where they exist

```
❌  className="text-gray-700"
✅  className={brandClasses.typography.body}
```

When no matching `brandClasses` token exists, bare Tailwind is acceptable only if the colour class maps to one of the four typography tiers (gray-900 / 700 / 600 / 500) or to a semantic status colour that already has a `brandColors` equivalent.

### RULE 4 — New colours must be added to `brandColors.ts` first

If a design requires a colour not already in the palette:

1. Add it to the appropriate group in `brandColors.ts`.
2. Add a matching CSS var in `global.css :root`.
3. Add a `brandClasses` token if it will be used as a Tailwind class.
4. Add a test in `brandColors.test.ts`.
5. Only then use it in the component.

### RULE 5 — No duplicate `:root` blocks

Only `global.css` may declare `:root` custom properties for colours.  Other CSS files must not re-declare sidebar, table, or other tokens.

### RULE 6 — Sort icons use `.sort-icon` class

All sort icon wrappers must use `className="sort-icon"`.  The colour comes from `.sort-icon { color: var(--table-header-text) }` in `global.css` — never from a hardcoded Tailwind class.

### RULE 7 — CSS var values are literal hex, not chained vars

Every CSS custom property must hold a literal hex value, not a reference to another custom property.  CRA's PostCSS pipeline does not reliably resolve chained vars.

```
❌  --table-header-text: var(--color-chrome-text);
✅  --table-header-text: #ffffff;
```

---

## 7.4  New Architecture Additions (Superseding Legacy)

### RULE 8 — Design tokens live in `lib/design-tokens/`

In the `Cleaned` architecture, brand colour tokens are a shared `lib/` service.  They must be placed in:

```
lib/design-tokens/
  brandColors.ts
  global.css
  brandClasses.ts
  index.ts
```

This makes them explicitly domain-agnostic and available to all components, pages, and layouts without coupling to any domain.

**Never import from `src/styles/`, `shared/design-tokens/`, or any other path.**  Only `lib/design-tokens/` is correct.

```
❌  import { brandColors } from '@/shared/design-tokens/brandColors'
❌  import { brandColors } from '@/src/styles/brandColors'
✅  import { brandColors } from '@/lib/design-tokens/brandColors'
```

### RULE 9 — Components receive colour via props or tokens only

Reusable UI components in `components/` must never hardcode colour values internally.  They receive colour via:

1. `brandClasses` tokens applied by the parent
2. CSS custom properties inherited from `global.css`
3. Explicit colour props when a component must be colour-configurable

Components must never import `brandColors.ts` directly to apply inline styles.

### RULE 10 — No domain-specific colour overrides inside shared components

### RULE 11 — CSS `@import` must precede all `@tailwind` directives

The CSS specification requires `@import` statements to appear before all other at-rules.  Vite (and most build tools) silently skip any `@import` that comes after an `@tailwind` directive — the imported file loads as if it does not exist, causing every `var(--)` reference in that file to resolve to `unset`.

In `app/index.css` the `@import` for design tokens **must always be the very first line**:

```css
/* ✅ CORRECT — @import first */
@import '../lib/design-tokens/global.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

```css
/* ❌ WRONG — @tailwind before @import; build tools silently skip the import */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import '../lib/design-tokens/global.css';
```

Symptom of violation: every `:root` CSS custom property (`--sidebar-bg`, `--color-brand`, etc.) resolves to `unset`.  The entire app renders as a blank or invisible page even though `npx vite build` reports no errors.

**Enforcement:** After any change to `app/index.css`, run `npx vite build` and visually verify the app renders before marking the task done.

If a component needs a different colour in the context of one domain (e.g. the Quotes domain uses a different badge colour), the override must be applied at the domain's component wrapper level — not inside the shared primitive component.

---

## 7.5  Known Technical Debt (Carried Forward from Legacy)

The following issues were identified in the legacy codebase and must be addressed during migration:

### Priority 1 — Competing CSS `:root` blocks (breaks colours)

| File | Issue |
|------|-------|
| `src/components/Sidebar.css` | Re-declares 11 sidebar vars with different hex values — conflicts with `global.css` |
| `src/components/NavbarInternal.css` | 5 bare hex values — should use CSS vars |

These must be resolved before the sidebar and navbar are migrated to the new architecture.

### Priority 2 — Inline Tailwind colour classes (~160 files)

Approximately 160 JSX files use bare Tailwind classes (`text-gray-*`, `bg-white`, `text-red-*`) instead of `brandClasses` tokens.  Migration should proceed domain by domain during the rebuild.

### Priority 3 — Object-encoded colour maps

Several files store Tailwind class strings in data arrays (KPI cards, finance sections, settings icons).  These must be refactored to use `brandClasses` tokens when the files are migrated.

---

## 7.6  Quick Reference — "Which token do I use?"

| I need… | Use this |
|---------|----------|
| Page title text colour | `brandClasses.typography.heading` |
| Body / label text colour | `brandClasses.typography.body` |
| Secondary / helper text | `brandClasses.typography.secondary` |
| Placeholder / timestamp | `brandClasses.typography.muted` |
| Table header bg (inline) | `brandColors.table.headerBg` |
| Table header text colour | Via `.app-table thead th` CSS rule |
| Sort arrow colour | Via `.sort-icon` CSS rule |
| Sidebar bg | Via `var(--sidebar-bg)` |
| Sidebar text | Via `var(--sidebar-text)` |
| Success/warning/error bg | `brandColors.statusLight.success.bg` etc. |
| Chart series colours | `brandColors.chart.series[n].border / .bg` |
| Button primary | `brandClasses.button.primary` |
| Badge success | `brandClasses.badge.success` |
| Focus ring | `brandClasses.focus.primary` |

---

## 7.7  Testing Requirements

| Test level | What to check |
|------------|---------------|
| **Jest (`brandColors.test.ts`)** | Token structure, CSS var matching, no hardcoded hex in migrated files, sort-icon class usage |
| **Playwright (`chrome-colors.spec.ts`)** | Computed colour of `--color-chrome-text`, `--sidebar-text`, `--table-header-text` in real browser |
| **Code scan** | Any PR introducing a new colour must add it to `brandColors.ts` first |

---

## 7.8  Global Table Styling Standards

These rules are **mandatory** across every table in the application without exception.

### RULE 12 — All tables must use `.app-table` and `.table-wrapper`

Every `<table>` rendered anywhere in the application must use `className="app-table"`.  No table may use raw Tailwind classes or custom CSS in place of `.app-table`.  The containing `<div>` must use `className="table-wrapper"` to support horizontal scroll.

```tsx
// ✅ CORRECT
<div className="table-wrapper">
  <table className="app-table">
    ...
  </table>
</div>

// ❌ WRONG — raw Tailwind, no app-table
<table className="w-full border-collapse text-sm">
  ...
</table>
```

This applies to **all new tables** and to **any existing table being modified**.  This is an absolute requirement.  No exceptions.

### RULE 13 — All table headers are LEFT aligned

All `<th>` elements must be left-aligned.  This is enforced globally by `.app-table thead th { text-align: left }` in `app/index.css`.  Never apply `text-right` or `text-center` to a header cell.

```tsx
// ✅ CORRECT
<th>Premium</th>

// ❌ WRONG
<th className="text-right">Premium</th>
```

### RULE 14 — Table cell (`<td>`) alignment by data type

Cell content alignment is determined by the data type.  Apply the class on `<td>` only — never on `<th>`.

| Data type | Alignment | Class to apply on `<td>` |
|-----------|-----------|---------------------------|
| Text (names, descriptions, statuses, ref numbers) | Left | none (default) |
| Dates | Left | none (default) |
| Financial amounts (£, $, €) | Right | `className="text-right"` |
| Percentages and rates | Right | `className="text-right"` |
| Checkboxes / toggles | Centre | `className="text-center"` |

```tsx
// ✅ CORRECT — header left, financial cell right
<th>Premium</th>
...
<td className="text-right">£12,500.00</td>

// ❌ WRONG — header right-aligned, cell left-aligned for a financial column
<th className="text-right">Premium</th>
...
<td>£12,500.00</td>
```

### RULE 15 — Number formatting (see OQ-043 for exact precision rules)

Until OQ-043 is answered, apply the following interim defaults:

| Data type | Interim format | Example |
|-----------|----------------|---------|
| Currency (GBP) | 2 d.p., thousands separator, symbol prefix | `£12,500.00` |
| Percentages | 2 d.p., `%` suffix | `12.50%` |
| Rates | 4 d.p. | `0.0125` |
| Large numbers | Full display (no M/B abbreviations) | `1,250,000` |
| Dates | DD/MM/YYYY | `13/03/2026` |

When OQ-043 is answered these will be codified into a shared formatting utility and this table will be updated.
