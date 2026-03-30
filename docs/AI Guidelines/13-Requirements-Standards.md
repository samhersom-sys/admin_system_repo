# AI Guideline 13 — Requirements Writing Standards

**Applies to:** All `.requirements.md` files in this codebase  
**When to read this:** Before creating any new requirements file, or before editing an existing one  
**Authority:** Adopted 2026-03-11. All new requirements must follow this standard from this date.

---

## 1. Purpose and Principles

Requirements are the contract between what is agreed and what is built. A poorly written requirement can be interpreted in multiple ways, cannot be tested, and cannot be traced. A well-written requirement has exactly one meaning. Anyone — developer, tester, product owner, or future AI agent — can read it and know precisely what to verify without asking any clarifying questions.

Every requirement must satisfy the SMART criteria:

| Criterion | Definition |
|-----------|------------|
| **Specific** | Describes exactly one behaviour. No compound "and/or" statements. No ambiguity. |
| **Measurable** | Has a pass/fail condition a test can verify objectively. |
| **Attainable** | Technically achievable within the current architecture. |
| **Reasonable** | Contributes to a business outcome or user need. Can be justified if challenged. |
| **Traceable** | Has a unique ID that appears in the test file verifying it. |

---

## 2. Requirement Format

Every requirement must follow the pattern:

> **Actor** `shall` **[action]** **[object]** **[constraint / condition]**

**Examples:**

✅ `REQ-AUTH-F-001: The LoginPage component shall redirect the user to /app-home without rendering the login form when a valid authenticated session exists at the time the page is rendered.`

✅ `REQ-AUTH-S-001: The authentication middleware shall return HTTP 403 when the tokenVersion value in the JWT payload does not match the token_version column for that user in the database.`

✅ `REQ-API-CLIENT-F-001: The api-client module shall attach an Authorization: Bearer <token> header to every outgoing HTTP request when a session token is present in the auth-session store.`

**Not requirements — anti-patterns to avoid:**

❌ `Section 2.7 — Session Handling` — (a section heading, not a verifiable statement)  
❌ `The token is stored by the auth-session service.` — (describes a design decision; no actor, no "shall", no constraint)  
❌ `R01 — Happy path` — (not atomic; no ID, no actor, no testable condition)  
❌ `Should display loading spinner` — (ambiguous modal verb; no actor; not traceable to a test)

---

## 3. Modal Vocabulary

| Word | Meaning | When to use |
|------|---------|-------------|
| `shall` | **Mandatory** — must be implemented and must have a passing test | All functional, security, and constraint requirements |
| `should` | **Recommended** — expected unless a documented exception exists | Usability or accessibility guidance where a justified deviation is acceptable |
| `may` | **Optional / permitted** — not grounds for failing a test | Optional features or caller-discretion behaviours |

Do not use "must", "will", "needs to", "is required to", or "should" as synonyms for "shall". Use each word only as defined above.

---

## 4. Requirement ID Format

Every requirement must have a unique ID in the format:

> `REQ-{DOMAIN}-{TYPE}-{NNN}`

### 4.1 Domain Codes

| Domain | Code |
|--------|------|
| Auth frontend pages (login, logout, password reset) | `AUTH` |
| Auth backend routes (`backend/routes/auth.js`) | `AUTH-BE` |
| Submissions domain module | `SUB-DOM` |
| Submissions backend routes | `SUB-BE` |
| Submissions list page | `SUB-LIST` |
| New Submission page | `SUB-NEW` |
| Submission View/Edit page | `SUB-VIEW` |
| Parties domain module | `PAR-DOM` |
| Parties backend routes | `PAR-BE` |
| api-client lib | `API-CLIENT` |
| auth-session lib | `AUTH-SES` |
| permissions lib | `PERM` |
| notifications lib service | `NOTIF-SVC` |
| NotificationDock component | `NOTIF-DOCK` |
| logger lib | `LOG` |
| formatters lib | `FMT` |
| design-tokens lib | `TOKENS` |
| AppLayout | `LAYOUT` |
| Sidebar | `SIDEBAR` |
| Home dashboard | `HOME` |
| Workflow page | `WORKFLOW` |
| Search page | `SEARCH` |
| Profile page | `PROFILE` |
| Finance page | `FINANCE` |
| Quotes page | `QUOTES-PG` |
| Settings page | `SETTINGS` |
| Policies page | `POLICIES-PG` |
| Binding Authorities page | `BA-PG` |
| Reports page | `REPORTS` |
| Website pages (marketing site, `website/`) | `WEB` |
| ResizableGrid component + useResizableColumns hook | `SHARED-GRID` |
| FieldGroup shared component | `SHARED-FG` |
| TabsNav shared component | `SHARED-TABS` |
| AuditTable component + useAudit hook | `SHARED-AUDIT` |

