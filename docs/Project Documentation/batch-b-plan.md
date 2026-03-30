# Batch B — Implementation Plan
**Started:** 2026-04-01  
**Status:** 🔶 In progress  
**References:** [reconstruction-gap-analysis.md](reconstruction-gap-analysis.md) §4.4–4.5  
**Guideline:** Three-Artifact Rule — Requirements → Tests → Code  

---

## Overview

Batch B covers the **Parties domain view page** (PartyViewPage) and closes out the **Search domain** (already fully implemented — no code work needed). The only Batch B code work is:

| ID | Area | Status |
|----|------|--------|
| B1 | PartyViewPage (FE + BE) | ❌ Not started |
| B2 | Search Polish | ✅ Already complete |

---

## B1 — PartyViewPage

**Status: ❌ Not started**

Full requirements: `reconstruction-gap-analysis.md` §4.4

---

### Delivery Sequence

**Step 1: Fix PartyListPage test wrapper (quick win)**  
Before implementing any new code, fix the pre-existing `PartyListPage.test.tsx` failure caused by missing `NotificationProvider` in the render wrapper. This unlocks a green baseline for parties test files.

**Step 2: BE — parties controller `:id` routes**  
Add the following to `backend/nest/src/parties/parties.controller.ts` (and `parties.service.ts`):  
1. `GET /api/parties/:id` (REQ-PAR-BE-F-010)  
2. `PUT /api/parties/:id` (REQ-PAR-BE-F-011)  
3. `GET /api/parties/:id/entities` (REQ-PAR-BE-F-012a)  
4. `POST /api/parties/:id/entities` (REQ-PAR-BE-F-012b)  
5. `PUT /api/parties/:id/entities/:entityId` (REQ-PAR-BE-F-012c)  
6. `DELETE /api/parties/:id/entities/:entityId` (REQ-PAR-BE-F-012d)  
7. `GET /api/parties/:id/audit` (REQ-PAR-BE-F-013a)  
8. `POST /api/parties/:id/audit` (REQ-PAR-BE-F-013b)  
9. `GET /api/parties/:id/submissions` (REQ-PAR-BE-F-014)  
10. `GET /api/parties/:id/quotes` (REQ-PAR-BE-F-015)  

> **DB note:** No migrations needed. `party` table (migrations 002+004) and `party_entities` table (migration 063) already have all required columns.  
> `party_entities` schema: `id, party_id (FK→party.id CASCADE), name, reference, entity_code, entity_type (DEFAULT 'Syndicate'), notes, active BOOLEAN (DEFAULT TRUE), created_at, updated_at`

**Step 3: FE — PartyViewPage**  
Create `frontend/src/parties/PartyViewPage/PartyViewPage.tsx`.  
Structure (following established page patterns e.g. `QuoteViewPage`, `SubmissionViewPage`):

```
PartyViewPage/
  PartyViewPage.tsx        ← main page, tabs, on-mount audit POST
  PartyDetails.tsx         ← Details tab: FieldGroups (Core Info, Address, Classification, Workforce)
  PartyEntities.tsx        ← Entities tab: ResizableGrid + inline row edit
  PartyAudit.tsx           ← Audit tab: AuditTable
  PartySubmissions.tsx     ← Submissions tab: ResizableGrid (lazy)
  PartyQuotes.tsx          ← Quotes tab: ResizableGrid (lazy)
  index.ts                 ← barrel export
```

Key behaviours:
- Six tabs: **Details, Submissions, Quotes, Policies, Claims, Entities, Audit**
- Details tab read-only by default; edit mode activates all fields; validate before PUT
- Required fields: Name, Type (Role), Address Line 1, Country — inline errors before API call
- SIC Standard toggle drives SIC Code + SIC Description SearchableSelect option lists
- Entities tab: `ResizableGrid`, inline row edit (Edit icon per row, Save/Cancel per row), `+ Add Entity` appends blank editable row
- On mount: POST `{ action: 'Party Opened', entityType: 'Party', entityId: id }` to audit
- Policies tab + Claims tab: "coming soon" placeholder

