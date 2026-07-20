# REQUIREMENTS — Account Create Page

**Domain Code:** `SETTINGS-USERS-C`
**Location:** `frontend/src/settings/AccountCreatePage.tsx`
**Status:** Active — initial build
**Test file:** `settings/__tests__/AccountCreatePage.test.tsx`

---

## 1. Scope

**In scope:**
- Create a new user account via `POST /api/settings/users`
- Fields: fullName, email, username, role, isActive, orgCode
- On success: navigate to `/settings/account/:newId`, show temporary password notification
- Sidebar "Save" action triggers creation
- Audit event "Account Created" logged by the backend

**Out of scope:**
- Password reset / invite email flow
- Org code selection from a dropdown (free-text input)

---

## 1a. Impact Analysis

### UI Impact
| Component | Path | Action |
|---|---|---|
| AccountCreatePage | `frontend/src/settings/AccountCreatePage.tsx` | Create |
| Route `/settings/account/new` | `frontend/src/main.jsx` | Add |
| settings.service.ts | `frontend/src/settings/settings.service.ts` | Add `createUser()` |

### API Impact
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/settings/users` | `internal_admin` only | Create a new user account |

### Database Impact
| Table | Impact |
|---|---|
| `users` | INSERT — fullName, email, username, role, orgCode, isActive, password_hash |
| `audit_event` | INSERT — `Account Created` event on successful creation |

---

## 2. Requirements

### C01 — Form fields
The create form MUST have: fullName, email (required), username (required), role (required), isActive (default true), orgCode.

Acceptance criteria:
- All fields rendered as controlled inputs
- Role rendered as a `<select>` with options: Company Admin, User
- isActive rendered as a toggle switch (default on)
- orgCode rendered as a text input
- ID field shown as "(assigned on save)" — read-only placeholder

### C02 — Save creates account via API
Clicking Save (sidebar action or form submit) MUST call `POST /api/settings/users` with the form values.

Acceptance criteria:
- On success: navigate to `/settings/account/:newId`
- A notification shows the temporary password (visible once): "Account created. Temporary password: `<tempPassword>`"
- On failure: error notification shown, form stays open

### C03 — Validation
The form MUST prevent submission if required fields are empty.

Acceptance criteria:
- Email, username, role are required
- If any required field is blank, submission is blocked and a validation message shown

### C04 — Sidebar section: Account Administration
The page MUST register `useSidebarSection` with title "Account Administration" and a "Save" action.

Acceptance criteria:
- `{ title: 'Account Administration', items: [{ label: 'Save', icon: FiSave, event: 'settings:account:save' }] }` registered
- Page listens for `'settings:account:save'` and calls `handleSave()`

### C05 — Backend: createUser
`POST /api/settings/users` MUST create a user and return the created user plus a one-time `tempPassword`.

Acceptance criteria:
- Generates a random temporary password (≥12 chars, mixed case + digit + symbol)
- Hashes password with bcryptjs
- INSERTs into users table
- Posts `Account Created` audit event
- Returns `{ id, username, email, fullName, role, isActive, orgCode, tempPassword }` (tempPassword only in creation response)
- Returns 400 if email or username already exists
- Returns 403 for non-internal_admin callers

---

## 3. Open Questions

None.

## 4. Dependencies

- `users` table — already exists
- `bcryptjs` — already available in backend
- `AuditService` — already available in SettingsService
- `createUser` frontend function in `settings.service.ts`
