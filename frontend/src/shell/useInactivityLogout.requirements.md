# useInactivityLogout — Requirements

**Domain code:** INACTIVITY  
**Location:** `app/AppLayout/useInactivityLogout.ts`  
**Tests:** `app/AppLayout/useInactivityLogout.test.ts`  
**Status:** All requirements confirmed by product owner (2026-03-14)

---

## Scope

**In scope:** Inactivity timer; automatic logout on timeout; token refresh on user activity.  
**Out of scope:** Login form, token storage (handled by `lib/auth-session`), API call mechanics (handled by `lib/api-client`).

---

## Impact Analysis

### UI / Front-End Impact
No visible UI change. `AppLayout` continues calling the hook with the same signature. Users are silently issued fresh tokens while active.

### API Impact
Adds calls to `POST /api/auth/refresh` from the hook on user activity events (throttled). The endpoint must exist on the backend before this hook is deployed.

### Database Impact
None.

---

## Requirements

## REQ-INACTIVITY-F-001: Automatic logout on inactivity

After `timeoutMs` milliseconds of continuous inactivity, the hook shall call
`clearSession()` and navigate to `/login`, ending the authenticated session.
The timer starts immediately on mount.

## REQ-INACTIVITY-F-002: Activity events reset the timer

The following user interaction events on `window` shall reset the inactivity
timer to its full value: `mousemove`, `keydown`, `click`, `scroll`,
`touchstart`. Each event restarts the countdown from zero.

## REQ-INACTIVITY-F-003: Cleanup on unmount

On unmount the hook shall remove all event listeners and cancel any pending
timer. No logout must fire after the component unmounts.

## REQ-INACTIVITY-F-004: Integration with AppLayout

`AppLayout` shall call `useInactivityLogout(INACTIVITY_TIMEOUT_MS)` where
`INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000` (30 minutes). The constant shall be
declared at module scope in `AppLayout.tsx`.

## REQ-INACTIVITY-F-005: Throttled token refresh on activity

On any user activity event, the hook shall call `POST /api/auth/refresh` via
`api-client.post()` and pass the returned `token` to `auth-session.updateToken()`,
throttled to at most once per 5 minutes. The refresh shall be skipped silently if
no session exists at the time of the event. If the refresh call returns an error
(e.g. token expired or revoked), the hook shall call `clearSession()` and navigate
to `/login`.

---

## Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-INACTIVITY-F-001 | `app/AppLayout/useInactivityLogout.test.ts` | T-INACTIVITY-R01 |
| REQ-INACTIVITY-F-002 | `app/AppLayout/useInactivityLogout.test.ts` | T-INACTIVITY-R02 |
| REQ-INACTIVITY-F-003 | `app/AppLayout/useInactivityLogout.test.ts` | T-INACTIVITY-R03 |
| REQ-INACTIVITY-F-004 | `app/AppLayout/AppLayout.tsx` | (integration — confirmed by component render) |
| REQ-INACTIVITY-F-005 | `app/AppLayout/useInactivityLogout.test.ts` | T-INACTIVITY-R04 |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-14 | Initial requirements written (F-001 – F-004) |
| 2026-03-14 | Added F-005 (throttled token refresh on activity); added Scope, Impact Analysis, Traceability, Change Log sections per Guideline 13 |