New domains must be assigned a code in this table before requirements for that domain are written.

### 4.2 Type Codes

| Code | Type | Description |
|------|------|-------------|
| `F` | Functional | Observable system behaviour — what the system does |
| `S` | Security | Authentication, authorisation, data protection, audit trail |
| `NF` | Non-Functional | Performance, reliability, usability, accessibility |
| `C` | Constraint | Architectural or technology rule — how the system must be built |

### 4.3 Sequence Numbers

- Start at `001` per domain-type combination.
- Numbers are never reused.
- When a requirement is deleted or superseded, mark it `[DELETED — YYYY-MM-DD: reason]` and retain the line so the ID cannot be recycled.

---

## 5. Rules

1. **One behaviour per requirement.** A single REQ-ID must not describe two distinct behaviours. If writing the requirement naturally requires the word "and", split it into two requirements.

2. **No duplicates.** If two requirements express the same behaviour in different words, consolidate them and mark the removed one as `[DELETED]`.

3. **No conflicts.** Requirements within the same file and across files must not contradict each other. If a conflict is discovered, resolve it before any test or code is written.

4. **Plain English.** A developer or tester with no prior context must be able to write a passing test for the requirement after reading it once, without asking any clarifying questions.

5. **Active voice.** "The system shall display..." — not "An error message shall be displayed by the system...".

6. **No implementation detail in functional requirements.** Functional requirements state *what* the system must do, not *how*. If an architectural approach is mandated (e.g. "must use the api-client shared service"), write a Constraint (`C`) requirement.

7. **Design notes are not requirements.** User flow diagrams, wireframe descriptions, and property tables belong in the **Design Notes** appendix of the same file — not in the requirements list. Their presence in the requirements list prevents testing because they cannot be made pass/fail statements.

---

## 6. Required Sections in Every Requirements File

Every `.requirements.md` file must contain the following sections, in this order:

| # | Section | Purpose |
|---|---------|---------|
| 1 | **File header** | Title, domain code, file location, status, link to test file |
| 2 | **Scope** | In scope and explicitly out of scope — bullet form, brief |
| 3 | **Impact Analysis** | Mandatory three-part coverage of all side-effects (see §6.1) |
| 4 | **Requirements** | All atomic REQ statements with IDs |
| 5 | **Traceability table** | Every REQ-ID mapped to the test file and test ID that verifies it |
| 6 | **Open questions** | Unresolved decisions blocking completeness, using `OQ-{NNN}` IDs |
| 7 | **Change log** | One line per date a requirement was added, changed, or deleted |
| 8 | **Design notes** (if needed) | Non-requirement context: flows, field tables, API response shapes |

**Stub files** (pages pending full implementation) are exempt from sections 4–5 until implementation begins, but must carry all other sections and must reference this guideline.

---

### 6.1 Impact Analysis — Mandatory Three-Part Section

The **Impact Analysis** section must appear in every requirements file — whether writing new requirements, implementing a feature, or changing existing requirements. It summarises side-effects across all three layers of the stack, so that nothing is overlooked and every change is intentional.

```markdown
## Impact Analysis

### UI / Front-End Impact
<!-- Which screens, components, or layouts are added, changed, or removed?
     Include component paths (e.g. frontend/src/parties/PartyListPage/PartyListPage.tsx).
     State "None" if there are no UI changes. -->

### API Impact
<!-- Which endpoints are added, changed, or deprecated?
     For each: Method, Path, what changes (request/response shape, auth, error codes).
     State "None" if there are no API changes. -->

### Database Impact
<!-- Which tables or columns are added, altered, or removed?
     Reference the migration number (e.g. db/migrations/004-...).
     State "None" if there are no schema changes. -->
```

**Rules:**
- All three subsections are required. Write "None" if a layer is unaffected — never omit the subsection.
- When a requirement changes, the Impact Analysis must be updated in the same commit/PR.
- New migrations referenced here must exist in `db/migrations/` before the requirements file may be marked **Agreed — ready for code**.
- API changes must be defined in the API contract (Guideline 09 §3) before the Impact Analysis is written.

---

## 7. Traceability Table Format

