# PROJECT DOCUMENTATION — 02: DOMAIN DEFINITIONS

This document defines each domain in the new architecture.  For each domain, it describes what the domain owns, what it does not own, its public interface, and its known dependencies.

---

## How to Read This Document

Each domain entry includes:

- **Purpose** — Why this domain exists in one sentence
- **Owns** — The data and business rules this domain is responsible for
- **Does not own** — What is explicitly excluded (prevents scope creep)
- **Public interface** — The functions and events the domain exposes to callers
- **Publishes (events)** — Events this domain emits when things happen
- **Subscribes to (events)** — Events from other domains this domain reacts to (via workflows only)
- **Known legacy files** — Where the matching logic currently lives in the legacy codebase
- **Open questions** — Unresolved questions about this domain's boundaries

---

## Domain: `submissions`

**Purpose:** Owns the intake and lifecycle management of insurance submission records.

**Owns:**
- Submission records (reference, insured, broker, dates, class of business, estimated premium)
- Workflow status transitions (unassigned → assigned → in-review → quoted / declined)
- Assignment to underwriters
- AI extraction results and confidence scores
- Clearance check triggers and results (pending OQ-001 — see Open Questions)

**Does not own:**
- Quote creation (that is the `quotes` domain)
- Party records (that is the `parties` domain)
- Email ingestion logic (that is the `ai-email-intake` workflow)

**Public interface:**
- `createSubmission(data, tenantContext)`
- `assignSubmission(submissionId, assignTo, callerContext)`
- `updateStatus(submissionId, newStatus, callerContext)`
- `getSubmission(submissionId, tenantContext)`
- `listSubmissions(filters, tenantContext)`

**Publishes:**
- `submission.created`
- `submission.assigned`
- `submission.status-changed`
- `submission.declined`

**Known legacy files:**
- `src/context/submissionsContext.js` — global state management (to be replaced by domain logic + API calls)
- `src/layouts/AppLayout/AppLayoutPages/Submission/SubmissionPage.jsx` — view/edit page
- `src/layouts/AppLayout/AppLayoutPages/Submission/SubmissionQuotes.jsx` — quotes linked to a submission
- `src/layouts/AppLayout/AppLayoutPages/Workflow/WorkflowPage.jsx` — assignment workflow
- `backend/routes/` — submission API routes (to be identified)

**Open questions:**
- OQ-001: Is clearance checking part of Submissions or a separate domain?

---

## Domain: `quotes`

**Purpose:** Owns the structure, pricing, and lifecycle of insurance quotes.

**Owns:**
- Quote records (reference, status, method of placement, contract type)
- Quote sections (by class of business)
- Coverages within each section (limits, excesses, rates)
- Deductions (brokerage, overrider, commission) per section
- Participations (insurer line shares) per section
- Premium calculations at Whole, Market, and Line level
- Quote status transitions (draft → referred → accepted → declined / bound)

**Does not own:**
- The submission that originated the quote (that is the `submissions` domain)
- Policy binding (that is the `policies` domain)
- Rating rules configuration (that is the `settings` domain)

**Public interface:**
- `createQuote(submissionId, tenantContext)`
- `addSection(quoteId, sectionData, tenantContext)`
- `addCoverage(quoteId, sectionId, coverageData, tenantContext)`
- `addDeduction(quoteId, sectionId, deductionData, tenantContext)`
- `acceptQuote(quoteId, callerContext)`
- `declineQuote(quoteId, callerContext)`
- `getQuote(quoteId, tenantContext)`

**Publishes:**
- `quote.created`
- `quote.section-added`
- `quote.accepted`
- `quote.declined`
- `quote.referred`

**Known legacy files:**
- `src/context/quotesContext.jsx` — global quote state (to be replaced)
- `src/layouts/AppLayout/AppLayoutPages/Quote/QuoteViewPage.jsx`
- `src/layouts/AppLayout/AppLayoutPages/Quote/QuoteSectionViewPage.jsx`
- `src/layouts/AppLayout/AppLayoutPages/Quote/QuoteCoverageDetailPage.jsx`
- `src/layouts/AppLayout/AppLayoutPages/Quote/QuoteCoverageSubDetailPage.jsx`
- `src/components/common/SectionDeductions.jsx`
- `src/components/common/SectionParticipations.jsx`
- `src/utils/premium.js` — premium calculation logic
- `src/utils/financialViewCalculations.js` — whole/market/line view logic

---

## Domain: `policies`

**Purpose:** Owns bound insurance policies and all post-binding changes.

**Owns:**
- Policy records (bound from a quote)
- Policy sections and coverages (copied from the bound quote)
- Endorsements (mid-term changes)
- Movements (financial deltas per endorsement)
- Audit trail for all policy changes
- Invoice generation triggers (pending OQ-002)

**Does not own:**
- The quote that originated the policy (that is the `quotes` domain)
- Invoice records themselves (pending OQ-002 — Finance vs. Policy ownership)
- Claims linked to the policy (that is the `claims` domain)

**Public interface:**
- `bindPolicy(quoteId, tenantContext)`
- `createEndorsement(policyId, endorsementData, callerContext)`
- `recordMovement(policyId, endorsementId, movementData, callerContext)`
- `getPolicy(policyId, tenantContext)`
- `listPolicies(filters, tenantContext)`

**Publishes:**
- `policy.bound`
- `policy.endorsed`
- `policy.movement-recorded`

