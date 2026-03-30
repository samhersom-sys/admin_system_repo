# REQUIREMENTS — auth-session

**Domain Code:** `AUTH-SES`  
**Location:** `lib/auth-session/`  
**Status:** Implementation pending  
**Test file:** `lib/auth-session/auth-session.test.ts`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** Storing, retrieving, and clearing a session token and user object; helper accessors for org code and user ID; authentication status check.  
**Out of scope:** Token validation against the server; login and logout API calls (those belong to the auth domain and api-client).

---

## 3. Impact Analysis

### UI / Front-End Impact
None. All consumers of `auth-session` call the same exported functions — no component API changes.

### API Impact
None. This is a client-side storage change only.

### Database Impact
None.

---

## 2. Requirements

**REQ-AUTH-SES-F-001:** The `storeSession(session)` function shall persist the session object (containing `token` and `user`) to `localStorage` under a single consistent key such that `getSession()` returns the same object after a page reload.

**REQ-AUTH-SES-F-002:** The `getSession()` function shall return `null` when no session has been stored in `localStorage`.

**REQ-AUTH-SES-F-003:** The `getSession()` function shall return the stored `Session` object when a valid session exists.

**REQ-AUTH-SES-F-004:** The `getSession()` function shall return `null` (and shall not throw) when the value stored in `localStorage` is not valid JSON.

**REQ-AUTH-SES-F-005:** The `isAuthenticated()` function shall return `false` when no session is stored in `localStorage`.

**REQ-AUTH-SES-F-006:** The `isAuthenticated()` function shall return `true` when a session containing a non-empty `token` string exists in `localStorage`.

**REQ-AUTH-SES-F-007:** The `getOrgCode()` function shall return an empty string when no session exists.

**REQ-AUTH-SES-F-008:** The `getOrgCode()` function shall return `session.user.orgCode` when a session exists.

**REQ-AUTH-SES-F-009:** The `getUserId()` function shall return an empty string when no session exists.

**REQ-AUTH-SES-F-010:** The `getUserId()` function shall return `session.user.id` when a session exists.

**REQ-AUTH-SES-F-011:** The `clearSession()` function shall remove the session from `localStorage` such that `getSession()` returns `null` immediately after the call.

**REQ-AUTH-SES-C-001:** No module other than `lib/auth-session` shall read from or write to `localStorage` directly for session data.

**REQ-AUTH-SES-F-012:** The `storeSession(session)` function shall write to `sessionStorage` (not `localStorage`), such that the session is automatically cleared when the browser tab is closed or the computer is restarted.

**REQ-AUTH-SES-F-013:** The `updateToken(newToken)` function shall replace only the `token` field within the stored session without modifying the `user` object, and shall do nothing if no session is currently stored.

**REQ-AUTH-SES-C-002:** The module shall use `sessionStorage` for all session reads and writes. No call to `localStorage` shall remain within `lib/auth-session`.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-AUTH-SES-F-001 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-002 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-003 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-004 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-005 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-006 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-007 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-008 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-009 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-010 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-F-011 | `lib/auth-session/auth-session.test.ts` | pending |
| REQ-AUTH-SES-C-001 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGIN-R18 |
| REQ-AUTH-SES-F-012 | `lib/auth-session/auth-session.test.ts` | T-lib-auth-session-R07 |
| REQ-AUTH-SES-F-013 | `lib/auth-session/auth-session.test.ts` | T-lib-auth-session-R08 |
| REQ-AUTH-SES-C-002 | `lib/auth-session/auth-session.test.ts` | T-lib-auth-session-R07 |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-AUTH-SES-{TYPE}-{NNN} format per Guideline 13 |
| 2026-03-14 | Added REQ-AUTH-SES-F-012 (sessionStorage), F-013 (updateToken), C-002 (no localStorage); added Impact Analysis section |
- `isAuthenticated()` returns `false` after clearing.

---

## Dependencies
- `sessionStorage` (browser / jsdom in tests)