```
| Requirement ID   | Test file                                      | Test ID(s)                          |
|------------------|------------------------------------------------|-------------------------------------|
| REQ-AUTH-F-001   | frontend/src/auth/__tests__/auth.test.tsx      | T-AUTH-LOGIN-R2                     |
| REQ-AUTH-F-002   | frontend/src/auth/__tests__/auth.test.tsx      | T-AUTH-LOGIN-R1                     |
| REQ-AUTH-S-001   | backend/__tests__/auth.test.js                 | T-BE-AUTH-R08a                      |
```

- Every `shall` requirement must appear in this table.
- A requirement with no test yet must list `pending` as the test ID. Writing the test is the next immediate step.
- Multiple test IDs for one requirement are comma-separated in the same row.

---

## 8.  Domain Codes — Quotes

The following codes are added to the §4.1 table for the Quotes domain:

| Domain | Code |
|--------|------|
| Quotes backend routes (Express) | `QUO-BE` |
| Quotes backend NestJS module | `QUO-BE-NE` |
| Quotes list page | `QUO-LIST` |
| New Quote page | `QUO-NEW` |
| Quote view/edit page | `QUO-VIEW` |
| Quote sections sub-domain | `QUO-SEC` |
| Quote coverages sub-domain | `QUO-COV` |

---

## 9.  Backup Source Analysis (Mandatory — Guideline §1.17)

When requirements are written for a domain that has an existing implementation in `policy-forge-chat (BackUp)/`, the requirements file must additionally contain a **Backup Coverage Map** section immediately before the Requirements section.

### 9.1  Required format

```markdown
## Backup Coverage Map

Sources read:
- `src/layouts/AppLayout/AppLayoutPages/{Domain}/ComponentA.jsx`
- `src/layouts/AppLayout/AppLayoutPages/{Domain}/ComponentB.jsx`
- (list every file read from the BackUp for this domain)

| # | BackUp Feature / Field / Behaviour | Requirement ID | Status |
|---|-------------------------------------|----------------|--------|
| 1 | Quote header fields (insured, submission link, dates, currency) | REQ-QUO-...-001 | COVERED |
| 2 | Business Type select (Insurance / Reinsurance) | REQ-QUO-...-002 | COVERED |
| 3 | Broker tab (placing broker ID + name lookup) | pending | DEFERRED — Block 3 |
| 4 | Additional Insured tab | pending | DEFERRED — Block 3 |
| 5 | Sections tab (section list, coverages drill-down) | pending | DEFERRED — Block 4 |
| 6 | [invented by AI, not in backup] | REQ-QUO-...-010 | NEW — confirmed 2026-03-17 |
```

Status values:
- `COVERED` — A `REQ-` statement exists and is agreed.
- `DEFERRED — {reason}` — Not built in this block; must be tracked in `11-Gap-Analysis.md`.
- `REMOVED — {reason}` — Intentionally omitted from Cleaned; reason documented.
- `NEW — confirmed {date}` — Not in BackUp; user has explicitly confirmed it should be included.

### 9.2  Completeness gate

The requirements file may not be marked `Status: Agreed — ready for code` until every row in the Backup Coverage Map has a status of COVERED, DEFERRED, REMOVED, or NEW (confirmed).

A status of `pending` in the Requirement ID column means the item is uncovered and blocks agreement.

---

## 8. Quality Checklist

Before a requirements file may be marked **Status: Agreed — ready for code**, confirm:

- [ ] Every requirement uses the Actor + `shall` + Action + Object + Constraint pattern
- [ ] Every requirement has a unique `REQ-{DOMAIN}-{TYPE}-{NNN}` ID
- [ ] No two requirements express the same behaviour
- [ ] No requirements conflict with each other or with another requirements file
- [ ] Every requirement appears in the traceability table with a test ID (or `pending`)
- [ ] Design notes have been moved to the Design Notes appendix at the bottom of the file
- [ ] All open questions are listed with `OQ-{NNN}` IDs
- [ ] The change log has been updated

---

## 9. Adopting this Standard for Existing Files

Requirements files written before this guideline must be updated before implementation of their domain begins. Process:

1. Read the existing file in full.
2. Identify each verifiable behaviour and convert it to a formal `REQ-{DOMAIN}-{TYPE}-{NNN}: Actor shall...` statement.
3. Move all descriptive prose, user flows, and value tables to a **Design Notes** appendix.
4. Write the traceability table.
5. Record any open questions using `OQ-{NNN}` IDs.
6. Add a change log entry: `{date} — Reformatted per Guideline 13`.

This process routinely surfaces implicit assumptions and missing requirements — treat them as open questions and resolve them before writing tests.
