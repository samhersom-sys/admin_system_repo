# REQUIREMENTS — api-client

**Domain Code:** `API-CLIENT`  
**Location:** `lib/api-client/`  
**Status:** Implementation pending  
**Test file:** `lib/api-client/api-client.test.ts`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `get`, `post`, `put`, `del` (DELETE) methods; automatic `Authorization` and `x-org-code` header injection from the current session; JSON parsing; typed `ApiError` on non-2xx responses.  
**Out of scope:** Caching, retries, rate limiting, request cancellation.

---

## 2. Requirements

**REQ-API-CLIENT-F-001:** The `get(url)` function shall send a GET request to the specified URL and return the parsed JSON response body on a 2xx status code.

**REQ-API-CLIENT-F-002:** The `post(url, body)` function shall send a POST request with the provided body serialised as JSON and return the parsed JSON response body on a 2xx status code.

**REQ-API-CLIENT-F-003:** The `put(url, body)` function shall send a PUT request with the provided body serialised as JSON and return the parsed JSON response body on a 2xx status code.

**REQ-API-CLIENT-F-004:** The `del(url)` function shall send a DELETE request without a body and return the parsed JSON response body on a 2xx status code.

**REQ-API-CLIENT-F-005:** The api-client module shall throw an `ApiError` containing a `status` (number) and `body` (parsed JSON) property on any non-2xx HTTP response.

**REQ-API-CLIENT-F-006:** The thrown `ApiError` shall be an instance of `Error` so that `error instanceof Error` evaluates to `true`.

**REQ-API-CLIENT-S-001:** The api-client module shall attach an `Authorization: Bearer <token>` header to every outgoing request when a session token exists in the auth-session store.

**REQ-API-CLIENT-S-002:** The api-client module shall omit the `Authorization` header from requests when no session token exists.

**REQ-API-CLIENT-S-003:** The api-client module shall attach an `x-org-code: <orgCode>` header to every outgoing request when `session.user.orgCode` is set.

**REQ-API-CLIENT-S-004:** The api-client module shall omit the `x-org-code` header from requests when no session exists.

**REQ-API-CLIENT-C-001:** When a caller passes an absolute `http://` or `https://` URL, the api-client module shall use that URL unchanged.

**REQ-API-CLIENT-C-002:** When the browser hostname is `localhost` or `127.0.0.1`, the api-client module shall preserve relative API URLs so local development continues to use the Vite `/api` proxy.

**REQ-API-CLIENT-C-003:** When the browser hostname starts with `app.`, the api-client module shall resolve relative API URLs against the sibling `api.` hostname on the same protocol. Example: `https://app.policyforge.com` + `/api/health` → `https://api.policyforge.com/api/health`.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-API-CLIENT-F-001 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-F-002 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-F-003 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-F-004 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-F-005 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-F-006 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-S-001 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-S-002 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-S-003 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-S-004 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-C-001 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-C-002 | `lib/api-client/api-client.test.ts` | pending |
| REQ-API-CLIENT-C-003 | `lib/api-client/api-client.test.ts` | pending |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-API-CLIENT-{TYPE}-{NNN} format per Guideline 13 |
| 2026-03-30 | Added deployment URL-resolution requirements for local proxy preservation and app→api hostname mapping |

---

## 6. Dependencies

- `lib/auth-session` — `getSession()` for auth and org-code header injection
- `fetch` (browser global / polyfill in tests)
