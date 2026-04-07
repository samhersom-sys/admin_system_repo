# REQUIREMENTS — Profile Page

**Domain Code:** `PROFILE`  
**Location:** `frontend/src/profile/`  
**Status:** Draft — pending user review (Batch C)  
**Test file:** `frontend/src/profile/profile.test.tsx`  
**Standard:** Written per [Guideline 13 — Requirements Writing Standards](../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `ProfilePage` component at route `/profile`
- Display of authenticated user's name, email, role, and organisation (read from `GET /api/auth/me`)
- Editing the user's Full Name and saving via `PUT /api/auth/profile`
- Change Password section (current password, new password, confirm) calling `POST /api/auth/change-password`
- Inline validation for name and password fields
- Toast notifications for save and password-change outcomes
- Backend: two new endpoints on `AuthController` (`PUT /api/auth/profile`, `POST /api/auth/change-password`)

**Out of scope:**
- Changing email address (email is the login identifier — read-only)
- Changing role or organisation (tenant-controlled)
- Profile photo / avatar upload
- Multi-factor authentication
- Admin editing another user's profile (that belongs to Settings → Account Administration)

---

## 2. Impact Analysis

### UI / Front-End Impact
`frontend/src/profile/index.tsx` — replace stub with full `ProfilePage` component.  
`frontend/src/profile/profile.test.tsx` — add Layer 1 component tests; retire smoke test.  
Route `/profile` already defined in `AppRoutes` — no router change needed.

### API Impact
- **New:** `PUT /api/auth/profile` — accepts `{ name: string }`, returns `{ data: { id, name, email, role } }`. Protected by `JwtAuthGuard`.  
- **New:** `POST /api/auth/change-password` — accepts `{ currentPassword: string; newPassword: string }`, returns `{ message: string }` or `401`. Protected by `JwtAuthGuard`.  
- **Unchanged:** `GET /api/auth/me` — already exists; ProfilePage reuses it.

### Database Impact
None. The `users` table already has a `full_name` column (confirmed in `user.entity.ts`). `password_hash` is updated by the change-password endpoint using bcrypt — no schema change.

---

## 3. Backup Coverage Map

Sources read:
- `src/layouts/AppLayout/AppLayoutPages/Profile/ProfilePage.jsx`

| # | BackUp Feature / Field / Behaviour | Requirement ID | Status |
|---|-------------------------------------|----------------|--------|
| 1 | Username field (read-only, `userName`) | — | REMOVED — `username` is an internal DB field; `fullName` is the user-facing identity in Cleaned |
| 2 | Name field (editable text) | REQ-PROFILE-F-002, REQ-PROFILE-F-005 | COVERED |
| 3 | Email field (editable) | REQ-PROFILE-F-003 | COVERED (read-only in Cleaned — email is login identifier) |
| 4 | Organisation Name field (editable) | REQ-PROFILE-F-003 | COVERED as read-only field (tenant-determined in Cleaned) |
| 5 | Org Code field (editable, max 8 chars) | — | REMOVED — org scoping is tenant-determined from JWT; not user-editable |
| 6 | Account Type dropdown (admin/broker/insurer) | — | REMOVED — role is tenant-assigned; not user-editable in Cleaned |
| 7 | Save Changes button → updates user context | REQ-PROFILE-F-004 | COVERED (now calls `PUT /api/auth/profile`) |
| 8 | Reset button → restores from context | — | REMOVED — page re-fetches from server on mount; cancel navigates away |
| 9 | Change Password section | REQ-PROFILE-F-006, REQ-PROFILE-F-007, REQ-PROFILE-F-008 | NEW — confirmed in gap analysis §4.6 |

---

## 4. Page Layout

```
Page Layout (from BackUp: ProfilePage.jsx + Cleaned Batch C spec)
┌─────────────────────────────────────────────────────┐
│  outer: <div className="p-6 flex flex-col gap-6">   │  ← class per Guideline 14.1
├─────────────────────────────────────────────────────┤
│  Card title="Profile Information"                   │  ← unconditional
│    Full Name  [text input]                          │
│    Email      [read-only text]                      │
│    Role       [read-only text]                      │
│    Organisation [read-only text]                    │
│    [Save button]                                    │
├─────────────────────────────────────────────────────┤
│  Card title="Change Password"                       │  ← unconditional
│    Current Password  [password input]               │
│    New Password      [password input]               │
│    Confirm Password  [password input]               │
│    [Change Password button]                         │
└─────────────────────────────────────────────────────┘
```

---

## 5. Requirements

### 5.1 Page Load and Display

**REQ-PROFILE-F-001:** The `ProfilePage` component shall call `GET /api/auth/me` on mount and populate the profile form fields with the returned `fullName`, `email`, `role`, and `orgCode` values.

**REQ-PROFILE-F-002:** The Full Name field shall be an editable text input pre-populated with the user's `fullName` from the `GET /api/auth/me` response.

**REQ-PROFILE-F-003:** The Email, Role, and Organisation fields shall be rendered as read-only display elements with no edit affordance.

### 5.2 Save Profile Name

**REQ-PROFILE-F-004:** The ProfilePage shall include a "Save" button in the Profile Information card that calls `PUT /api/auth/profile` with body `{ name: <full name field value> }` and on HTTP 200 displays a toast notification with the message "Profile updated".

**REQ-PROFILE-F-005:** The Full Name field shall enforce a maximum of 100 characters and shall display the inline validation message "Name is required" if the field is empty when the Save button is clicked; the API call shall not be made while the field is empty.

### 5.3 Change Password

**REQ-PROFILE-F-006:** The ProfilePage shall include a Change Password card with three password inputs: Current Password, New Password, and Confirm New Password. Clicking the "Change Password" button shall call `POST /api/auth/change-password` with `{ currentPassword, newPassword }`. On HTTP 200 the message toast "Password changed successfully" shall appear and all three password fields shall be cleared.

**REQ-PROFILE-F-007:** The "Change Password" button shall be disabled and the inline message "Password does not meet requirements" shall appear if the New Password field value does not satisfy all three rules: minimum 8 characters, at least one upper-case letter, at least one digit.

**REQ-PROFILE-F-008:** The "Change Password" button shall be disabled and the inline message "Passwords do not match" shall appear if the Confirm New Password field value differs from the New Password field value.

**REQ-PROFILE-F-009:** On a `401` response from `POST /api/auth/change-password` the ProfilePage shall display the inline error message "Current password is incorrect" beneath the Current Password field.

### 5.4 Security

**REQ-PROFILE-S-001:** The `/profile` route shall be protected by `RequireAuth`; unauthenticated users shall be redirected to `/login`.

### 5.5 Constraints

**REQ-PROFILE-C-001:** All HTTP calls from `ProfilePage` shall use the `api-client` shared service (`@/shared/lib/api-client/api-client`); direct use of `fetch` or `axios` is forbidden.

---

## 6. Backend Requirements (AuthController additions)

> These requirements extend `backend/nest/src/auth/auth.controller.ts` and `auth.service.ts`.

**REQ-AUTH-BE-F-010:** `AuthController` shall expose `PUT /api/auth/profile` decorated with `@UseGuards(JwtAuthGuard)` accepting `{ name: string }` in the request body and returning `{ data: { id, name, email, role } }` where `name` reflects the saved `fullName`.

**REQ-AUTH-BE-F-011:** `PUT /api/auth/profile` shall return HTTP 400 with `{ error: "Name is required" }` if the `name` field is absent or contains only whitespace after trimming.

**REQ-AUTH-BE-F-012:** `PUT /api/auth/profile` shall return HTTP 400 with `{ error: "Name must not exceed 100 characters" }` if the `name` field exceeds 100 characters after trimming.

**REQ-AUTH-BE-F-013:** `AuthController` shall expose `POST /api/auth/change-password` decorated with `@UseGuards(JwtAuthGuard)` and `@HttpCode(HttpStatus.OK)` accepting `{ currentPassword: string; newPassword: string }` and returning `{ message: "Password changed successfully" }` on success.

**REQ-AUTH-BE-F-014:** `POST /api/auth/change-password` shall return HTTP 401 with `{ error: "Current password is incorrect" }` if `bcrypt.compare(currentPassword, user.passwordHash)` returns `false`.

**REQ-AUTH-BE-F-015:** `PUT /api/auth/profile` and `POST /api/auth/change-password` shall obtain the user identity exclusively from `req.user.id` (the validated JWT payload) — reading `id` from the request body or query parameters is forbidden.

---

## 7. Traceability

| Requirement ID | Test file | Test ID |
|----------------|-----------|--------|
| REQ-PROFILE-F-001 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-F-002 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-F-003 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-F-004 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-F-005 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-F-006 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-F-007 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-F-008 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-F-009 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-S-001 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-PROFILE-C-001 | `frontend/src/profile/profile.test.tsx` | pending |
| REQ-AUTH-BE-F-010 | `backend/__tests__/auth.test.js` | pending |
| REQ-AUTH-BE-F-011 | `backend/__tests__/auth.test.js` | pending |
| REQ-AUTH-BE-F-012 | `backend/__tests__/auth.test.js` | pending |
| REQ-AUTH-BE-F-013 | `backend/__tests__/auth.test.js` | pending |
| REQ-AUTH-BE-F-014 | `backend/__tests__/auth.test.js` | pending |
| REQ-AUTH-BE-F-015 | `backend/__tests__/auth.test.js` | pending |

---

## 8. Open Questions

None blocking.

> **OQ-004 resolution:** Confirmed — ProfilePage is a simple form page in its own `profile/` module, not owned by the `auth` domain. The `auth` domain owns login/logout/session only. ProfilePage calls auth endpoints but is not architecturally part of that domain.

---

## 9. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Stub created per Guideline 13 |
| 2026-04-15 | Full requirements written for Batch C; stub replaced; OQ-004 resolved |
