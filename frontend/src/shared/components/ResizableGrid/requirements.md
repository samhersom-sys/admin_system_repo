# REQUIREMENTS — ResizableGrid & useResizableColumns

**Domain Code:** `SHARED-GRID`
**Location:** `frontend/src/shared/components/ResizableGrid/` and `frontend/src/shared/hooks/`
**Status:** Agreed — ready for tests and code
**Test file:** `frontend/src/shared/components/ResizableGrid/__tests__/ResizableGrid.test.tsx`
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `useResizableColumns` hook — column width state with `localStorage` persistence and mouse-drag resize
- `ResizableGrid` component — generic table renderer with resizable columns, sort indicator support, and empty-state rendering
- Application of `ResizableGrid` to all primary list and search-result tables in the application

**Out of scope:**
- Column reordering (drag-and-drop column position change)
- Column visibility toggling (show/hide chooser)
- Inline search picker tables (`BrokerSearch`, `InsuredSearch`) — excluded from initial release because they are transient modals

---

## 2. Impact Analysis

### UI / Front-End Impact
- **New:** `frontend/src/shared/components/ResizableGrid/ResizableGrid.tsx`
- **New:** `frontend/src/shared/hooks/useResizableColumns.ts`
- **Modified:** `frontend/src/quotes/QuotesListPage/QuotesListPage.tsx` — replace inline `<table>` with `ResizableGrid`
- **Modified:** `frontend/src/search/SearchResults.tsx` — replace inline `<table>` with `ResizableGrid`
- **Modified:** `frontend/src/parties/PartyListPage/PartyListPage.tsx` — replace inline `<table>` with `ResizableGrid`

### API Impact
None.

### Database Impact
None. Column widths are persisted in browser `localStorage` only — no server-side storage.

---

## 3. Requirements

### REQ-SHARED-GRID-F-001
The `useResizableColumns` hook shall initialise column widths by reading the JSON value stored at `storageKey` in `localStorage` and merging it with `defaultWidths`, so that any column key absent from storage uses its `defaultWidths` value.

### REQ-SHARED-GRID-F-002
The `useResizableColumns` hook shall write the current column widths object as JSON to `localStorage` under `storageKey` whenever any column width changes.

### REQ-SHARED-GRID-F-003
The `useResizableColumns` hook shall prevent any column width from being set below `minWidth` pixels (default: 80) during a mouse-drag resize, clamping the value at `minWidth` if the drag would produce a smaller value.

### REQ-SHARED-GRID-F-004
The `ResizableGrid` component shall render a `<colgroup>` containing one `<col>` per column whose `style.width` is the pixel string returned by `getWidth(column.key)` from the `useResizableColumns` hook.

### REQ-SHARED-GRID-F-005
The `ResizableGrid` component shall render a drag-handle element positioned at the right edge of each `<th>` cell; a `mousedown` event on the handle shall begin a resize interaction that tracks `mousemove` on `window` and terminates on `mouseup`.

### REQ-SHARED-GRID-F-006
The `ResizableGrid` component shall render a sort icon in every column header whose `sortable` flag is `true`: no-sort icon when the column is not the current sort key, ascending icon when it is sorted `asc`, and descending icon when sorted `desc`. Clicking the column label text shall call `onRequestSort(column.key)`.

### REQ-SHARED-GRID-F-007
The `ResizableGrid` component shall render a single `<tr>` spanning all columns containing the `emptyMessage` string when the `rows` prop is an empty array.

### REQ-SHARED-GRID-C-001
All primary list and search-result tables shall use `ResizableGrid` as their table rendering component. In-scope tables for this release: `QuotesListPage`, `SearchResults`, `PartyListPage`.

### REQ-SHARED-GRID-C-002
Each `ResizableGrid` instance shall receive a unique `storageKey` prop in the format `table-widths-{tableName}` (e.g. `table-widths-quotes-list`) so that column width preferences are stored independently per table.

---

## 4. Traceability Table

| Requirement ID | Test file | Test ID |
|---|---|---|
| REQ-SHARED-GRID-F-001 | `frontend/src/shared/components/ResizableGrid/__tests__/ResizableGrid.test.tsx` | pending |
| REQ-SHARED-GRID-F-002 | `frontend/src/shared/components/ResizableGrid/__tests__/ResizableGrid.test.tsx` | pending |
| REQ-SHARED-GRID-F-003 | `frontend/src/shared/components/ResizableGrid/__tests__/ResizableGrid.test.tsx` | pending |
| REQ-SHARED-GRID-F-004 | `frontend/src/shared/components/ResizableGrid/__tests__/ResizableGrid.test.tsx` | pending |
| REQ-SHARED-GRID-F-005 | `frontend/src/shared/components/ResizableGrid/__tests__/ResizableGrid.test.tsx` | pending |
| REQ-SHARED-GRID-F-006 | `frontend/src/shared/components/ResizableGrid/__tests__/ResizableGrid.test.tsx` | pending |
| REQ-SHARED-GRID-F-007 | `frontend/src/shared/components/ResizableGrid/__tests__/ResizableGrid.test.tsx` | pending |
| REQ-SHARED-GRID-C-001 | integration tests per table file | pending |
| REQ-SHARED-GRID-C-002 | `frontend/src/shared/components/ResizableGrid/__tests__/ResizableGrid.test.tsx` | pending |

---

## 5. Open Questions
None. All design decisions confirmed by product owner on 2026-03-19.

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-03-19 | Initial requirements written — Block 3 scope |

---

## 7. Design Notes

### Hook API (`useResizableColumns`)

```ts
interface UseResizableColumnsOptions {
  storageKey: string;
  columnOrder: string[];       // ordered list of column keys
  defaultWidths: Record<string, number>;
  minWidth?: number;           // default 80
}

interface UseResizableColumnsResult {
  startResize: (key: string, event: React.MouseEvent) => void;
  getWidth: (key: string) => string;   // returns e.g. "160px"
}
```

### Component API (`ResizableGrid`)

```ts
interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right';
}

interface ResizableGridProps {
  columns: Column[];
  rows: unknown[];
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onRequestSort?: (key: string) => void;
  storageKey: string;
  defaultWidths: Record<string, number>;
  getRowKey: (row: unknown, index: number) => string;
  renderCell: (key: string, row: unknown) => React.ReactNode;
  emptyMessage?: string;
}
```

### localStorage key examples

| Table | storageKey |
|---|---|
| QuotesListPage | `table-widths-quotes-list` |
| SearchResults | `table-widths-search-results` |
| PartyListPage | `table-widths-party-list` |
