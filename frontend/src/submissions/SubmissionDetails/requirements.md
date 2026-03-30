# SubmissionDetails Component — Requirements

## Purpose
An editable card capturing the core date and contract-type fields for a submission. Changes are local until the user triggers a save action via the sidebar. The component publishes its current values when a `submission:save` DOM custom event is dispatched.

## Scope
**In scope:**
- Inception date, expiry date, renewal date, contract type
- Auto-populating expiry to inception + 1 year when expiry is empty
- Auto-populating renewal date to inception + 1 year when renewal is empty
- Validation before emitting values
- Reacting to the `submission:save` DOM event (sidebar Save button)

**Out of scope:**
- Saving directly to the API (the page/orchestrator handles persistence)
- Status transitions

## Requirements

### R01 — Field rendering
Renders four fields:
- Inception Date — `<input type="date">` with `id="sub-inception-date"`
- Expiry Date — `<input type="date">` with `id="sub-expiry-date"`
- Renewal Date — `<input type="date">` with `id="sub-renewal-date"`
- Contract Type — `<select>` with `id="sub-contract-type"` and options: `Open Market`, `Binding Authority Contract`, `Lineslip`, `Facultative`

Acceptance criteria:
- All four fields render on mount.
- Each field has a visible `<label>` that references it via `htmlFor`.

### R02 — Controlled initialisation
Accepts an `initialValues` prop that pre-fills all four fields.

Acceptance criteria:
- When `initialValues.inceptionDate` is provided, the inception date input has that value.
- When `initialValues.expiryDate` is provided, the expiry input has that value.
- When `initialValues.renewalDate` is provided, the renewal input has that value.
- When `initialValues.contractType` is provided, the select shows that value.

### R03 — Expiry auto-population
When inception date changes and expiry date is currently empty, the expiry date auto-populates to inception + 1 year (same month and day).

Acceptance criteria:
- Changing inception from empty + expiry empty → expiry set to inception + 1 year.
- Changing inception when expiry already has a value → expiry is NOT changed.

### R04 — Renewal auto-population
When inception date changes and renewal date is currently empty, the renewal date auto-populates to inception + 1 year.

Acceptance criteria:
- Same rules as expiry (R03) but for the renewal field.

### R05 — `submission:save` event listener
The component listens for the `submission:save` DOM custom event on `window`. When received:
1. Validate that `inceptionDate` is not empty — if it is, call `onValidationError('Inception date is required.')`.
2. Validate that `expiryDate` is not empty — if it is, call `onValidationError('Expiry date is required.')`.
3. If valid, call `onSave(currentValues)`.

Acceptance criteria:
- Dispatching `new CustomEvent('submission:save')` on `window` triggers `onSave` with the current form values when they are valid.
- Dispatching the event with an empty `inceptionDate` calls `onValidationError` and does NOT call `onSave`.
- The event listener is cleaned up when the component unmounts.

### R06 — Props interface
```ts
interface SubmissionDetailsValues {
  inceptionDate: string
  expiryDate: string
  renewalDate: string
  contractType: string
}

interface SubmissionDetailsProps {
  initialValues?: Partial<SubmissionDetailsValues>
  onSave: (values: SubmissionDetailsValues) => void
  onValidationError?: (message: string) => void
}
```

## Dependencies
- DOM CustomEvent — `submission:save`
- No domain imports (pure UI + callback pattern)
