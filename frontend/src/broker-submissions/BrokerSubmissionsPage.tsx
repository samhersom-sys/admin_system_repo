/**
 * BrokerSubmissionsPage — /broker-submissions
 *
 * Domain: PSS-BRK-LIST
 * Requirements: BrokerSubmissionsPage.requirements.md
 * Tests: __tests__/BrokerSubmissionsPage.test.tsx
 *
 * Features:
 *  - Access guard: redirects non-broker / unauthenticated users (S-001/002)
 *  - Table of broker submissions for the authenticated org (F-001/002)
 *  - Empty state when no submissions exist (F-003)
 *  - Filter-empty state with clear-filters prompt (F-004)
 *  - Loading indicator while fetching (F-006)
 *  - Error state with retry button (F-007)
 *  - Source (type) and status filter controls (F-008/009/010)
 *  - Row click navigates to detail page (F-011)
 *  - "New Submission" button (F-012)
 *  - Sidebar "Broker Submissions" nav item registered for brokers (F-013/014)
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlusCircle, FiInbox } from 'react-icons/fi'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import {
  listBrokerSubmissions,
  type BrokerSubmission,
  type BrokerSubmissionFilters,
} from './broker-submissions.service'

// Module-level constant — RULE 9 compliance (must not be defined inside component)
const SIDEBAR_SECTION: SidebarSection = {
  title: 'Broker Submissions',
  items: [
    { label: 'Broker Submissions', icon: FiInbox, to: '/broker-submissions' },
    { label: 'New Submission', icon: FiPlusCircle, to: '/broker-submissions/new' },
  ],
}

const SOURCE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'manual', label: 'Manual' },
  { value: 'platform_shared', label: 'Platform Shared' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Created', label: 'Created' },
  { value: 'In Review', label: 'In Review' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Withdrawn', label: 'Withdrawn' },
]

function formatPremium(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(value)
}

export default function BrokerSubmissionsPage() {
  const navigate = useNavigate()
  const session = getSession()

  const orgType = (session?.user as Record<string, unknown>)?.['orgType'] as string | undefined
  const userRole = session?.user?.role
  const canAccess = orgType === 'broker' || userRole === 'internal_admin'

  // REQ-PSS-BRK-LIST-S-002 — unauthenticated redirect
  useEffect(() => {
    if (!session) {
      navigate('/login')
    }
  }, [session, navigate])

  // REQ-PSS-BRK-LIST-S-001/S-003 — non-broker, non-admin redirect
  useEffect(() => {
    if (session && !canAccess) {
      navigate('/')
    }
  }, [session, canAccess, navigate])

  // REQ-PSS-BRK-LIST-F-013/014 — sidebar section (only registered when access guard passes)
  useSidebarSection(canAccess ? SIDEBAR_SECTION : null)

  const [submissions, setSubmissions] = useState<BrokerSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const hasActiveFilters = sourceFilter !== '' || statusFilter !== ''

  const loadSubmissions = useCallback(() => {
    setLoading(true)
    setError(null)
    const filters: BrokerSubmissionFilters = {}
    if (sourceFilter) filters.source = sourceFilter
    if (statusFilter) filters.status = statusFilter
    listBrokerSubmissions(filters)
      .then(setSubmissions)
      .catch((err: Error) => setError(err.message ?? 'Failed to load submissions.'))
      .finally(() => setLoading(false))
  }, [sourceFilter, statusFilter])

  useEffect(() => {
    if (!canAccess) return
    loadSubmissions()
  }, [canAccess, loadSubmissions])

  if (!session || !canAccess) return null

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p role="heading" aria-level={1} className="text-xl font-semibold text-gray-900">
          Broker Submissions
        </p>
        <button
          type="button"
          onClick={() => navigate('/broker-submissions/new')}
          className="px-4 py-2 text-sm rounded bg-brand-600 text-white hover:bg-brand-700"
        >
          + New Submission
        </button>
      </div>

      {/* Filters — REQ-PSS-BRK-LIST-F-008/009 */}
      <div className="flex gap-3">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          aria-label="Filter by type"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Body */}
      {loading ? (
        <div
          aria-label="Loading submissions"
          className="flex items-center justify-center py-12"
        >
          <span className="text-sm text-gray-400 animate-pulse">Loading submissions…</span>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadSubmissions}
            className="ml-auto px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-100 text-xs"
          >
            Try again
          </button>
        </div>
      ) : submissions.length === 0 && !hasActiveFilters ? (
        /* REQ-PSS-BRK-LIST-F-003 — empty state, no filters */
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <FiInbox size={32} className="text-gray-300" />
          <p className="text-gray-500 text-sm">No submissions yet.</p>
          <p className="text-gray-400 text-xs">Click "New Submission" to get started.</p>
        </div>
      ) : submissions.length === 0 ? (
        /* REQ-PSS-BRK-LIST-F-004 — filter-empty state */
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-gray-500 text-sm">No submissions match the selected filters.</p>
          <button
            type="button"
            onClick={() => { setSourceFilter(''); setStatusFilter('') }}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* REQ-PSS-BRK-LIST-F-001/002 — table */
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Reference</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Insured</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Class of Business</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Est. Premium</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr
                  key={sub.id}
                  onClick={() => navigate(`/broker-submissions/${sub.id}`)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-500">{sub.reference ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.insuredName}</td>
                  <td className="px-4 py-3 text-gray-600">{sub.classOfBusiness ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {sub.estimatedPremium !== null ? formatPremium(sub.estimatedPremium) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {sub.source === 'platform_shared' ? 'Platform Shared' : 'Manual'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {sub.workflowStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
