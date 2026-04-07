import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import { getSession } from '@/shared/lib/auth-session/auth-session'
import ErrorBoundary from '@/shared/ErrorBoundary/ErrorBoundary'
import AppLayout from './shell/AppLayout'
// Domain pages
import LoginPage from '@/auth/LoginPage'
import NewSubmissionPage from '@/submissions/NewSubmissionPage'
import SubmissionViewPage from '@/submissions/SubmissionViewPage'
import QuotesPage from '@/quotes/index'
import NewQuotePage from '@/quotes/NewQuotePage/NewQuotePage'
import QuoteViewPage from '@/quotes/QuoteViewPage/QuoteViewPage'
import QuoteSectionViewPage from '@/quotes/QuoteSectionViewPage/QuoteSectionViewPage'
import PoliciesPage from '@/policies/index'
import PoliciesListPage from '@/policies/PoliciesListPage/PoliciesListPage'
import PolicyViewPage from '@/policies/PolicyViewPage/PolicyViewPage'
import PolicySectionViewPage from '@/policies/PolicySectionViewPage/PolicySectionViewPage'
import PolicyEndorsePage from '@/policies/PolicyEndorsePage/PolicyEndorsePage'
import PolicyEndorsementPage from '@/policies/PolicyEndorsementPage/PolicyEndorsementPage'
import PolicyCoverageDetailPage from '@/policies/PolicyCoverageDetailPage/PolicyCoverageDetailPage'
import PolicyCoverageSubDetailPage from '@/policies/PolicyCoverageSubDetailPage/PolicyCoverageSubDetailPage'
import QuoteCoverageDetailPage from '@/quotes/QuoteCoverageDetailPage/QuoteCoverageDetailPage'
import QuoteCoverageSubDetailPage from '@/quotes/QuoteCoverageSubDetailPage/QuoteCoverageSubDetailPage'
// Finance
import FinanceHubPage from '@/finance/FinanceHubPage/FinanceHubPage'
import CashBatchingPage from '@/finance/CashBatchingPage/CashBatchingPage'
import CashBatchingCreatePage from '@/finance/CashBatchingPage/CashBatchingCreatePage'
import InvoicesPage from '@/finance/InvoicesPage/InvoicesPage'
import PaymentsPage from '@/finance/PaymentsPage/PaymentsPage'
import TrialBalancePage from '@/finance/TrialBalancePage/TrialBalancePage'
// Reporting
import ReportsListPage from '@/reporting/ReportsListPage/ReportsListPage'
import ReportCreatePage from '@/reporting/ReportCreatePage/ReportCreatePage'
import ReportRunPage from '@/reporting/ReportRunPage/ReportRunPage'
// Binding Authorities
import BAListPage from '@/binding-authorities/BAListPage/BAListPage'
import NewBAPage from '@/binding-authorities/NewBAPage/NewBAPage'
import BAViewPage from '@/binding-authorities/BAViewPage/BAViewPage'
import BASectionViewPage from '@/binding-authorities/BASectionViewPage/BASectionViewPage'
import SettingsPage from '@/settings/index'
import CompanyListPage from '@/settings/ModuleLicensing/CompanyListPage'
import CompanyConfigPage from '@/settings/ModuleLicensing/CompanyConfigPage'
import RatingRulesPage from '@/settings/RatingRulesPage'
import RatingRulesDetailPage from '@/settings/RatingRulesDetailPage'
import ProductListPage from '@/settings/ProductListPage'
import ProductConfigPage from '@/settings/ProductConfigPage'
import DataQualitySettingsPage from '@/settings/DataQualitySettingsPage'
import OrganisationDetailPage from '@/settings/OrganisationDetailPage'
import PartyListPage from '@/parties/PartyListPage/PartyListPage'
import CreatePartyPage from '@/parties/CreatePartyPage/CreatePartyPage'
import PartyViewPage from '@/parties/PartyViewPage/PartyViewPage'
// Claims
import ClaimsListPage from '@/claims/ClaimsListPage/ClaimsListPage'
import ClaimViewPage from '@/claims/ClaimViewPage/ClaimViewPage'
// App shell features
import HomePage from './home/index'
// Workflow
import WorkflowDirectoryPage from './workflow/WorkflowDirectoryPage/WorkflowDirectoryPage'
import WorkflowSubmissionsPage from './workflow/WorkflowPage/WorkflowPage'
import ClearanceWorkflowPage from './workflow/ClearanceWorkflowPage/ClearanceWorkflowPage'
import DataQualityPage from './workflow/DataQualityPage/DataQualityPage'
import SearchPage from './search/index'
import ProfilePage from './profile/ProfilePage'
import NotFound from './not-found/index'
import InstallBanner from './pwa/InstallBanner'
import { registerServiceWorker } from './pwa/registerServiceWorker'

registerServiceWorker()

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Keeps auth logic in one place; never duplicated per-route.
 */
