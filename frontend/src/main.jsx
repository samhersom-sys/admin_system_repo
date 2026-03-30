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
import BindingAuthoritiesPage from '@/binding-authorities/index'
import ReportingPage from '@/reporting/index'
import FinancePage from '@/finance/index'
import SettingsPage from '@/settings/index'
import CompanyListPage from '@/settings/ModuleLicensing/CompanyListPage'
import CompanyConfigPage from '@/settings/ModuleLicensing/CompanyConfigPage'
import PartyListPage from '@/parties/PartyListPage/PartyListPage'
import CreatePartyPage from '@/parties/CreatePartyPage/CreatePartyPage'
// App shell features
import HomePage from './home/index'
import WorkflowPage from './workflow/index'
import SearchPage from './search/index'
import ProfilePage from './profile/index'
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
          <Route path="/policies"              element={<PoliciesPage />} />
          <Route path="/binding-authorities"   element={<BindingAuthoritiesPage />} />
          <Route path="/reports"               element={<ReportingPage />} />
          <Route path="/finance"               element={<FinancePage />} />
          <Route path="/workflow"              element={<WorkflowPage />} />
          <Route path="/settings"              element={<SettingsPage />} />
          <Route path="/settings/module-licensing"           element={<CompanyListPage />} />
          <Route path="/settings/module-licensing/:orgCode"  element={<CompanyConfigPage />} />
          <Route path="/settings/account"      element={<NotFound />} />
          <Route path="/settings/products"     element={<NotFound />} />
          <Route path="/settings/organisations" element={<NotFound />} />
          <Route path="/settings/rating-rules" element={<NotFound />} />
          <Route path="/settings/data-quality" element={<NotFound />} />
          <Route path="/parties"               element={<PartyListPage />} />
          <Route path="/parties/new"           element={<CreatePartyPage />} />
          <Route path="/search"               element={<SearchPage />} />
          <Route path="/profile"              element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)

