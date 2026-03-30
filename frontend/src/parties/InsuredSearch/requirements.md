# InsuredSearch Component — Requirements

## Purpose
A reusable search-and-select component that lets users find an existing party of type `Insured` or create a new one inline. Used on the New Submission page and the Submission view page when the insured field is editable.

## Scope
**In scope:**
- Live search of parties filtered to type `Insured`
- Select a result → emit `onSelect(party)` callback
- Inline "Create Insured" flow: name field + save button → creates party via API → auto-selects it

**Out of scope:**
- Searching non-insured party types (use a different component for brokers)
- Full party edit/detail screen

## Requirements

### R01 — Search input
Renders a text input with `id="insured-search-input"` and `aria-label="Search insured"`.

Acceptance criteria:
- Input is visible on mount.
- Placeholder text is `"Search insured…"`.

### R02 — Dropdown results
When the search input has 1 or more characters, calls `listParties({ type: 'Insured', search: value })` and renders a listbox (`role="listbox"`) beneath the input with one item per result.

Acceptance criteria:
- Each result item renders the party `name`.
- Clicking a result calls `onSelect(party)` and closes the dropdown.
- An empty result set shows `"No insureds found"` in the listbox.

### R03 — Loading state
While the search API call is in-flight, renders a loading indicator with `aria-label="Loading insureds"` inside the dropdown.

Acceptance criteria:
- Loading indicator present while request is pending.
- Loading indicator absent after results arrive.

### R04 — Create Insured inline
A button labelled `"+ Create Insured"` is always visible below the search input (not inside the dropdown). Clicking it expands an inline form with:
- A text input for the new party name (`id="new-insured-name"`)
- A `"Save"` button that calls `createParty({ name, type: 'Insured', orgCode, createdBy })`, then calls `onSelect(newParty)` and collapses the form.

Acceptance criteria:
- `"+ Create Insured"` button renders on mount.
- Clicking it shows the inline name input and Save button.
- Valid name → Save calls `createParty` and then `onSelect`.
- Empty name → Save shows `"Name is required"` error and does NOT call `createParty`.

### R05 — Controlled value display
When `selectedParty` prop is supplied, the search input displays `selectedParty.name`.

Acceptance criteria:
- `selectedParty.name` appears in the input when the prop is provided.

### R06 — Props interface
```ts
interface InsuredSearchProps {
  selectedParty?: Party | null
  onSelect: (party: Party) => void
  orgCode: string
  createdBy: string
}
```

## Open Questions
- Should search trigger on every keystroke or after a debounce? (Start with every keystroke; debounce is an optimisation.)

## Dependencies
- `domains/parties` — `listParties`, `createParty`, `Party` type
- `lib/auth-session` — for `orgCode` / `createdBy` (passed as props; component stays pure)
