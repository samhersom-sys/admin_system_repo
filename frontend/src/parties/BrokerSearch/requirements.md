# BrokerSearch Component — Requirements

## Purpose
A reusable search-and-select component that lets users find an existing party of type `Broker`.
Used on the New Submission page to link a placing broker to a submission being created.

## Scope
**In scope:**
- Live search of parties filtered to type `Broker`
- Select a result → emit `onSelect(party)` callback

**Out of scope:**
- Searching non-broker party types (see InsuredSearch for Insureds)
- Inline party creation (brokers are pre-registered; create via /parties/new)
- Full party edit/detail screen

## Requirements

### R01 — Trigger field
Renders a read-only text input with `aria-label="Search broker"` and `placeholder="Search broker…"`.

Acceptance criteria:
- Input is visible on mount.
- Placeholder text is `"Search broker…"`.
- Input is read-only (clicking it opens the modal).

### R02 — Search icon button
Renders a button with `aria-label="Search parties"` that opens the modal.

Acceptance criteria:
- Button is visible on mount.
- Clicking it opens the search modal.

### R03 — Selected value display
When `selectedParty` prop is provided, the trigger input displays `selectedParty.name`.

Acceptance criteria:
- `selectedParty.name` appears in the trigger input when the prop is set.

### R04 — Modal opens on trigger click
Clicking either the trigger input or the search icon button opens a modal dialog with
`role="dialog"` and `aria-label="Select broker"`.

Acceptance criteria:
- Modal is not present on initial render.
- Modal is present after clicking the trigger input.
- Modal is present after clicking the search icon button.

### R05 — Load all brokers on open
When the modal opens, calls `listParties({ type: 'Broker' })` and renders all results.

Acceptance criteria:
- `listParties` called with `{ type: 'Broker' }` on open.
- Results rendered in a table inside the modal.

### R06 — Live search filter
As the user types in the modal search input, calls
`listParties({ type: 'Broker', search: query })` and updates results.

Acceptance criteria:
- Typing a query calls `listParties` with `{ type: 'Broker', search: query }`.
- Results table updates with filtered list.

### R07 — Empty state
When no results are returned, renders `"No broker parties found."` inside the modal.

Acceptance criteria:
- Empty-state message visible when `listParties` resolves to `[]`.

### R08 — Select and close
Clicking a result row calls `onSelect(party)` with the full party object and closes the modal.

Acceptance criteria:
- `onSelect` called with the correct party.
- Modal closed after selection.

### R09 — ESC closes modal
Pressing the `Escape` key while the modal is open closes it without making a selection.

Acceptance criteria:
- Modal closed after `Escape` key event.
- `onSelect` NOT called.

### R10 — Close button
A button with `aria-label="Close"` in the modal closes it without making a selection.

Acceptance criteria:
- Modal closed after clicking the close button.
- `onSelect` NOT called.

## Props interface
```ts
interface BrokerSearchProps {
  selectedParty?: Party | null
  onSelect: (party: Party) => void
}
```

## Dependencies
- `domains/parties` — `listParties`, `Party` type

## Traceability

| Requirement | Test file | Test ID |
|---|---|---|
| R01 | test.tsx | T-BROKER-SEARCH-R01 |
| R02 | test.tsx | T-BROKER-SEARCH-R02 |
| R03 | test.tsx | T-BROKER-SEARCH-R03 |
| R04 | test.tsx | T-BROKER-SEARCH-R04 |
| R05 | test.tsx | T-BROKER-SEARCH-R05 |
| R06 | test.tsx | T-BROKER-SEARCH-R06 |
| R07 | test.tsx | T-BROKER-SEARCH-R07 |
| R08 | test.tsx | T-BROKER-SEARCH-R08 |
| R09 | test.tsx | T-BROKER-SEARCH-R09 |
| R10 | test.tsx | T-BROKER-SEARCH-R10 |
