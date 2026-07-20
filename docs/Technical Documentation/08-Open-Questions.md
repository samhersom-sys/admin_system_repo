# TECHNICAL DOCUMENTATION — 08: OPEN QUESTIONS

This is the live open questions log.  Every unresolved question about the architecture, domain boundaries, workflows, permissions, or migration approach is recorded here.

When a question is answered, the status changes from `Open` to `Answered` and the answer is recorded.  When a question is deliberately deferred, the status changes to `Deferred` with a reason.

---

## OQ-058: Coverage Defaults — Parent-Time Precedence Rule Confirmation

- **Raised:** 2026-07-10
- **Status:** Open
- **Context:** New requirements add coverage and coverage-detail `effective_time` / `expiry_time` defaults using parent-level values when present; fallback values are `00:00:00` and `23:59:59`.
- **Question:** For quote and policy coverage flows, is parent-level time inheritance mandatory whenever parent values exist, or optional per product specification?
- **Why it matters:** This determines whether server logic always overrides fallback defaults with parent times, and affects deterministic test assertions for defaulting.
- **Dependencies:** REQ-QUO-BE-NE-F-049, REQ-POL-BE-NE-F-017, REQ-QUO-FE-F-083, REQ-POL-FE-F-051.
- **Answer:** [Pending]

---

## OQ-059: Coverage Expiry Default — One-Year Basis Definition

- **Raised:** 2026-07-10
- **Status:** Open
- **Context:** Requirements specify expiry defaults to parent inception + 1 year where applicable.
- **Question:** Should "+ 1 year" be implemented as calendar-year addition (same day next year, with leap-year handling) or fixed day-count addition (365 days), and should end-of-day rounding apply when parent times are absent?
- **Why it matters:** Different methods can produce different dates around leap years and month-end boundaries, affecting quote/policy consistency.
- **Dependencies:** REQ-QUO-BE-NE-F-049, REQ-POL-BE-NE-F-017.
- **Answer:** [Pending]

---

## OQ-060: Compatibility Window Length for Mixed Client Payloads

- **Raised:** 2026-07-10
- **Status:** Open
- **Context:** The delta requires backward compatibility for payloads that omit new coverage date/time fields while supporting new clients sending them.
- **Question:** What is the mandated compatibility window duration (for example, one release cycle, 90 days, or indefinite) during which both payload shapes must be supported?
- **Why it matters:** This decision drives deprecation timelines, validation strictness, and release communication.
- **Dependencies:** REQ-QUO-BE-NE-F-054, REQ-POL-BE-NE-F-022, REQ-QUO-FE-F-087, REQ-POL-FE-F-055.
- **Answer:** [Pending]

---

## OQ-061: Rollback Safety Scope for Date/Time Migration

- **Raised:** 2026-07-10
- **Status:** Open
- **Context:** Requirements call for rollback-safe migration and non-functional rollback guarantees.
- **Question:** In rollback, should newly added coverage/coverage-detail date-time columns be dropped, retained but ignored, or retained with data archival to preserve auditability?
- **Why it matters:** The decision changes migration down behavior, data retention expectations, and operational runbooks.
- **Dependencies:** REQ-QUO-BE-NE-F-052, REQ-POL-BE-NE-F-020.
- **Answer:** [Pending]

---

## OQ-052: Earnings — Is the earning engine in scope for this ticket?

- **Raised:** 2026-06-19
- **Status:** Answered — 2026-06-19
- **Context:** The `EARN-CFG` implementation covers configuration only (pattern CRUD, rule CRUD). No service exists to read those patterns and calculate earned/unearned premium figures on a policy section.
- **Question:** Is the earning engine — the process that reads a resolved pattern and produces earned/unearned premium amounts per period — in scope for this ticket, or is this strictly configuration-only for now?
- **Why it matters:** If in scope, three tables (`earning_periods`, `earning_period_transactions` or similar), a calculation service, and reporting measures are all required. If out of scope, the current implementation is complete and the engine is a future ticket.
- **References:** `EarningsConfigPage.requirements.md` — Scope (Out of scope: "Automatic calculation of earned/unearned figures"); REQ-EARN-CFG-F-003 through F-009
- **Dependencies:** Blocks OQ-053 through OQ-057 if out of scope.
- **Answer:** Yes — in scope. The earning engine shall be built. Patterns are configured by finance/actuarial users in the Settings module. At policy section creation a user populates a defined set of attributes; the engine evaluates those attributes against the configured rules to resolve the correct pattern. A background runtime job (not an inline synchronous calculation) shall be responsible for producing the earned/unearned figures. The engine must cover all combinations — every valid combination of policy section attributes must have a pattern defined.

---

## OQ-053: Earnings — How is a pattern resolved and linked to a policy section?

- **Raised:** 2026-06-19
- **Status:** Answered — 2026-06-19
- **Context:** `earning_pattern_rules` contains selection criteria (class of business, contract type, product, include_incepted). Nothing currently evaluates those rules against a `policy_section` record and records which pattern applies. The `policy_sections` table has no `earning_pattern_id` column.
- **Question:** When and how is a pattern resolved for a policy section?
- **Why it matters:** Determines whether `policy_sections` needs a new column, whether a resolver service is needed, and whether retroactive rule changes affect already-incepted policies.
- **References:** `backend/nest/src/entities/policy-section.entity.ts`; `backend/nest/src/entities/earning-pattern.entity.ts` (`EarningPatternRule`)
- **Answer:** Option A — at section creation. When a user creates or updates a policy section, the system evaluates the `earning_pattern_rules` set (ordered by priority) against the section's attributes and writes the resolved `earning_pattern_id` FK onto `policy_sections`. This gives a stable, stored result that does not change if rules are later edited (protecting incepted business). All valid attribute combinations must have a matching rule; the system shall surface a validation error if no rule matches. The background runtime job (OQ-052) then uses the stored `earning_pattern_id` to run the calculation.

---

## OQ-054: Earnings — What is the `productId` FK target on `earning_pattern_rules`?

- **Raised:** 2026-06-19
- **Status:** Answered — 2026-06-19
- **Context:** `earning_pattern_rules.product_id` is a nullable INT column intended to match earning rules to a specific product. No `products` table is defined in the NestJS backend or in any TypeORM entity. The `settings.service.ts` references a `/api/settings/products` endpoint backed by raw SQL against a `products` table.
- **Question:** Should `earning_pattern_rules.product_id` reference the `products` table used by the settings module?
- **Why it matters:** Without a known FK target the column is a loose INT with no referential integrity.
- **References:** `backend/nest/src/entities/earning-pattern.entity.ts` (`productId`); `backend/nest/src/settings/settings.service.ts` (`getProducts`)
- **Answer:** Remove `product_id` from `earning_pattern_rules`. The "products" concept has not been formally implemented in the NestJS backend with a TypeORM entity or stable schema. Including an unresolvable FK creates data integrity risk. Product-level pattern matching is deferred as an open requirement until the products module is formally implemented. An open question (OQ-EARN-PROD-001) shall track this. The rule matching criteria are reduced to: `class_of_business`, `contract_type`, and `include_incepted` for the current build.

---

## OQ-055: Earnings — Which existing measures should have earned/unearned variants?

- **Raised:** 2026-06-19
- **Status:** Answered — 2026-06-19
- **Context:** The original request stated the Earnings module creates "Earned" and "Unearned" variants of existing measures. Currently only one premium measure exists in `measure_definitions`: `grossWrittenPremium`.
- **Question:** Which measure keys need earned and unearned variants, and how should they be managed?
- **Why it matters:** Determines schema changes to `measure_definitions` and what the earning engine must produce.
- **References:** `db/seeds/032-measure-definitions.js`; `backend/nest/src/measures/measure-definition.entity.ts`
- **Answer:** Yes — the `measure_definitions` table exists (entity: `MeasureDefinition`, seed: `032-measure-definitions.js`). A new boolean column `has_earning_variants` shall be added to the `measure_definitions` table. When `has_earning_variants = true` on a measure, the system automatically creates or exposes two derived variants: `{key}Earned` and `{key}Unearned`. This flag is set by `internal` measures only (tenant measures cannot self-declare earning variants). Initial measures flagged `has_earning_variants = true`: `grossWrittenPremium` (source: `policies`). The earned/unearned variants are `internal` seeded measures. Additional variants (e.g. net net premium, brokerage earned) are deferred until the premium decomposition model is agreed. Variant measures are surfaced in the reporting and dashboarding measures list alongside their parent.

---

## OQ-056: Earnings — Should earning be by accounting period or calendar day, and what defines an accounting period?

- **Raised:** 2026-06-19
- **Status:** Answered — 2026-06-19
- **Context:** REQ-EARN-CFG-F-004 exposes an `earn_by` field (`day` or `period`) on each pattern.
- **Question:** What defines an accounting period in this system?
- **Why it matters:** The earning engine cannot operate in `period` mode without a defined period calendar.
- **References:** REQ-EARN-CFG-F-004 (`earnBy`); `backend/nest/src/entities/earning-pattern.entity.ts` (`earnBy` column)
- **Answer:** For the current build, both `earn_by = 'day'` and `earn_by = 'period'` shall use **calendar months** as the system period boundary. A calendar period is defined as the first to last day of each calendar month. The engine shall calculate earned amounts using exact day-count precision within each calendar month (no precision is lost — day-count is always the basis, calendar months define the aggregation buckets). Ledger periods — user-defined accounting periods that consume earned data into the general ledger — are a separate, more complex concept that has not yet been discussed. A new open question (OQ-LEDGER-001) shall track ledger periods as an open requirement. Ledger periods shall not be implemented in this ticket.

---

## OQ-057: Earnings — Should the policy section view and finance module display earned/unearned figures?

- **Raised:** 2026-06-19
- **Status:** Answered — 2026-06-19
- **Context:** No changes were made to the policy section view page, the finance module, or the reporting module.
- **Question:** Where in the UI should earned/unearned figures appear?
- **Why it matters:** Without answers, no UI requirements can be written for the earning output.
- **References:** `frontend/src/finance/`; `frontend/src/reporting/`; `backend/nest/src/reporting/field-mappings.ts`
- **Answer:** Two integration points are confirmed:
  1. **Finance Summary tab** — A "Finance Summary" tab shall be added to both the Policy Section view page and the Policy (layer) view page. This tab shall display the earned/unearned premium figures produced by the earning engine, broken down by calendar period. This is a read-only summary view driven by the engine output.
  2. **Reporting and dashboarding measures list** — Earned and unearned premium measures shall appear in the measures list available to dashboard widget builders and custom report builders. These measures are backed by the earning engine output stored in the database.

---

## OQ-SA-EARN-001: Earning Pattern Resolver — Cross-Domain Call Mechanism

