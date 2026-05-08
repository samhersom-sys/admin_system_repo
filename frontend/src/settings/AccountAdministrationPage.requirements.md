# REQUIREMENTS — Account Administration Page

**Domain Code:** `SETTINGS-USERS`
**Location:** `frontend/src/settings/AccountAdministrationPage.tsx`
**Status:** Active — initial build
**Test file:** `settings/__tests__/AccountAdministrationPage.test.tsx`

---

## 1. Scope

**In scope:**
- List all user accounts (internal and company) — visible to `internal_admin` users only
- Display per-user: full name, email, organisation code, current role, active/inactive status, last login
- Change a user's role (permitted target values: `client_admin`, `user` — `internal_admin` cannot be assigned through this UI)
- Toggle a user's active/inactive status via an inline button
- Prevent modifying the currently authenticated user's own account
- Users grouped into two sections: "Internal Accounts" (role = `internal_admin`) and "Company Accounts" (all other roles)

**Out of scope:**
- Creating new user accounts
- Permanently deleting user records (deactivation only)
- Password reset (handled via `POST /api/auth/generate-reset-token`)
- Inviting users by email

---

## 1a. Impact Analysis

### UI Impact
| Component | Path | Action |
|---|---|---|
| AccountAdministrationPage | `frontend/src/settings/AccountAdministrationPage.tsx` | Create |
| Route `/settings/account` | `frontend/src/main.jsx` | Update (was NotFound) |
| settings.service.ts | `frontend/src/settings/settings.service.ts` | Add `AdminUser` type, `getAdminUsers()`, `updateUser()` |

### API Impact
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/settings/users` | `internal_admin` only | List all users (no password hash or security fields) |
| PATCH | `/api/settings/users/:id` | `internal_admin` only | Update `role` and/or `isActive` for a user |

### Database Impact
| Table | Impact |
|---|---|
| `users` | SELECT (`id`, `username`, `email`, `full_name`, `org_code`, `role`, `is_active`, `last_login`, `created_at`); UPDATE `role`, `is_active` |

No migration required — `is_active` and `role` columns already exist in the `users` table.

---

## 2. Requirements

### R01 — Load user list
The page MUST call `GET /api/settings/users` on mount and display the returned users.

Acceptance criteria:
- A loading spinner is shown while the request is in flight
- On success, all returned users are rendered in their respective section tables
- On API failure, an error message is displayed (no spinner)

### R02 — Two user groups
Users MUST be divided into two sections:
- **Internal Accounts** — role = `internal_admin`
- **Company Accounts** — role = `client_admin` or `user`

Acceptance criteria:
- Each group appears as a labelled `<Card>` section
- A user appears in exactly one group
- When an internal user's role is changed, they move to the Company Accounts section on next render
- An empty group shows a placeholder message ("No accounts.")

### R03 — User row fields
Each user row MUST display: full name (or username as fallback), email, organisation code, role control, active/inactive button, and last login date.

Acceptance criteria:
- `fullName` shown; falls back to `username` when `fullName` is null
- Role displayed as a `<select>` dropdown with options: "Internal Admin" (disabled, only when current role = `internal_admin`), "Company Admin" (`client_admin`), "User" (`user`)
- Active/inactive shown as a clickable pill button
- Last login shown as formatted date; "—" when null

### R04 — Change role
Selecting a new role in the dropdown MUST immediately call `PATCH /api/settings/users/:id` with `{ role }`.

Acceptance criteria:
- Optimistic update: the dropdown reflects the new value during the in-flight request
- On success, the row retains the new role; user moves to correct section if role grouping changes
- On failure, an error notification is shown and the dropdown reverts to the previous value
- `internal_admin` is never available as a selectable option

### R05 — Toggle active status
Clicking the active/inactive pill button MUST call `PATCH /api/settings/users/:id` with `{ isActive: <toggled value> }`.

Acceptance criteria:
- Optimistic update: the button reflects the new state during the in-flight request
- The button is disabled (non-interactive) while the PATCH is in flight
- On success, the button retains the new state
- On failure, an error notification is shown and the button reverts to the previous state

### R06 — Own account locked
The authenticated user's own row MUST have the role dropdown and active/inactive button disabled.

Acceptance criteria:
- Role `<select>` has `disabled` attribute for the current user's row
- Active/inactive `<button>` has `disabled` attribute for the current user's row
- Both controls carry a `title` attribute: "You cannot modify your own account."

### R07 — Backend: access control
`GET /api/settings/users` and `PATCH /api/settings/users/:id` MUST return 403 for any role other than `internal_admin`.

Acceptance criteria:
- Requests with `client_admin` JWT → 403
- Requests with `user` JWT → 403
- `PATCH` with the requesting user's own `id` → 403

### R08 — Backend: restrict role values
`PATCH /api/settings/users/:id` MUST reject any `role` value not in `['user', 'client_admin']` with a 400 response.

Acceptance criteria:
- `role: "internal_admin"` → 400
- `role: "superuser"` → 400
- Empty body (no `role` and no `isActive`) → 400

---

## 3. Open Questions

None — approved for implementation.

## 4. Dependencies

- `users` table — `is_active` (boolean) and `role` (varchar) columns
- `JwtAuthGuard` + `RolesGuard` — NestJS auth middleware (existing)
- `SettingsController` / `SettingsService` — already exist; endpoints added here
