# LoginForm — Requirements

> Parent requirements: `app/pages/auth/auth.requirements.md` (§2.2–2.4)
> Tested via: `app/pages/auth/auth.test.tsx` (T-AUTH-LOGIN-R* suite)
> Test ID format: `T-AUTH-LOGIN-R[NN]`

## Purpose

`LoginForm` is the credential submission form rendered inside `LoginPage`. It owns:

- The email and password input fields
- Submission handling (calls `POST /api/auth/login` via `api-client`)
- Session persistence on success (via `auth-session.storeSession`)
- Redirect to `/app-home` on success
- Error display for 401 (wrong credentials) and 5xx/network failures
- Loading state (disabled inputs + spinner) during the request

`LoginForm` contains no routing logic beyond the success redirect, no domain imports,
and no direct `fetch()` or `localStorage` calls.

---

## Requirements

### R01 — API call
On submit, `LoginForm` calls `POST /api/auth/login` with `{ email, password }` via
`api-client.post()`. It must never call `fetch()` directly.

### R02 — Session storage on success
On a 200 response, `LoginForm` calls `auth-session.storeSession({ token, user })`.
It must never write to `localStorage` directly.

### R03 — Redirect on success
After successfully storing the session, `LoginForm` navigates to `/app-home` using
`react-router-dom`'s `useNavigate`. The redirect happens after `storeSession` completes.

### R04 — Loading state
While the API call is in flight:
- The submit button is disabled.
- A loading spinner is displayed.
- Both the email and password inputs are disabled.

### R05 — 401 error handling
When the API returns a 401 status, `LoginForm` displays "Incorrect email or password".
The form inputs retain their current values. The submit button is re-enabled.

### R06 — Server / network error handling
When the API returns a 5xx status or a network error occurs, `LoginForm` displays
a generic error message. The form inputs retain their current values.

### R07 — No hardcoded colours
`LoginForm` must not contain hex colour literals. All colours come from Tailwind
utility classes or `brandClasses` tokens.

---

## Notes

The full acceptance criteria, user journey, and edge cases are specified in
`app/pages/auth/auth.requirements.md` §2.2–2.4. This file captures the component-level
scope summary. Tests live in `app/pages/auth/auth.test.tsx` and cover all R01–R07 items
above through the T-AUTH-LOGIN-R* suite (which renders LoginForm inside LoginPage via
React Testing Library).
