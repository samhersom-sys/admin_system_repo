# Policy Forge — Project ToDo List

> **Current Focus:** Phase 1 — Manual Review (Rating Profiles pages)

---

## Phase Overview

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Rating Rules / Rating Profiles — implementation (22 tests, F-001–F-016) | ✅ Complete |
| Phase 1 — Manual Review | Browser review of Rating Profiles pages (F-017–F-031) | 🔄 In Progress |
| Phase 2 | BA Section Rating Configuration tab (199 tests) | ✅ Implementation complete |
| Phase 2 — Manual Review | Browser review of BA Section Rating Configuration | ⬜ Pending |
| Phase 3 | Locations Schedule Tab (30 tests) | ✅ Implementation complete |
| Phase 3 — Manual Review | Browser review of Locations Schedule Tab | ⬜ Pending |
| Phase 4 | Group-based rule editor (F-024–F-031) | ✅ Implementation complete |
| Phase 4b | Deferred items (Versions tab, Conflicting Schedules, Coverage Detail selects) | ⬜ Not started |

---

## Phase 1 — Manual Review Tasks

> **Status: 🔄 In Progress**
> All implementation done. Tests confirmed: 40/40 passing.

### Completed fixes from browser review:
- [x] **F-017** — Open records via magnifying glass (FiSearch), not row click
- [x] **F-018** — Unsaved warning in notification panel (not inline banner), `warning` type with stable ID `rating-unsaved`
- [x] **F-019** — Schedule ID column in list table
- [x] **F-020** — Schedule ID shown in detail metadata card
- [x] **F-021** — Title format: `"Rating Profile: {name}"`
- [x] **F-022** — Removed in-page back arrow (sidebar Back handles navigation)
- [x] **F-023** — Save is sidebar-only; no page-level Save button
- [x] **F-024–F-031** — Group-based rule editor (groups, conditions, field/operator dropdowns, IF/AND/OR logic, CRUD, ordering)
- [x] `useBlocker` for React Router navigation guard (in addition to `beforeunload`)
- [x] Sortable columns in Rating Profiles list (Name, Effective From, Effective To, Status)
- [x] Page header: `"Rating Profiles"`
- [x] Sidebar section title: `"Rating Rules"`
- [x] Terminology rename: Rating Schedule → Rating Profile throughout

### Remaining manual review:
- [ ] Open app in browser and visually verify Rating Profiles list page
- [ ] Visually verify Rating Profile detail page (group editor, IF/AND/OR, dropdowns)
- [ ] Verify notification toast appears and clears correctly
- [ ] Verify `useBlocker` fires on React Router navigation when unsaved changes exist
- [ ] Verify sidebar Save triggers PUT correctly

---

## Phase 2 — Manual Review (⬜ Pending)

> **Note: We still need to check Phase 2 in the browser.**

### BA Section Rating Configuration tab — checklist:
- [ ] "Rating Configuration" tab visible in BA Section view
- [ ] Lazy load — API not called until tab clicked
- [ ] Table: Schedule Name, Effective From, Effective To, Status badge, Rules Count, View Schedule link
- [ ] Active/Inactive badge colours correct
- [ ] "View Schedule" link → `/settings/rating-rules/:id`
- [ ] Empty state message shown when no schedules
- [ ] Error notification shown on API failure

---

## Phase 3 — Manual Review (⬜ Pending)

> **Note: We still need to check Phase 3 in the browser.**

### Locations Schedule Tab — checklist:
- [ ] Tab loads with location rows
- [ ] CSV import dialog opens and accepts file
- [ ] Version selector dropdown functions correctly
- [ ] Inline add / edit / delete rows work
- [ ] "Previously Included" sub-tab shows correct data

---

## Phase 4b — Deferred Items (⬜ Not started)

- [ ] Versions tab on Rating Profile detail
- [ ] Conflicting Schedules tab on Rating Profile detail
- [ ] Coverage Detail special selects (linked sub-type dropdown)

---

## Test Status

| Test Suite | Tests | Status |
|------------|-------|--------|
| RatingRulesPage (Phase 1 + 4) | 40/40 | ✅ Passing |
| BASectionRatingConfiguration (Phase 2) | 199 | ✅ Passing (prior session) |
| LocationsScheduleTab (Phase 3) | 30 | ✅ Passing (prior session) |

### Run tests:
```powershell
# From: c:\Users\samhe\OneDrive\Desktop\Cleaned\frontend
npx jest --testPathPattern=RatingRulesPage --no-coverage
npx jest --testPathPattern=BASectionRating --no-coverage
npx jest --testPathPattern=LocationsScheduleTab --no-coverage
```

---

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/settings/RatingRulesPage.tsx` | Rating Profiles list page |
| `frontend/src/settings/RatingRulesDetailPage.tsx` | Rating Profile detail + group-based rule editor |
| `frontend/src/settings/settings.service.ts` | API service, types, `FIELD_OPTIONS`, `OPERATOR_OPTIONS` |
| `frontend/src/settings/settings.requirements.md` | Requirements traceability F-001–F-031 |
| `frontend/src/settings/__tests__/RatingRulesPage.test.tsx` | All 40 unit tests (R01–R30) |