**Step 4: Router wiring**  
Register `/parties/:id` → `<PartyViewPage>` in the application router. Ensure `/parties/new` still maps to `<CreatePartyPage>` and is matched before the `:id` wildcard.

**Step 5: SearchResults navigation URL**  
Update `recordUrl()` in `frontend/src/search/SearchResults.tsx`:  
- `case 'Party'`: return `` `/parties/${id}` ``  
(This auto-closes the last party-navigation gap in the Search domain.)

---

### Requirements Traceability

| REQ ID | Description | Tests | Code |
|--------|-------------|-------|------|
| REQ-PAR-FE-F-020 | PartyViewPage at `/parties/:id`, GET on mount, 404 redirect | T-PAR-FE-NF-R20 | ❌ |
| REQ-PAR-FE-F-021 | Sidebar: Back, Edit, Save, Cancel | T-PAR-FE-NF-R21 | ❌ |
| REQ-PAR-FE-F-022 | TabsNav with 6 tabs | T-PAR-FE-NF-R22 | ❌ |
| REQ-PAR-FE-F-023 | Details tab field groups (Core Info, Address, Classification, Workforce) | T-PAR-FE-NF-R23 | ❌ |
| REQ-PAR-FE-F-024 | Edit/Save/Cancel behaviour | T-PAR-FE-NF-R24 | ❌ |
| REQ-PAR-FE-F-024a | Validation before PUT (4 required fields) | T-PAR-FE-NF-R24a | ❌ |
| REQ-PAR-FE-F-025 | Entities tab (ResizableGrid, inline edit, CRUD) | T-PAR-FE-NF-R25 | ❌ |
| REQ-PAR-FE-F-026 | Audit tab + Party Opened POST on mount | T-PAR-FE-NF-R26 | ❌ |
| REQ-PAR-FE-F-027 | PartyListPage row link + test wrapper fix | T-PAR-FE-NF-R27 | ❌ |
| REQ-PAR-FE-F-028 | Router at `/parties/:id` | T-PAR-FE-NF-R28 | ❌ |
| REQ-PAR-FE-F-029 | Submissions tab (lazy, ResizableGrid) | T-PAR-FE-NF-R29 | ❌ |
| REQ-PAR-FE-F-030 | Quotes tab (lazy, ResizableGrid) | T-PAR-FE-NF-R30 | ❌ |
| REQ-PAR-FE-F-031 | Policies + Claims tabs placeholder | T-PAR-FE-NF-R31 | ❌ |
| REQ-PAR-BE-F-010 | GET /api/parties/:id | T-PAR-BE-NE-R10a/b | ❌ |
| REQ-PAR-BE-F-011 | PUT /api/parties/:id | T-PAR-BE-NE-R11a/b/c | ❌ |
| REQ-PAR-BE-F-012a | GET /api/parties/:id/entities | T-PAR-BE-NE-R12a | ❌ |
| REQ-PAR-BE-F-012b | POST /api/parties/:id/entities | T-PAR-BE-NE-R12b/bc | ❌ |
| REQ-PAR-BE-F-012c | PUT /api/parties/:id/entities/:entityId | T-PAR-BE-NE-R12c | ❌ |
| REQ-PAR-BE-F-012d | DELETE /api/parties/:id/entities/:entityId | T-PAR-BE-NE-R12d | ❌ |
| REQ-PAR-BE-F-013a | GET /api/parties/:id/audit | T-PAR-BE-NE-R13a | ❌ |
| REQ-PAR-BE-F-013b | POST /api/parties/:id/audit | T-PAR-BE-NE-R13b | ❌ |
| REQ-PAR-BE-F-014 | GET /api/parties/:id/submissions | T-PAR-BE-NE-R14 | ❌ |
| REQ-PAR-BE-F-015 | GET /api/parties/:id/quotes | T-PAR-BE-NE-R15 | ❌ |

---

### Test Plan

#### Backend tests (to be added to `backend/nest/src/parties/parties.spec.ts`)

