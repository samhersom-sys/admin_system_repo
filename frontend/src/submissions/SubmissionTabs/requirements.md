# SubmissionTabs Component — Requirements

## Purpose
A tabbed section that appears on the submission view page, providing access to the secondary data areas of a submission: placing broking information, linked quotes, linked policies, related submissions, and the audit trail. For Binding Authority submissions, the Quotes and Policies tabs are replaced with a Binding Authority Contracts tab.

## Scope
**In scope:**
- Tab bar with labels
- Rendering the correct tab pane based on the active tab
- Adjusting visible tabs based on `contractType`
- Real content panes for: Placing Broking (R06 — **editable**), Quotes (R08), Policies (R10), Related Submissions (R09), and Audit (R07)
- Stub content for: Binding Authority Contracts

**Out of scope:**
- Binding Authority Contracts tab content (deferred)
- Contacts lookup for individual broker person within a company (future — requires a `party_contact` table; for now, broker name is a free-text field)
- Modal dialogs for linking existing quotes (future — new quotes are created via `/quotes/new?submissionId=X`; see `QuoteSearchModal` in quotes domain requirements for the reusable modal specification)

**Future development note (Block E — Related Submissions matching rules):**
The business context for linking related submissions is that the same underlying risk (e.g. the same client placing the same exposure) may be submitted to an insurer or MGA by two or more competing brokers independently. The "related" link surfaces this so an underwriter can see all submissions for the same risk, regardless of the broker placing them. What constitutes "the same risk" will vary by organisation — one insurer may match on `insuredId`; another may match on insured name + inception year + class of business. A future **Organisation Configuration** page in Settings should allow `client_admin` users to define per-org matching rules (e.g. field combinations used to auto-suggest related submissions). These rules will be stored in a new `org_submission_matching_rules` table. Until that feature is built, related submissions are linked manually by the user searching and selecting.
**Future development note (Block B — Placing Broking):**
When a broker organisation creates a submission and passes it to an insurer ("Broker Generated Submission"), the `Placing Broker Company` field should default to the creating broker's own party record. This pre-population pattern is not yet implemented. When implemented, the Placing Broking pane should read this from the submission's `createdByOrgCode` and resolve the correspondent party record automatically.

## Requirements

### R01 — Standard tab set
When `contractType` is NOT `"Binding Authority Contract"`, the tab bar must show (in order):
`Placing Broking` | `Quotes` | `Policies` | `Related Submissions` | `Audit`

Acceptance criteria:
- All five tab buttons render.
- No "Binding Authority Contracts" tab is visible.

### R02 — Binding Authority tab set
When `contractType` is `"Binding Authority Contract"`, the tab bar must show:
`Placing Broking` | `Binding Authority Contracts` | `Related Submissions` | `Audit`
(Quotes and Policies tabs are hidden.)

Acceptance criteria:
- `"Binding Authority Contracts"` tab renders.
- `"Quotes"` and `"Policies"` tabs do NOT render.

### R03 — Active tab indicator
The active tab button has `aria-selected="true"`. All others have `aria-selected="false"`.
The default active tab on mount is the first tab in the visible set.

Acceptance criteria:
- On mount, the first tab is active.
- Clicking a different tab makes it active and hides the previous pane.

### R04 — Tab pane content
Each tab pane renders as its own `<div role="tabpanel">`. Non-active panes are hidden (not unmounted).

- **Placing Broking** — editable pane; see R06.
- **Quotes** — real data table; see R08.
- **Policies** — real data table; see R10.
- **Binding Authority Contracts** — renders `<p>Binding Authority Contracts — coming soon.</p>` (stub).
- **Related Submissions** — real data table; see R09.
- **Audit** — renders the full audit trail (R07).

Acceptance criteria:
- Active tab pane is visible (not `hidden`).
- Inactive tab panes are hidden.

### R05 — Props interface
```ts
interface SubmissionTabsProps {
  contractType?: string
  submissionId: number
  placingBroker?: string | null
  placingBrokerId?: string | null
  placingBrokerName?: string | null
  insured?: string | null
  insuredId?: string | null
  isEditLocked?: boolean
}
```

`placingBroker`, `placingBrokerId`, and `placingBrokerName` are passed as initial values; the Placing Broking pane manages its own dirty state after load.
`insured` and `insuredId` are passed to the Related Submissions pane for auto-suggestion filtering.

