# TECHNICAL DOCUMENTATION — 11: GAP ANALYSIS

This document tracks the gaps between the Backup (`policy-forge-chat (BackUp)`) and the Cleaned rebuild.  
It is a living document — update it as gaps are closed.

**Last updated:** 2026-03-16

---

## 0. Database Layer

| Area | Status | Notes |
|---|---|---|
| Migrations (001–083) | ✅ Complete | All 83 migration files exist and are chained in `package.json db:migrate` |
| Seeds (001–023) | ✅ Complete | All 23 seed files exist, chained in `db:seed`, all have NODE_ENV guard |
| Core domain tables | ✅ Complete | users, parties, submission, quotes, policies, claims, policy_transactions, quote_sections, policy_sections, policy_coverages, binding_authorities, binding_authority_sections, binding_authority_transactions |
| Soft-delete columns | ✅ Complete | `deleted_at` added to all 10 domain tables (migrations 074–083) |
| Missing backup tables added | ✅ Complete | party_entities, ba_section_participations, quote/policy_section_participations, report_template_audits/shares, binding_authority_documents, locations, location_coverages, locations_schedule_versions, policy_location_schedule_rows (migrations 063–073) |
| Lookup tables | ✅ Complete | 27 lookup tables (migrations 027–053) |
| Rating tables | ✅ Complete | 5 rating/premium tables (migrations 054–058) |
| Stub routes with no real DB backing | None | All stubs have corresponding real tables now |

---

## 1. Backend API Coverage

| Area | Backup (approx.) | Cleaned | Status |
|---|---|---|---|
| Auth | 5 endpoints | 2 (login, me) | Partial |
| Submissions | ~8 endpoints | 6 (CRUD + submit + decline) + BE tests ✅ | Partial |
| Parties | ~14 endpoints | 2 (list + create) | Partial |
| Quotes | ~18 endpoints | None | Not started |
| Policies | ~22 endpoints | None | Not started |
| Binding Authorities | ~25 endpoints | None | Not started |
| Claims | 3 endpoints | None | Not started |
| Finance | 6 endpoints | None | Not started |
| Reporting / Dashboards | ~20 endpoints | None | Not started |
| Rating Engine | ~19 endpoints | None | Not started |
| Workflow / Clearance | ~10 endpoints | None | Not started |
| Settings / Products | ~11 endpoints | None | Not started |
| Lookups | 2 endpoints | None | Not started |
| Notifications | ~8 endpoints | None | Not started |
| Org / Hierarchy | ~12 endpoints | None | Not started |
| Field Metadata | 4 endpoints | None | Not started |
| Audit Events | 2 endpoints | None | Not started |
| Locations Schedule | 6 endpoints | None | Not started |
| Global Search | 1 endpoint | 1 (GET /api/search) | ✅ Complete |

**Total:** ~9 of 185 endpoints rebuilt. Database layer for all domains complete (tables, indexes, FKs).

---

## 2. Domain Implementations

| Domain | Cleaned state | Gap |
|---|---|---|
| `auth` | Login UI only | change-password, logout, registration |
| `submissions` | Domain logic + UI (list, new, view) + 6 BE endpoints + 22 BE tests ✅ | Audit, related quotes/policies/BAs, clearance, SubmissionTabs stubs |
| `parties` | Domain logic + InsuredSearch component | GET by ID, update, contacts, entities, audit |
| `quotes` | DB table built, stub BE route, stub FE component | BE route file, BE tests, FE list/view/new pages |
| `policies` | DB table built, stub BE route, stub FE component | BE route file, BE tests, FE list/view/new pages |
| `binding-authorities` | DB table built, stub BE route, stub FE component | BE route file, BE tests, FE list/view/new pages |
| `finance` | DB tables built, no BE route | BE route file, BE tests, FE pages |
| `reporting` | DB tables built, no BE route | BE route file, BE tests, FE pages |
| `settings` | No tables, no BE route | Full domain |
| `claims` | DB table built, no BE route, no FE | BE route file, BE tests, FE list/view pages |

**Total:** 2 of 10 domains have partial logic. All domain DB tables now exist. 8 domains need BE routes + FE.

---

## 3. Frontend Features / Pages

| Feature | Cleaned state | Gap |
|---|---|---|
| Home dashboard | Widgets exist, not wired to real data | API integration |
| Submission list + view + new | Built | — |
| Quotes | Not built | Entire quotes UI |
| Policies | Not built | Entire policies UI |
| Binding Authorities (~30 components) | Not built | Entire BA UI |
| Claims | Not built | Entire claims UI |
| Party view / contacts / entities | InsuredSearch only | Full party pages |
| Finance | Not built | Entire finance UI |
| Reporting / dashboards / widgets | Not built | Entire reporting UI |
| Workflow / clearance / data quality | Stub route only | Entire workflow UI |
| Settings | Not built | Entire settings UI |
| Global search | ✅ Built | — |
| Profile | Stub only | Implementation |
| Chat-dock (internal team messaging) | Not built | Full implementation — Teams integration aspirational |
| Locations schedule | Not built | Entire locations UI |
| Rating rules | Not built | Entire rating UI |
| External/public pages | Built | — |
| NotificationDock | Built | — |

**Total:** ~5 of 35 page areas built.

---

## 4. Infrastructure Gaps

| Item | Gap |
|---|---|
| Production Docker config | `docker-compose.prod.yml`, `Dockerfile.backend`, `nginx/` missing |
| Backend services layer | `services/` (audit, email, document, submission-extractor) all missing |
| E2E tests (Playwright) | None |
| Reference seed data | Countries, SIC codes, risk codes, tax tables not in Cleaned |
| `.gitignore` / `.dockerignore` | Missing |
| Email ingestion | Deferred — replicate vs redesign TBD |

---

## 5. Dependencies Not Yet in Cleaned

| Package | Purpose |
|---|---|
| `openai` | AI extraction |
| `pdf-lib`, `pdfjs-dist`, `pdfkit` | PDF generation/parsing |
| `imap`, `mailparser` | Email ingestion (deferred) |
| `leaflet`, `react-leaflet` | Locations map view |
| `recharts` | Charts |
| `xlsx` | Bordereau import/export |
| `@headlessui/react` | Accessible UI primitives |
| `react-toastify` | Toast notifications |
| `express-rate-limit`, `helmet` | API security hardening |

---

## 6. Summary

| Zone | Built | Remaining |
|---|---|---|
| Database tables / migrations | ✅ 83 migrations, all domain tables | — |
| Backend API endpoints | ~9 of 185 | ~176 (all domain route files) |
| Domain logic | 2 of 10 (partial) | 8 domains need BE routes + FE |
| Frontend page areas | ~6 of 35 | ~29 |
| Infrastructure | ~40% | Docker, Nginx, services layer |
| npm dependencies | ~30% | 9 packages |

---

## 7. Resolved Questions

| # | Question | Resolution | Date |
|---|---|---|---|
| 1 | Is `claims` in scope? | Yes — its own domain, confirmed in scope | 2026-03-11 |
| 2 | Is chat an AI feature? | No — internal team messaging, Teams integration aspirational | 2026-03-11 |
| 3 | Email ingestion: replicate or redesign? | Deferred — revisit when reaching that domain | 2026-03-11 |
| 4 | Formalise versioned migration runner? | Not needed — numbered idempotent scripts are correct for this dev environment | 2026-03-11 |
