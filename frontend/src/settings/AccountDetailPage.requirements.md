# REQUIREMENTS — Account Detail Page

**Domain Code:** `SETTINGS-USERS-D`
**Location:** `frontend/src/settings/AccountDetailPage.tsx`
**Status:** Active — audit tab addition
**Test file:** `settings/__tests__/AccountDetailPage.test.tsx`

---

## 1. Scope

**In scope:**
- View and edit a single user account (role, isActive)
- Audit tab showing a chronological log of account lifecycle events and field changes
- Audit tab records: account opened, account closed, each field change (what field, old value, new value)

**Out of scope:**
- Editing fields beyond role and isActive
- Bulk audit export

---

## 1a. Impact Analysis

### UI Impact
| Component | Path | Action |
|---|---|---|
| AccountDetailPage | `frontend/src/settings/AccountDetailPage.tsx` | Update — add tabs + audit tab |
| AccountDetailPage.test.tsx | `frontend/src/settings/__tests__/AccountDetailPage.test.tsx` | Update — add audit tab tests |

### API Impact
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/settings/users/:id/audit` | `internal_admin` only | Fetch audit history for a user account |
| POST | `/api/settings/users/:id/audit` | `internal_admin` only | Write a single audit event for a user account |

### Database Impact
| Table | Impact |
|---|---|
| `audit_event` | INSERT (on open, close, save) and SELECT (for audit tab) |

---

## 2. Requirements

### D01 — Tab navigation
The account detail page MUST display a tab bar with two tabs: **Details** and **Audit**.

Acceptance criteria:
- `TabsNav` component renders with tabs `[{ key: 'details', label: 'Details' }, { key: 'audit', label: 'Audit' }]`
- Default active tab is `'details'`
- Clicking `Audit` tab switches the active tab to `'audit'`
- The existing account information and access control panels are rendered only when `details` tab is active

### D02 — Audit tab renders AuditTable
When the `audit` tab is active, the page MUST render an `AuditTable` component displaying the audit history.

Acceptance criteria:
- `AuditTable` is rendered with the audit events fetched from the backend
- A loading state is shown while audit history is being fetched
- An error message is shown if the audit fetch fails
- An empty state message ("No audit history for this account.") is shown if no events exist
- `getAudit()` is called the first time the audit tab is selected (lazy load)

### D03 — Lifecycle audit events
When the account detail page is mounted, an **"Account Opened"** event MUST be posted to the backend.  
When the page is unmounted, an **"Account Closed"** event MUST be posted.

Acceptance criteria:
- `useAudit` is called with `{ entityType: 'Account', entityId: <userId>, apiBase: '/api/settings/users', trackVisits: true }`
- On mount: `POST /api/settings/users/:id/audit` with `{ action: 'Account Opened', user: <userName>, userId: <userId> }`
- On unmount: `POST /api/settings/users/:id/audit` with `{ action: 'Account Closed', user: <userName>, userId: <userId> }`
- Lifecycle posts are fire-and-forget (errors are silently ignored)
- No lifecycle post is made if `entityId` is null

### D04 — Field change audit on save
When the user saves changes to an account, an **"Account Updated"** audit event MUST be posted capturing the field changes.

Acceptance criteria:
- `POST /api/settings/users/:id/audit` is called with `{ action: 'Account Updated', changes: { <fieldName>: { old: <oldValue>, new: <newValue> } } }` for each changed field
- Only fields that actually changed are included in `changes`
- Human-readable field names are used (e.g. `Role`, `Active Status`)
- `true`/`false` for `isActive` is rendered as `'Active'`/`'Inactive'` in the change record
- After a successful save + audit post, `getAudit()` is called to refresh the audit tab

### D05 — Backend: audit endpoint for accounts
`GET /api/settings/users/:id/audit` and `POST /api/settings/users/:id/audit` MUST be available and restricted to `internal_admin` only.

Acceptance criteria:
- `GET /api/settings/users/:id/audit` returns ordered list of audit events for the user (oldest first)
- `POST /api/settings/users/:id/audit` writes a new audit event with `entityType: 'Account'`
- `'Account'` is included in the backend's `VALID_ENTITY_TYPES` allowlist
- Both endpoints return 403 for non-internal_admin users
- The user identified in the event always comes from the JWT (never from the request body)

### D06 — More editable fields; ID shown read-only
The Details tab MUST display the account ID (read-only) and allow editing `fullName` and `email` in addition to `role` and `isActive`.

Acceptance criteria:
- ID field shown as plain text (not an input); not editable
- `fullName` and `email` rendered as text inputs; changes tracked in dirty state
- `username` shown read-only
- Organisation name/code shown read-only
- Backend `PATCH /api/settings/users/:id` accepts `fullName` and `email` fields
- Audit change record includes `Full Name` and `Email` when those fields change

### D07 — No in-page back button
The "← Back to Account Administration" button MUST NOT appear in the page content.

Acceptance criteria:
- No back button rendered inside the page
- Navigation back uses the global sidebar Back button

### D08 — Save action in sidebar
The Save action MUST be in the sidebar section, not an in-page button.

Acceptance criteria:
- No "Save changes" button in the page body
- `useSidebarSection` registers `{ title: 'Account Administration', items: [{ label: 'Save', icon: FiSave, event: 'settings:account:save', disabled: ... }] }`
- Page listens for `'settings:account:save'` custom event and calls `handleSave()`
- Sidebar Save item is disabled when nothing is dirty, or the account belongs to the viewer, or role is `internal_admin`

---

## 3. Open Questions

None — approved for implementation.

## 4. Dependencies

- `audit_event` table — already exists
- `AuditService` (`backend/nest/src/audit/audit.service.ts`) — already exists; `getHistory` and `writeEvent` used
- `AuditModule` — already imported in AppModule; must be imported in SettingsModule
- `TabsNav` component — already exists at `@/shared/components/TabsNav/TabsNav`
- `AuditTable` component — already exists at `@/shared/components/AuditTable/AuditTable`
- `useAudit` hook — already exists at `@/shared/lib/hooks/useAudit`