### R06 — Placing Broking pane — editable

The Placing Broking pane shall be a fully editable form matching the pattern of `SubmissionPlacingBroking.jsx` in BackUp.

**Layout:**
```
┌─ Placing Broking ─────────────────────────────────────────────────────────┐
│  Placing Broker Company          │  Broker (individual name)              │
│  [read-only text + search icon]  │  [free-text input]                     │
│                                                                            │
│  (Dirty state: Save Changes / Cancel buttons appear at bottom)            │
└────────────────────────────────────────────────────────────────────────────┘
```

**REQ-SUB-TABS-R06a:** The Placing Broking pane shall pre-populate `Placing Broker Company` from the `placingBroker` prop and `Broker (individual name)` from the `placingBrokerName` prop on first render.

**REQ-SUB-TABS-R06b:** The `Placing Broker Company` field shall be read-only text with a search icon button. Clicking either the text or the search icon shall open a `PartySearchModal` filtered to `type=Broker`.

**REQ-SUB-TABS-R06c:** The `PartySearchModal` (see R06-modal) shall call `GET /api/parties?type=Broker` and present results in a searchable list. Selecting a party shall set `placingBroker` (name) and `placingBrokerId` (id) and close the modal.

**REQ-SUB-TABS-R06d:** The `Broker (individual name)` field shall be a free-text input. Contact name lookup (dropdown from `GET /api/parties/:id/contacts`) is a future feature deferred until a `party_contact` table exists.

**REQ-SUB-TABS-R06e:** Any change to either field shall set the pane into a dirty state, revealing `"Save Changes"` and `"Cancel"` buttons at the bottom of the pane.

**REQ-SUB-TABS-R06f:** Clicking `"Save Changes"` shall call `PUT /api/submissions/:submissionId` with `{ placingBroker, placingBrokerId, placingBrokerName }` and shall clear the dirty state on success.

**REQ-SUB-TABS-R06g:** Clicking `"Cancel"` shall reset all fields to their last saved values and shall clear the dirty state without making an API call.

**REQ-SUB-TABS-R06h:** The pane shall also save when the global `submission:save` event fires, if and only if the pane is dirty.

**REQ-SUB-TABS-R06i:** When no `placingBroker` is set, the `Placing Broker Company` field shall display placeholder text `"— search to select —"`.

**REQ-SUB-TABS-R06j:** When the parent Submission View Page passes `isEditLocked: true`, the Placing Broking pane shall render its editable controls in a non-interactive state and shall not show the dirty-state Save/Cancel controls.

**REQ-SUB-TABS-R06k:** When the parent Submission View Page passes `isEditLocked: true`, the Placing Broking pane shall not issue `PUT /api/submissions/:submissionId` from either the local `Save Changes` action or the global `submission:save` event.

### R07 — Audit pane content
The Audit pane fetches `GET /api/audit/Submission/:submissionId` on mount and renders the audit trail for the submission.

Acceptance criteria:
- A loading indicator with text `"Loading audit trail…"` is shown while the fetch is in flight.
- After a successful fetch, the pane renders a table with columns `DATE`, `ACTION`, and `USER`.
- Each audit event row shows the `action` value and `user` value.
- When the API returns an empty array, the pane renders `"No audit events recorded."`.
- When the API call fails, the pane renders the error message text.

### R08 — Quotes pane — functional

**REQ-SUB-TABS-R08a:** The Quotes pane shall fetch `GET /api/quotes?submission_id=:submissionId` on first render (lazy — only when the Quotes tab is first activated).

**REQ-SUB-TABS-R08b:** While the fetch is in flight, the pane shall render `"Loading quotes…"`.

**REQ-SUB-TABS-R08c:** On success, the pane shall render a table with columns: Reference, Status, Created By, Last Updated By, Actions.

**REQ-SUB-TABS-R08d:** Each row's Actions column shall contain a `"View"` link that navigates to `/quotes/:id`.

**REQ-SUB-TABS-R08e:** When the API returns an empty array, the pane shall render `"No quotes linked to this submission."`.

**REQ-SUB-TABS-R08f:** A `"New Quote"` button at the top of the pane shall navigate to `/quotes/new?submissionId=:submissionId`.

