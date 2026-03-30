# TECHNICAL DOCUMENTATION — 06: SHARED SERVICE INTEGRATION NOTES

This document describes the specific integration work needed for each shared service during migration, including what needs to change from the legacy code.

---

## Shared Service: `event-bus`

### Legacy State

**Does not exist.**  The legacy codebase has no event bus.  All cross-feature communication happens through shared React Context providers.

### What Must Be Built

This is a greenfield build.  Before any domain can publish or subscribe to events, the event bus must exist.  It is the first shared service that must be built.

### Key Consumers (once built)

| Domain | Will publish via event bus |
|--------|--------------------------|
| `submissions` | `submission.created`, `submission.assigned`, `submission.status-changed` |
| `quotes` | `quote.accepted`, `quote.declined` |
| `policies` | `policy.bound`, `policy.endorsed` |
| `claims` | `claim.opened`, `claim.settled` |

---

## Shared Service: `permissions`

### Legacy State

**Does not exist as a service.**  Permission checks are:
- Absent from all API routes
- Partially implemented as JSX conditional rendering in components (e.g. hiding buttons based on `user.role`)
- Not consistent across the codebase

### What Must Be Built

A clean `can(action, userContext)` function that returns a boolean.  The permission matrix (what each role can do) must be defined as a requirements document before this service is built.

### Migration Note

All existing JSX conditionals like `{user.role === 'admin' && <button>...}` must be identified, documented, and replaced with calls to `permissions.can()`.

**Scan required:** Before migration begins, run a code scan to find all `role` comparisons in JSX and document them as implicit permission rules.

> **Open question OQ-008:** Define the full permission matrix.  This is a blocker for this service.

---

## Shared Service: `notifications`

### Legacy State

`src/context/notificationContext.jsx` implements notifications as a React Context provider.  It:
- Loads notifications on mount by `userName` and `orgCode`
- Adds notifications to database and local state
- Has a fallback for network failures (local-only notification)
- Supports marking read, clearing, and deleting

### What Must Change

- Move from React Context to a shared service with a clean function interface
- Query must be strictly tenant-scoped (there is a potential bug where `orgCode` could be wrong)
- The local-only fallback pattern is valid and must be preserved
- The `clientId` pattern (for client-side notification identity before server response) must be preserved

### Migration Risk

The `notificationContext` uses `user.name` (not `user.id`) as the user identifier for notification scoping.  If users can change their username, this could cause notifications to become orphaned.  This should be changed to `user.id` in the new architecture.

---

## Shared Service: `api-client`

### Legacy State

`src/utils/apiBase.js` provides `safeJson`, `fetchJson`, and `apiUrl`.  However:
- Not all pages use these functions — some pages call raw `fetch()` directly (e.g. `ApplicationHomePage.jsx`)
- The `apiUrl` function handles environment-specific base URLs

### What Must Change

- All API calls in the new architecture must use `api-client`
- The API client must automatically attach the JWT token to every request
- The API client must handle 401 (unauthorised) by clearing the session and redirecting to login

### Migration Note

A codebase scan should identify all files using raw `fetch()` directly.  These are primary migration targets.

---

## Shared Service: `formatters`

### Legacy State

Multiple utility files provide formatting:
- `src/utils/dateFormat.js` — date formatting
- `src/utils/formatters.js` — general formatting
- `src/utils/money.js` — currency formatting
- `src/utils/textCase.js` — text case conversion
- `src/utils/reference.js` — reference number generation

### What Must Change

- Consolidate all formatting into a single `formatters` shared service
- Ensure currency formatting can handle multiple currencies (multi-tenant may have different currencies)
- `reference.js` generates reference numbers using entity type, date, and sequence — this is formatting logic but may also be domain logic (who controls the reference format?).  Pending OQ-024.

---

## Shared Service: `lookups`

### Legacy State

Reference data is stored as JSON files in `src/data/`:
- `countries.json`, `riskCodes.json`, `taxTable.json`, `classRiskCodeMap.json`, etc.

The `useSectionLookups.js` hook and `src/context/lookups/` provide access to this data.

### What Must Change

- Move all JSON reference data to `shared/lookups/data/`
- Replace direct JSON imports with calls to the lookups shared service
- Some lookups (e.g. products, rating rules) are tenant-specific — these should come from the API, not static files

---

## Shared Service: `auth-session`

### Legacy State

`src/context/userContext.jsx` stores the user and token in `localStorage` and exposes them via React Context.

### Key Issues

- `localStorage` access is scattered across the codebase
- The `legacyUser` compatibility map creates aliases that make it unclear what the true user object shape is
- No token expiry checking or refresh logic

### What Must Change

- Single, clean user object shape (no aliases)
- Token management centralised in the auth-session service
- Consumers must all update to use the new user object fields

### Migration Blocker

Before migrating `userContext.jsx`, all consumers of `useUser()` must be identified and their field usage documented.  This prevents silent breaking changes.

> **Open question OQ-021:** Run a scan of all `useUser()` consumers and list every field they access.

---

## Shared Service: `design-tokens`

### Legacy State

`src/styles/brandColors.js` and `src/styles/global.css` hold the design token system.  It is well-structured but:
- Lives in `src/styles/` (not in a shared service location)
- Competing `:root` blocks in `Sidebar.css` and `NavbarInternal.css` override tokens
- ~160 JSX files use bare Tailwind classes instead of `brandClasses` tokens

### What Must Change

- Move token files to `shared/design-tokens/`
- Fix the competing `:root` blocks (Priority 1 colour debt)
- Migrate colour debt file by file during domain rebuilds
