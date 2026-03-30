# LoadingSpinner — Requirements

> Test file: `components/LoadingSpinner/test.tsx`  
> Test ID format: `T-LoadingSpinner-R[NN]`

## Purpose
Accessible inline SVG spinner used as the loading state for any async component.
Provides consistent loading UI across the application without duplicating markup.

## Scope
**Included:** SVG spinner animation; `role="status"` accessibility; screen-reader label;
`data-testid` for test targeting; configurable size.  
**Excluded:** timeout behaviour, progress indication, cancellation.

---

## Requirements

### R01 — Accessibility role
The component renders with `role="status"` so screen readers announce the loading state.

Acceptance criteria:
- An element with `role="status"` is present in the rendered output.

### R02 — Accessible label
An `aria-label` attribute reflects the `label` prop. Defaults to `"Loading"`.

Acceptance criteria:
- `aria-label` defaults to `"Loading"` when no prop is passed.
- `aria-label` reflects a custom `label` prop when provided.

### R03 — Screen reader text
A `<span className="sr-only">` with the label text is rendered for screen readers.

Acceptance criteria:
- The label text is present as visible DOM text (inside sr-only span).

### R04 — Test targeting
The component always renders `data-testid="loading-spinner"`.

Acceptance criteria:
- `screen.getByTestId('loading-spinner')` always finds the element.

---

## Dependencies
- None
