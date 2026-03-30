# SubmissionIdentity Component — Requirements

## Purpose
A read-only display card that shows the system-managed identity fields for a submission: the submission reference and the current workflow status. These values are never edited directly by the user — they are assigned by the application.

## Scope
**In scope:**
- Displaying the submission reference as a read-only text field
- Displaying the submission status as a styled badge
- Handling the "not yet saved" state (reference shown as placeholder)

**Out of scope:**
- Status transitions (handled by the workflow layer)
- Reference editing

## Requirements

### R01 — Reference display
Renders the submission reference in an element with `data-testid="sub-reference"`.

Acceptance criteria:
- When `reference` prop is a non-empty string, that string is visible.
- When `reference` is empty or not supplied, renders `"Generating…"` as placeholder text.

### R02 — Status badge
Renders the submission status in an element with `data-testid="sub-status"`.
The badge colour maps to status:
- `Created` / `In Review` → blue tint
- `Outstanding` → amber tint
- `Declined` → red tint
- `Quote Created` / `Quoted` → green tint
- `Bound` → dark green tint

Acceptance criteria:
- The status text is visible.
- Each status group has a distinguishable CSS class (e.g. `status--blue`, `status--amber`, `status--red`, `status--green`, `status--dark-green`).

### R03 — Props interface
```ts
interface SubmissionIdentityProps {
  reference: string
  status: SubmissionStatus
}
```
`SubmissionStatus` is imported from `@/domains/submissions`.

## Dependencies
- `domains/submissions` — `SubmissionStatus` type
