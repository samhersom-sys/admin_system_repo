# Movement — Requirements

**File:** `src/shared/components/Movement/Movement.tsx`  
**Last updated:** 2026-04-05  
**Status:** Active

---

## Purpose

Render a movement delta (numeric difference between current and baseline value) as a colour-coded, parenthesized display string. Used across PolicySectionViewPage and QuoteSectionDetailsHeader to visualise changes on all financial and limit fields.

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| REQ-MOV-F-001 | Renders as a disabled input by default; `as="span"` renders an inline span. |
| REQ-MOV-F-002 | Positive delta uses neutral dark text `(+1,200)`; negative delta uses red text `(-500)`. |
| REQ-MOV-F-003 | Returns null when delta is zero, null, or undefined and `renderEmpty` is false. |
| REQ-MOV-F-004 | When `renderEmpty=true`, renders a blank disabled input even for zero/null delta. |
| REQ-MOV-F-005 | Accepts `locale` prop (default `en-GB`) and passes it to `formatMovement`. |
| REQ-MOV-F-006 | Accepts optional `className` prop appended to the computed class string. |

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `delta` | `number \| null \| undefined` | — | Numeric movement to display |
| `as` | `'input' \| 'span'` | `'input'` | Render mode |
| `className` | `string` | `''` | Additional CSS classes |
| `locale` | `string` | `'en-GB'` | Locale for number formatting |
| `renderEmpty` | `boolean` | `false` | Render blank input when delta is 0/null |

---

## Dependencies

- `formatMovement()` from `@/shared/lib/formatters/formatters`
