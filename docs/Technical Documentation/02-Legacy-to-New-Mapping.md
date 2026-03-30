# TECHNICAL DOCUMENTATION — 02: LEGACY TO NEW ARCHITECTURE MAPPING

This document maps every significant file and feature in the legacy `policy-forge-chat (BackUp)` codebase to its place in the new `Cleaned` architecture.

---

## How to Read This Table

| Column | Meaning |
|--------|---------|
| **Legacy file / feature** | Path relative to `src/` or `backend/` in the legacy project |
| **Category** | Rewrite / Migrate / Extract / Delete / Preserve |
| **New location** | Where it goes in the new `Cleaned` folder |
| **Domain** | Which domain owns this logic |
| **Workflow** | Which workflow(s) this participates in |
| **Shared services** | Which shared services it should use |
| **Notes** | Migration-specific notes or concerns |

---

## Application Shell and Routing

| Legacy file | Category | New location | Notes |
|-------------|----------|-------------|-------|
| `src/App.jsx` | Rewrite | `app/shell/App.jsx` + `app/shell/Router.jsx` | Route definitions extracted to Router.jsx; context providers replaced by domain calls |
| `src/index.js` | Migrate | `app/shell/index.jsx` | Entry point — minimal changes |
| `src/components/RequireAuth.jsx` | Rewrite | `app/shell/RequireAuth.jsx` | Must use `auth-session` shared service; add permission check |
| `src/components/common/ProtectedRoute.jsx` | Merge into RequireAuth | `app/shell/RequireAuth.jsx` | Duplicate of RequireAuth — consolidate |
| `src/layouts/AppLayout/AppLayout.jsx` | Migrate | `app/layouts/AppLayout.jsx` | Layout shell preserved |
| `src/layouts/PublicLayout/PublicLayout.jsx` | Migrate | `app/layouts/PublicLayout.jsx` | Public layout shell preserved |
| `src/components/Navbar.jsx` | Migrate | `app/layouts/Navbar.jsx` | Navbar component |
| `src/components/NavbarInternal.jsx` | Migrate | `app/layouts/NavbarInternal.jsx` | Fix hardcoded colours — see Priority 1 in design token debt |
| `src/components/NavbarInternal.css` | Rewrite | (merge into global.css) | Replace bare hex with CSS vars |
| `src/components/Sidebar.jsx` | Migrate | `app/layouts/Sidebar.jsx` | |
| `src/components/Sidebar.css` | Rewrite | (merge into global.css) | Fix competing `:root` block — critical colour bug |
| `src/utils/lazyWithRetry.js` | Preserve | `shared/utils/lazyWithRetry.ts` | Utility for lazy-loading with retry |

---

## Authentication

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/context/userContext.jsx` | Rewrite | `shared/auth-session/auth-session.ts` | `auth` | Remove localStorage hacks; use proper token management |
| `src/layouts/PublicLayout/PublicLayoutPages/LoginPage.jsx` | Migrate | `app/pages/login/index.jsx` | `auth` | Tidy up, use auth domain |
| `backend/` (auth routes) | Rewrite | `backend/routes/auth.js` | `auth` | Add proper JWT middleware |
| `backend/middleware/` | Rewrite | `backend/middleware/auth.js` + `tenant.js` + `permissions.js` | Shared | Add tenant scoping and permission middleware |

---

## Submissions

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/context/submissionsContext.js` | Extract | `domains/submissions/submissions.ts` | `submissions` | State management → domain logic; enrichment logic → domain |
| `src/layouts/AppLayout/AppLayoutPages/Submission/SubmissionPage.jsx` | Rewrite | `app/pages/submissions/[id].jsx` | `submissions` | Use domain functions + api-client |
| `src/layouts/AppLayout/AppLayoutPages/Submission/SubmissionQuotes.jsx` | Rewrite | `app/pages/submissions/[id].jsx` (tab) | `submissions` / `quotes` | Integrate into submission page as a tab |
| `src/layouts/AppLayout/AppLayoutPages/Workflow/WorkflowPage.jsx` | Rewrite | `app/pages/workflow/submissions.jsx` | `submissions` | Assignment workflow UI; use submissions domain + permissions |
| `src/layouts/AppLayout/AppLayoutPages/Workflow/WorkflowDirectoryPage.jsx` | Migrate | `app/pages/workflow/index.jsx` | | Navigation page |
| `src/layouts/AppLayout/AppLayoutPages/Workflow/ClearanceWorkflowPage.jsx` | Rewrite | `app/pages/workflow/clearance.jsx` | `submissions` | Pending OQ-001 |
| `src/layouts/AppLayout/AppLayoutPages/Workflow/DataQualityPage.jsx` | Migrate | `app/pages/workflow/data-quality.jsx` | | Fix 62 hardcoded colour violations |
| `backend/` (submission routes) | Rewrite | `backend/routes/submissions.js` | `submissions` | Add org_code filtering |