- **Raised:** 2026-06-19
- **Status:** Answered — 2026-06-19
- **Context:** The SA review identified that calling `EarningsConfigService.resolvePatternForSection()` from `PoliciesService` would violate §04 no cross-domain service injection.
- **Question:** Which of three options should be used for the pattern resolver? (A) Separate resolver endpoint called by frontend before section save; (B) NestJS pipe injected into PoliciesController; (C) Domain event with synchronous reply.
- **Answer:** Option A — a dedicated `POST /api/earning-engine/sections/resolve` endpoint (JWT-guarded, roles: `client_admin`, `internal_admin`). The frontend calls this endpoint with the section's `classOfBusiness`, `contractType`, and `includeIncepted` values before saving the section. The resolver returns `resolvedEarningPatternId`, which the frontend includes in the section save payload. `PoliciesService` validates only that the FK value exists in `earning_patterns` — it does not import `EarningEngineService`. REQ-EARN-F-001 and REQ-EARN-F-002 updated accordingly.

---

## OQ-SA-EARN-002: Resolver Endpoint — Authentication and Rate Limiting

- **Raised:** 2026-06-19
- **Status:** Answered — 2026-06-19
- **Context:** If Option A is chosen for OQ-SA-EARN-001, the new `POST /api/earning-engine/sections/resolve` endpoint must not be accessible to unauthenticated callers, as doing so would allow enumeration of an org's pattern configuration rules.
- **Question:** Must the resolver endpoint be JWT-authenticated, and should it carry a rate limit?
- **Answer:** Yes — the endpoint is guarded by `JwtAuthGuard` and `RolesGuard` with roles `['client_admin', 'internal_admin']`. Unauthenticated requests return 401; requests from roles below client_admin return 403. Rate limiting is not required beyond the standard NestJS application-level throttler already configured (if any); no bespoke per-endpoint rate limit is added in this ticket.

- **Raised:** 2026-06-19
- **Status:** Deferred
- **Context:** `earning_pattern_rules` originally included a `product_id` column to allow patterns to be matched to specific products. Per OQ-054, `product_id` has been removed because the `products` concept has not been formally implemented in the NestJS backend with a TypeORM entity or stable schema.
- **Question:** Once the products module is formally implemented (TypeORM entity, seed data, stable schema), should `earning_pattern_rules` be extended to include a product-level filter criterion?
- **Why it matters:** Without product-level matching, organisations that have multiple products with different earning profiles must use class-of-business and contract-type alone to differentiate rules. For some organisations this may be insufficient.
- **Dependencies:** Blocked by products module implementation. No action required in the current build.
- **Answer:** [Deferred — to be revisited when the products module is implemented]

---

## OQ-LEDGER-001: Ledger Periods — Accounting User-Defined Period Boundaries

- **Raised:** 2026-06-19
- **Status:** Open
- **Context:** Per OQ-056, the earning engine uses calendar months as the system period boundary for the current build. However, accounting users in an organisation typically work to "ledger periods" — explicitly defined, non-overlapping date ranges that determine when earned data is consumed into the general ledger (analogous to a financial accounting period close). Ledger periods differ from calendar months in that they can be defined independently by the organisation, can be opened/closed by an accounting user, and must not overlap.
- **Question:**
  1. Should ledger periods be a separate table (`ledger_periods`) with columns: `org_code`, `label` (e.g. "Jan 2026"), `start_date`, `end_date`, `status` ('open' | 'closed'), `closed_by`, `closed_at`?
  2. Should the earning engine optionally aggregate earned figures into the user's ledger period boundaries rather than calendar month boundaries?
  3. Who can open and close a ledger period — finance role only, or also client_admin?
  4. Should a closed ledger period be immutable — i.e. no re-runs of the engine can alter figures for a closed period?
- **Why it matters:** Ledger periods are a fundamental concept in insurance finance. Without them, earned figures cannot be reliably published to a general ledger or passed to a finance system. This is a significant scope item and must be requirements-driven before implementation.
- **Dependencies:** OQ-056 (earning period definition); earning engine output schema; Finance module integration (OQ-057).
- **Answer:** [Pending — open requirement; not in scope for the current earning engine build]

---

## OQ-001: Clearance Domain Boundary

- **Raised:** 2026-03-05
- **Status:** Answered — 2026-03-05
- **Context:** Clearance checking identifies potential duplicates across submissions, quotes, and policies.
- **Question:** Is clearance a sub-feature of the `submissions` domain, or does it warrant its own domain or workflow?
- **Answer:** Clearance is a sub-workflow of the `submissions` domain.  It is not a separate domain.  `clearance-checking` remains a workflow in `workflows/clearance-checking/`, but its logic is invoked from within the submissions context and it has no independent domain ownership.

---

## OQ-002: Invoice Ownership

- **Raised:** 2026-03-05
- **Status:** Answered — 2026-03-05
- **Question:** Who generates and owns invoices?
- **Answer:** Invoices are a **shared module** (`sharedmodules/invoices/`), not owned by any single domain.  They are created as an output of the issuance process (quote issuance = turning a quote into a live policy; endorsement issuance = turning an endorsement into a revised version of a policy).  The creation logic and output format are identical regardless of which process triggers them.  The `finance` domain consumes invoices for cash allocation, aged debt monitoring, and payments.  Finance does not create invoices.

Invoicing components (`InvoiceLineItems`, `InvoiceSummary`) are shared and may be rendered inside a quote, policy, or endorsement page without duplication.

---

## OQ-003: Financial View Calculations Ownership

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** The legacy `financialViewCalculations.js` computes Whole, Market, and Line premium views.  Which domain owns this?  Is it `quotes`, `policies`, or a shared service?
- **Why it matters:** Both quotes and policies display these views.  The logic must not be duplicated.
- **Dependencies:** Blocks domain definitions for `quotes` and `policies`.
- **Answer:** [Pending]

---

## OQ-004: User Profile — Auth Domain or Thin Page?

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** Is the user profile page (`/profile`) part of the `auth` domain, or is it a simple read/update page with no domain significance?
- **Why it matters:** Determines whether the `auth` domain needs a `ProfileComponent` or whether the profile page is just a form calling the users API.
- **Answer:** [Pending]

---

## OQ-005: Locations — Shared Module

- **Raised:** 2026-03-05
- **Status:** Answered — 2026-03-05
- **Question:** Is the location schedule part of the `quotes` domain, or a separate domain/concept?
- **Answer:** Locations are a **shared module** (`sharedmodules/locations/`).  A submission, quote, policy, and endorsement can all carry locations.  The data model, entry form, and display component are identical regardless of which record type carries them.  No single domain owns locations.  Domain records reference location IDs; location data itself lives in the shared module.

---

## OQ-006: AI Extraction — Workflow or Shared Service?

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** Is the AI extraction capability (extracting submission data from emails using OpenAI) part of the `broker-led-submission` workflow, or should it be a general-purpose `ai-extractor` shared service?
- **Why it matters:** If it is a shared service, it could be reused for other extraction tasks (e.g. extracting data from uploaded PDFs).
- **Answer:** [Pending]

---

## OQ-007: Email-to-Broker Mapping Location

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** The AI email intake workflow maps email sender domains (like `@aon.com`) to known broker party records.  Where does this mapping live?  Is it a property of the `parties` domain (email domain stored on the party record) or a workflow configuration table?
- **Why it matters:** Affects `parties` domain and the `broker-led-submission` workflow definition.
- **Answer:** [Pending]

---

## OQ-008: Full Permission Matrix

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** What specific actions can each role perform?  The `permissions` shared service cannot be built without a defined permission matrix.
- **Why it matters:** This is a blocker for the `permissions` shared service and for multi-tenant enforcement.
- **Dependencies:** Blocks `shared/permissions/` entirely.
- **Answer:** [Pending — requires product/business input]

---

## OQ-009: Cross-Tenant Data Sharing Model

