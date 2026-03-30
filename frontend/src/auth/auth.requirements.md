# REQUIREMENTS — AUTH DOMAIN (Frontend)

**Domain Code:** `AUTH`  
**Location:** `domains/auth/`, `app/AppLayout/LogoutButton.tsx`  
**Status:** Tests written — code pending  
**Test file:** `domains/auth/components/auth.test.tsx`  
**First artifact** in the three-artifact rule: requirements → tests → code  
**Standard:** Written per [Guideline 13 — Requirements Writing Standards](../../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- Login page (`/login`) — credential form, session establishment, brute-force lockout
- Logout — server-side token invalidation and client session teardown
- Password reset — admin-initiated work item, time-limited reset link, audit
- Server-side session management — token versioning

**Out of scope:**
- User self-registration — account creation is admin-only (see Settings domain)
- Multi-factor authentication — deferred

---

## 2. Requirements

### 2.1 Login Page — Route and Rendering

**REQ-AUTH-F-001:** The LoginPage component shall render a login form when no valid authenticated session exists at the time of rendering.

**REQ-AUTH-F-002:** The LoginPage component shall always render the login form regardless of whether a valid authenticated session exists at the time of rendering. This ensures the page is always accessible so users can re-authenticate or change accounts at any time. (Updated per OQ-B: auto-logout session.)

**REQ-AUTH-F-003:** The LoginPage component shall be accessible at the route `/login` without requiring authentication.

**REQ-AUTH-C-001:** The LoginPage component shall use `PublicLayout` and shall not be wrapped in `AppLayout` or `RequireAuth`.

### 2.2 Login Form — Fields

**REQ-AUTH-F-004:** The LoginForm component shall render an email input field of type `email` with the placeholder `email@company.com`.

**REQ-AUTH-F-005:** The LoginForm component shall render a password input field of type `password` with the placeholder `Enter your password`.

**REQ-AUTH-F-006:** The LoginForm component shall render a submit button with the label "Sign in".

### 2.3 Login Form — Password Visibility Toggle

**REQ-AUTH-F-007:** The LoginForm component shall render a toggle button adjacent to the password field that switches the input between `type="password"` and `type="text"` on each click.

**REQ-AUTH-F-008:** The toggle button shall carry `aria-label="Show password"` when the password is hidden, and `aria-label="Hide password"` when it is visible.

### 2.4 Login Form — Empty Field Validation

**REQ-AUTH-F-009:** The LoginForm component shall display the message "Please enter both email and password." and shall not call the authentication API when the user submits the form with the email field empty.

**REQ-AUTH-F-010:** The LoginForm component shall display the message "Please enter both email and password." and shall not call the authentication API when the user submits the form with the password field empty.

### 2.5 Login Form — Loading State

**REQ-AUTH-F-011:** The LoginForm component shall disable the submit button and display a loading spinner while an authentication API request is in flight.

**REQ-AUTH-F-012:** The LoginForm component shall disable the email and password input fields while an authentication API request is in flight.

### 2.6 Login Form — Success

**REQ-AUTH-F-013:** The LoginForm component shall call `auth-session.storeSession()` with the token and user object before navigating away from `/login` on a successful authentication response.

**REQ-AUTH-F-014:** The LoginPage component shall redirect the user to `/app-home` after a successful authentication response and the session has been stored.

### 2.7 Login Form — Failure States

**REQ-AUTH-F-015:** The LoginForm component shall display the message "Incorrect email or password." when the server returns HTTP 401 without an `attemptsRemaining` field.

**REQ-AUTH-F-016:** The LoginForm component shall display the message "Incorrect email or password. {n} attempts remaining." when the server returns HTTP 401 with an `attemptsRemaining` value of `n`.

**REQ-AUTH-F-017:** The LoginForm component shall display the message "Your account has been locked. Please contact your administrator." when the server returns HTTP 423.

**REQ-AUTH-F-018:** The LoginForm component shall display the message "Something went wrong. Please try again." when the server returns HTTP 500 or when the request fails with a network error.

**REQ-AUTH-F-019:** The LoginForm component shall retain the values entered in the email and password fields after any failed login attempt.

**REQ-AUTH-F-020:** The LoginForm component shall re-enable the submit button after any failed login attempt resolves.

### 2.8 Login Form — Forgot Password

**REQ-AUTH-F-021:** The LoginForm component shall render a "Forgot password?" link below the submit button.

**REQ-AUTH-F-022:** The LoginForm component shall display a browser alert containing the text "Contact your administrator to reset your password." when the user clicks the "Forgot password?" link, and shall not navigate away from `/login`.

### 2.9 Session Tokens

**REQ-AUTH-F-023:** The system shall issue a JWT with a lifetime of 8 hours upon successful authentication.

**REQ-AUTH-F-024:** The system shall embed the authenticated user's `orgCode` in the JWT payload upon successful authentication.

**REQ-AUTH-C-002:** The LoginPage and LoginForm components shall use the `auth-session` shared service to store the session token and shall not write to `localStorage` or `sessionStorage` directly.

**REQ-AUTH-C-003:** The LoginPage and LoginForm components shall not call `fetch()` directly; all API calls shall be made via the `api-client` shared service.

**REQ-AUTH-C-004:** The LoginPage and LoginForm components shall not import from any module under `domains/`.

---

### 3. Logout

**REQ-AUTH-F-025:** The LogoutButton component shall call `POST /api/auth/logout` via the `api-client` shared service before calling `auth-session.clearSession()`.

**REQ-AUTH-F-026:** The LogoutButton component shall call `auth-session.clearSession()` and navigate to `/login` even when the `POST /api/auth/logout` API call fails with a network or server error.

**REQ-AUTH-C-005:** The LogoutButton component shall not call `fetch()` directly; the logout API call shall be made via the `api-client` shared service.

**REQ-AUTH-C-006:** The LogoutButton component shall not call `localStorage.removeItem()`, `sessionStorage.removeItem()`, or `localStorage.clear()` directly; session teardown shall be performed via `auth-session.clearSession()`.

---

### 4. Server-Side Token Invalidation

**REQ-AUTH-S-001:** The system shall increment the `token_version` column for the authenticated user in the database upon each successful login, embedding the new version in the issued JWT payload as `tokenVersion`.

**REQ-AUTH-S-002:** The system shall increment the `token_version` column for the authenticated user in the database when `POST /api/auth/logout` is called with that user's valid token.

**REQ-AUTH-S-003:** The system shall increment the `token_version` column for a user in the database when a password reset is completed for that user.

**REQ-AUTH-S-004:** The authentication middleware shall return HTTP 403 when the `tokenVersion` value in the JWT payload does not match the `token_version` value for that user in the database.

---

### 5. Account Management

**REQ-AUTH-S-005:** The system shall reject requests to create user accounts from callers whose JWT role is not `'admin'` with HTTP 403.

**REQ-AUTH-C-007:** The login page shall not render a "Sign up", "Register", or equivalent self-registration link or form.

---

### 6. Password Reset

**REQ-AUTH-F-027:** The system shall support a `PASSWORD_RESET_REQUEST` work item type that is visible only to users with `role = 'admin'` in the shared work item queue.

**REQ-AUTH-F-028:** The system shall expose the public route `/reset-password` which accepts a `?token=` query parameter and renders a password reset form.

**REQ-AUTH-F-029:** The reset-password page shall display the message "This link has expired. Please contact your administrator." when the token is absent, expired, or already used.

**REQ-AUTH-F-030:** The reset-password form shall include a "New password" field and a "Confirm new password" field.

**REQ-AUTH-F-031:** The reset-password form shall validate client-side that the new password meets the minimum policy (minimum 8 characters, at least one uppercase letter, one number, one special character) before calling the API.

**REQ-AUTH-F-032:** The reset-password form shall validate client-side that the "New password" and "Confirm new password" fields contain identical values before calling the API.

**REQ-AUTH-S-006:** The system shall store the password reset token as a cryptographic hash in the `password_reset_tokens` table alongside the associated `user_id`, `expires_at` (1 hour from generation), and a `used_at` field initialised to NULL.

**REQ-AUTH-S-007:** The system shall return an error response equivalent to an expired token when a reset link has already been used (`used_at` is not NULL).

**REQ-AUTH-S-008:** The system shall reject any use of a reset link more than 1 hour after its generation time.

---

### 7. Audit

**REQ-AUTH-S-009:** The system shall insert a record into the `password_audit_log` table on every successful password change, capturing `user_id`, `changed_by_user_id`, `changed_at` (UTC), `method` (`'admin_reset'` or `'self_service'`), and `ip_address`.

**REQ-AUTH-S-010:** The `password_audit_log` table shall be append-only; no record shall ever be updated or deleted.

**REQ-AUTH-S-011:** The password audit requirement shall apply to all user accounts, including accounts with `role = 'admin'`.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|-----------|
| REQ-AUTH-F-001 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R2 |
| REQ-AUTH-F-002 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R1 |
| REQ-AUTH-F-004 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R3, T-AUTH-LOGIN-R-PH-1 |
| REQ-AUTH-F-005 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R4, T-AUTH-LOGIN-R-PH-2 |
| REQ-AUTH-F-006 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R5 |
| REQ-AUTH-F-007 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R-TOGGLE-1, T-AUTH-LOGIN-R-TOGGLE-2, T-AUTH-LOGIN-R-TOGGLE-3 |
| REQ-AUTH-F-008 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R-TOGGLE-1, T-AUTH-LOGIN-R-TOGGLE-2 |
| REQ-AUTH-F-009 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R-EMPTY-1 |
| REQ-AUTH-F-010 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R-EMPTY-2 |
| REQ-AUTH-F-011 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R6, T-AUTH-LOGIN-R7 |
| REQ-AUTH-F-012 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R8 |
| REQ-AUTH-F-013 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R9, T-AUTH-LOGIN-R11 |
| REQ-AUTH-F-014 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R10 |
| REQ-AUTH-F-015 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R12 |
| REQ-AUTH-F-016 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R-ATTEMPTS-1 |
| REQ-AUTH-F-017 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R-LOCK-1 |
| REQ-AUTH-F-018 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R15, T-AUTH-LOGIN-R16 |
| REQ-AUTH-F-019 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R13 |
| REQ-AUTH-F-020 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R14 |
| REQ-AUTH-F-021 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R-FORGOT-1 |
| REQ-AUTH-F-022 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R-FORGOT-2 |
| REQ-AUTH-C-002 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R18 |
| REQ-AUTH-C-003 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R17 |
| REQ-AUTH-C-004 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R19 |
| REQ-AUTH-F-025 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R4 |
| REQ-AUTH-F-026 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R5 |
| REQ-AUTH-C-005 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R6 |
| REQ-AUTH-C-006 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R3 |
| REQ-AUTH-S-001 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R08a |
| REQ-AUTH-S-002 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R07b |
| REQ-AUTH-S-004 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R07b, T-BE-AUTH-R08a |
| REQ-AUTH-S-009 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R10f |
| REQ-AUTH-F-023 | pending | pending |
| REQ-AUTH-F-024 | pending | pending |
| REQ-AUTH-F-027 | pending | pending |
| REQ-AUTH-F-028 | pending | pending |
| REQ-AUTH-F-029 | pending | pending |
| REQ-AUTH-F-030 | pending | pending |
| REQ-AUTH-F-031 | pending | pending |
| REQ-AUTH-F-032 | pending | pending |
| REQ-AUTH-S-003 | pending | pending |
| REQ-AUTH-S-005 | pending | pending |
| REQ-AUTH-S-006 | pending | pending |
| REQ-AUTH-S-007 | pending | pending |
| REQ-AUTH-S-008 | pending | pending |
| REQ-AUTH-S-010 | pending | pending |
| REQ-AUTH-S-011 | pending | pending |
| REQ-AUTH-C-001 | pending | pending |
| REQ-AUTH-C-007 | pending | pending |

---

## 4. Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-AUTH-001 | Should the login page display the PolicyForge logo and marketing text (as in the legacy app), or a clean minimal form? | Open |
| OQ-AUTH-002 | Should failed login attempts be rate-limited on the client side (e.g. disable submit button for N seconds after N failures)? | Open |

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written (login page, logout, session handling) |
| 2026-03-11 | Added: server-side invalidation, token versioning, no self-registration, password reset flow, audit trail |
| 2026-03-11 | Full rewrite into formal REQ-AUTH-{TYPE}-{NNN} format per Guideline 13 |

---

## 6. Design Notes

*The following sections provide context. They are not requirements and cannot be used as acceptance criteria.*

### Login User Flow

```
User visits /login
  → Login form always renders regardless of session state (REQ-AUTH-F-002)
  → Render LoginPage

User enters email + password → clicks "Sign in"
  [Idle] → submit button enabled

  [In flight] → button disabled, spinner shown, inputs disabled

  [Success] ← 200 { token, user }
    → storeSession(token, user)
    → redirect to /app-home

  [Failure — 401 no attempts info] → "Incorrect email or password."
  [Failure — 401 with attemptsRemaining] → "Incorrect email or password. N attempts remaining."
  [Failure — 423 locked] → "Your account has been locked. Please contact your administrator."
  [Failure — 500 / network] → "Something went wrong. Please try again."
  → in all failure cases: retain form values, re-enable submit
```

### Password Reset Flow

```
1. Admin selects PASSWORD_RESET_REQUEST work item
2. Admin calls POST /api/auth/generate-reset-token { userId }
   ← { resetUrl } with 1-hour expiry embedded
3. Admin shares the reset URL with the user out-of-band
4. User visits /reset-password?token=<token>
   → If expired or used → show expiry message
   → Render reset form (new password + confirm)
5. User submits form
   → Client validates: policy + match
   → POST /api/auth/reset-password { token, newPassword }
   ← 200 → show "Password reset successfully." + link to /login
   ← 400 → show inline error
6. System: updates password_hash, sets used_at, increments token_version
7. System: writes record to password_audit_log
```

### API Response Shapes (Login)

```json
POST /api/auth/login → 200
{
  "message": "Login successful",
  "token": "<jwt>",
  "user": { "id", "username", "email", "fullName", "orgCode", "role" }
}
```

### Token Versioning Mechanism

- `users` table has a `token_version INTEGER NOT NULL DEFAULT 0` column.
- Every new login increments `token_version` and embeds the new value in the JWT as `tokenVersion`.
- The authentication middleware compares `req.user.tokenVersion` (from JWT) against the DB value.
- Any mismatch → 403. This prevents concurrent sessions and ensures logout is server-side.
