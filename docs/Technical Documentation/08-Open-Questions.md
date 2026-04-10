# TECHNICAL DOCUMENTATION — 08: OPEN QUESTIONS

This is the live open questions log.  Every unresolved question about the architecture, domain boundaries, workflows, permissions, or migration approach is recorded here.

When a question is answered, the status changes from `Open` to `Answered` and the answer is recorded.  When a question is deliberately deferred, the status changes to `Deferred` with a reason.

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