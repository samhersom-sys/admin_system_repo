# AI Guideline 16 — Error Handling Standards

**Applies to:** All frontend pages, domain components, backend routes, and backend middleware  
**When to read this:** Before writing any error handling code, before adding any `catch` block, before rendering any error state, and when reviewing existing code for compliance  
**Authority:** Adopted 2026-03-17. All new code must follow this standard. Existing violations must be remediated.

---

## 1. Purpose

Errors must be visible, traceable, and recorded. A user must never be left wondering why something did not work. A developer must never have to guess what went wrong or when.

There are two distinct error destinations, and both must be used:

| Destination | What it is | When to use |
|---|---|---|
| **Notification panel** | The `useNotifications().addNotification()` hook — shows the bell icon flyout | Every system-level error (save failed, load failed, server error, validation failure) |
| **Error log table** | Backend `error_log` database table | Every backend error that produces a 4xx or 5xx HTTP response |

---

## 2. Frontend — Notification Panel Rule (Hard Stop)

### 2.1  Rule

Every error arising at a system boundary must be dispatched to the notification panel via `useNotifications().addNotification()` with `type: 'error'`.

A **system boundary** includes:
- API call failures (save, load, update, delete, status change)
- Network errors (`Failed to fetch`, timeout)
- Authentication/authorisation errors
- Any error caught in a `try/catch` block around an async API call
- Form submission failures

### 2.2  Inline field errors (permitted, but not sufficient)

Inline errors close to a specific field (e.g. "Insured is required" rendered below the insured search widget) are **permitted** to assist the user in finding the problem quickly.

However, inline display is **never sufficient on its own**. Every inline error must also call `addNotification()`.

**Correct pattern:**

```tsx
const { addNotification } = useNotifications()

// Inline display
setInsuredError('Please select an insured before saving.')
// Notification panel (mandatory in addition)
addNotification('Quote not saved: insured is required.', 'error')
```

### 2.3  Unsaved changes banner

The "You have unsaved changes" banner is **not** an error notification. It is a warning UI element — it must remain as a visible page-level banner. It does **not** need to also appear in the notification panel.

However, if a save attempt fails, the resulting error message must appear in the notification panel (§2.1 applies).

### 2.4  Import rule

`useNotifications` is exported from `@/shell/NotificationDock`.  
Do not import it from any other path.

```tsx
import { useNotifications } from '@/shell/NotificationDock'
```

### 2.5  Error message wording

Notification panel error messages must:
- State what failed (noun/verb): "Quote save failed." / "Could not load submission."
- State the reason if known: "Quote save failed: server returned 400 — insured is required."
- Never show raw error stack traces or internal identifiers.

---

## 3. Backend — Error Log Table Rule (Hard Stop)

### 3.1  Rule

Every backend route that produces a `4xx` or `5xx` HTTP response must write a record to the `error_log` table **before** sending the response.

The only exceptions are:
- `401 Unauthorised` responses from the `authenticateToken` middleware (these are already logged by the auth middleware)
- `404` for records not found (optional but encouraged)

### 3.2  Error log table schema

Table: `error_log`

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PRIMARY KEY | Auto-increment |
| `org_code` | TEXT | From `req.user.orgCode` (null if auth failed) |
| `user_name` | TEXT | From `req.user.name` (null if auth failed) |
| `source` | TEXT NOT NULL | Route path + method, e.g. `POST /api/quotes/:id/bind` |
| `error_code` | TEXT NOT NULL | Machine-readable code, e.g. `ERR_QUOTE_ALREADY_BOUND` |
| `description` | TEXT NOT NULL | Human-readable description of what went wrong |
| `context` | JSONB | Request body, params, or other debugging context (no PII/passwords) |
| `created_at` | TIMESTAMPTZ | Defaults to `NOW()` |

Migration file: `db/migrations/085-create-error-log.js`

### 3.3  Error log helper (recommended pattern)

A shared helper should be used in routes to keep error logging consistent:

```js
async function logError(req, errorCode, description, context = {}) {
    try {
        await runQuery(
            `INSERT INTO error_log (org_code, user_name, source, error_code, description, context)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                req.user?.orgCode ?? null,
                req.user?.name ?? null,
                `${req.method} ${req.route?.path ?? req.path}`,
                errorCode,
                description,
                JSON.stringify(context),
            ]
        )
    } catch (_) {
        // Non-fatal — never let logging failure break the response
    }
}
```

### 3.4  Route error pattern

```js
// In a route handler:
if (!quote) {
    await logError(req, 'ERR_QUOTE_NOT_FOUND', `Quote ${id} not found`)
    return res.status(404).json({ error: 'Quote not found' })
}

if (quote.status === 'Bound') {
    await logError(req, 'ERR_QUOTE_ALREADY_BOUND', `Cannot bind a quote already in Bound status`, { quoteId: id })
    return res.status(400).json({ error: 'Cannot bind a Bound quote' })
}
```

---

## 4. Existing Code Violations — Remediation Order

Code written before this guideline was adopted must be brought into compliance. Priority order:

| Status | Code location | Violation | Resolution |
|---|---|---|---|
| Remediated | `frontend/src/quotes/NewQuotePage/NewQuotePage.tsx` | `setSaveError`, `setInsuredError` — panel not called | Fixed 2026-03-17 |
| Remediated | `frontend/src/quotes/QuoteViewPage/QuoteViewPage.tsx` | `setActionError`, `setDeclineError`, `setLoadError` — panel not called | Fixed 2026-03-17 |
| Remediated | `backend/routes/quotes.js` | No `error_log` writes on 4xx/5xx | Fixed 2026-03-17 |
| Remediated | `frontend/src/submissions/NewSubmissionPage.tsx` | `setSaveError`, `setInsuredError` — panel not called | Fixed 2026-03-17 |
| Remediated | `frontend/src/submissions/SubmissionViewPage.tsx` | `setLoadError`, `setActionError`, `setDeclineError` — panel not called | Fixed 2026-03-17 |
| Remediated | `frontend/src/submissions/SubmissionTabs/SubmissionTabs.tsx` | `AuditPane` `setError` — panel not called | Fixed 2026-03-17 |
| Remediated | `frontend/src/quotes/QuotesListPage/QuotesListPage.tsx` | `setError` — panel not called | Fixed 2026-03-17 |
| Remediated | `frontend/src/parties/CreatePartyPage/CreatePartyPage.tsx` | `setValidationError` (3 sites) — panel not called | Fixed 2026-03-17 |
| Remediated | `frontend/src/parties/PartyListPage/PartyListPage.tsx` | `setError` — panel not called | Fixed 2026-03-17 |
| Remediated | `backend/routes/submissions.js` | No `error_log` writes on 4xx/5xx | Fixed 2026-03-17 |
| Remediated | `backend/routes/parties.js` | No `error_log` writes on 4xx/5xx | Fixed 2026-03-17 |
| Remediated | `backend/routes/search.js` | No `error_log` writes on 4xx/5xx | Fixed 2026-03-17 |
| Remediated | `backend/routes/audit.js` | No `error_log` writes on 4xx/5xx | Fixed 2026-03-17 |
| Remediated | `backend/routes/dashboard-stubs.js` | No `error_log` write on 500 | Fixed 2026-03-17 |

---

## 5. Audit Checklist

When reviewing any component for error-handling compliance, check:

- [ ] Is every `catch` block calling `addNotification()` with `type: 'error'`?
- [ ] Is every inline error state (`setSaveError`, `setLoadError`, etc.) accompanied by a `addNotification()` call?
- [ ] Is the message in `addNotification()` human-readable (not a raw error object)?
- [ ] In the backend route, is every non-success branch writing to `error_log`?
- [ ] Are passwords, tokens, or PII excluded from the `context` column?
- [ ] Does the notification message tell the user what failed and why, without exposing internals?

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-03-17 | Guideline created — covers frontend notification panel rule, backend error_log rule, and remediation priority list |
