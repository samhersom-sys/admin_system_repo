# REQUIREMENTS — TabsNav Shared Component

**Domain Code:** `SHARED-TABS`
**Location:** `frontend/src/shared/components/TabsNav/TabsNav.tsx`
**Status:** Agreed — ready for tests and code
**Test file:** `frontend/src/shared/components/TabsNav/__tests__/TabsNav.test.tsx`
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `TabsNav` component — a horizontal tab navigation bar consumed by any page that needs tabbed content switching

**Out of scope:**
- Vertical tabs
- Tab icons (text labels only for this release)
- Lazy loading of tab panel content (panel rendering is the consumer's responsibility)

---

## 2. Impact Analysis

### UI / Front-End Impact
- **New:** `frontend/src/shared/components/TabsNav/TabsNav.tsx`
- **Consumed by:** `frontend/src/quotes/QuoteViewPage/QuoteViewPage.tsx`

### API Impact
None.

### Database Impact
None.

---

## 3. Requirements

### REQ-SHARED-TABS-F-001
The `TabsNav` component shall render a `<nav>` element containing one `<button>` for each entry in the `tabs` prop array, in the same order.

### REQ-SHARED-TABS-F-002
The `TabsNav` component shall apply a `border-b-2 border-brand-500 font-medium text-gray-900` style to the button whose `key` matches the `activeTab` prop, and apply `text-gray-600 hover:text-gray-800 hover:border-b-2 hover:border-gray-300` to all other buttons.

### REQ-SHARED-TABS-F-003
The `TabsNav` component shall call `onChange(tab.key)` when a tab button is clicked.

### REQ-SHARED-TABS-F-004
The `TabsNav` component shall render each button with a `data-testid` attribute equal to `tab-{tab.key}` to support deterministic test selection.

---

## 4. Traceability Table

| Requirement ID | Test file | Test ID |
|---|---|---|
| REQ-SHARED-TABS-F-001 | `frontend/src/shared/components/TabsNav/__tests__/TabsNav.test.tsx` | pending |
| REQ-SHARED-TABS-F-002 | `frontend/src/shared/components/TabsNav/__tests__/TabsNav.test.tsx` | pending |
| REQ-SHARED-TABS-F-003 | `frontend/src/shared/components/TabsNav/__tests__/TabsNav.test.tsx` | pending |
| REQ-SHARED-TABS-F-004 | `frontend/src/shared/components/TabsNav/__tests__/TabsNav.test.tsx` | pending |

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
interface Tab {
  key: string;
  label: string;
}

interface TabsNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
}
```

### Rendered HTML (example — "details" active)
```html
<nav class="flex space-x-6 border-b mb-4">
  <button data-testid="tab-details" class="... border-b-2 border-brand-500 font-medium text-gray-900">Details</button>
  <button data-testid="tab-sections" class="... text-gray-600">Sections</button>
  <button data-testid="tab-audit" class="... text-gray-600">Audit</button>
</nav>
```