**Known legacy files:**
- `src/layouts/AppLayout/AppLayoutPages/Policy/PolicyViewPage.jsx`
- `src/layouts/AppLayout/AppLayoutPages/Policy/PolicySectionViewPage.jsx`
- `src/layouts/AppLayout/AppLayoutPages/Policy/PolicyEndorsement/`
- `src/components/common/Movement.jsx`
- `src/components/policy/PolicySectionDetailsHeader.jsx`
- `src/utils/policyStatus.js`

**Open questions:**
- OQ-002: Does the Policy domain own invoice generation, or does the Finance domain react to `policy.bound`?

---

## Domain: `binding-authorities`

**Purpose:** Owns delegated underwriting authority contracts and their transactions.

**Owns:**
- Binding authority (BA) contract records
- BA sections (authorised risk codes, capacity limits)
- BA participations (coverholder, insurer line shares)
- BA endorsements
- BA bordereaux transactions
- Document library for BA contracts

**Does not own:**
- Individual policies written under the BA (those are in the `policies` domain)
- Coverholder party records (those are in the `parties` domain)

**Public interface:**
- `createBindingAuthority(data, tenantContext)`
- `addSection(baId, sectionData, tenantContext)`
- `recordTransaction(baId, transactionData, tenantContext)`
- `getBindingAuthority(baId, tenantContext)`
- `listBindingAuthorities(filters, tenantContext)`

**Publishes:**
- `binding-authority.created`
- `binding-authority.endorsed`
- `binding-authority.transaction-recorded`

**Known legacy files:**
- `src/layouts/AppLayout/AppLayoutPages/BindingAuthority/`
- `src/components/common/BindingAuthorityContractSearchModal.jsx`
- `src/components/common/BindingAuthoritySearchModal.jsx`
- `src/components/common/BindingAuthoritySectionSearchModal.jsx`
- `backend/create-ba-*.js` (seeding scripts)
- `src/utils/bordereauValidations.js`

---

## Domain: `claims`

**Purpose:** Owns claim records and their financial lifecycle.

**Owns:**
- Claim records (linked to a policy)
- Claim transactions (payments, reserves)
- Claim status transitions
- Reserve calculations

**Does not own:**
- The policy the claim is against (that is the `policies` domain)

**Known legacy files:**
- `src/layouts/AppLayout/AppLayoutPages/Claim/ClaimCreatePage.jsx`
- `src/layouts/AppLayout/AppLayoutPages/Claim/ClaimViewPage.jsx`
- `src/context/claimsContext.jsx`

---

## Domain: `parties`

**Purpose:** Owns all participant records — organisations, brokers, insureds, coverholders, and insurers.

**Owns:**
- Party records (name, type, contact details, role)
- Org hierarchies (branches, departments)
- Insurer syndicate records

**Does not own:**
- User accounts (that is the `auth` domain)
- Party roles within specific contracts (those belong to the contract domain — Quote, BA etc.)

**Known legacy files:**
- `src/context/partiesContext.js`
- `src/layouts/AppLayout/AppLayoutPages/Party/`
- `src/components/common/PartySearchModal*.jsx`
- `src/components/common/OrganisationSearchModal.jsx`

---

## Domain: `finance`

**Purpose:** Owns financial records — invoices, payments, cash batching, and trial balance.

**Owns:**
- Invoice records
- Payment records
- Cash batching (grouping payments into settlement batches)
- Trial balance reporting data

**Known legacy files:**
- `src/layouts/AppLayout/AppLayoutPages/Finance/`
- `src/utils/financialViewCalculations.js` (shared with quotes — needs review)
- `src/utils/money.js`
- `src/utils/tax.js`

---

## Domain: `reporting`

**Purpose:** Owns custom reports and configurable dashboards.

**Owns:**
- Report definitions (selected fields, filters, schedule)
- Dashboard configurations (widget layout, widget config)
- Dashboard widget types

**Known legacy files:**
- `src/layouts/AppLayout/AppLayoutPages/Reporting/`

---

## Domain: `settings`

**Purpose:** Owns tenant-configurable platform settings.

**Owns:**
- Rating rules and schedules
- Product definitions and configurations
- Field metadata (labels, visibility, validation rules per field)
- Organisation configuration
- Account administration
- Data quality rules configuration

**Known legacy files:**
- `src/layouts/AppLayout/AppLayoutPages/Settings/`
- `src/config/fieldMetadata.js`
- `src/hooks/useFieldMetadata.js`

---

## Domain: `auth`

**Purpose:** Owns user identity, authentication, and session management.

**Owns:**
- Login / logout
- Session token issuance and validation
- User account records (username, email, role, org code)
- Password management

**Does not own:**
- Role permission definitions (those are the `permissions` shared service)
- User profile display (that is the `profile` page)

**Known legacy files:**
- `src/context/userContext.jsx`
- `src/components/RequireAuth.jsx`
- `src/components/common/ProtectedRoute.jsx`
- `src/layouts/PublicLayout/PublicLayoutPages/LoginPage.jsx`
- `backend/` — auth routes and JWT middleware

---

## Unresolved Domain Boundary Questions

See `Technical Documentation/08-Open-Questions.md` for all open questions.  Specifically:

- OQ-001: Clearance — Submissions domain or its own domain?
- OQ-002: Invoice ownership — Policy domain or Finance domain?
- OQ-003: Financial view calculations (whole/market/line) — Quotes domain, Finance domain, or shared service?
- OQ-004: User profile — Auth domain or a thin page with no domain?
- OQ-005: Location schedule — Is this part of the Quotes domain or a separate domain?