---

## Quotes

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/context/quotesContext.jsx` | Extract | `domains/quotes/quotes.ts` | `quotes` | Context → domain logic |
| `src/layouts/AppLayout/AppLayoutPages/Quote/QuoteViewPage.jsx` | Rewrite | `app/pages/quotes/[id].jsx` | `quotes` | |
| `src/layouts/AppLayout/AppLayoutPages/Quote/QuoteSectionViewPage.jsx` | Rewrite | `app/pages/quotes/[id]/sections/[sectionId].jsx` | `quotes` | |
| `src/layouts/AppLayout/AppLayoutPages/Quote/QuoteCoverageDetailPage.jsx` | Rewrite | `app/pages/quotes/[id]/sections/[sectionId]/coverages/[coverageId].jsx` | `quotes` | |
| `src/layouts/AppLayout/AppLayoutPages/Quote/QuoteCoverageSubDetailPage.jsx` | Rewrite | Sub-page of coverage detail | `quotes` | |
| `src/components/common/SectionDeductions.jsx` | Extract | `domains/quotes/components/DeductionsPanel/` | `quotes` | Check for calculation logic inside component |
| `src/components/common/SectionParticipations.jsx` | Extract | `domains/quotes/components/ParticipationsPanel/` | `quotes` | Check for calculation logic inside component |
| `src/utils/premium.js` | Rewrite | `domains/quotes/quotes.ts` | `quotes` | Premium calculation → domain logic |
| `src/utils/financialViewCalculations.js` | Extract | `domains/quotes/quotes.ts` + possible shared | `quotes` | Pending OQ-003 |
| `src/components/common/FinancialViewToggle.jsx` | Migrate | `components/FinancialViewToggle/` | Primitive | No domain logic — safe to extract |
| `src/components/common/CopySectionsModal.jsx` | Extract | `domains/quotes/components/` (pending OQ-011) | `quotes` | Check if copy logic is domain logic |

---

## Policies

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/layouts/AppLayout/AppLayoutPages/Policy/PolicyViewPage.jsx` | Rewrite | `app/pages/policies/[id].jsx` | `policies` | |
| `src/layouts/AppLayout/AppLayoutPages/Policy/PolicySectionViewPage.jsx` | Rewrite | `app/pages/policies/[id]/sections/[sectionId].jsx` | `policies` | |
| `src/layouts/AppLayout/AppLayoutPages/Policy/PolicyEndorsement/` | Rewrite | `app/pages/policies/[id]/endorse.jsx` | `policies` | |
| `src/layouts/AppLayout/AppLayoutPages/Policy/PolicyEndorsePage.jsx` | Rewrite | Part of endorsement page | `policies` | |
| `src/components/common/Movement.jsx` | Extract | `domains/policies/components/MovementPanel/` (pending OQ-012) | `policies` | |
| `src/components/policy/PolicySectionDetailsHeader.jsx` | Extract | `domains/policies/components/PolicySectionHeader/` (pending OQ-013) | `policies` | |
| `src/utils/policyStatus.js` | Rewrite | `domains/policies/policies.ts` | `policies` | Status logic → domain |
| `backend/` (policy routes) | Rewrite | `backend/routes/policies.js` | `policies` | Add org_code filtering |

---

## Binding Authorities

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/layouts/AppLayout/AppLayoutPages/BindingAuthority/` | Rewrite | `app/pages/binding-authorities/` | `binding-authorities` | |
| `src/components/common/BindingAuthorityContractSearchModal.jsx` | Migrate | `components/` or `domains/binding-authorities/components/` | Pending | Check domain logic |
| `src/components/common/BindingAuthoritySearchModal.jsx` | Migrate | As above | Pending | |
| `src/components/common/BindingAuthoritySectionSearchModal.jsx` | Migrate | As above | Pending | |
| `src/utils/bordereauValidations.js` | Rewrite | `domains/binding-authorities/binding-authority.ts` | `binding-authorities` | Validation → domain logic |
| `backend/create-ba-*.js` | Preserve | `backend/migrations/` + `backend/seed-data/` | | Seeding scripts |

---

## Claims

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/context/claimsContext.jsx` | Rewrite | `domains/claims/claims.ts` | `claims` | |
| `src/layouts/AppLayout/AppLayoutPages/Claim/ClaimCreatePage.jsx` | Rewrite | `app/pages/claims/create.jsx` | `claims` | |
| `src/layouts/AppLayout/AppLayoutPages/Claim/ClaimViewPage.jsx` | Rewrite | `app/pages/claims/[id].jsx` | `claims` | |

---