| Test ID | Scenario |
|---------|----------|
| T-PAR-BE-NE-R10a | GET /api/parties/:id returns full party record for matching orgCode |
| T-PAR-BE-NE-R10b | GET /api/parties/:id returns 404 when id does not exist or wrong orgCode |
| T-PAR-BE-NE-R11a | PUT /api/parties/:id updates provided fields and returns updated record |
| T-PAR-BE-NE-R11b | PUT /api/parties/:id returns 404 when party not found |
| T-PAR-BE-NE-R11c | PUT /api/parties/:id does not update orgCode even if supplied in body |
| T-PAR-BE-NE-R12a | GET /api/parties/:id/entities returns only active=true rows, ordered by name ASC |
| T-PAR-BE-NE-R12b | POST /api/parties/:id/entities creates entity with defaults (entity_type='Syndicate') |
| T-PAR-BE-NE-R12bc | POST /api/parties/:id/entities returns 400 when name is absent |
| T-PAR-BE-NE-R12c | PUT /api/parties/:id/entities/:entityId updates entity fields |
| T-PAR-BE-NE-R12d | DELETE /api/parties/:id/entities/:entityId sets active=false (soft delete), returns 204 |
| T-PAR-BE-NE-R13a | GET /api/parties/:id/audit returns audit events ordered by created_at DESC |
| T-PAR-BE-NE-R13b | POST /api/parties/:id/audit writes audit event |
| T-PAR-BE-NE-R14 | GET /api/parties/:id/submissions returns submissions linked to party's name |
| T-PAR-BE-NE-R15 | GET /api/parties/:id/quotes returns quotes linked to party's submissions |

#### Frontend tests (to be added to `frontend/src/parties/PartyViewPage/PartyViewPage.test.tsx`)

| Test ID | Scenario |
|---------|----------|
| T-PAR-FE-NF-R20 | Renders party detail on mount via GET /api/parties/:id |
| T-PAR-FE-NF-R21 | Sidebar shows Back/Edit in read-only mode, Save/Cancel in edit mode |
| T-PAR-FE-NF-R22 | All 6 tabs are visible |
| T-PAR-FE-NF-R23 | Details tab displays Core Info, Address, Classification, Workforce field groups |
| T-PAR-FE-NF-R24 | Clicking Edit makes fields editable; Save calls PUT; Cancel reverts |
| T-PAR-FE-NF-R24a | Save blocked with inline errors when required fields are blank |
| T-PAR-FE-NF-R25 | Entities tab shows grid with Name/Type/Code/Reference/Notes; edit icon activates inline edit |
| T-PAR-FE-NF-R26 | Party Opened audit POST fires on mount |
| T-PAR-FE-NF-R27 | PartyListPage row link navigates to /parties/:id |
| T-PAR-FE-NF-R28 | Router resolves /parties/:id to PartyViewPage |
| T-PAR-FE-NF-R29 | Submissions tab loads GET /api/parties/:id/submissions on first visit |
| T-PAR-FE-NF-R30 | Quotes tab loads GET /api/parties/:id/quotes on first visit |
| T-PAR-FE-NF-R31 | Policies tab and Claims tab show "coming soon" placeholder text |

---

## B2 — Search Polish

**Status: ✅ ALREADY COMPLETE**

`frontend/src/search/index.tsx` (SearchPage), `SearchForm.tsx`, and `SearchResults.tsx` are fully implemented in the cleaned project. Debounce, entity type filter, `ResizableGrid`, pagination, and sort all work.

**Remaining gap (auto-resolves per later batch):** `recordUrl()` in `SearchResults.tsx` returns `null` for Party, Policy, BindingAuthority, and Claim — because those view pages do not exist yet.

- Party navigation URL → resolved by B1 Step 5 above
- Policy → Batch D
- BindingAuthority → Batch H
- Claim → Batch E

No standalone work item is needed for B2.

---

## Test Status Baseline (entering Batch B)

| Suite | Result |
|-------|--------|
| BE NestJS full suite (`npm test` in `backend/nest`) | 68/68 ✅ |
| FE full suite (`npm test` in `frontend`) | 641/671 — 25 pre-existing failures unrelated to our work + 5 PartyListPage failures (NotificationProvider missing) |

Target on Batch B completion: **686+/686+ BE**, **675+/675 FE** (PartyListPage fix + new PartyViewPage tests).