function ProtectedRoute({ children }) {
  return getSession() ? children : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <InstallBanner />
        <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated — all share AppLayout (sidebar + content) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/app-home"             element={<HomePage />} />
          {/* OQ-047 CLOSED: No SubmissionsListPage needed.
               The "Submissions" sidebar header is contextual — it only appears when viewing
               a submission record. Users find submissions via Search (all record types indexed).
               This redirect ensures /submissions doesn't 404 if navigated to directly. */}
          <Route path="/submissions"             element={<Navigate to="/search" replace />} />
          <Route path="/submissions/new"        element={<NewSubmissionPage />} />
          <Route path="/submissions/:id"        element={<SubmissionViewPage />} />
          <Route path="/quotes"                element={<QuotesPage />} />
          <Route path="/quotes/new"           element={<NewQuotePage />} />
          <Route path="/quotes/:id"           element={<QuoteViewPage />} />
          <Route path="/quotes/:id/sections/:sectionId" element={<QuoteSectionViewPage />} />
          <Route path="/quotes/:id/sections/:sectionId/coverages/:coverageId" element={<QuoteCoverageDetailPage />} />
          <Route path="/quotes/:id/sections/:sectionId/coverages/:coverageId/details/:detailName" element={<QuoteCoverageSubDetailPage />} />
          <Route path="/policies"              element={<PoliciesListPage />} />
          <Route path="/policies/endorse/:id"  element={<PolicyEndorsePage />} />
          <Route path="/policies/:id"          element={<PolicyViewPage />} />
          <Route path="/policies/:id/endorsements/:endorsementId/edit" element={<PolicyEndorsementPage />} />
          <Route path="/policies/:policyId/sections/:sectionId" element={<PolicySectionViewPage />} />
          <Route path="/policies/:policyId/sections/:sectionId/coverages/:coverageId" element={<PolicyCoverageDetailPage />} />
          <Route path="/policies/:policyId/sections/:sectionId/coverages/:coverageId/details/:detailName" element={<PolicyCoverageSubDetailPage />} />
          {/* Binding Authorities */}
          <Route path="/binding-authorities"                           element={<BAListPage />} />
          <Route path="/binding-authorities/new"                      element={<NewBAPage />} />
          <Route path="/binding-authorities/:id"                      element={<BAViewPage />} />
          <Route path="/binding-authorities/:id/sections/:sectionId" element={<BASectionViewPage />} />
          {/* Reporting */}
          <Route path="/reports"               element={<ReportsListPage />} />
          <Route path="/reports/create"        element={<ReportCreatePage />} />
          <Route path="/reports/edit/:id"      element={<ReportCreatePage />} />
          <Route path="/reports/run/:reportId" element={<ReportRunPage />} />
          {/* Finance */}
          <Route path="/finance"                      element={<FinanceHubPage />} />
          <Route path="/finance/cash-batching"        element={<CashBatchingPage />} />
          <Route path="/finance/cash-batching/create" element={<CashBatchingCreatePage />} />
          <Route path="/finance/invoices"             element={<InvoicesPage />} />
          <Route path="/finance/payments"             element={<PaymentsPage />} />
          <Route path="/finance/trial-balance"        element={<TrialBalancePage />} />
          {/* Workflow */}
          <Route path="/workflow"                  element={<WorkflowDirectoryPage />} />
          <Route path="/workflow/submissions"      element={<WorkflowSubmissionsPage />} />
          <Route path="/workflow/clearance"        element={<ClearanceWorkflowPage />} />
          <Route path="/workflow/data-quality"     element={<DataQualityPage />} />
          <Route path="/settings"              element={<SettingsPage />} />
          <Route path="/settings/module-licensing"           element={<CompanyListPage />} />
          <Route path="/settings/module-licensing/:orgCode"  element={<CompanyConfigPage />} />
          <Route path="/settings/account"      element={<NotFound />} />
          <Route path="/settings/products"     element={<ProductListPage />} />
          <Route path="/settings/products/:id" element={<ProductConfigPage />} />
          <Route path="/settings/organisation" element={<OrganisationDetailPage />} />
          <Route path="/settings/organisation/new" element={<OrganisationDetailPage />} />
          <Route path="/settings/organisations" element={<OrganisationDetailPage />} />
          <Route path="/settings/rating-rules" element={<RatingRulesPage />} />
          <Route path="/settings/rating-rules/:id" element={<RatingRulesDetailPage />} />
          <Route path="/settings/data-quality" element={<DataQualitySettingsPage />} />
          <Route path="/parties"               element={<PartyListPage />} />
          <Route path="/parties/new"           element={<CreatePartyPage />} />
          <Route path="/parties/:id"           element={<PartyViewPage />} />
          {/* Claims */}
          <Route path="/claims"                element={<ClaimsListPage />} />
          <Route path="/claims/:id"            element={<ClaimViewPage />} />
          <Route path="/search"               element={<SearchPage />} />
          <Route path="/profile"              element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)

