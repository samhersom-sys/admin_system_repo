# REQUIREMENTS — Backend Auth Routes

**Domain Code:** `AUTH-BE`  
**Location:** `backend/routes/auth.js`  
**Routes mounted at:** `/api/auth`  
**Status:** Tests written — code pending  
**Test file:** `backend/__tests__/auth.test.js`  
**Standard:** Written per [Guideline 13 — Requirements Writing Standards](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `POST /api/auth/login` — credential verification, brute-force protection, JWT issuance with token versioning
- `GET /api/auth/me` — return current user from a valid JWT
- `POST /api/auth/logout` — server-side token invalidation
- `POST /api/auth/generate-reset-token` — admin-only reset link generation
- `POST /api/auth/reset-password` — public password reset with audit

**Out of scope:**
- User self-registration
- Multi-factor authentication

---

## 2. Requirements

### 2.1 POST /api/auth/login

**REQ-AUTH-BE-F-001:** The system shall return HTTP 400 when the `email` field is absent from the login request body.

**REQ-AUTH-BE-F-002:** The system shall return HTTP 400 when the `password` field is absent from the login request body.

**REQ-AUTH-BE-F-003:** The system shall return HTTP 401 with body `{ error: "Invalid email or password" }` when the submitted email does not match any user record.

**REQ-AUTH-BE-F-004:** The system shall return HTTP 401 with body `{ error: "Invalid email or password", attemptsRemaining: N }` when the submitted password is incorrect and the account has fewer than 5 failed attempts.

**REQ-AUTH-BE-S-001:** The system shall increment the `failed_login_attempts` column for the matching user by 1 on each failed password attempt.

**REQ-AUTH-BE-S-002:** The system shall set `locked_until` to `NOW() + 15 minutes` and return HTTP 423 when a failed attempt causes `failed_login_attempts` to reach 5.

**REQ-AUTH-BE-S-003:** The system shall return HTTP 423 with a message indicating minutes remaining when a login attempt is made while `locked_until` is in the future.

**REQ-AUTH-BE-F-005:** The system shall return HTTP 403 with body `{ error: "Account is deactivated" }` when the matching user's `is_active` value is `false`.

**REQ-AUTH-BE-F-006:** The system shall return HTTP 200 with body `{ message: "Login successful", token: string, user: object }` on a successful authentication.

**REQ-AUTH-BE-S-004:** The system shall increment `token_version` for the authenticated user on each successful login and embed the new value in the issued JWT payload as `tokenVersion`.

**REQ-AUTH-BE-S-005:** The system shall reset `failed_login_attempts` to 0 and set `last_login` to the current UTC timestamp on each successful login.

**REQ-AUTH-BE-S-006:** The system shall sign the JWT with `process.env.JWT_SECRET` and set an expiry of **30 minutes**.

**REQ-AUTH-BE-S-007:** The JWT payload shall contain `{ id, username, email, orgCode, role, tokenVersion }` and shall not contain `password_hash` or any other sensitive field.

**REQ-AUTH-BE-C-001:** The system shall verify passwords using `bcryptjs.compare()` and shall never store or log plaintext passwords.

### 2.2 GET /api/auth/me

**REQ-AUTH-BE-F-007:** The system shall return HTTP 401 when the `Authorization` header is absent from a request to `GET /api/auth/me`.

**REQ-AUTH-BE-F-008:** The system shall return HTTP 403 when the `Authorization` header contains an invalid or expired token on `GET /api/auth/me`.

**REQ-AUTH-BE-S-008:** The system shall return HTTP 403 when the `tokenVersion` in the JWT does not match the `token_version` value in the database for that user.

**REQ-AUTH-BE-F-009:** The system shall return HTTP 200 with the current user object (excluding `password_hash`) when a valid token is presented to `GET /api/auth/me`.

### 2.3 POST /api/auth/logout

**REQ-AUTH-BE-F-010:** The system shall return HTTP 401 when no `Authorization` header is present on `POST /api/auth/logout`.

**REQ-AUTH-BE-F-011:** The system shall return HTTP 403 when the `Authorization` header contains an invalid token on `POST /api/auth/logout`.

**REQ-AUTH-BE-F-012:** The system shall return HTTP 200 with body `{ message: "Logged out successfully" }` on a successful logout.

**REQ-AUTH-BE-S-009:** The system shall increment `token_version` for the authenticated user on a successful logout, invalidating all previously issued tokens.

### 2.4 POST /api/auth/generate-reset-token

**REQ-AUTH-BE-F-013:** The system shall return HTTP 403 when the caller's JWT role is not `'admin'` on `POST /api/auth/generate-reset-token`.

**REQ-AUTH-BE-F-014:** The system shall return HTTP 400 when `userId` is absent from the request body.

**REQ-AUTH-BE-F-015:** The system shall return HTTP 404 when the specified `userId` does not exist in the database.

**REQ-AUTH-BE-F-016:** The system shall return HTTP 200 with body `{ resetUrl: string }` when an admin successfully generates a reset token for an existing user.

**REQ-AUTH-BE-S-010:** The system shall store the reset token as a cryptographic hash in the `password_reset_tokens` table with `user_id`, `expires_at` (1 hour from generation), and `used_at` initialised to NULL.

### 2.5 POST /api/auth/reset-password

**REQ-AUTH-BE-F-017:** The system shall return HTTP 400 when `token` is absent from the request body.

**REQ-AUTH-BE-F-018:** The system shall return HTTP 400 when `newPassword` is absent from the request body.

**REQ-AUTH-BE-F-019:** The system shall return HTTP 400 when the submitted token does not match any record in `password_reset_tokens`, has expired, or has already been used.

**REQ-AUTH-BE-F-020:** The system shall return HTTP 200 with body `{ message: "Password reset successfully." }` after successfully resetting a password.

**REQ-AUTH-BE-S-011:** The system shall update the user's `password_hash` using `bcryptjs` (10 rounds), set `used_at` on the reset token record, and increment `token_version` for that user on a successful password reset.

**REQ-AUTH-BE-S-012:** The system shall insert a record into `password_audit_log` on every successful password reset, capturing `user_id`, `changed_by_user_id` (the admin's user ID), `changed_at` (UTC), `method: 'admin_reset'`, and `ip_address`.

**REQ-AUTH-BE-S-013:** The `password_audit_log` table shall be append-only; no row shall be updated or deleted by any application code.

### 2.6 POST /api/auth/refresh

**REQ-AUTH-BE-F-021:** The system shall return HTTP 401 when the `Authorization` header is absent from a request to `POST /api/auth/refresh`.

**REQ-AUTH-BE-F-022:** The system shall return HTTP 403 when the `Authorization` header contains an invalid or expired token on `POST /api/auth/refresh`.

**REQ-AUTH-BE-F-023:** The system shall return HTTP 403 when the authenticated user's `is_active` flag is `false` on `POST /api/auth/refresh`.

**REQ-AUTH-BE-F-024:** The system shall return HTTP 200 with body `{ token: string }` containing a newly signed JWT (30-minute expiry) when a valid, non-expired token is presented to `POST /api/auth/refresh`.

**REQ-AUTH-BE-S-014:** The refresh token issued by `POST /api/auth/refresh` shall carry the payload `{ id, username, email, orgCode, role }` sourced from the verified JWT — no database read is required for a standard refresh.

**REQ-AUTH-BE-S-015:** The `POST /api/auth/refresh` endpoint shall not increment `token_version`; only login, logout, and password reset may invalidate existing tokens.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-AUTH-BE-F-001 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R02a |
| REQ-AUTH-BE-F-002 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R02b |
| REQ-AUTH-BE-F-003 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R03a |
| REQ-AUTH-BE-F-004 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R04a |
| REQ-AUTH-BE-S-001 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R04b |
| REQ-AUTH-BE-S-002 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R05a |
| REQ-AUTH-BE-S-003 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R05b |
| REQ-AUTH-BE-F-006 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R01a |
| REQ-AUTH-BE-S-004 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R08a |
| REQ-AUTH-BE-S-005 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R01d |
| REQ-AUTH-BE-S-007 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R01b, T-BE-AUTH-R01c |
| REQ-AUTH-BE-F-007 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R06b |
| REQ-AUTH-BE-F-008 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R06c |
| REQ-AUTH-BE-S-008 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R07b, T-BE-AUTH-R08a |
| REQ-AUTH-BE-F-009 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R06a, T-BE-AUTH-R06d |
| REQ-AUTH-BE-F-010 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R07c |
| REQ-AUTH-BE-F-012 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R07a |
| REQ-AUTH-BE-S-009 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R07b |
| REQ-AUTH-BE-F-013 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R09b |
| REQ-AUTH-BE-F-014 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R09c |
| REQ-AUTH-BE-F-015 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R09d |
| REQ-AUTH-BE-F-016 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R09a |
| REQ-AUTH-BE-F-017 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R10d |
| REQ-AUTH-BE-F-018 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R10e |
| REQ-AUTH-BE-F-019 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R10b, T-BE-AUTH-R10c |
| REQ-AUTH-BE-F-020 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R10a |
| REQ-AUTH-BE-S-011 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R10a |
| REQ-AUTH-BE-S-012 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R10f |
| REQ-AUTH-BE-F-005 | pending | pending |
| REQ-AUTH-BE-F-011 | pending | pending |
| REQ-AUTH-BE-S-006 | pending | pending |
| REQ-AUTH-BE-S-010 | pending | pending |
| REQ-AUTH-BE-S-013 | pending | pending |
| REQ-AUTH-BE-C-001 | pending | pending |
| REQ-AUTH-BE-F-021 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R11a |
| REQ-AUTH-BE-F-022 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R11b |
| REQ-AUTH-BE-F-023 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R11c |
| REQ-AUTH-BE-F-024 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R11d |
| REQ-AUTH-BE-S-014 | `backend/__tests__/auth.test.js` | T-BE-AUTH-R11e |
| REQ-AUTH-BE-S-015 | pending | pending |

---

## 4. Open Questions

None — all auth backend requirements are agreed.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written (login + GET /me) |
| 2026-03-11 | Added logout, token versioning, password reset, audit requirements |
| 2026-03-11 | Rewritten into formal REQ-AUTH-BE-{TYPE}-{NNN} format per Guideline 13 |
| 2026-03-14 | REQ-AUTH-BE-S-006 updated: JWT expiry changed from 8h to 30m (sliding session design) |
| 2026-03-14 | Added section 2.6 POST /api/auth/refresh (REQ-AUTH-BE-F-021–F-024, S-014, S-015) |

---

## 6. Design Notes

*The following are context-setting notes. They are not requirements.*

### Database Table (users)

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer | Primary key |
| `username` | varchar(100) | Unique |
| `email` | varchar(255) | Unique — primary login identifier |
| `password_hash` | varchar(255) | bcryptjs hash, 10 rounds |
| `full_name` | varchar(255) | Nullable |
| `org_code` | varchar(50) | Tenant identifier |
| `role` | varchar(50) | Default `'user'` |
| `is_active` | boolean | Default `true` |
| `failed_login_attempts` | integer | Default 0 |
| `locked_until` | timestamp | Nullable |
| `last_login` | timestamp | Updated on successful login |
| `token_version` | integer | Default 0 — incremented on login, logout, password reset |

### Lockout Constants

| Constant | Value |
|----------|-------|
| `MAX_LOGIN_ATTEMPTS` | 5 |
| `LOCKOUT_DURATION_MINUTES` | 15 |
