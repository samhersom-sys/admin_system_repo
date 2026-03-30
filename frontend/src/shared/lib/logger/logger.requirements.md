# REQUIREMENTS — logger

**Domain Code:** `LOG`  
**Location:** `lib/logger/`  
**Status:** Implementation pending  
**Test file:** TBD (codebase scan enforces R06 via RULE-09 test)  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `logger.log`, `logger.warn`, `logger.error`, `logger.request`, `logger.response`, `logger.apiError`; dev/test console forwarding; production no-op behaviour.  
**Out of scope:** Remote logging, error tracking services (e.g. Sentry), structured log formats.

---

## 2. Requirements

**REQ-LOG-F-001:** The `logger.log`, `logger.warn`, and `logger.error` functions shall forward their arguments to `console.log`, `console.warn`, and `console.error` respectively — each prepended with `'[PF]'` — when `process.env.NODE_ENV` is not `'production'`.

**REQ-LOG-F-002:** The `logger.log`, `logger.warn`, `logger.error`, `logger.request`, `logger.response`, and `logger.apiError` functions shall each be a complete no-op — calling no `console.*` method and producing no side effects — when `process.env.NODE_ENV` is `'production'`.

**REQ-LOG-F-003:** The `logger.request(method, url, body?)` function shall, in non-production environments, open a console group labelled `[PF] ▶ METHOD URL`, log `'Request body:'` and `body` if a body argument is provided, then close the group.

**REQ-LOG-F-004:** The `logger.response(method, url, status, body?)` function shall, in non-production environments, open a console group with prefix `✓` when `status < 400` or prefix `✗` otherwise, log `'Response:'` and `body` if provided, then close the group.

**REQ-LOG-F-005:** The `logger.apiError(method, url, status, detail?)` function shall, in non-production environments, open a console group labelled `[PF] ✗ ERROR STATUS METHOD URL`, call `console.error` with `'Detail:'` and `detail` if provided, then close the group.

**REQ-LOG-C-001:** No source file other than `lib/logger/logger.ts` shall call `console.log`, `console.warn`, or `console.error` directly, with the sole exception of a single `console.error` in `components/ErrorBoundary/component.tsx` inside `componentDidCatch`.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-LOG-F-001 | TBD | pending |
| REQ-LOG-F-002 | TBD | pending |
| REQ-LOG-F-003 | TBD | pending |
| REQ-LOG-F-004 | TBD | pending |
| REQ-LOG-F-005 | TBD | pending |
| REQ-LOG-C-001 | `tools/scan-tests/` (RULE-09) | pending |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-LOG-{TYPE}-{NNN} format per Guideline 13 |