**REQ-SUB-TABS-R08g:** When the API call fails, the pane shall render the error message.

### R09 — Related Submissions pane — functional (join table)

**REQ-SUB-TABS-R09a:** The Related Submissions pane shall fetch `GET /api/submissions/:submissionId/related` on first activation (lazy load).

**REQ-SUB-TABS-R09b:** While the fetch is in flight, the pane shall render `"Loading related submissions…"`.

**REQ-SUB-TABS-R09c:** On success, the pane shall render a table of linked submissions with columns: Reference, Insured, Status, Inception Date, Actions.

**REQ-SUB-TABS-R09d:** Each row's Actions column shall contain a `"View"` link navigating to `/submissions/:id`.

**REQ-SUB-TABS-R09e:** Each row's Actions column shall contain a `"Remove"` button that calls `DELETE /api/submissions/:submissionId/related/:relatedId` and removes the row from the table on success.

**REQ-SUB-TABS-R09f:** A `"Link Submission"` button (`+`) at the top of the pane shall open a `RelatedSubmissionSearchModal`. The modal shall fetch and display all submissions belonging to the user's org, excluding the current submission and any already-linked submissions. The user may search by any combination of reference, insured name, or placing broker. There is no pre-filtering applied — the user is responsible for identifying which submission represents the same risk. (Configurable org-level auto-suggestion rules are a future feature; see the Future Development note above.)

**REQ-SUB-TABS-R09g:** The `RelatedSubmissionSearchModal` shall call `GET /api/submissions` on open and display results in a searchable list. The search input shall filter the displayed list client-side across `reference`, `insured`, and `placingBroker` fields simultaneously. Selecting a submission row shall call `POST /api/submissions/:submissionId/related` with `{ relatedSubmissionId }` and add the newly linked submission to the pane table on success, then close the modal.

**REQ-SUB-TABS-R09h:** When the API returns an empty array, the pane shall render `"No related submissions linked."`.

**REQ-SUB-TABS-R09i:** When the API call fails, the pane shall render the error message.

### R10 — Policies pane — functional

**REQ-SUB-TABS-R10a:** The Policies pane shall fetch `GET /api/policies?submission_id=:submissionId` on first activation (lazy load).

**REQ-SUB-TABS-R10b:** While the fetch is in flight, the pane shall render `"Loading policies…"`.

**REQ-SUB-TABS-R10c:** On success, the pane shall render a table with columns: Reference, Insured, Status, Inception Date, Expiry Date, Actions.

**REQ-SUB-TABS-R10d:** Each row’s Reference column shall render the policy reference as a navigation link to `/policies/:id` styled in the brand colour (per §14.7 RULE 9).

**REQ-SUB-TABS-R10e:** Each row’s Actions column shall contain a `"View"` link that navigates to `/policies/:id`.

**REQ-SUB-TABS-R10f:** When the API returns an empty array, the pane shall render `"No policies linked to this submission."`.

**REQ-SUB-TABS-R10g:** When the API call fails, the pane shall render the error message.

## Dependencies
- `@/shared/lib/api-client` � `get`, `put`, `post` (used by all functional panes)
- `@/parties/parties.service` � `listParties` (used by PartySearchModal within Placing Broking pane)
- No other domain imports (orchestration handled by parent page)

## Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements � stub panes for all tabs except Placing Broking and Audit |
| 2026-03-20 | R06 rewritten: Placing Broking pane is now editable with party search modal (Block B) |
| 2026-03-20 | R08 added: Quotes tab functional (Block C) |
| 2026-03-20 | R09 added: Related Submissions tab functional with join table (Block E); modal shows all org submissions, no pre-filter; future org-level matching rules noted |
| 2026-03-20 | Future Development note added: org-level submission matching rules (configurable via Organisation Configuration in Settings; deferred) |
| 2026-03-20 | R04 updated: Policies remains stub (no backend table); Broker Generated Submission note added |
| 2026-03-23 | Added `isEditLocked` parent override and R06j-R06k so Placing Broking honours the submission concurrent edit lock |
| 2026-04-05 | R10 added: Policies tab upgraded from stub to functional pane (GET /api/policies?submission_id). Scope updated. R04 Policies line updated. QuoteSearchModal cross-reference added to Out-of-scope note. |
