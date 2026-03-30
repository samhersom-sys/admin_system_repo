# PROJECT DOCUMENTATION — 04: SHARED SERVICE DEFINITIONS

This document defines each shared service in the new architecture.  Shared services are domain-agnostic capabilities used across domains, workflows, and pages.

---

## Rules for All Shared Services (Summary)

- Never import from any domain
- Accept all domain data as parameters — never fetch it themselves
- Accept tenant context (`orgCode`) at every entry point
- Expose a stable, documented interface
- Have their own requirements file, test file, and implementation file

---

## Shared Service: `event-bus`

**Purpose:** Enable decoupled communication between domains through a publish/subscribe mechanism.

**Provides:**
- `publish(event: PolicyForgeEvent): void`
- `subscribe(eventName: string, handler: Function): void`
- `unsubscribe(eventName: string, handler: Function): void`

**Tenant awareness:** Each published event carries `orgCode` in its envelope.

**Notes:** See `AI Guidelines/08-Event-Driven-Communication.md` for event naming conventions and structure.

**Legacy equivalent:** There is no event bus in the legacy codebase.  Context providers (React Context) act as implicit event channels, but they are not decoupled.

---

## Shared Service: `permissions`

**Purpose:** Evaluate whether a user has permission to perform a specific action.

**Provides:**
- `can(action: string, user: UserContext): boolean`
- `canForTenant(action: string, user: UserContext, orgCode: string): boolean`

**Tenant awareness:** Permissions are evaluated within the tenant context.  Different roles may have different permissions per tenant.

**Key permission actions (initial list — to be expanded):**
- `submission.assign`
- `submission.decline`
- `quote.create`
- `quote.accept`
- `policy.bind`
- `policy.endorse`
- `claim.create`
- `settings.manage`
- `finance.view`
- `reporting.create`
- `admin.manage-users`

**Legacy equivalent:** No permissions middleware exists in the legacy codebase.  `RequireAuth.jsx` checks for authentication only.  Role-based logic is scattered in component-level checks.

**Open questions:**
- OQ-008: What is the full permission matrix per role?  This must be defined before the permissions service can be built.

---

## Shared Service: `notifications`

**Purpose:** Create, persist, and deliver user notifications.

**Provides:**
- `addNotification(message, type, options, tenantContext): Notification`
- `listNotifications(userId, orgCode): Notification[]`
- `markRead(notificationId, tenantContext): void`
- `clearNotification(notificationId, tenantContext): void`

**Tenant awareness:** Notifications are scoped to `orgCode` and `userId`.

**Legacy equivalent:** `src/context/notificationContext.jsx` — currently implemented as a React Context with direct API calls.  Needs to be extracted to a shared service with a clean interface.

---

## Shared Service: `audit`

**Purpose:** Record an immutable log of every change to any entity in the system.

**Provides:**
- `recordChange(entityType, entityId, fieldChanges, callerContext): AuditEntry`
- `getHistory(entityType, entityId, tenantContext): AuditEntry[]`

**Tenant awareness:** Audit entries are scoped to `orgCode`.

**Legacy equivalent:** `src/hooks/useAudit.js` — a React hook calling the audit API.  Also `src/components/common/AuditTable.jsx`.

---

## Shared Service: `auth-session`

**Purpose:** Validate session tokens and provide the current user's identity and tenant context.

**Provides:**
- `validateToken(token: string): UserContext | null`
- `getCurrentUser(): UserContext`
- `isAuthenticated(): boolean`

**Tenant awareness:** Returns `orgCode` as part of the user context.

**Legacy equivalent:** `src/context/userContext.jsx` — React Context storing user and token in `localStorage`.  JWT validation is implicit (token presence assumed to mean valid).

---

## Shared Service: `api-client`

**Purpose:** Provide a standardised, safe HTTP fetch wrapper for all API calls.

**Provides:**
- `fetchJson(url, options, tenantContext): Promise<T>`
- `apiUrl(path): string` — builds the correct API base URL for the environment

**Tenant awareness:** Automatically attaches auth token (containing `orgCode`) to every request.

**Legacy equivalent:** `src/utils/apiBase.js` — `safeJson`, `fetchJson`, `apiUrl` functions.  Used inconsistently across the codebase.  Some pages still use raw `fetch()` directly.

---

## Shared Service: `formatters`

**Purpose:** Provide consistent formatting for currency, dates, and text.

**Provides:**
- `formatCurrency(amount, currency): string`
- `formatDate(date, format): string`
- `formatReference(entityType, orgCode, date, sequence): string`
- `toTitleCase(text): string`
- `toUpperCaseFirst(text): string`

**Tenant awareness:** Currency formatting may be tenant-specific (e.g. USD vs GBP).

**Legacy equivalent:**
- `src/utils/dateFormat.js`
- `src/utils/formatters.js`
- `src/utils/textCase.js`
- `src/utils/money.js`
- `src/utils/reference.js`

---

## Shared Service: `lookups`

**Purpose:** Provide access to reference data used across domains.

**Provides:**
- `getCountries(): Country[]`
- `getRiskCodes(): RiskCode[]`
- `getSicCodes(country): SicCode[]`
- `getTaxTable(): TaxRate[]`
- `getRegionsByCountry(country): Region[]`

**Tenant awareness:** Some lookup data may be tenant-specific (e.g. products, rating rules).  Standard lookups are platform-wide.

**Legacy equivalent:**
- `src/data/countries.json`
- `src/data/riskCodes.json`
- `src/data/taxTable.json`
- `src/data/classRiskCodeMap.json`
- etc.
- `src/hooks/useSectionLookups.js`
- `src/context/lookups/` (to be confirmed)

---

## Shared Service: `pdf-generator`

**Purpose:** Generate PDF documents from structured data and templates.

**Provides:**
- `generateDocument(templateName, data, tenantContext): Buffer`

**Tenant awareness:** Document templates may be tenant-specific.

**Legacy equivalent:** `backend/document-generator.js`

---

## Shared Service: `email-scheduler`

**Purpose:** Send scheduled or triggered emails, and monitor inboxes for incoming submissions.

**Provides:**
- `scheduleEmail(to, subject, body, scheduledAt, tenantContext): void`
- `monitorInbox(config): void` — runs the email intake loop

**Legacy equivalent:** `backend/email-scheduler.js`

---

## Shared Service: `design-tokens`

**Purpose:** Provide the canonical colour and design token system for all UI components.

**Provides:**
- `brandColors` — JS token object
- `brandClasses` — Tailwind class strings
- CSS custom properties via `global.css`

**Legacy equivalent:**
- `src/styles/brandColors.js`
- `src/styles/global.css`

See `AI Guidelines/07-Brand-Colour-Standards.md` for full rules.

---

## Shared Service: `rating-engine`

**Purpose:** Calculate premiums for quote coverages based on rating tables and location data.

**Provides:**
- `calculatePremium(coverageData, ratingContext, tenantContext): PremiumResult`

**Tenant awareness:** Rating rules are tenant-configurable.

**Legacy equivalent:**
- `backend/rating-api.js`
- `src/utils/locationsScheduleApi.js`
- `backend/create-rating-tables.js` (seeding)