- **Raised:** 2026-03-05
- **Status:** Partially Answered — 2026-03-08
- **Question:** How does data sharing between tenants work?  (e.g. a broker tenant submitting a risk to an insurer tenant, or an insurer referring to a co-insurer.)  What are the governance rules?
- **Why it matters:** Affects the multi-tenant architecture.  Without this, cross-tenant workflows cannot be designed.
- **Answer (partial):** Two tenant modes exist — **marketplace participant** and **sole-tenant**.  The mode is set by PolicyForge admin only (not by the org's own admin).  It is a monetisation lever: marketplace participation is a paid tier distinction.
  - **Marketplace participant:** Cross-tenant data sharing is possible.  A broker may submit a risk to multiple insurers simultaneously.  Both insurer records remain active and are linked.  Clearance operates cross-tenant in this mode.
  - **Sole-tenant:** The org operates in isolation.  Clearance is scoped within the org only.  Cross-tenant routing and competing-broker scenarios cannot arise.
  - Full governance rules for what data is shared, what remains private, and how broker-to-insurer submission routing works in marketplace mode are still to be defined.  This remains a partial answer.

---

## OQ-010: Jest Configuration Count

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** How many Jest configurations does the new architecture need?  Recommendation: three (frontend unit/component, backend integration, requirements regression).
- **Why it matters:** Setting up more configs than needed creates maintenance overhead.
- **Answer:** [Pending confirmation]

---

## OQ-011: CopySectionsModal — Domain Logic Present?

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** Does `CopySectionsModal.jsx` contain data transformation / business logic, or is it purely a UI interaction?
- **Dependencies:** Need to read `CopySectionsModal.jsx` in full.
- **Answer:** [Pending analysis]

---

## OQ-012: Movement.jsx — Domain Logic Present?

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** Does `Movement.jsx` calculate the movement value, or only display it?
- **Dependencies:** Need to read `Movement.jsx` in full.
- **Answer:** [Pending analysis]

---

## OQ-013: PolicySectionDetailsHeader — Domain or Primitive?

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** Is `PolicySectionDetailsHeader.jsx` a policy-domain-specific component, or is it generic enough to be a reusable UI primitive?
- **Answer:** [Pending analysis]

---

## OQ-014–OQ-016: SectionDeductions, SectionParticipations

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** Do `SectionDeductions.jsx` and `SectionParticipations.jsx` contain calculation logic?
- **Answer:** [Pending analysis of both files]

---

## OQ-017: Workspace Context — App Feature

- **Raised:** 2026-03-05
- **Status:** Answered — 2026-03-05
- **Question:** Is the workspace/tabs feature required in the new architecture?
- **Answer:** Yes, preserve it.  It is an **app feature** (`app/features/workspace-tabs/`), not a domain concern.  It does not own any business objects.  It serves the user by allowing multiple open records to be held in named session tabs.  It has no place inside a domain.

---

## OQ-018: Chat Dock — App Feature

- **Raised:** 2026-03-05
- **Status:** Answered — 2026-03-05
- **Question:** Is the chat dock in scope for the new architecture?
- **Answer:** Yes, but as an **app feature** (`app/features/chat-dock/`), not a domain.  Its purpose is to allow users within the same organisation (scoped by `org_code`) to message each other inside the application.  It is not tied to any specific business object (quote, submission, policy).  The current legacy implementation is incomplete.  Requirements must be agreed before any code is written (`chat-dock.requirements.md` must exist first).  It is a shared communication capability, not a domain.

---

## OQ-019: `dirty.js` — Still Needed?

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** What does `src/utils/dirty.js` do?  Is it still needed?
- **Answer:** [Pending analysis]

---

## OQ-020: Homepage Widget Visibility

- **Raised:** 2026-03-05
- **Status:** Answered — 2026-03-05
- **Question:** What should each user role see on the homepage?
- **Answer:** All users see all widgets.  Widget visibility is not role-gated.  The data within each widget is filtered by `org_code` (tenant) and, where relevant, `userId`.  The `permissions` service controls only which *actions* within widgets are enabled, not widget visibility.  See `app/pages/home/home.requirements.md` section 7.

---

## OQ-021: `useUser()` Consumers — Field Usage Scan

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** Which fields does each consumer of `useUser()` access?  This must be documented before `userContext.jsx` is migrated to prevent silent breaking changes.
- **Dependencies:** Blocks `auth-session` shared service migration.
- **Answer:** [Pending code scan]

---

## OQ-022: Data Quality Rules — Current State

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** What data quality rules are currently implemented?  What types of issues does `DataQualityPage.jsx` detect?
- **Answer:** [Pending analysis of DataQualityPage.jsx]

---

## OQ-023: Tasks — System-Assigned and User-Created

- **Raised:** 2026-03-05
- **Status:** Answered — 2026-03-08 (updated)
- **Question:** Are tasks pushed by workflow events (system-assigned), user-managed, or both?
- **Answer:** Both.  Tasks can be pushed by workflow events (e.g. "Submission assigned to you") and can also be created manually by users.  A `source` field (`'system'` | `'user'`) distinguishes them.  Both types appear in the `TasksWidget` and the `/my-work-items` page.  The API must support filtering by source.
  
  **Team assignment and claim model (clarified 2026-03-08):** A task may be assigned to either an individual user or a team.  When assigned to a team, any team member may claim it (claim sets `assigned_to_user_id` and clears `assigned_to_team_id`).  Once claimed the task belongs to that individual.  Re-assignment by a manager, or re-release to the team, is also supported.  See `03-Workflow-Definitions.md` — Workflow: `tasks` for the full task model.

---

## OQ-024: Reference Number Generation — Domain or Shared?

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** `src/utils/reference.js` generates reference numbers.  Is the reference format a business rule (domain logic) or a formatting concern (shared service)?
- **Answer:** [Pending analysis]

---

## OQ-025: Domain-Specific Search Modals — Approach

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** Should domain-specific search modals (party, submission, quote, policy) be primitives configured by props, or domain components that use the `SearchModal` primitive internally?
- **Answer:** [Pending architecture decision]

---

## OQ-026: DateSyncNotification — What Does It Do?

- **Raised:** 2026-03-05
- **Status:** Open
- **Question:** Is `DateSyncNotification.jsx` a UI notification pattern or a business rule about date synchronisation?
- **Answer:** [Pending analysis]

---

## OQ-027: Submission Routing Workflow

- **Raised:** 2026-03-05
- **Status:** Open
- **Context:** Submission routing has not yet been defined as a workflow.  It determines how incoming submissions are assigned to the correct underwriting team or individual.  The following routing methods have been identified:

  - **a. AI agent routing** — routes submissions received in a generic inbox automatically to the correct team
  - **b. Manual routing role** — a user who sits outside specific underwriting teams routes submissions when AI cannot assign
  - **c. Underwriter self-allocation** — an underwriter who received a submission directly adds it to their own queue, or redirects it to another team
  - **d. Rules-based routing** — configurable rules (e.g. class of business = Marine → Marine team) require no AI; defined in settings
  - **e. Specialism-based routing** — routes to underwriters or teams based on a defined specialism profile (e.g. large property risks over a threshold)
  - **f. Broker-preferred routing** — broker nominates a specific underwriting contact or team on the submission (common in the London Market)
  - **g. Load-balanced assignment** — distributes new submissions evenly across available team members; fallback when no specific rule applies

- **Questions to answer:**
  1. Which of the above routing methods are in scope for the initial build?
  2. Should multiple methods be active simultaneously (e.g. AI first, then rules-based fallback, then manual)?
  3. Who can configure routing rules?  (A settings admin role?)
  4. Does routing happen before or after clearance checking?
  5. Is routing a sub-workflow of `submissions` (like clearance), or a standalone workflow?

- **Why it matters:** Routing affects the `submissions` domain, the `broker-led-submission` and `manual-submission` workflows, the `settings` domain (rules configuration), the tasks system (assignments push tasks to users), and possibly the AI integration layer.
- **Dependencies:** Blocks `workflows/submission-routing/` definition and affects `03-Workflow-Definitions.md`.
- **Answer (partial — 2026-03-08):** Methods **d (rules-based)**, **e (specialism-based)**, **f (broker-preferred)**, and **g (load-balanced)** are all valid and in scope.  Authority-based referral (an underwriter can refer a submission up the authority chain when it exceeds their delegated limit) is also an automation target and should be added as method **h**.  Method **a (AI agent routing)** and method **b (manual routing role)** remain open.  Method **c (underwriter self-allocation)** is confirmed in scope.
  
  Remaining open sub-questions:
  1. Which methods are in scope for the **initial build** vs later iterations?
  2. Can multiple methods be active simultaneously (e.g. rules-based first, then load-balanced fallback)?
  3. Who configures routing rules — settings admin role?
  4. Does routing happen before or after clearance checking?
---

## OQ-028: Layer 2 Backend Integration Tests � Deferred

- **Raised:** 2026-03-07
- **Status:** Deferred
- **Context:** AI Guideline �06-6.1 mandates three test layers for any feature touching a database: Layer 1 (Jest/RTL frontend), Layer 2 (Supertest/real test DB backend), and Layer 3 (Playwright E2E).  The `Cleaned` project currently has Layer 1 only.  No `backend/__tests__/` directory exists and no backend test infrastructure has been set up.
- **Question:** When will backend integration test infrastructure (`backend/__tests__/schema-validation.test.js`, `backend/__tests__/api-smoke.test.js`, `backend/__tests__/requirements/`) be created and the Layer 2 test suite established?
- **Why it matters:** �06-6.1 states "Frontend tests passing does NOT mean the feature works."  Every widget on the home page mocks the api-client � none of the actual backend endpoints are verified.  A production bug would not be caught by the current test suite.
- **Dependencies:** Requires backend server running against a test database; requires OQ-010 (Jest config count) to be answered first.
- **Risk:** HIGH � a production deploy with only Layer 1 tests passing provides no evidence the backend endpoints are functional.
- **Answer:** [Deferred � to be addressed when backend endpoint development begins in the Cleaned project]

---

## OQ-029: Layer 3 E2E Tests (Playwright) � Deferred

- **Raised:** 2026-03-07
- **Status:** Deferred
- **Context:** AI Guideline �06-6.1 mandates Playwright E2E tests for auth flows, core workflows (submission ? quote ? policy), and every new feature that changes a critical path.  No `playwright/` directory exists in the Cleaned project.
- **Question:** When will Playwright infrastructure be set up and which flows will be covered in the initial suite?
- **Why it matters:** E2E tests are the only verification that the full stack works together in a real browser.  Existing auth and home page tests are Jest/jsdom only � they cannot catch routing failures, CSS rendering issues, or real network errors.
- **Dependencies:** Requires Layer 2 backend tests to be passing first (OQ-028); requires a Playwright-compatible CI environment.
- **Risk:** MEDIUM � no automated protection against regressions on the login flow or navigation until this is established.
- **Answer:** [Deferred � to be addressed when the first vertical feature slice is built end-to-end]
---

## OQ-030: Bordereaux Import — Row Count Limit

- **Raised:** 2026-05-22
- **Status:** Open
- **Context:** `BordereauImportModal.tsx` currently sends only the first 5 rows of the parsed spreadsheet (`normalizedPreview`) to `POST /api/bordereaux/import`. The backup source code (`BindingAuthorityBordereauImportModal.jsx`) contained a comment: "send the entire set in a real upload; here we just preview first 5".
- **Question:** Should the production import endpoint receive **all parsed rows** (potentially thousands), or should a chunk/streaming approach be used?  The current 5-row limit means the backend persists only a preview, not the full bordereaux.
- **Why it matters:** The current implementation does not fulfil the user need — importing a full bordereaux. It needs a decision before the backend integration is complete.
- **Risk:** HIGH — data is silently truncated. Users may believe the full file was imported.
- **Dependencies:** Affects `bordereaux.controller.ts` payload handling and response message.
- **Answer:** [Pending product decision]

---

## OQ-031: Bordereaux Import — Claims Table Target

- **Raised:** 2026-05-22
- **Status:** Open
- **Context:** The `BordereauImportModal.tsx` supports a Claims bordereaux data type (`dataType = 'claims'`). The backend controller (`bordereaux.controller.ts`) only handles Risk rows (insert/update `policies`, `policy_sections`, `policy_section_coverages`, `policy_transactions`). There are no claims tables defined in the NestJS backend.
- **Question:** Which database tables should Claims bordereaux data be persisted to? Does a claims table exist or need to be created?
- **Why it matters:** Currently, sending a Claims bordereaux does not produce any persisted data — there is no handler for it. This is a silent data loss bug.
- **Risk:** HIGH — feature appears to work (wizard completes) but nothing is saved for claims-type imports.
- **Dependencies:** Blocks claims bordereaux support in `bordereaux.controller.ts`. May require a new migration.
- **Answer:** [Pending]

---

## OQ-032: Bordereaux Import — Organisation Scoping on Policy Lookup

- **Raised:** 2026-05-22
- **Status:** Open
- **Context:** `bordereaux.controller.ts` resolves existing policies using `WHERE LOWER(reference) = $1 AND created_by_org_code = $2`. This prevents cross-org matches. However, in a marketplace-participant tenant mode (OQ-009), a broker may import a bordereaux for policies owned by an insurer org.
- **Question:** Should the org-scoping on the policy lookup use the importing user's `orgCode`, the binding authority's coverholder org code, or both?
- **Why it matters:** Incorrect scoping could either block legitimate imports or allow cross-tenant data pollution.
- **Dependencies:** Depends on OQ-009 (Cross-Tenant Data Sharing Model).
- **Answer:** [Pending — blocked by OQ-009]

---

## OQ-033: Quote Date Filtering — Type Casting for `created` Basis

- **Raised:** 2026-05-22
- **Status:** Open
- **Context:** `quotes.service.ts findAll` applies date range filtering via `q.createdDate >= :dateFrom` when `date_basis = 'created'`. The `createdDate` column is `TIMESTAMPTZ` in the database. The `dateFrom` / `dateTo` values are plain date strings (e.g. `'2026-01-01'`). PostgreSQL will implicitly cast the string to `TIMESTAMPTZ` at midnight UTC, which may produce off-by-one results for users in non-UTC timezones.
- **Question:** Should the date comparison for `date_basis=created` use explicit timezone casting (e.g. `q.createdDate::date >= :dateFrom::date`) or should `dateFrom`/`dateTo` always be provided as ISO 8601 datetime strings by the frontend?
- **Why it matters:** A user in UTC+5 querying "from 2026-01-01" expects records created after midnight local time, but the current filter will return records from midnight UTC (19:00 previous day local).
- **Dependencies:** Affects `quotes.controller.ts` (parameter validation), `quotes.service.ts` (query), and frontend date picker behaviour.
- **Answer:** [Pending — requires product decision on timezone handling]

---

## OQ-034: Homepage Pinned Dashboard Deletion

- **Raised:** 2026-05-22
- **Status:** Open
- **Context:** `HomeEmbeddedDashboard.tsx` stores the index of the currently selected pinned dashboard in `selectedIndex` state. If a dashboard that is currently selected is deleted (or its `showOnHomepage` flag is toggled off), the next reload will re-fetch the list and reset `selectedIndex` to 0 — which is correct. However, if the deletion happens while the page is mounted and the component does not refresh, the `selectedIndex` may transiently point to a non-existent entry until the next navigation.
- **Question:** Should `HomeEmbeddedDashboard` subscribe to a dashboard-update event or poll with a short interval to detect when pinned dashboards change while the tab is open?
- **Why it matters:** Low severity — the issue resolves on next page visit — but may cause a brief "Could not load dashboard" error message while the stale index is held.
- **Dependencies:** Affects `HomeEmbeddedDashboard.tsx` and possibly the reporting service event model.
- **Answer:** [Deferred — acceptable risk given low severity; to be reviewed when real-time dashboard subscriptions are considered]
---

## OQ-030: Clearance Rule Configuration Authority

- **Raised:** 2026-03-08
- **Status:** Open
- **Context:** The `clearance-checking` workflow uses configurable matching rules (insured name fuzzy match tolerance, inception date window, class of business scope).  These rules live in a `clearance_rules` config table.
- **Question:** Who has authority to configure clearance matching rules — org admin only, or also team-level config?
- **Why it matters:** Determines the permissions model for clearance configuration, the UI entry point (org settings vs team settings), and whether rules are org-wide or per-team.
- **Dependencies:** Blocks clearance configuration requirements and the `settings` domain definition for clearance config.
- **Answer:** [Pending — requires product/business input]

---

## OQ-031: Competing-Broker Submission — Rating Alignment Enforcement

- **Raised:** 2026-03-08
- **Status:** Open
- **Context:** When a `competing-broker` clearance match is identified, two submissions for the same risk exist from different brokers to the same insurer.  Both submissions remain active and are linked.
- **Question:** When two competing-broker submissions are linked, does the system enforce rating alignment automatically (e.g. prevent one from being quoted at a significantly different premium) or does it only issue a warning?
- **Why it matters:** Determines whether the clearance outcome has a hard constraint on the rating workflow or is advisory only.  Hard enforcement significantly increases complexity.
- **Answer:** [Pending — requires product/business input]

---

## OQ-032: Email Reply-to-Quote Auto-Acceptance via Embedded Reference Code

- **Raised:** 2026-03-08
- **Status:** Open
- **Context:** The `quote-to-policy` workflow includes a concept where a unique submission reference code is embedded in a chase email to the broker.  When the broker replies to that email, the system can auto-create an acceptance task (or even auto-accept the quote) by detecting the reference code in the reply.
- **Question:** Is this email reply-to-quote auto-acceptance via embedded reference code in scope for the initial build, or is it a future iteration?
- **Why it matters:** If in scope for initial build, it adds requirements to the `ai-email-intake` workflow and the `quote-to-policy` workflow, and requires the reference code to be embedded in all outbound chase emails from day one.
- **Answer:** [Pending — deferred until core quote-to-policy flow is defined]

---

## OQ-033: Module Licensing — Baseline module set

- **Raised:** 2026-03-12
- **Status:** Answered — 2026-03-12
- **Context:** The Module Access Control proposal (Technical Documentation/12-Module-Access-Control.md) defines a set of licensable module keys per org.
- **Question:** Which modules are included for every org by default and cannot be removed? Candidates: `module:parties`, `module:search`, `module:settings`. Should `module:search` and `module:settings` always be on, or can an org be created without them?
- **Why it matters:** Determines the seeding logic for `org_modules` and whether the backend needs special-case handling for baseline modules.
- **Answer:** The concept of a "baseline" is dissolved: there are no independently licensable foundational modules. Instead, `parties`, `search`, and `settings` are **infrastructure dependencies** — they are automatically present whenever any other module that requires them is licensed. They cannot be toggled off in isolation; they are removed only if all modules that depend on them are also removed. Every org that exists in the system will have at least one commercial module, which will always pull in these dependencies. The `org_modules` table therefore does not need special-case rows for infrastructure — the backend resolves dependencies at login time when building `enabledModules`.

---

## OQ-034: Module Licensing — Per-org or per-user granularity

- **Raised:** 2026-03-12
- **Status:** Answered — 2026-03-12
- **Context:** The proposal stores module access per org. But a large org may want only certain users to have access to a module (e.g., org has `module:finance` but only finance team users should see it).
- **Question:** Should module access be per-org only, or can it be further restricted per user or per user-role within an org?
- **Why it matters:** Per-org is simpler. Per-user adds a `user_modules` table or a module-scoped role system. Determines the data model and the `requireModule` middleware signature.
- **Answer:** Module access is **per-org only**. An org must have a commercial agreement in place before any users are created on the platform. Once an org has a module licensed, all users in that org can see and navigate to that module's pages. What a user can **do** within a module is controlled by their **role** (e.g., a claims adjuster cannot create a quote or issue a policy). This is two orthogonal concerns: (1) org-level module licensing — what the org has purchased; (2) role-level action permissions — what a user in that org is authorised to do within a licensed module. No `user_modules` table is needed.

---

## OQ-035: Module Licensing — Session update on admin change

- **Raised:** 2026-03-12
- **Status:** Answered — 2026-03-12
- **Context:** The `enabledModules` array is baked into the session at login and returned by `GET /api/auth/me`. If a PolicyForge admin adds or removes a module from an org, active user sessions hold a stale value.
- **Question:** When modules are changed by a PF admin, does it take effect: (a) only on next login, (b) on next page load (re-fetches /me), or (c) immediately (requires a push mechanism or session invalidation)?
- **Why it matters:** Determines whether token versioning (already on `users`) needs a parallel mechanism on `org_modules`, and how the frontend refreshes the module list.
- **Answer:** Module changes take effect on the user's **next login**. Active sessions continue to see the previous module set until they log out and back in. This is acceptable: module changes are commercial decisions made infrequently, and the admin can ask users to re-login if needed. No session invalidation mechanism is required for module changes — the existing `token_version` pattern on `users` is sufficient for auth-level invalidation and does not need to be extended to `org_modules`.

---

## OQ-036: Module Licensing — Module dependencies

- **Raised:** 2026-03-12
- **Status:** Answered — 2026-03-12
- **Context:** Some modules may imply others. For example, `module:submission-workflow` logically includes quotes, policies, and finance interactions.
- **Question:** Are there hard dependencies between modules that must be enforced? (e.g., can you enable `module:claims` without `module:parties`?) Or are all modules fully independent?
- **Why it matters:** Dependencies affect both the admin UI validation and the `requireModule` middleware (which module to check for a given route may depend on multiple keys).
- **Answer:** Hard dependencies exist and must be enforced. Confirmed dependency graph:
  - `module:claims` → requires `parties` (auto-included)
  - `module:submission-workflow` → requires `parties` (auto-included)
  - `module:bordereau-import` → requires `module:binding-authorities`
  - `module:parties` is not an independently toggleable module; it is an infrastructure dependency that is present whenever any other module requires it. Disabling `module:claims` does not remove `parties` access if `module:submission-workflow` is also active.
  
  The admin UI must enforce these dependencies: attempting to enable `bordereau-import` without `binding-authorities` must be blocked. Attempting to remove the last module that depends on `parties` implicitly removes `parties` access too. Backend `requireModule` does not need to check dependencies — the router checks the specific key for each route, and the data will always be consistent if the admin UI enforces the rules at write time.

---

## OQ-037: Module Licensing — Bordereau import vs. BA reporting

- **Raised:** 2026-03-12
- **Status:** Answered — 2026-03-12
- **Context:** The backup app has bordereau functionality inside the `binding-authorities` domain. The proposal creates a separate `module:bordereau-import` domain for inbound bordereau processing (creating policy records from an imported file). The `binding-authorities` domain retains outbound bordereau generation.
- **Question:** Is this separation correct? Should `bordereau-import` be a standalone domain, or should it remain a feature inside `binding-authorities` but licensable separately?
- **Why it matters:** Determines whether a new `domains/bordereau-import/` folder is created or whether the BA domain grows a sub-feature.
- **Answer:** `bordereau-import` is a **sub-feature of `binding-authorities`**, not a standalone domain. An org can have `module:binding-authorities` without `module:bordereau-import`, but `module:bordereau-import` cannot exist without `module:binding-authorities` (the imported policies must link to a BA contract). The inbound import functionality will live inside `domains/binding-authorities/` as a feature area, but it is still independently licensable — the `org_modules` table can have `module:bordereau-import` only if `module:binding-authorities` is also present. No separate `domains/bordereau-import/` folder is created.

---

## OQ-038: Module Licensing — Policy-Forge-Admin interface location

- **Raised:** 2026-03-12
- **Status:** Answered — 2026-03-12
- **Context:** The org module assignment needs an admin interface. Three options are described in Technical Documentation/12-Module-Access-Control.md §6.
- **Question:** Does the PolicyForge admin interface live as: (A) a separate app/deploy, (B) a super-admin role within this app, or (C) a backend CLI/script for the initial phase?
- **Why it matters:** Determines how much frontend work is needed before the module system is usable, and whether the backend needs a separate auth route for PF-admin access.
- **Answer:** **Option B — Super-admin role (`pf_admin`) within this app.** The admin capability is exposed as a sub-section within `settings`, visible only to users with `role: pf_admin`. This includes managing org module assignments, org hierarchy configuration, and other platform-level settings. The `settings` domain therefore has two layers: tenant admin settings (visible to org admins) and platform admin settings (visible only to pf_admin). Org hierarchy management — which also exists in the backup app — will be one of these platform admin sub-modules.

---

## OQ-039: Module Licensing — Unlicensed route UX

- **Raised:** 2026-03-12
- **Status:** Answered — 2026-03-12
- **Context:** If a user navigates directly to a route for an unlicensed module (e.g., bookmarks `/submissions` but loses the submission-workflow module), the UI needs to respond.
- **Question:** Should unlicensed routes show: (A) a generic 404, (B) a "not included in your plan" page (NotLicensed component) that names the module, or (C) a redirect to home?
- **Why it matters:** Option B is the best UX but requires a `<ModuleGuard>` component and a `NotLicensed` page. Options A and C are simpler.
- **Answer:** **Hide entirely.** Unlicensed module nav items and create-menu items are removed from the sidebar — users never see them. If a user has a stale bookmark to an unlicensed route, they are redirected to the home page (`/app-home`). There is no "not in your plan" message. The clean approach is: if you can't see it in the nav, you can't go there. No `<NotLicensed>` page is needed; the `<ModuleGuard>` component redirects to `/app-home` rather than rendering a message.

---

## OQ-040: Parties Module — Single vs Multi-Tenant Address Book Architecture

- **Raised:** 2026-03-13
- **Status:** Open
- **Context:** When adding a company to the Module Licensing configuration, the company must first exist as a party in the parties module. This raises a broader architectural question about how the party address book works in each deployment mode.
- **Question:** In a multi-tenant environment, should the party address book be centralised (one party record shared across all tenants) or tenant-scoped (each org maintains its own list of parties)?  In a sole-tenant environment, the org maintains its own list.  How should the system accommodate both modes efficiently?
- **Why it matters:** Determines whether party records include an `org_code` field (tenant-scoped) or are platform-level (shared).  Affects how clearance checking identifies matching parties across tenants, how broker party records are shared with insurers in marketplace mode, and whether a party can carry different roles in different tenants.
- **Dependencies:** Linked to OQ-009 (cross-tenant data sharing); blocks `parties` domain data model design.
- **Answer:** [Pending — requires architectural decision]

---

## OQ-041: Reusable Party Search Modal — Architecture

- **Raised:** 2026-03-13
- **Status:** Open
- **Context:** Multiple places in the application need a party search modal — Module Licensing company linking, Submission insured field, and others.  The user has specified that the search component should be reusable and parameterised by party type (e.g. `'company'`, `'insured'`, `'broker'`) so the same modal handles all contexts with different filters.
- **Question:** Where should the reusable `PartySearchModal` live?  Options:
  - (A) `components/` primitive — accepts `partyType` prop; parties-search logic bleeds into a generic component.
  - (B) `domains/parties/` export — domain component exported for use elsewhere; violates §1.6 no direct cross-domain imports.
  - (C) `lib/` shared service — a search modal wired to the parties API, framework-agnostic, not a domain concern.
- **Why it matters:** Option A violates separation of concerns.  Option B violates architectural boundaries.  The correct approach must be established before any party search modal is built.
- **Dependencies:** Linked to OQ-025 (domain-specific search modals approach); blocks `Module Licensing` company add flow and `submissions` insured search.
- **Answer:** [Pending — requires architecture decision]

---

## OQ-042: Multi-Tenant Integrity — Non-Overridable Settings Configuration

- **Raised:** 2026-03-13
- **Status:** Open
- **Context:** In a multi-tenant environment, certain configuration values set at platform level by `internal_admin` must not be overridable by `client_admin`, to protect cross-tenant data integrity.  Examples: clearance matching rules, global reference number formats, cross-tenant routing rules, marketplace participation mode.
- **Question:** Which categories of settings configuration must be marked as non-overridable by `client_admin`?  What enforcement mechanism should be used — e.g. a `platform_locked` flag on config records, separate API endpoint permissions per role, or UI-level field disabling?
- **Why it matters:** Determines the data model for settings configuration tables, the permission rules on settings API endpoints, and the UI display pattern for locked vs unlockable settings.  A `client_admin` must not be able to silently override platform-level integrity constraints through the settings UI.
- **Dependencies:** Linked to OQ-008 (full permission matrix); blocks settings domain configuration requirements for any module with platform-level constraints.
- **Answer:** [Pending — requires product/business input on which settings are platform-locked]

---

## OQ-043: Table Data Formatting Standards

- **Raised:** 2026-03-13
- **Status:** Open
- **Context:** AI Guideline §7.8 RULE 15 establishes interim formatting defaults for table cell data.  However, the exact precision rules for different number types in the insurance domain have not been formally agreed.
- **Question:** What are the exact formatting rules for:
  1. **Percentages** — is a rate of `1.2345%` displayed as `1.23%`, `1.2345%`, or is precision context-dependent (e.g., 2 d.p. for display, 4 d.p. for rating calculations)?
  2. **Currency** — symbol (£, $, €), thousands separator format, always 2 decimal places or variable?
  3. **Large numbers** — abbreviation (e.g. `£1.2M`) vs full display (`£1,200,000`)?
  4. **Rates** (e.g. risk premium rate) — how many decimal places?
  5. **Dates** — `DD/MM/YYYY`, `YYYY-MM-DD`, or formatted display (`13 Mar 2026`)?
- **Why it matters:** Inconsistent formatting across tables violates the single styling principle (§7.8 RULE 12).  These rules feed into a shared formatting utility that all table cells will use.
- **Dependencies:** Blocks creation of a shared number/date formatting utility; affects all financial table displays across the application.
- **Answer:** [Pending — requires product/business input]

---

## OQ-044: Submission View Page — Broker-Origin Locked Fields

- **Raised:** 2026-03-21
- **Status:** Open
- **Context:** When an Insurer or MGA user views a submission that was originated by a Broker (identified via `createdByOrgType: 'Broker'` on the submission record), a subset of the editable-tier fields must be rendered read-only. This prevents the Insurer/MGA from overwriting data that the broker owns. The exact list of locked fields has not yet been defined.
- **Question:** Which specific fields on a broker-originated submission are locked (read-only) when viewed or edited by an Insurer or MGA user? Candidates from the editable-tier: `insured`, `placingBroker`, `inceptionDate`, `expiryDate`, `renewalDate`. Are all locked, or only a subset? Are there additional fields beyond the editable-tier that require consideration?
- **Why it matters:** REQ-SUB-VIEW-F-023 and REQ-SUB-VIEW-F-024 in `SubmissionViewPage.requirements.md` depend on this answer. The implementation uses a `BROKER_ORIGIN_LOCKED_FIELDS` constant array; its contents cannot be confirmed until this question is resolved. If the list varies by `contractType`, the lock logic will need parameterisation, which significantly increases complexity.
- **Dependencies:** Blocks finalisation of REQ-SUB-VIEW-F-023 and REQ-SUB-VIEW-F-024 tests. Part of the broader broker submission workflow (deferred).
- **Answer:** [Pending — deferred until broker submission workflow session]

---

## OQ-045: Party Mastering Workflow — Broker-Created Parties

- **Raised:** 2026-03-21
- **Status:** Open
- **Context:** In a marketplace deployment, a broker may create party records (e.g. insureds, intermediaries) in their own tenant and submit a risk to an Insurer/MGA. The Insurer/MGA receives the submission but the insured party record was created by the broker. The Insurer/MGA may already have their own party record for the same entity, or may need to adopt the broker's record, or may need to merge the two.
- **Question:** What are the exact rules and steps for the party mastering decision when a broker-created party arrives at an Insurer/MGA system? Specifically:
  1. Is the mastering decision a manual workflow task, or automated?
  2. What are the three options: (a) adopt the broker's record as-is, (b) keep the Insurer/MGA's existing record and link it to the submission, (c) merge details from both records?
  3. Who can perform the mastering decision — underwriter, team admin, or platform admin only?
  4. What happens to the submission's `insuredId` reference after the mastering decision?
  5. Is this workflow triggered once per party per org-pair, or every time a new submission arrives from that broker?
- **Why it matters:** Affects the `insured` field on the Submission View Page (REQ-SUB-VIEW-F-009), the `InsuredSearch` component, and the party table data model. Without a mastering workflow, duplicate party records will proliferate across tenants.
- **Dependencies:** Linked to OQ-040 (party address book architecture), OQ-009 (cross-tenant data sharing). Deferred until broker submission workflow session.
- **Answer:** [Pending — deferred until broker submission and multi-tenant party workflow session]

---

## OQ-046: Party and Submission `createdByOrgType` — Column Definition

- **Raised:** 2026-03-21
- **Status:** Answered — 2026-03-21
- **Context:** Both the `party` table and the `submission` table need a field to record the type of organisation that created the record. The `role` field on the `party` table is already backed by a lookup table in the database.
- **Answer:**
  1. **Not a string column at all.** The `role` values are already lookup-table backed. Rather than denormalising a type string, store a **foreign key to the party table**: `party_created_id INTEGER REFERENCES party(id)`. The org type is derived at query time by joining `party.role` — no separate type column needed.
  2. **Naming convention: `party_{concept}_id`.** Examples: `party_created_id` (the party who created this record); `party_insured_id` (future rename of `insuredId`). This gives all party FK columns a consistent, self-describing name across the schema.
  3. **Both tables get `party_created_id`:** `submission.party_created_id` → the party record of the org that created the submission. `party.party_created_id` → the party record of the org that created this party record (needed for OQ-045 mastering workflow). The derived `createdByOrgType` value in API responses comes from `JOIN party p ON p.id = s.party_created_id` → `p.role`.
  4. **NULL is acceptable.** Existing/test data rows carry `NULL`. In production the test data is purged before go-live. The frontend treats NULL `createdByOrgType` as "no origin lock" (safest default — fields remain editable).
- **Migration:** `backend/add-party-created-id.js` — adds `party_created_id INTEGER REFERENCES party(id)` (nullable) to both `party` and `submission` tables using `ADD COLUMN IF NOT EXISTS` (safe to re-run).

---

## OQ-047: Error Reporting to Platform Admin Account

- **Raised:** 2026-03-14
- **Status:** Open — deferred pending design discussion
- **Context:** The `ErrorBoundary` component currently catches render-time errors and shows a user-friendly fallback (with a "Reload page" button). In development it shows the full error. In production it shows only "An unexpected error occurred."
- **Question:** When an `ErrorBoundary` catches an error in production, should it silently send an error report to a designated Policy Forge admin account or notification feed, so the platform team can see what errors users are encountering?
- **Requirements to confirm:**
  1. What is the "Policy Forge admin account" destination — a dedicated admin notification type, a new DB table, or an external service (e.g. Sentry)?
  2. Should the error report include: user ID, org code, error message, component stack, route, timestamp?
  3. Should this be a fire-and-forget `POST /api/errors` call, or should it use the existing `POST /api/notifications` endpoint with a reserved system-level org/user?
  4. Should the `ErrorBoundary` itself make the API call, or should it invoke a shared `reportError()` service?
- **Why it matters:** Without error reporting, production crashes are invisible to the platform team. The current `logger.error()` call in `componentDidCatch` is a development-only no-op.
- **Blocks:** Implementation of any error-reporting integration in `ErrorBoundary/component.tsx` and any new backend route.
- **Answer:** [Pending — to discuss in a future session]

---

## OQ-048: policy_coverages — Rename Table or Fix Service?

- **Raised:** 2026-04-09
- **Status:** Answered — 2026-04-09
- **Context:** Migration 014 created a table named `policy_coverages`. The NestJS `PoliciesService` already queried it as `policy_section_coverages` — a name mismatch causing a 500 on the policy coverages GET endpoint.
- **Question:** Should a new migration rename `policy_coverages` → `policy_section_coverages` (consistent with the new `quote_section_coverages` pattern), or should the service be updated to query `policy_coverages`?
- **Options:**
  - **A — Rename table:** New migration renames `policy_coverages` → `policy_section_coverages`. Zero-risk (table was empty in all environments).
  - **B — Fix service:** Change `policy_section_coverages` references in `policies.service.ts` to `policy_coverages`.
- **Recommendation:** Option A — consistent naming across both domains (`quote_section_coverages` / `policy_section_coverages`).
- **Answer:** Option A confirmed. Migration 099 renames `policy_coverages` to `policy_section_coverages` and adds the `days_on_cover` column. Applied to local and UAT databases.

---

## OQ-049: Coverage columns — `coverage` or `coverage_name`?

- **Raised:** 2026-04-09
- **Status:** Answered — 2026-04-09
- **Context:** Frontend files used `coverage_name` as the field name for the coverage description column. The database column convention in `policy_coverages` / `policy_section_coverages` used `coverage`. These needed to be reconciled.
- **Question:** Should the column be named `coverage` or `coverage_name`?
- **Why it matters:** Inconsistency between frontend TypeScript types and database column names causes runtime field mapping errors.
- **Answer:** Use `coverage` — the field name is self-explanatory in context. All frontend files updated (`coverage_name` → `coverage`) across `quotes.service.ts`, `QuoteSectionViewPage.tsx`, `QuoteCoverageDetailPage.tsx`, `QuoteCoverageSubDetailPage.tsx`, and `quotes.test.tsx`. The `quote_section_coverages` table (migration 100) was created with `coverage TEXT` from the outset.

---

## OQ-050: BordereauRunPage — live data vs illustrative data

- **Raised:** 2026-04-17
- **Status:** Open
- **Context:** REQ-BA-FE-F-122b specifies a `BordereauRunPage` that renders bordereau output. The page currently uses illustrative/hardcoded sample data matching the `BordereauConfigModal` Step 4 preview. No data pipeline exists yet.
- **Question:** What data source should drive the BordereauRunPage output — is it live DB data filtered by BA (policies/claims linked to this BA), or should it remain illustrative until a dedicated back-end data pipeline is built?
- **Why it matters:** If live data is required, a new API endpoint must be designed (`GET /api/binding-authorities/:id/bordereaux/:configId/run`) and the data aggregation logic specified. This has significant backend impact and should be planned before implementation begins.
- **Affects:** REQ-BA-FE-F-122b; potentially new `bordereaux.requirements.md` backend section.

---

## OQ-051: BAEndorsePage — backdated endorsements

- **Raised:** 2026-04-17
- **Status:** Open
- **Context:** REQ-BA-FE-F-125 validates that the Effective Date on `BAEndorsePage` falls between the BA inception and expiry dates; it does not restrict past dates.
- **Question:** Should endorsements be allowed to have an effective date in the past (backdating), or should the date be restricted to today or a future date?
- **Why it matters:** Backdated endorsements are common in Lloyd's market practice (e.g., agreed MTA effective 3 months ago). If backdating is prohibited, the validation rule must be tightened. If allowed, no change needed.
- **Affects:** REQ-BA-FE-F-125 (validation logic).

---

---

## OQ-QUO-BE-NE-003: `findOne` — 403 ForbiddenException for org mismatch

- **Raised:** 2026-03-25
- **Status:** Answered — 2026-03-25
- **Context:** `QuotesService.findOne` checked `orgCode` twice: once in the query (`WHERE created_by_org_code = :orgCode`) and once with an explicit `ForbiddenException` throw if the returned record's org didn't match.
- **Question:** Should a dedicated 403 ForbiddenException be thrown when a quote exists but belongs to a different org, or is the structural query-level guard sufficient?
- **Answer:** Remove the 403. The query already scopes by `orgCode`, so a record from another org simply returns no rows — the caller sees a 404 (NotFoundException). The dual-check is redundant and reveals internal implementation detail. A test shall verify that requesting another org's quote ID returns 404. REQ-QUO-BE-NE-F-003 updated accordingly.

---

## OQ-QUO-BE-NE-004: Concurrent user detection — NestJS — deferred or needed now?

- **Raised:** 2026-03-25
- **Status:** Answered — 2026-03-25
- **Context:** The legacy Express backend detectConcurrentUsers is implemented in `backend/services/audit.service.js` and `backend/server.js`. It was listed as out-of-scope in `backend/routes/audit.requirements.md` ("future feature"). The NestJS backend does not yet have this capability.
- **Question:** Is concurrent user detection needed in the NestJS backend now?
- **Answer:** Yes — needed now. When a `"Quote Opened"` (or any `"*Opened"`) audit event is posted, the response must include `otherUsersOpen: string[]` listing any other users who currently have the same record open. The algorithm (net Opened-minus-Closed count per user, excluding current user) shall be implemented as `AuditService.detectConcurrentUsers()`. See REQ-AUDIT-BE-F-013 and REQ-QUO-BE-NE-F-014.

---

## OQ-QUO-BE-NE-005: `decline()` — raw SQL JSONB merge or JavaScript merge?

- **Raised:** 2026-03-25
- **Status:** Answered — 2026-03-25
- **Context:** `QuotesService.decline()` used raw SQL (`payload || $2::jsonb`) to merge declinature reason into the JSONB payload column. This was documented as a raw SQL exception (C-002) because TypeORM QueryBuilder cannot express Postgres-specific JSONB operators.
- **Question:** Should the JSONB merge remain as raw SQL, or be restructured to a JavaScript object merge?
- **Answer:** Restructure to JavaScript merge. Fetch the current record via TypeORM `repository.findOne()`, merge `{ declineReasonCode, declineReasonText }` into the existing payload in JS, then save via `repository.save()`. This eliminates the raw SQL exception. REQ-QUO-BE-NE-C-002 superseded.

---

## OQ-QUO-BE-NE-006: Audit raw SQL — retain exception or create AuditEvent TypeORM entity?

- **Raised:** 2026-03-25
- **Status:** Answered — 2026-03-25
- **Context:** `QuotesService.getAudit()` and `postAudit()` used raw SQL against the `audit_event` table. This was documented as a raw SQL exception (C-003) because no `AuditEvent` TypeORM entity existed.
- **Question:** Should the raw SQL exception be retained, or should the `AuditEvent` TypeORM entity be created to eliminate it?
- **Answer:** Create the `AuditEvent` TypeORM entity covering all domains. Migrate `AuditService` to use `Repository<AuditEvent>`. `QuotesService` delegates `getAudit`/`postAudit` to `AuditService`. Raw SQL exception C-003 is removed. This also enables `detectConcurrentUsers` to use TypeORM. The `audit_event` table schema is already established in `db/migrations/006-create-audit-event-table.js`.

---

## OQ-QUO-BE-NE-007: `copy` — should Declined be a valid source status?

- **Raised:** 2026-03-25
- **Status:** Answered — 2026-03-25
- **Context:** `REQ-QUO-FE-F-061` originally stated Copy Quote was visible only when status is `"Draft"`, `"Quoted"`, or `"Bound"` (not `"Declined"`). However, `QuoteViewPage.tsx` already showed Copy Quote for all statuses with no filter.
- **Question:** Should copy be available from a Declined quote?
- **Answer:** Yes. Copy is available from all statuses including Declined. The copied quote is always `status = 'Draft'`. The `declineReasonCode` and `declineReasonText` from the source quote's payload are NOT copied — the new Draft is a clean attempt. The requirement was wrong; the code was correct. REQ-QUO-FE-F-020, REQ-QUO-FE-F-061, and REQ-QUO-BE-NE-F-010 updated accordingly.

---

## OQ-QUO-FE-001: Recent Activity widget — org-level or current user's own records?

- **Raised:** 2026-03-25
- **Status:** Answered — 2026-03-25
- **Context:** `home.requirements.md` §5.4 described the RecentActivityWidget as showing records "scoped to the current tenant (`org_code`)". The legacy `RecentRecords.jsx` and `/api/recent-records-data` use `last_opened_date` which reflects the last time *anyone* opened the record.
- **Question:** Should Recent Activity show the org's most recently updated records (any user), or the current user's own recently opened records?
- **Answer:** The current logged-in user's own recent records only. The widget queries audit events filtered by `user_id = current user` where `action LIKE '%Opened%'`, groups by entity, orders by `created_at DESC`, and returns up to 10 distinct entity records. `home.requirements.md` §5.4 updated accordingly.

---

## OQ-AUDIT-001: `detectConcurrentUsers` result — part of POST audit response or separate endpoint?

- **Raised:** 2026-03-25
- **Status:** Answered — 2026-03-25
- **Context:** When a `"Quote Opened"` event is posted, the system needs to report any other users currently viewing the same record. Two options: (A) return `otherUsersOpen` as part of the existing `POST /api/quotes/:id/audit` response, or (B) introduce a separate `GET /api/quotes/:id/concurrent-users` endpoint.
- **Question:** Which approach is correct?
- **Rationale for Option A (chosen):**
  1. The `useAudit` hook (`frontend/src/shared/lib/hooks/useAudit.ts`) already reads `data.otherUsersOpen` from the POST audit response (`if (data.otherUsersOpen) setOtherUsersOpen(data.otherUsersOpen)`).
  2. All legacy entity endpoints (submissions, BAs, quotes in Express `server.js`) return `otherUsersOpen` from the same POST audit response — the pattern is established and consistent.
  3. No additional HTTP round-trip on page load.
  4. The legacy `audit.service.js` `recordAuditEvent()` already returns `{ success, audit, otherUsersOpen }` in its response shape.
- **Answer:** Return `otherUsersOpen: string[]` as part of the `POST /api/quotes/:id/audit` response (`{ success: true, audit, otherUsersOpen }`). REQ-AUDIT-BE-F-014 and REQ-QUO-BE-NE-F-014 specified accordingly.

---

## OQ-STAT-001: Submission `is_active` — stored boolean or derived from status?

- **Raised:** 2026-05-19
- **Status:** Answered — 2026-05-19
- **Context:** Submissions need an efficient way to filter active vs inactive records. The status column already implies activity (e.g. `Open` is active, `Closed` is not), so one option is to derive `is_active` from status at query time; the other is to store it as a dedicated boolean.
- **Question:** Should `is_active` be a stored boolean column on `submission`, or should activity be derived from the `status` column at query time?
- **Why it matters:** Determines whether the DB schema needs a new column and whether a nightly sync job is required to keep it consistent.
- **Answer:** Stored boolean. Add `is_active BOOLEAN DEFAULT TRUE NULL` to the `submission` table. Terminal states (`Expired, Cancelled, Lapsed, Renewed, Closed, Disbanded`) set it to `false`. It is maintained by application events and nightly jobs (Checkpoint E). This enables efficient indexed filtering without recomputing from status on every query. Implemented in Checkpoint C.

---

## OQ-STAT-002: Policy version status — stored lookup FK or plain text column?

- **Raised:** 2026-05-19
- **Status:** Answered — 2026-05-19
- **Context:** Policies can be Original (first issuance from a quote) or Endorsed (a version created via an endorsement). The policy record needs to identify which it is.
- **Question:** Should policy version status (`Original`/`Endorsed`) be stored as a plain text column, or as an integer FK referencing a lookup table?
- **Why it matters:** A FK provides referential integrity and follows the established lookup pattern; a text column is simpler but allows invalid values.
- **Answer:** FK column. Add `version_status_id INT NULL` to `policies` referencing `lookup_policy_version_statuses(id)`. Create `lookup_policy_version_statuses` table seeded with `Original` and `Endorsed`. Follows the same lookup pattern as `status_id` on policies. Implemented in Checkpoint C.

---

## OQ-STAT-003: Quote status `Draft` — rename to `Created`?

- **Raised:** 2026-05-19
- **Status:** Answered — 2026-05-19
- **Context:** The quote status `Draft` does not accurately reflect the concept. A quote that has been created and persisted is not a draft — it is a live record awaiting action. `Created` better matches domain language and aligns with the lifecycle progression (Created → Quoted → Bound → Issued).
- **Question:** Should the `Draft` quote status be renamed to `Created`?
- **Why it matters:** Affects `lookup_quote_statuses`, `quotes.service.ts` create/copy/markQuoted logic, all tests, and requirements documentation.
- **Answer:** Yes. Rename `Draft` → `Created` throughout. `lookup_quote_statuses` seed updated; `quotes.service.ts` `create()` and `copy()` now produce `status = 'Created'`; `markQuoted()` guard updated to check `!== 'Created'`. A migration script (`tools/migrate-quotes-draft-to-created.js`) handles existing production data. Implemented in Checkpoint B.

---

## OQ-STAT-004: `Declined` as a submission status — remove or keep?

- **Raised:** 2026-05-19
- **Status:** Answered — 2026-05-19
- **Context:** The legacy submission status set included `Declined`. In practice, a submission is not declined — individual quotes are declined. When all quotes are declined or the client withdraws, the submission moves to `Closed`.
- **Question:** Should `Declined` remain as a valid submission status?
- **Why it matters:** Determines whether `lookup_submission_statuses` retains the `Declined` row and whether `SUB-2024-004` (the only seeded `Declined` submission) needs to be updated.
- **Answer:** No. Remove `Declined` from `lookup_submission_statuses`. `Declined` is valid only as a quote status. Existing seed `SUB-2024-004` changed from `Declined` → `Closed`. Implemented in Checkpoint C.

---

## OQ-STAT-005: Renewal submission links — single FK or bidirectional pair?

- **Raised:** 2026-05-19
- **Status:** Answered — 2026-05-19
- **Context:** When a submission is renewed, a new submission is created. The expiring submission needs to know where its renewal went; the new submission needs to know its origin.
- **Question:** Should the renewal link be a single FK column on one of the two submissions, or a bidirectional pair of nullable columns on both?
- **Why it matters:** Determines how renewal chains are traversed in both directions (e.g. "show me the renewal of this submission" and "show me the submission this was renewed from").
- **Answer:** Bidirectional pair. Two nullable INT columns on `submission`:
  - `renewed_submission_id` — on the expiring submission; stores the ID of the new renewal submission.
  - `renewed_from_submission_id` — on the new renewal submission; stores the ID of the expiring submission.
  Both are nullable and have no DB-level FK constraint (to avoid circular dependency issues during inserts). Implemented in Checkpoint C.

---

## OQ-STAT-006: `Issued` status — add to quote and submission lifecycles?

- **Raised:** 2026-05-19
- **Status:** Answered — 2026-05-19
- **Context:** After a quote is bound and `issuePolicy()` runs, the quote stays in `Bound` status. This is incorrect — the quote has progressed beyond Bound to a policy being live. A quote with a successfully issued policy should be in a distinct terminal status.
- **Question:** Should `Issued` be added to the quote lifecycle and submission lifecycle? At what point does the transition happen?
- **Why it matters:** Without `Issued`, there is no way to distinguish a Bound-but-not-yet-issued quote from a Bound-and-issued quote. The submission status also cannot reflect "a policy has been issued from this submission" until `Issued` exists.
- **Answer:** Yes. Add `Issued` to `lookup_quote_statuses` (at `order_index` 4, after `Bound`). `issuePolicy()` in `quotes.service.ts` now sets `quote.status = 'Issued'` immediately after inserting the policy record. `Issued` also added to `lookup_submission_statuses` (at `order_index` 4). Submission status inheritance (setting the submission to `Issued`) is implemented in Checkpoint D. Implemented (quote side) in Checkpoint B; submission side in Checkpoint D.

---

## OQ-STAT-007: Full submission status set — what values?

- **Raised:** 2026-05-19
- **Status:** Answered — 2026-05-19
- **Context:** The legacy submission status set was `Open, Quoted, Declined, Closed, Disbanded` (5 values). With the removal of `Declined` and the addition of policy lifecycle states that a submission inherits, the full set needs to be redefined.
- **Question:** What is the complete set of valid submission statuses?
- **Why it matters:** Determines `lookup_submission_statuses` rows, seed data coverage, and the status filter options in the search form.
- **Answer:** 11 statuses, in order:
  1. `Open` (is_active: true) — submission is open and awaiting quotes
  2. `Quoted` (is_active: true) — at least one quote has been provided
  3. `Bound` (is_active: true) — a quote has been bound, pending issuance
  4. `Issued` (is_active: true) — policy has been issued
  5. `Active` (is_active: true) — linked policy is currently active
  6. `Expired` (is_active: false) — linked policy has expired
  7. `Cancelled` (is_active: false) — linked policy has been cancelled
  8. `Lapsed` (is_active: false) — linked policy has lapsed
  9. `Renewed` (is_active: false) — submission has been renewed into a new submission
  10. `Closed` (is_active: false) — submission has been closed (all quotes declined)
  11. `Disbanded` (is_active: false) — submission has been disbanded
  Implemented in Checkpoint C.

---

## OQ-STAT-008: Auto-decline sibling quotes on bind — configurable per organisation?

- **Raised:** 2026-05-19
- **Status:** Deferred
- **Context:** Checkpoint D implements `bind()` auto-decline: when a quote is bound, all other `Created`/`Quoted` quotes on the same submission are automatically set to `Declined`. This behaviour will be hardcoded initially.
- **Question:** Should auto-decline of sibling quotes on bind be configurable per organisation (e.g. some orgs may want to keep sibling quotes open for comparison or re-use)?
- **Why it matters:** If yes, a new org-level settings table and config flag are needed before the feature is shipped to production. If no, the behaviour is universal and no settings infrastructure is required.
- **Dependencies:** Blocked until org settings module is designed (not yet in scope). Checkpoint D implements the hardcoded version first.
- **Answer:** Deferred — implement as hardcoded auto-decline in Checkpoint D. Revisit when the org settings module is built.

---

## OQ-SETTINGS-001: Settings module sub-domain restructuring — agree folder names and page allocation

- **Raised:** 2026-05-19
- **Status:** Open
- **Context:** The `settings/` frontend module contains 7+ distinct concern areas (account administration, organisation details, product configuration, rating rules, platform admin, reporting config, data quality) in a flat folder. §12.7e now defines a sub-module nesting pattern with `settings/` as the canonical example.
- **Question:** Before any files are moved, agree: (a) the exact sub-folder names, (b) which pages and components belong to each sub-folder, (c) whether a top-level `settings.service.ts` is needed or services are per sub-module.
- **Why it matters:** File moves must be done in a single committed checkpoint with all imports updated. Starting without agreement risks partial restructuring.
- **Dependencies:** None — design decision only, no downstream blockers.
- **Answer:** Pending

---

## OQ-STAT-009: Legacy `submit()` and `decline()` statuses outside the 11-value set

- **Raised:** 2026-05-19
- **Status:** Open
- **Context:** `SubmissionsService.submit()` currently sets `status = 'In Review'` and `SubmissionsService.decline()` sets `status = 'Declined'`. Both values are absent from the 11-value status set defined in OQ-STAT-007 (`Open`, `Quoted`, `Bound`, `Issued`, `Active`, `Expired`, `Cancelled`, `Lapsed`, `Renewed`, `Closed`, `Disbanded`). The seeds in `004-lookup-submission-statuses.js` do not include either value.
- **Question:** What is the correct replacement status for (a) `submit()` — the action of submitting a submission for underwriter review, and (b) `decline()` — the action of an underwriter declining a submission?
- **Why it matters:** Until resolved, `submit()` and `decline()` will write values that are not in the lookup table, which will cause seed integrity failures and UI display gaps.
- **Dependencies:** Requires business clarification on whether 'In Review' and/or 'Declined' should be added to the 11-value set, or whether the methods should map to existing values.
- **Answer:** Pending

---

## OQ-STAT-010: Terminal status transitions — when should `updateStatusFromQuote` set `isActive = false`?

- **Raised:** 2026-05-19
- **Status:** Open
- **Context:** `updateStatusFromQuote()` is currently only called with `isActive = true` (for 'Bound' and 'Issued' transitions). REQ-SUB-BE-NE-F-C01 specifies that terminal statuses (`Expired`, `Cancelled`, `Lapsed`, `Renewed`, `Closed`, `Disbanded`) must set `is_active = false`. No service method currently calls `updateStatusFromQuote` with `isActive = false`.
- **Question:** Which service methods trigger terminal submission status transitions, and should they call `updateStatusFromQuote(submissionId, '<terminal>', false, orgCode)` directly or defer to the nightly reconciliation job?
- **Why it matters:** Without a clear ownership rule, terminal status + isActive transitions may be applied inconsistently (partly by service methods, partly by the nightly job), causing data integrity issues.
- **Dependencies:** Relates to OQ-STAT-011 (nightly reconciliation job scope).
- **Answer:** Pending

---

## OQ-STAT-011: Nightly `isActive` reconciliation job — scope and trigger mechanism

- **Raised:** 2026-05-19
- **Status:** Open
- **Context:** REQ-SUB-BE-NE-F-C01 references a nightly reconciliation job (Checkpoint E) that synchronises `is_active` with `status` for all submissions. This job is not yet designed or tracked as a formal checkpoint.
- **Question:** (a) What is the trigger mechanism (CRON, database event, admin-initiated)? (b) Should it operate only on records where `is_active` is inconsistent with the current status, or perform a full sweep? (c) Should it log a reconciliation audit trail? (d) What is the agreed Checkpoint label (Checkpoint E)?
- **Why it matters:** Without defining scope and trigger, the job cannot be estimated or spec'd. If omitted, submissions that miss the real-time transition calls will remain with stale `is_active` values.
- **Dependencies:** OQ-STAT-010 (defines which transitions are handled in real-time vs deferred to the job).
- **Answer:** Pending

---

## OQ-CHOME-001: Recent Records and My Tasks — report_templates subtype

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — 2026-06-29
- **Context:** The homepage widgets "Recent Records" and "My Tasks" are currently hardcoded in `HomeDashboard.tsx`. To promote them to the reporting stack they need a `type` in `report_templates`.
- **Question:** Should "Recent Records" and "My Tasks" use a new subtype (e.g. `type: 'widget'`) in `report_templates`, or be regular `type: 'core'` entries?
- **Answer:** "Recent Records" and "My Tasks" become standard `type: 'core'` entries in `report_templates` — no new subtype needed.

---

## OQ-CHOME-002: Homepage widget types — which types are supported?

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — 2026-06-29
- **Context:** A user configuring a dashboard as their homepage may want to add widgets of various types (table, chart, metric). The question was whether all types should be supported or only a subset.
- **Question:** Which widget types (table, chart, metric, text) should be supported when a user adds a widget to a homepage dashboard?
- **Answer:** Any widget type (table, chart, metric) — user defines the widget type, sees a live preview, and explicitly saves it.

---

## OQ-CHOME-003: Relationship between the Overview tab and the master homepage

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — 2026-06-29
- **Context:** The current `home/index.tsx` hardcodes an "Overview" tab backed by `HomeDashboard` (five fixed widgets). The configurable homepage must determine what happens to this tab.
- **Question:** Does the master homepage _replace_ the Overview tab, sit alongside it, or is the Overview tab removed and replaced entirely?
- **Answer:** The "Overview" tab is replaced by the master homepage dashboard. If a user has a dashboard set as "master homepage", that renders as the home page. If no master is set (or master is turned off), the Overview tab does not show. The default system-provided homepage is itself a pre-configured dashboard (same layout as the current Overview tab) which is set as master by default but can be changed.

---

## OQ-CHOME-004: Homepage configuration scope — per-user or per-organisation?

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — 2026-06-29
- **Context:** Dashboard configuration is currently per-user (dashboards in `report_templates` are created by individual users). The question was whether the master homepage pointer should be per-user, per-role, or per-organisation.
- **Question:** Is homepage configuration per-user or per-organisation?
- **Answer:** Per user only.

---

## OQ-CHOME-005: Where should the master homepage pointer be stored?

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — 2026-06-29
- **Context:** A pointer is needed to record which dashboard is a user's master homepage. Options included a new `homepages` table, a column on `users`, or a `user_preferences` table.
- **Question:** Which table/column should store the per-user `masterHomepageTemplateId` pointer?
- **Answer:** Homepages ARE dashboards stored in `report_templates`. No new homepage table is needed. Only a per-user pointer is required: `master_homepage_template_id` on the `users` table (or `user_preferences`). BA includes this in the DB Impact Analysis; final structure deferred to DBA. See REQ-HOME-CFG-DB-F-001.

---

## OQ-CHOME-006: New homepage config page or reuse existing dashboard infrastructure?

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — 2026-06-29
- **Context:** Creating a homepage could require a purpose-built configuration screen, or the existing `DashboardConfigurePage` / `DashboardCreatePage` infrastructure could be reused.
- **Question:** Should a new homepage-specific configuration page be built, or should the existing dashboard create/configure pages be reused?
- **Answer:** Reuse existing dashboard grid and `DashboardConfigurePage`. All existing Overview tab functionality (KPI strip, GWP charts, Recent Records, My Tasks) must be achievable via the dashboard widget model.

---

## OQ-CHOME-007: Can multiple dashboards be the master homepage simultaneously?

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — 2026-06-29
- **Context:** The `showOnHomepage` flag can be true on multiple dashboards for the same user. The question was whether more than one of those can be the "master" homepage (the one rendered at `/app-home`).
- **Question:** Can multiple dashboards be simultaneously designated as the user's master homepage?
- **Answer:** Every dashboard can have `show_on_homepage: true`. One of those can be designated the user's master homepage. Only one master at a time per user.

---

## OQ-CHOME-008: Is homepage configuration multi-tenant?

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — 2026-06-29
- **Context:** The platform is multi-tenant. The question was whether the master homepage configuration must carry explicit `tenant_id` scoping, or whether user-level scoping is sufficient.
- **Question:** Does the homepage configuration need explicit multi-tenant scoping (e.g. a `tenant_id` column on a `user_preferences` table)?
- **Answer:** Per-user (users are already tenant-scoped, so multi-tenant isolation is automatic). No additional `tenant_id` column is needed beyond what already exists on the `users` table.

---

## OQ-CHOME-009: HOME-CFG — Legacy `/api/recent-records-data` Route Disposition

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — SA 2026-06-30
- **Context:** The existing `RecentActivityWidget` calls `GET /api/recent-records-data` (handled by `DashboardController`). The formalised canonical endpoint for the promoted "Recent Records" core template is `GET /api/recent-records`.
- **Question:** Should the legacy route be kept as an alias, deprecated with notice, or removed immediately?
- **Why it matters:** Immediate removal breaks `RecentActivityWidget` before migration is complete. Keeping both routes permanently creates maintenance confusion.
- **References:** REQ-HOME-CFG-FE-F-008; `backend/nest/src/dashboard/dashboard.controller.ts`
- **Answer:** Alias + deprecate-with-notice. Add `@Get('recent-records')` to `DashboardController` pointing to the same `dashboardService.getRecentRecords()` handler. Add a `// @deprecated — use GET /api/recent-records` comment to the existing `@Get('recent-records-data')` handler. Formal route removal is deferred to a follow-up migration ticket. No callers are broken in the interim.

---

## OQ-CHOME-010: HOME-CFG — New-User Preference Seed Strategy

- **Raised:** 2026-06-29
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — SA 2026-06-30
- **Context:** When a user has no `user_homepage_preferences` row for a core template, the UI must decide whether to treat the absence as `show_on_homepage = false` (opt-in) or to rely on a system-default seed row.
- **Question:** Should the "Default Homepage" Dashboard toggle show as ON for all new users from an absent-row fallback, or only after the seed explicitly creates a preference row?
- **Why it matters:** Fallback logic creates implicit state invisible to the database. Seed rows are explicit and testable.
- **References:** REQ-HOME-CFG-FE-F-001; REQ-HOME-CFG-DB-F-002
- **Answer:** Explicit seed row. At new user creation the system creates an explicit `user_homepage_preferences` row for the "Default Homepage" template with `show_on_homepage = true` and `homepage_page_order = 1`. The UI always reads from the preferences table; there is no fallback. An absent row resolves to `false` via the column default, but the seed prevents new users from silently reaching that state.

---

## OQ-CHOME-011: HOME-CFG — Tenancy Column on `user_homepage_preferences`

- **Raised:** 2026-06-30
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — SA 2026-06-30
- **Context:** REQ-HOME-CFG-DB-F-002 specifies `tenant_id (FK → organizations.id)` on the new `user_homepage_preferences` table. However OQ-CHOME-008 (resolved at BA stage) already concluded that per-user isolation is sufficient. Additionally, the existing `users`, `report_templates`, and most other entities use `org_code` (varchar) for tenancy — not an integer `tenant_id` FK.
- **Question:** Should `user_homepage_preferences` use `tenant_id` INT FK (per formal architectural rule §05) or `org_code` varchar (consistent with existing implementation pattern)?
- **Why it matters:** A mixed `tenant_id`/`orgCode` data model within the same feature creates bridging complexity and confuses future developers.
- **References:** REQ-HOME-CFG-DB-F-002 AC-DB-002c; OQ-CHOME-008; `backend/nest/src/entities/user.entity.ts`; `backend/nest/src/entities/report-template.entity.ts`
- **Answer:** Use `org_code` (varchar NOT NULL), matching the existing `users` and `report_templates` patterns. OQ-CHOME-008 established that per-user isolation is sufficient — the `user_id` FK already scopes to a single tenant. REQ-HOME-CFG-DB-F-002 AC-DB-002c must be corrected from `tenant_id has a FK to organizations.id` to `org_code (varchar NOT NULL) stores the authenticated user's orgCode`.

---

## OQ-CHOME-012: HOME-CFG — `getDashboardWidgetData` Requires `userId`/`username` Injection

- **Raised:** 2026-06-30
- **Feature:** Configurable Homepage (HOME-CFG)
- **Status:** Resolved — SA 2026-06-30
- **Context:** `POST /api/dashboards/widgets/data` currently calls `reportingService.getDashboardWidgetData(req.user.orgCode, body.widget, body.filters)`. The proposed `recent-records` widget source requires user-scoped query filtering (matching the existing `DashboardService.getRecentRecords()` signature which takes `orgCode`, `userId`, and `username`).
- **Question:** Should `reporting.controller.ts` be updated to also pass `req.user.id` and `req.user.username` to the service method?
- **Why it matters:** Without user identity, the `recent-records` special-case handler in `ReportingService` cannot filter to the authenticated user's recent records. Passing all-org records instead would be a data scope violation.
- **References:** REQ-HOME-CFG-FE-F-010; `backend/nest/src/reporting/reporting.controller.ts`; `backend/nest/src/dashboard/dashboard.service.ts getRecentRecords()`
- **Answer:** Yes. `reporting.controller.ts` must pass `req.user.id` and `req.user.username` alongside `req.user.orgCode` to `getDashboardWidgetData`. This is an additive change to an internal method signature with no external API contract impact. `reporting.controller.ts` must be added to the BA Impact Analysis for this feature.