# REQUIREMENTS — Logout Button

**Domain Code:** `LOGOUT`  
**Location:** `app/AppLayout/LogoutButton.tsx`  
**Status:** Implementation complete  
**Test file:** `domains/auth/components/auth.test.tsx`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** Rendering the "Sign out" button; orchestrating the server-side logout API call, client-side session clear, and redirect to the login page.  
**Out of scope:** UI styling of the button beyond its semantic role; any session or token management logic (owned by `lib/auth-session` and the backend auth route).

---

## 2. Requirements

### 2.1 Render

**REQ-LOGOUT-F-001:** The component shall render a button with an accessible label of `"Sign out"` that is visible in the sidebar footer.

### 2.2 Logout flow

**REQ-LOGOUT-F-002:** When the Sign out button is clicked, the component shall call `POST /api/auth/logout` via the `api-client` library **before** clearing the client session.

**REQ-LOGOUT-F-003:** If the `POST /api/auth/logout` call fails (network error or non-2xx response) the component shall **not** trap the user — it shall still proceed to clear the client session and redirect to `/login`.

**REQ-LOGOUT-F-004:** After the API call (success or failure), the component shall call `clearSession()` from `lib/auth-session` to remove all client-side auth state.

**REQ-LOGOUT-F-005:** After calling `clearSession()`, the component shall navigate to `/login` using the React Router `useNavigate` hook.

### 2.3 Architectural constraints

**REQ-LOGOUT-C-001:** The component shall not call `fetch()` directly. All HTTP calls shall go via `lib/api-client`.

**REQ-LOGOUT-C-002:** The component shall not access `localStorage`, `sessionStorage`, or `document.cookie` directly. All session clearing shall use `clearSession()` from `lib/auth-session`.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-LOGOUT-F-001 | `app/AppLayout/Sidebar.test.tsx` | T-SIDEBAR-LOGOUT-R01 |
| REQ-LOGOUT-F-002 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R4 |
| REQ-LOGOUT-F-003 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R5 |
| REQ-LOGOUT-F-004 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R1 |
| REQ-LOGOUT-F-005 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R2 |
| REQ-LOGOUT-C-001 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R6 |
| REQ-LOGOUT-C-002 | `domains/auth/components/auth.test.tsx` | T-AUTH-LOGOUT-R3 |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-12 | Initial requirements written to resolve missing file identified in guidelines audit |