## Parties

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/context/partiesContext.js` | Rewrite | `domains/parties/parties.ts` | `parties` | |
| `src/layouts/AppLayout/AppLayoutPages/Party/` | Rewrite | `app/pages/parties/` | `parties` | |
| `src/components/common/PartySearchModal*.jsx` | Extract | Part domain, part primitive | Pending | Search modal UI is primitive; party resolution is domain |
| `src/components/common/OrganisationSearchModal.jsx` | Extract | As above | Pending | |

---

## Finance

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/layouts/AppLayout/AppLayoutPages/Finance/` | Rewrite | `app/pages/finance/` | `finance` | Fix colour debt (see 7.4) |
| `src/utils/money.js` | Migrate | `shared/formatters/formatters.ts` | Shared | |
| `src/utils/tax.js` | Rewrite | `domains/finance/finance.ts` or `shared/formatters/` | Pending OQ-003 | |
| `src/utils/tax.test.js` | Migrate | Move with tax.js | | |

---

## Reporting

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/layouts/AppLayout/AppLayoutPages/Reporting/` | Rewrite | `app/pages/reports/` + `app/pages/dashboards/` | `reporting` | Fix major colour debt in AddWidgetModal.jsx |

---

## Settings

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/layouts/AppLayout/AppLayoutPages/Settings/` | Rewrite | `app/pages/settings/` | `settings` | |
| `src/config/fieldMetadata.js` | Migrate | `domains/settings/settings.ts` | `settings` | |
| `src/hooks/useFieldMetadata.js` | Rewrite | Domain function in `settings` | `settings` | |

---

## Notifications

| Legacy file | Category | New location | Domain | Notes |
|-------------|----------|-------------|--------|-------|
| `src/context/notificationContext.jsx` | Rewrite | `shared/notifications/notifications.ts` | Shared | Must scope to org_code correctly |

---

## Workspace

| Legacy file | Category | New location | Notes |
|-------------|----------|-------------|-------|
| `src/context/workspaceContext.jsx` | Evaluate | `app/shell/` or delete | The workspace/tab concept: is it needed in new architecture? See OQ-017 |
| `src/layouts/AppLayout/AppLayoutComponents/workspace/WorkspacePanel.jsx` | Evaluate | Same as above | |

---

## Hooks

| Legacy file | Category | New location | Notes |
|-------------|----------|-------------|-------|
| `src/hooks/useAudit.js` | Rewrite | `shared/audit/audit.ts` | Audit hook → shared service |
| `src/hooks/useFieldMetadata.js` | Rewrite | `domains/settings/settings.ts` | |
| `src/hooks/useResizableColumns.js` | Migrate | `components/ResizableGrid/` | UI utility |
| `src/hooks/useSectionLookups.js` | Rewrite | `shared/lookups/lookups.ts` | |
| `src/hooks/useSectionMovements.js` | Rewrite | `domains/policies/policies.ts` | Movement logic → domain |

---

## Utility Files

| Legacy file | Category | New location | Notes |
|-------------|----------|-------------|-------|
| `src/utils/apiBase.js` | Migrate | `shared/api-client/api-client.ts` | |
| `src/utils/apiBase.test.js` | Migrate | `shared/api-client/api-client.test.ts` | |
| `src/utils/addressNormalizer.js` | Migrate | `shared/formatters/formatters.ts` | |
| `src/utils/chartSetup.js` | Migrate | `shared/design-tokens/` or component | |
| `src/utils/dateFormat.js` | Migrate | `shared/formatters/formatters.ts` | |
| `src/utils/dirty.js` | Evaluate | Possible UI pattern utility | |
| `src/utils/errorLogger.js` | Migrate | `shared/utils/errorLogger.ts` | |
| `src/utils/formatters.js` | Migrate | `shared/formatters/formatters.ts` | |
| `src/utils/lazyWithRetry.js` | Preserve | `shared/utils/lazyWithRetry.ts` | |
| `src/utils/locationsScheduleApi.js` | Evaluate | Pending OQ-005 | |
| `src/utils/money.js` | Migrate | `shared/formatters/formatters.ts` | |
| `src/utils/policyStatus.js` | Rewrite | `domains/policies/policies.ts` | Business rule → domain |
| `src/utils/premium.js` | Rewrite | `domains/quotes/quotes.ts` | Business rule → domain |
| `src/utils/reference.js` | Migrate | `shared/formatters/formatters.ts` | |
| `src/utils/tableResizer.js` | Migrate | `components/ResizableGrid/` | UI utility |
| `src/utils/tax.js` | Evaluate | `domains/finance/` or `shared/formatters/` | Pending OQ-003 |
| `src/utils/textCase.js` | Migrate | `shared/formatters/formatters.ts` | |

---

## Data Files

