# REQUIREMENTS — Submission View/Edit Page

**Domain Code:** `SUB-VIEW`
**Location:** `domains/submissions/components/SubmissionViewPage.tsx`
**Status:** Requirements agreed — pending tests
**Test file:** `domains/submissions/components/SubmissionViewPage.test.tsx`
**Standard:** Written per [Guideline 13](../../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** Loading a single submission by id; rendering the submission header panel (reference, status, contract type, placing broker); rendering the editable fields panel (insured, inception, expiry, renewal); evaluating and applying field-lock tiers based on lifecycle state, origin type, and concurrent edit-lock state; handling inline Save, Submit, and Decline actions; rendering the `SubmissionTabs` component; registering the sidebar section; showing page editability state via a fixed bottom-right status indicator.

**Out of scope:**
- SubmissionTabs pane content — each tab is defined in its own requirements document
- Creating a new submission — handled by `NewSubmissionPage.tsx`
- The exact list of broker-origin-locked fields — deferred to OQ-044
- Quote create/edit flow — quotes domain separate requirements
- Policy endorsement flow — policies domain separate requirements
- Party mastering workflow — deferred to OQ-045
- Broker variant of the submission page — a separate future feature

---

## 2. Requirements

### 2.1 Data Loading

**REQ-SUB-VIEW-F-001:** The Submission View Page shall call `getSubmission(submissionId)` on initial render using the numeric `id` value extracted from the URL parameter, before any submission data is displayed.

**REQ-SUB-VIEW-F-002:** The Submission View Page shall render a loading indicator containing the text `"Loading submission…"` while the `getSubmission` request is in flight and no submission data is yet available.

**REQ-SUB-VIEW-F-003:** The Submission View Page shall render the error message returned by the rejected `getSubmission` call alongside a back link to `/submissions` when `getSubmission` rejects, without throwing an uncaught JavaScript exception.

**REQ-SUB-VIEW-F-004:** The Submission View Page shall render the text `"Submission not found."` alongside a back link to `/submissions` when `getSubmission` resolves but returns a null or undefined value.

### 2.2 Header Panel — Immutable and System-Managed Fields

**REQ-SUB-VIEW-F-005:** The Submission View Page shall render the `reference` value in the header panel accompanied by a visual immutable badge, such that no HTML input element for `reference` is present in the rendered DOM under any condition.

**REQ-SUB-VIEW-F-006:** The Submission View Page shall render the `status` value in the header panel accompanied by a visual system-managed badge, such that no HTML input element for `status` is present in the rendered DOM under any condition.

**REQ-SUB-VIEW-F-007:** The Submission View Page shall render the `contractType` value in the header panel accompanied by a visual immutable badge, such that no HTML input element for `contractType` is present in the rendered DOM under any condition.

**REQ-SUB-VIEW-F-008:** The Submission View Page shall render `createdBy`, `createdDate`, and `createdByOrgCode` as read-only display values, such that no HTML input element for any of these fields is present in the rendered DOM under any condition.

### 2.3 Editable Fields Panel — Normal Editable State

**REQ-SUB-VIEW-F-009:** The Submission View Page shall render an editable input control for the `insured` field, pre-populated with the current insured name, when the submission is in an editable state (no quote and no policy exists).

**REQ-SUB-VIEW-F-010:** ~~The Submission View Page shall render an editable input control for the `placingBroker` field in the main form.~~ **SUPERSEDED by Block B (2026-03-20):** `placingBroker`, `placingBrokerId`, and `placingBrokerName` are now managed exclusively in the Placing Broking tab (SubmissionTabs R06). The main editable fields panel shall NOT contain an input for `placingBroker`.

**REQ-SUB-VIEW-F-011:** The Submission View Page shall render editable date input controls for `inceptionDate`, `expiryDate`, and `renewalDate`, pre-populated with the current values, when the submission is in an editable state.

### 2.4 Save Action

**REQ-SUB-VIEW-F-012:** The Submission View Page shall listen for the `submission:save` event on the sidebar event bus and shall call `updateSubmission(id, changedFields)` when that event fires, where `changedFields` contains only the editable-tier fields whose values differ from the last saved state.

**REQ-SUB-VIEW-F-013:** The Submission View Page shall display a success notification and update all displayed field values to reflect the server-confirmed saved state when `updateSubmission` resolves successfully.

**REQ-SUB-VIEW-F-014:** The Submission View Page shall display an error message and preserve all in-progress field values when `updateSubmission` rejects, so that no unsaved changes are lost.

### 2.5 Submit Action

**REQ-SUB-VIEW-F-015:** The Submission View Page shall listen for the `submission:submit` event on the sidebar event bus and shall call the submit workflow endpoint to transition the submission status from `Draft` to `In Review` when that event fires.

**REQ-SUB-VIEW-F-016:** The Submission View Page shall update the displayed `status` badge value to `In Review` when the submit call resolves successfully.

### 2.5a Decline Action

**REQ-SUB-VIEW-F-031:** The Submission View Page shall render a `Decline` item in the sidebar section that, when activated, opens a Decline modal dialog without navigating away from the page.

**REQ-SUB-VIEW-F-032:** The Decline modal shall present a required reason code dropdown with the following options: Capacity, Pricing, Risk Quality, Duplicate Submission, Other.

**REQ-SUB-VIEW-F-033:** The Decline modal shall present an optional free-text `Additional notes` field (textarea) for supplementary context.

**REQ-SUB-VIEW-F-034:** The `Confirm Decline` button in the modal shall be disabled until a reason code is selected.

**REQ-SUB-VIEW-F-035:** On confirmation, the page shall call `POST /api/submissions/:id/decline` with `{ reasonCode, reasonText }` and update the displayed `status` to `Declined` when the call resolves successfully.

**REQ-SUB-VIEW-F-036:** The Decline modal shall display the API error message when the decline call rejects, preserving the modal's open state and the user's selected reason.

**REQ-SUB-VIEW-F-037:** Clicking Cancel or the backdrop shall dismiss the Decline modal without submitting any decline request.

**REQ-SUB-VIEW-S-004:** The Decline modal shall not expose any submission data beyond what is already rendered on the page. The reason code and reason text are user-supplied inputs only.

### 2.6 Cascade Lock — Quote Exists

**REQ-SUB-VIEW-F-017:** The Submission View Page shall render all main editable-tier fields (`insured`, `inceptionDate`, `expiryDate`, `renewalDate`) as read-only display values, with no HTML input elements present, when the submission response includes `hasQuote: true`. The `placingBroker` field is managed by the Placing Broking tab (see SubmissionTabs R06f) and honours the same cascade lock there.

**REQ-SUB-VIEW-F-018:** The Submission View Page shall display a contextual message informing the user that changes to submission details must be made via the associated quote when `hasQuote` is `true`.

**REQ-SUB-VIEW-F-019:** The Submission View Page shall not render the sidebar `Save` action item when `hasQuote` is `true`.

### 2.7 Cascade Lock — Policy Exists

**REQ-SUB-VIEW-F-020:** The Submission View Page shall render all editable-tier fields as read-only display values, with no HTML input elements present, when the submission response includes `hasPolicy: true`.

**REQ-SUB-VIEW-F-021:** The Submission View Page shall display a contextual message informing the user that an endorsement is required to change submission details when `hasPolicy` is `true`.

**REQ-SUB-VIEW-F-022:** The Submission View Page shall not render the sidebar `Save` action item when `hasPolicy` is `true`.

### 2.8 Origin-Based Locking

**REQ-SUB-VIEW-F-023:** The Submission View Page shall render broker-origin-locked fields as read-only display values, with no HTML input elements present for those fields, when the submission `createdByOrgType` is `'Broker'` and the current session org type is `'Insurer'` or `'MGA'`.

*Note: The specific field list for broker-origin locking is pending OQ-044. The test for this requirement is `pending` until OQ-044 is resolved.*

**REQ-SUB-VIEW-F-024:** The Submission View Page shall display a contextual message indicating that some fields are locked because the submission was originated by a broker, when origin-based locking is active per REQ-SUB-VIEW-F-023.

**REQ-SUB-VIEW-F-025:** The Submission View Page shall apply no origin-based field locks when the submission `createdByOrgType` is `'Insurer'` or `'MGA'`, regardless of the session org type, such that the main editable-tier fields (`insured`, `inceptionDate`, `expiryDate`, `renewalDate`) remain editable unless a cascade lock (§2.6 and §2.7) applies.

### 2.9 SubmissionTabs

**REQ-SUB-VIEW-F-026:** The Submission View Page shall render the `SubmissionTabs` component below the fields panel, passing `submissionId`, `contractType`, `placingBroker`, `placingBrokerId`, `placingBrokerName`, `insured`, and `insuredId` from the loaded submission record.

### 2.10 Sidebar Registration

**REQ-SUB-VIEW-F-027:** The Submission View Page shall register a sidebar section titled `'Submission'` containing `Save`, `Submit`, and `Create` (with sub-items: Quote and Create Party) on mount via `useSidebarSection`, and shall deregister it on unmount.

### 2.11 Audit Event on Save

**REQ-SUB-VIEW-F-028:** The Submission View Page shall post a `POST /api/audit/event` request with `entityType: 'Submission'`, `entityId: submission.id`, and `action: 'Submission Updated'` after `updateSubmission` resolves successfully. The audit post shall be best-effort: a failure to write the audit event shall not affect the save outcome and shall not display an error to the user.

### 2.12 Unsaved Changes Detection

**REQ-SUB-VIEW-F-029:** The Submission View Page shall display a visible "You have unsaved changes" message when `formValues` differ from the last server-confirmed saved state, and the submission is not cascade-locked. The banner shall disappear after a successful save.

**REQ-SUB-VIEW-F-030:** The Submission View Page shall attach a `beforeunload` event handler that prevents the browser from closing or refreshing the page while there are unsaved changes, and shall remove the handler once the form is clean or the component unmounts.

### 2.12a Concurrent Edit Lock

**REQ-SUB-VIEW-F-038:** After the initial `getSubmission(submissionId)` call resolves successfully, the Submission View Page shall attempt to acquire the submission edit lock through the submissions domain module before treating the page as confirmed editable for the current session.

**REQ-SUB-VIEW-F-039:** When the submission edit lock is acquired successfully, the Submission View Page shall renew that lock periodically while the page remains mounted and shall issue a best-effort lock release when the page unmounts.

**REQ-SUB-VIEW-F-040:** When lock acquisition or renewal returns a lock-conflict response naming another user, the Submission View Page shall disable page editing for the current session, remove the sidebar `Save`, `Submit`, and `Decline` action items, and add a notification-panel warning in the format `This page has been locked for editing by {lockedByUserName}.`

**REQ-SUB-VIEW-F-041:** The concurrent edit-lock holder message shall be surfaced through the NotificationDock only; the page shall not render a separate inline concurrent-lock banner in the content area.

**REQ-SUB-VIEW-F-042:** The Submission View Page shall render a fixed bottom-right page-status indicator showing whether the page is currently editable, checking edit access, or locked by another user.

**REQ-SUB-VIEW-S-005:** The Submission View Page shall not call `updateSubmission` when the current session does not hold the active submission edit lock, even if the `submission:save` event is dispatched programmatically.

**REQ-SUB-VIEW-S-006:** The Submission View Page shall not call the submit or decline workflow endpoints when the current session does not hold the active submission edit lock, even if the `submission:submit` or `submission:decline` events are dispatched programmatically.

### 2.13 Security

**REQ-SUB-VIEW-S-001:** The Submission View Page shall not be accessible without a valid authenticated session; requests without a session shall be redirected to `/login` via the `ProtectedRoute` wrapper in `main.jsx`.

**REQ-SUB-VIEW-S-002:** The Submission View Page shall not render any HTML input element for immutable-tier fields (`reference`, `createdBy`, `createdDate`, `createdByOrgCode`, `contractType`) or system-managed-tier fields (`status`, `assignment`) under any session state, user role, or submission lifecycle condition.

**REQ-SUB-VIEW-S-003:** The Submission View Page shall not call `updateSubmission` when the submission is in a quote-locked or policy-locked state, even if the save event is dispatched programmatically outside the normal UI flow.

### 2.13 Constraints

**REQ-SUB-VIEW-C-001:** The Submission View Page shall source all submission API interactions through the `@/domains/submissions` module exports (`getSubmission`, `updateSubmission`); it shall not call `fetch` or `axios` directly.

**REQ-SUB-VIEW-C-002:** The Submission View Page shall read the current session org type via `getSession()` from `@/lib/auth-session`; it shall not derive org type from URL parameters, route state, or component-local hardcoded values.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-SUB-VIEW-F-001 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-002 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-003 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-004 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-005 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-006 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-007 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-008 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-009 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-010 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-011 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-012 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-013 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-014 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-015 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-016 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-017 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-018 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-019 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-020 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-021 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-022 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-023 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending (blocked by OQ-044) |
| REQ-SUB-VIEW-F-024 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending (blocked by OQ-044) |
| REQ-SUB-VIEW-F-025 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-026 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-027 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-S-001 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-S-002 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-S-003 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-028 | `domains/submissions/components/SubmissionViewPage.test.tsx` | T-SUB-VIEW-R28 |
| REQ-SUB-VIEW-F-029 | `domains/submissions/components/SubmissionViewPage.test.tsx` | T-SUB-VIEW-R29 |
| REQ-SUB-VIEW-F-030 | `domains/submissions/components/SubmissionViewPage.test.tsx` | T-SUB-VIEW-R30 (E2E) |
| REQ-SUB-VIEW-F-031 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-032 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-033 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-034 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-035 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-036 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-037 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-S-004 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-F-038 | `domains/submissions/components/SubmissionViewPage.test.tsx` | validated |
| REQ-SUB-VIEW-F-039 | `domains/submissions/components/SubmissionViewPage.test.tsx` | validated |
| REQ-SUB-VIEW-F-040 | `domains/submissions/components/SubmissionViewPage.test.tsx` | validated |
| REQ-SUB-VIEW-F-041 | `domains/submissions/components/SubmissionViewPage.test.tsx` | validated |
| REQ-SUB-VIEW-F-042 | `domains/submissions/components/SubmissionViewPage.test.tsx` | validated |
| REQ-SUB-VIEW-S-005 | `domains/submissions/components/SubmissionViewPage.test.tsx` | validated |
| REQ-SUB-VIEW-S-006 | `domains/submissions/components/SubmissionViewPage.test.tsx` | validated |
| REQ-SUB-VIEW-C-001 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |
| REQ-SUB-VIEW-C-002 | `domains/submissions/components/SubmissionViewPage.test.tsx` | pending |

---

## 4. Open Questions

**OQ-044 (this file):** Which specific fields on a broker-originated submission are locked (read-only) when viewed or edited by an Insurer or MGA user? REQ-SUB-VIEW-F-023 and REQ-SUB-VIEW-F-024 reference this list. See `documentation/Technical Documentation/08-Open-Questions.md` — OQ-044.

**OQ-045 (this file):** Party mastering workflow — when a broker-created party record is received by an Insurer/MGA, what are the exact rules for the mastering decision (adopt, keep own, merge)? This affects the insured field lookup and the InsuredSearch component used on the edit form. See OQ-045.

**OQ-046 (this file):** What is the exact column name, data type, and allowed values for the org-type-of-origin field on the `party` and `submission` tables? The requirements use `createdByOrgType` and values `'Broker'`, `'Insurer'`, `'MGA'` as working names. A constrained enum is preferable to free text; the definitive value list must be confirmed before the DB migration and the origin-lock logic are written. See OQ-046.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-21 | Initial requirements written per Guideline 13. All 32 requirements captured from session discussions. |
| 2026-06-18 | Added REQ-SUB-VIEW-F-031 through REQ-SUB-VIEW-F-037 and REQ-SUB-VIEW-S-004 for Decline action (§2.5a). Updated scope statement. Updated traceability table. |
| 2026-03-20 | REQ-SUB-VIEW-F-010 superseded: placingBroker removed from main form panel (now managed in Placing Broking tab per Block B). REQ-SUB-VIEW-F-017 updated accordingly. REQ-SUB-VIEW-F-026 updated to pass broker + insured props to SubmissionTabs. |
| 2026-03-23 | Added REQ-SUB-VIEW-F-038–F-042 and REQ-SUB-VIEW-S-005 for concurrent submission edit-lock handling and fixed page-status indicator. |

---

## 6. Design Notes

### 6.1 Field Tier Model

Three tiers govern field editability. A field's tier is fixed and never changes regardless of user role.

| Tier | Fields | Rule |
|---|---|---|
| **Immutable** | `reference`, `createdBy`, `createdDate`, `createdByOrgCode`, `contractType` | Set on first save, never writable by any user through any UI action |
| **System-managed** | `status`, `assignment` | Changed only by workflow transitions (Submit, Assign, Re-route); never directly writable |
| **Editable** | `insured`, `inceptionDate`, `expiryDate`, `renewalDate` | Writable via explicit Save — subject to cascade locks (§6.2) and origin locks (§6.3) |
| **Tab-managed** | `placingBroker`, `placingBrokerId`, `placingBrokerName` | Managed in the Placing Broking tab (`SubmissionTabs`) rather than the main editable form |

### 6.1a Concurrent Edit Lock Layer

Concurrent edit locking is separate from lifecycle cascade locking. A submission may be lifecycle-editable but still unavailable for editing when another user holds the active edit lease.

| Concurrent lock state | Effect |
|---|---|
| `checking` | Page is determining whether the current session can edit; fixed page-status indicator shows a neutral checking state |
| `editable` | Current session holds the active edit lock; editable controls behave normally |
| `locked-by-other-user` | Editable controls are disabled/hidden, Save is absent, and the lock-holder message is pushed to the NotificationDock |

### 6.2 Cascade Lock Hierarchy

Editable fields are subject to cascade locks that escalate as the submission advances through the lifecycle. Lock state is determined by `hasQuote` and `hasPolicy` booleans returned by `GET /api/submissions/:id`.

```
State:   Draft (hasQuote: false, hasPolicy: false)
Effect:  All main editable fields have input controls. Save action visible. Placing broker is managed in the Placing Broking tab.

State:   Quote exists (hasQuote: true, hasPolicy: false)
Effect:  All editable fields are read-only. Save action hidden.
Message: "This submission has an active quote. Update the quote to change submission details."
Path:    User edits quote → quote writes back to submission on update.

State:   Policy exists (hasPolicy: true)
Effect:  All editable fields are read-only. Save action hidden.
Message: "A policy exists. Apply an endorsement to change these details."
Path:    Endorsement → updates quote → quote writes back to submission.
```

### 6.3 Origin-Based Lock

A submission carries a `createdByOrgType` value set immutably at creation time. When the viewing session belongs to an Insurer or MGA org and the submission was created by a Broker org, a subset of editable-tier fields becomes additionally read-only. The origin lock is additive to cascade locks.

The exact field list is OQ-044. Until OQ-044 is answered:
- The origin-lock logic must be implemented with an injectable field list (e.g. a constant array `BROKER_ORIGIN_LOCKED_FIELDS`)
- All fields in that array will be read-only in the broker-origin scenario
- The test for this behaviour is `pending` until the array contents are confirmed

When the session org created the submission (Insurer/MGA origin), no origin-based locks apply.

### 6.4 Sidebar Action Behaviour

| Action | Event | API call | Visibility condition |
|---|---|---|---|
| **Save** | `submission:save` | `updateSubmission(id, changedFields)` | Visible only when submission is editable (no quote, no policy, no concurrent lock) |
| **Submit** | `submission:submit` | workflow submit endpoint | Visible only when submission is editable (no quote, no policy, no concurrent lock) |
| **Create > Quote** | — | Navigate to `/quotes/new?submissionId=:id` | Always visible |
| **Create > Create Party** | — | Navigate to `/parties/new` | Always visible |
| Forbidden until route exists | — | The sidebar shall not expose Binding Authority Contract or Claim create actions while `/binding-authorities/new` and `/claims/new` are not implemented | Always |

### 6.5 Page Layout Reference

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to submissions                                              │
├─────────────────────────────────────────────────────────────────────┤
│  Reference: SUB-2026-001 [IMMUTABLE]   Status: Draft [SYSTEM]      │
│  Contract Type: Open Market [IMMUTABLE]                             │
│  Created by: J. Smith  |  Date: 21/03/2026  |  Org: ACME [READ-ONLY]│
├─────────────────────────────────────────────────────────────────────┤
│  [origin-lock banner if applicable]                                 │
│  [cascade-lock banner if applicable]                                │
├─────────────────────────────────────────────────────────────────────┤
│  Insured:         [editable / read-only per lock state]             │
│  Placing Broker:  [read-only summary on page; editable in tabs]     │
│  Inception Date:  [editable / read-only per lock state]             │
│  Expiry Date:     [editable / read-only per lock state]             │
│  Renewal Date:    [editable / read-only per lock state]             │
├─────────────────────────────────────────────────────────────────────┤
│ [Placing Broking | Quotes | Policies | Related Submissions | Audit] │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  (SubmissionTabs — each pane has its own requirements doc)  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                 [Editability pill] │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.6 API Response Shape (Expected)

`GET /api/submissions/:id` must return the following fields for this page to function:

```json
{
  "id": 1,
  "reference": "SUB-2026-001",
  "status": "Draft",
  "contractType": "Open Market",
  "createdBy": "J. Smith",
  "createdDate": "2026-03-21",
  "createdByOrgCode": "ACME",
  "createdByOrgType": "Insurer",
  "insured": "Widget Corp",
  "placingBroker": "Marsh",
  "inceptionDate": "2026-04-01",
  "expiryDate": "2027-04-01",
  "renewalDate": "2027-03-01",
  "hasQuote": false,
  "hasPolicy": false
}
```

The `hasQuote` and `hasPolicy` booleans are required for cascade lock evaluation (§6.2). If the backend does not currently return these fields, a backend requirements update is needed before the component can implement cascade locking.

### 6.7 Design Analysis — §1.16 Flaw Identification

**Recommended approach:** Client-side lock state evaluation using `hasQuote` and `hasPolicy` booleans from the API response, with origin-lock state derived from `createdByOrgType` and the current session.

**Potential flaws:**

1. **Stale lock state** — If another user creates a quote after this page loads, `hasQuote` remains `false` in the client's copy until the page is refreshed. The user sees editable inputs, makes changes, and then receives a server-side rejection on save. REQ-SUB-VIEW-S-003 prevents `updateSubmission` from firing when the client detects the lock state, but cannot prevent the stale-state case. The server must enforce the lock server-side on `PUT /api/submissions/:id` regardless of what the client sends.

2. **OQ-044 deferred — incomplete origin lock** — REQ-SUB-VIEW-F-023 specifies origin-based locking but cannot name the fields because OQ-044 is unresolved. The component must be implemented with a placeholder `BROKER_ORIGIN_LOCKED_FIELDS` constant. If OQ-044 resolves with a large or unexpected list, the constant update is low-risk. However, if the list varies per `contractType` (e.g. Open Market vs Binding Authority), a refactor of the lock logic will be needed.

**Alternatives considered:**

A. **Real-time lock polling** — Poll `GET /api/submissions/:id` every 30 seconds to refresh `hasQuote`/`hasPolicy`. Eliminates the stale-state flaw (flaw 1) for the majority of users. Trade-off: additional network traffic; does not eliminate the race condition entirely (a quote could be created between polls). Appropriate for production hardening but not for the initial implementation.

B. **Server-only enforcement, always-visible inputs** — Show all editable inputs always, and rely purely on the server to reject saves when lock conditions are violated. Simpler component; no lock rendering logic needed. Trade-off: very poor UX — insurance users must be informed of lock state before spending time editing. Not recommended.
