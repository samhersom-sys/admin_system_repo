# Card — Requirements

> Test file: `components/Card/test.tsx`  
> Test ID format: `T-Card-R[NN]`

## Purpose
Standard surface wrapper that applies consistent white rounded-border shadow styling
across all dashboard widgets and detail panels.  Accepts an optional heading.

## Scope
**Included:** wrapping children in a styled surface; optional title header; className passthrough.  
**Excluded:** data fetching, state management, click handling, domain logic.

---

## Requirements

### R01 — Renders children
`Card` renders its `children` inside a content area.

Acceptance criteria:
- Any child element passed to `Card` appears in the rendered output.

### R02 — Optional title
When a `title` prop is provided, it is rendered in a header section above the content.

Acceptance criteria:
- The title text is visible when the prop is supplied.
- No header is rendered when `title` is omitted.

### R03 — className passthrough
The `className` prop is applied to the outer container alongside the default classes.

Acceptance criteria:
- A custom class passed via `className` appears on the outer element.
- Omitting `className` does not cause an error.

---

## Dependencies
- None
