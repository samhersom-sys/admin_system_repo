# ErrorBoundary — Requirements

> Test file: `components/ErrorBoundary/test.tsx`  
> Test ID format: `T-ErrorBoundary-R[NN]`

## Purpose
React error boundary that catches render and lifecycle errors in its child subtree
and renders an accessible fallback UI instead of crashing the whole page.

## Scope
**Included:** catching errors via `getDerivedStateFromError`; default fallback alert;
custom `fallback` render prop.  
**Excluded:** logging to external services (deferred until error tracking is configured),
network errors, async errors outside the React tree.

---

## Requirements

### R01 — Renders children when no error
When no error occurs, `ErrorBoundary` renders its children normally.

Acceptance criteria:
- Child content appears in the output when no error is thrown.

### R02 — Default fallback on error
When a child throws during render, the default fallback shows "Something went wrong"
in an accessible `role="alert"` element.

Acceptance criteria:
- An element with `role="alert"` is rendered after a child throws.
- The text "Something went wrong" is visible.

### R03 — Custom fallback prop
When a `fallback` function prop is provided, it is called with the error and its
return value is rendered instead of the default fallback.

Acceptance criteria:
- The custom fallback's output is rendered when a child throws.
- The custom fallback receives the thrown `Error` object as its argument.

### R04 — Recovery action
The default fallback shall include a "Reload page" button that reloads the browser
window, so users can recover without manually refreshing.

Acceptance criteria:
- A "Reload page" button is visible in the default fallback.
- Clicking it calls `window.location.reload()`.
- The button is not shown when a custom `fallback` prop is used (caller controls recovery).

---

## Change Log

| Date | Change |
|---|---|
| 2026-07-14 | Added R04 — recovery action (Reload page button) |

---

## Dependencies
- React class component API (`getDerivedStateFromError`, `componentDidCatch`)
