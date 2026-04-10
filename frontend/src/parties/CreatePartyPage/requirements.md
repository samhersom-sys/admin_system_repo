# Create Party Page — Requirements

**Component:** `CreatePartyPage`  
**Domain:** Parties (`domains/parties/`)  
**Location:** `domains/parties/components/CreatePartyPage/`  
**Route:** `/parties/new`  
**Test file:** `domains/parties/components/CreatePartyPage/test.tsx`  
**Standard:** Written per [Guideline 13](../../../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Purpose

The Create Party Page provides a dedicated full-page form for creating a new party record. It replaces the previously inline modal on `PartyListPage`, giving the user a focused creation experience with clear navigation back to the party list.

---

## 2. Scope

**In scope:**
- Form with required fields: Name and Type
- Form with optional fields: Email, Phone, Address Line 1, City, Postcode, Country
- Client-side validation before submit
- Submitting the form via `createParty()` from the parties domain
- Navigating to `/parties` on successful save or Cancel

**Out of scope:**
- Editing an existing party (future)
- SIC codes / financial fields (future — available in DB schema)
- Auto-saving / draft state (future)

---

## 3. Requirements

### R00 — Sidebar section (Guideline 14, RULE 9)

**REQ-PAR-CREATE-R00a:** The page shall register a contextual sidebar section titled `"Party"` containing **one** item:
- **Save** — an event item that dispatches the `party:save` DOM custom event

> **Note (§14 compliance):** A "Back" item is **not** included in this section. The global sidebar Back button (present on all non-home pages) handles back navigation. Adding a domain-specific Back item would create a duplicate per issue #11 fix (2025-01-xx). See `Sidebar.tsx`: the global Back is rendered for `location.pathname !== '/app-home'`.

---

### R01 — Page structure

**REQ-PAR-CREATE-R01a:** The page shall render a heading of `"Create Party"`.

---

### R02 — Form — required fields

**REQ-PAR-CREATE-R02a:** The form shall contain a text input (`aria-label="Party name"`) for the party name.

**REQ-PAR-CREATE-R02b:** The form shall contain a select (`aria-label="Party type"`) with options: Insured, Broker, Insurer, Coverholder.

---

### R03 — Form — optional fields

**REQ-PAR-CREATE-R03a:** The form shall contain a text input (`aria-label="Address line 1"`) for the first address line.

**REQ-PAR-CREATE-R03b:** The form shall contain a text input (`aria-label="City"`) for the city.

**REQ-PAR-CREATE-R03c:** The form shall contain a text input (`aria-label="Postcode"`) for the postcode.

**REQ-PAR-CREATE-R03d:** The form shall contain a text input (`aria-label="Country"`) for the country.

**REQ-PAR-CREATE-R03e:** The form shall contain a text input (`aria-label="Email"`) for the party's email address. This field is optional.

**REQ-PAR-CREATE-R03f:** The form shall contain a text input (`aria-label="Phone"`) for the party's phone number. This field is optional.

---

### R04 — Validation

**REQ-PAR-CREATE-R04a:** Firing the `party:save` event when Name is empty shall display `"Name is required."` as a `role="alert"` and shall NOT call `createParty`.

**REQ-PAR-CREATE-R04b:** Firing the `party:save` event when Type is unselected shall display `"Type is required."` as a `role="alert"` and shall NOT call `createParty`.

---

### R05 — Submission

**REQ-PAR-CREATE-R05a:** Firing the `party:save` event with valid Name and Type shall call `createParty` with `{ name, type, orgCode, createdBy, email?, phone?, addressLine1?, city?, postcode?, country? }`, where `orgCode` and `createdBy` are sourced from the active session and all address/contact fields are included only when non-empty.

**REQ-PAR-CREATE-R05b:** On a successful `createParty` call the page shall navigate to `/parties`.

**REQ-PAR-CREATE-R05c:** If `createParty` rejects, the page shall display the error message as a `role="alert"` and shall NOT navigate away.

---

### R06 — Back navigation

**REQ-PAR-CREATE-R06a:** Back navigation is handled entirely by the sidebar Back item (REQ-PAR-CREATE-R00a). The page body shall contain no inline Cancel or Back button.

---

## 4. Traceability

| Requirement ID | Test ID |
|---|---|
| REQ-PAR-CREATE-R00a | T-PAR-CREATE-R00a |
| REQ-PAR-CREATE-R01a | T-PAR-CREATE-R01a |
| REQ-PAR-CREATE-R02a | T-PAR-CREATE-R02a (implicit render check) |
| REQ-PAR-CREATE-R02b | T-PAR-CREATE-R02b (implicit render check) |
| REQ-PAR-CREATE-R03e | T-PAR-CREATE-R03e |
| REQ-PAR-CREATE-R03f | T-PAR-CREATE-R03f |
| REQ-PAR-CREATE-R04a | T-PAR-CREATE-R04a |
| REQ-PAR-CREATE-R04b | T-PAR-CREATE-R04b |
| REQ-PAR-CREATE-R05a | T-PAR-CREATE-R05a |
| REQ-PAR-CREATE-R05b | T-PAR-CREATE-R05b |
| REQ-PAR-CREATE-R05c | T-PAR-CREATE-R05c |
| REQ-PAR-CREATE-R06a | T-PAR-CREATE-R06a (no inline buttons in page body) |

---

## 5. Dependencies

- `@/domains/parties/parties` — `createParty`
- `@/lib/auth-session` — `getSession` (provides `orgCode` and `createdBy` for create payload)
- `react-router-dom` — `useNavigate`
- `@/app/AppLayout/SidebarContext` — `useSidebarSection`, `SidebarSection` (RULE 9)
- `react-icons/fi` — `FiSave`, `FiArrowLeft` (sidebar icons)

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-07-14 | Initial requirements written — extracted from CreatePartyModal in PartyListPage |
| 2026-07-14 | Updated per Guideline 14 RULE 9: Save and Back moved to contextual sidebar section; R00 added; R01b removed; R04/R05a updated to fire event; R06 updated to note sidebar handles Back |
| 2026-03-20 | R03e (email) and R03f (phone) added per layout scan diffing BackUp PartyDetails |
| 2026-03-20 | R05a updated to include email, phone in createParty payload |