| Legacy file | Category | New location | Notes |
|-------------|----------|-------------|-------|
| `src/data/countries.json` | Migrate | `shared/lookups/data/countries.json` | |
| `src/data/riskCodes.json` | Migrate | `shared/lookups/data/riskCodes.json` | |
| `src/data/taxTable.json` | Migrate | `shared/lookups/data/taxTable.json` | |
| `src/data/classRiskCodeMap.json` | Migrate | `shared/lookups/data/classRiskCodeMap.json` | |
| `src/data/countries.json` | Migrate | As above | |
| `src/data/regionsByCountry.json` | Migrate | `shared/lookups/data/` | |
| `src/data/subdivisionsByCountry.json` | Migrate | `shared/lookups/data/` | |
| `src/data/*.json` | Migrate | `shared/lookups/data/` | All reference data migrates to lookups shared service |

---

## Design Tokens

| Legacy file | Category | New location | Notes |
|-------------|----------|-------------|-------|
| `src/styles/brandColors.js` | Migrate | `shared/design-tokens/brandColors.ts` | |
| `src/styles/global.css` | Migrate | `shared/design-tokens/global.css` | Fix Sidebar.css and NavbarInternal.css competing `:root` blocks first |
| `src/index.css` | Evaluate | Merge with global.css or delete | |

---

## Homepage and Dashboard

| Legacy file | Category | New location | Notes |
|-------------|----------|-------------|-------|
| `src/layouts/AppLayout/AppLayoutPages/ApplicationHomePage.jsx` | Rewrite | `app/pages/home/HomeDashboard.jsx` | See Homepage Rebuild Plan |
| `src/layouts/AppLayout/AppLayoutPages/ApplicationHomePage/KpiCards.jsx` | Rewrite | `app/pages/home/HomeWidgets/KpiWidget.jsx` | |
| `src/layouts/AppLayout/AppLayoutPages/ApplicationHomePage/GwpChart.jsx` | Rewrite | `app/pages/home/HomeWidgets/GwpChartWidget.jsx` | |
| `src/layouts/AppLayout/AppLayoutPages/ApplicationHomePage/CumulativeGwpChart.jsx` | Rewrite | `app/pages/home/HomeWidgets/CumulativeGwpWidget.jsx` | |
| `src/layouts/AppLayout/AppLayoutPages/ApplicationHomePage/RecentRecords.jsx` | Rewrite | `app/pages/home/HomeWidgets/RecentActivityWidget.jsx` | |
| `src/layouts/AppLayout/AppLayoutPages/home/RecentRecords.jsx` | Delete | (duplicate of above) | |
| `src/layouts/AppLayout/AppLayoutComponents/chat/` | Evaluate | Pending — AI chat feature scope unclear | |

---

## Backend

| Legacy file | Category | New location | Notes |
|-------------|----------|-------------|-------|
| `backend/server.js` | Migrate | `backend/server.js` | Add tenant and permission middleware |
| `backend/db.js` | Preserve | `backend/db.js` | |
| `backend/routes/` | Rewrite | `backend/routes/` | Add org_code filtering to every route |
| `backend/middleware/` | Rewrite | `backend/middleware/` | Add tenant.js and permissions.js |
| `backend/services/` | Migrate | `backend/services/` | |
| `backend/email-scheduler.js` | Migrate | `backend/services/email-intake.js` | |
| `backend/document-generator.js` | Migrate | `backend/services/pdf.js` | |
| `backend/rating-api.js` | Migrate | `backend/services/rating.js` | |
| `backend/migrations/` | Preserve | `backend/migrations/` | |
| `backend/seed-data/` | Preserve | `backend/seed-data/` | |
| `backend/create-*.js` | Migrate | `backend/migrations/` or `backend/seed-data/` | Organise as proper migration files |

---

## Files to Delete (No Value in New Architecture)

| Legacy file | Reason |
|-------------|--------|
| `src/layouts/AppLayout/AppLayoutPages/home/RecentRecords.jsx` | Duplicate of ApplicationHomePage version |
| `src/utils/dirty.js` | Review — may be obsolete |
| `src/layouts/AppLayout/AppLayoutPageNotFound.jsx` | Acceptable to rewrite inline |
| `src/layouts/PublicLayout/PublicLayoutPageNotFound.jsx` | As above |

---

## Files Requiring Clarification Before Mapping

| Legacy file | Open question |
|-------------|--------------|
| `src/layouts/AppLayout/AppLayoutComponents/chat/` | OQ-018: AI chat dock — is this in scope for the new architecture? |
| `src/context/workspaceContext.jsx` | OQ-017: Is the workspace/tab concept required? |
| `src/utils/locationsScheduleApi.js` | OQ-005: Is locations schedule a separate domain? |
| `src/utils/financialViewCalculations.js` | OQ-003: Which domain owns whole/market/line calculations? |
| `src/utils/dirty.js` | OQ-019: What is this used for? Is it still needed? |
