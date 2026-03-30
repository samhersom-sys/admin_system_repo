# REQUIREMENTS — FieldGroup Shared Component

**Domain Code:** `SHARED-FG`
**Location:** `frontend/src/shared/components/FieldGroup/FieldGroup.tsx`
**Status:** Agreed — ready for tests and code
**Test file:** `frontend/src/shared/components/FieldGroup/__tests__/FieldGroup.test.tsx`
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `FieldGroup` component — a `<fieldset>`/`<legend>` wrapper used to group related form fields under a visible section title

**Out of scope:**
- Accordion / collapsible behaviour (not required)
- Validation state (error highlighting at group level)

---

## 2. Impact Analysis

### UI / Front-End Impact
- **New:** `frontend/src/shared/components/FieldGroup/FieldGroup.tsx`
- **Consumed by:** `frontend/src/quotes/QuoteViewPage/QuoteViewPage.tsx` (Details tab, five field groups)

### API Impact
None.

### Database Impact
None.

---

## 3. Requirements

### REQ-SHARED-FG-F-001
The `FieldGroup` component shall render a `<fieldset>` element containing a `<legend>` with the `title` prop text when `title` is a non-empty string.

### REQ-SHARED-FG-F-002
The `FieldGroup` component shall render a `<fieldset>` element without any `<legend>` element when the `title` prop is absent or an empty string.

### REQ-SHARED-FG-F-003
The `FieldGroup` component shall render any `children` inside the `<fieldset>` element regardless of whether a `title` is provided.

### REQ-SHARED-FG-C-001
The `FieldGroup` component shall apply the Tailwind classes `border border-gray-300 rounded-md p-3 bg-white` to the `<fieldset>` element, and `px-1 text-xs font-semibold text-gray-700 select-none` to the `<legend>` element when rendered.

---

## 4. Traceability Table

| Requirement ID | Test file | Test ID |
|---|---|---|
| REQ-SHARED-FG-F-001 | `frontend/src/shared/components/FieldGroup/__tests__/FieldGroup.test.tsx` | pending |
| REQ-SHARED-FG-F-002 | `frontend/src/shared/components/FieldGroup/__tests__/FieldGroup.test.tsx` | pending |
| REQ-SHARED-FG-F-003 | `frontend/src/shared/components/FieldGroup/__tests__/FieldGroup.test.tsx` | pending |
| REQ-SHARED-FG-C-001 | `frontend/src/shared/components/FieldGroup/__tests__/FieldGroup.test.tsx` | pending |

---

## 5. Open Questions
None.

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-03-19 | Initial requirements written |

---

## 7. Design Notes

### Props

```ts
interface FieldGroupProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}
```

### Rendered HTML (with title)
```html
<fieldset class="border border-gray-300 rounded-md p-3 bg-white">
  <legend class="px-1 text-xs font-semibold text-gray-700 select-none">Quote &amp; Referencing</legend>
  <!-- children -->
</fieldset>
```
