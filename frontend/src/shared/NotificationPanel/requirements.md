# NotificationPanel — Requirements

> Test file: `components/NotificationPanel/test.tsx`
> Test ID format: `T-NotificationPanel-R[NN]`

## Purpose
A pure presentational panel that renders an application's in-flight notifications.
Receives all data and callbacks as props — no context coupling — so it can be
rendered and tested in complete isolation.

## Scope
**Included:** Panel header with title, severity-aware styling, per-item dismiss
button, action buttons, "Clear all" control, close button, empty state.
**Excluded:** Data fetching, React context, timer logic, bell button — those are
orchestrated by NotificationDock.

---

## Requirements

### R01 — Empty state
When `notifications` is an empty array the panel renders "No notifications" text.

### R02 — Notification list
Each item in `notifications` is rendered as a list item showing `n.message`.

Acceptance criteria:
- Items are uniquely keyed by `n.id`.
- All items are visible inside a scrollable list region.

### R03 — Type-based styling
Notification items apply type-appropriate CSS classes:
- `error`   → red border + red text
- `warning` → yellow styling
- `success` → green styling
- `info` (default) → neutral grey

The panel header also becomes red when any notification has `type === "error"`.

### R04 — Per-item dismiss
Each notification item has a dismiss button (`×`) that calls `onRemove(n.id)`
when clicked.

### R05 — Clear all
A "Clear" button calls `onClearAll()` when notifications list is non-empty.
The button is visually disabled (and does not call `onClearAll`) when the list is empty.

### R06 — Close button
An `X` icon button in the panel header calls `onClose()` when clicked.

### R07 — Action buttons
When `n.actions` is a non-empty array each action is rendered as a button that
calls `a.onClick()` when clicked.  `variant === "danger"` actions are styled red.
