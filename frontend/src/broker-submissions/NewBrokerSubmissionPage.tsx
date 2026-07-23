/**
 * NewBrokerSubmissionPage — /broker-submissions/new
 *
 * Domain: PSS-BRK-NEW
 * Requirements: NewBrokerSubmissionPage.requirements.md
 * Tests: __tests__/NewBrokerSubmissionPage.test.tsx
 *
 * Features:
 *  - Access guard: redirects non-broker / unauthenticated (S-001/002)
 *  - Form with all required and optional fields (F-001)
 *  - Type selection mandatory with plain-language descriptions (F-002/003)
 *  - Estimated premium and broker reference are optional (F-004/005)
 *  - Expiry date defaults to inception + 1 year (F-006)
 *  - Validation: insured name, inception date, type required; expiry >= inception (F-007/008/009)
 *  - Loading indicator while saving (F-010)
 *  - Navigate to detail on success (F-011)
 *  - Error message + data preserved on failure (F-012)
 *  - Unsaved-changes banner after any edit (F-013)
 *  - Confirm before navigating away (F-014)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSave, FiInbox } from 'react-icons/fi'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import { createBrokerSubmission } from './broker-submissions.service'
import Card from '@/shared/Card/Card'
import SearchableSelect from '@/shared/components/SearchableSelect/SearchableSelect'

// REQ-PSS-BRK-NEW — agreed type descriptions (REQ-PSS-BRK-NEW-F-002)
const TYPE_OPTIONS = [
  {
    value: 'platform_shared',
    label: 'Platform Shared',
    description: 'I intend to share this submission with insurers through the platform.',
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'I will manage placement of this risk outside the platform (by phone, email, or paper).',
  },
]
const TYPE_LABELS = TYPE_OPTIONS.map((o) => o.label)

// Module-level constant — RULE 9 compliance
const SIDEBAR_SECTION: SidebarSection = {
  title: 'Broker Submissions',
  items: [
    { label: 'Save', icon: FiSave, event: 'broker-submission:save' },
    { label: 'Broker Submissions', icon: FiInbox, to: '/broker-submissions' },
  ],
}

/** Returns yyyy-mm-dd for one year after the given yyyy-mm-dd string */
function addOneYear(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export default function NewBrokerSubmissionPage() {
  const navigate = useNavigate()
  const session = getSession()
  const { addNotification } = useNotifications()

  // REQ-PSS-BRK-NEW-S-002
  useEffect(() => {
    if (!session) navigate('/login')
  }, [session, navigate])

  // REQ-PSS-BRK-NEW-S-001 / S-003 — allow broker orgs and platform admins; redirect everyone else to home
  const userOrgType = (session?.user as Record<string, unknown>)?.['orgType'] as string | undefined
  const isAdmin = session?.user?.role === 'internal_admin'
  useEffect(() => {
    if (session && userOrgType !== 'broker' && !isAdmin) {
      navigate('/app-home')
    }
  }, [session, userOrgType, isAdmin, navigate])

  useSidebarSection(SIDEBAR_SECTION)

  // Form state
  const [insuredName, setInsuredName] = useState('')
  const [classOfBusiness, setClassOfBusiness] = useState('')
  const [inceptionDate, setInceptionDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [type, setType] = useState('platform_shared') // REQ-PSS-BRK-NEW-F-002 — default to Platform Shared
  const [estimatedPremium, setEstimatedPremium] = useState('')
  const [reference, setReference] = useState('')

  // UX state
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // REQ-PSS-BRK-NEW-F-006 — auto-set expiry when inception changes
  const handleInceptionChange = useCallback((val: string) => {
    setInceptionDate(val)
    setExpiryDate(addOneYear(val))
    setIsDirty(true)
  }, [])

  // REQ-PSS-BRK-NEW-F-013 — any field edit marks form dirty
  const markDirty = useCallback(() => setIsDirty(true), [])

  // REQ-PSS-BRK-NEW-F-014 — beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // REQ-PSS-BRK-NEW-S-003 — push admin notice to notification panel once on mount
  const didNotifyAdmin = useRef(false)
  useEffect(() => {
    if (isAdmin && !didNotifyAdmin.current) {
      didNotifyAdmin.current = true
      void addNotification(
        'Platform administrators can view this form but cannot create broker submissions.',
        'info',
      )
    }
  }, [isAdmin, addNotification])

  // REQ-PSS-BRK-NEW-F-012 — push unsaved-changes notice to notification panel (once when first dirty)
  const didNotifyDirty = useRef(false)
  useEffect(() => {
    if (isDirty && !didNotifyDirty.current) {
      didNotifyDirty.current = true
      void addNotification('Unsaved changes', 'warning')
    }
  }, [isDirty, addNotification])

  // Sidebar save event listener
  useEffect(() => {
    const handler = () => handleSubmit()
    window.addEventListener('broker-submission:save', handler)
    return () => window.removeEventListener('broker-submission:save', handler)
  })

  const handleSubmit = useCallback(async () => {
    // REQ-PSS-BRK-NEW-S-003 — admin cannot create broker submissions
    if (isAdmin) return
    // Prevent double-submission while save is in flight
    if (saving) return
    setValidationError(null)
    setError(null)

    // REQ-PSS-BRK-NEW-F-007
    if (!insuredName.trim()) {
      setValidationError('Insured name is required.')
      return
    }
    // REQ-PSS-BRK-NEW-F-008
    if (!inceptionDate) {
      setValidationError('Inception date is required.')
      return
    }
    // REQ-PSS-BRK-NEW-F-002
    if (!type) {
      setValidationError('Submission type is required.')
      return
    }
    // REQ-PSS-BRK-NEW-F-009
    if (expiryDate && expiryDate < inceptionDate) {
      setValidationError('Expiry date must be on or after the inception date.')
      return
    }

    setSaving(true)
    try {
      const result = await createBrokerSubmission({
        insuredName: insuredName.trim(),
        inceptionDate,
        source: type,
        classOfBusiness: classOfBusiness.trim() || null,
        expiryDate: expiryDate || null,
        estimatedPremium: estimatedPremium ? Number(estimatedPremium) : null,
        reference: reference.trim() || null,
      })
      setIsDirty(false)
      // REQ-PSS-BRK-NEW-F-011
      navigate(`/broker-submissions/${result.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create submission. Please try again.'
      // REQ-PSS-BRK-NEW-F-012 — error shown, form data preserved (state unchanged)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }, [insuredName, inceptionDate, type, expiryDate, classOfBusiness, estimatedPremium, reference, navigate, saving, isAdmin])

  if (!session || (userOrgType !== 'broker' && !isAdmin)) {
    return null
  }

  const displayError = validationError || error

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Identity header — mirrors SubmissionIdentity pattern (§14.2) */}
      <Card>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Title</p>
            <span className="text-sm font-semibold text-gray-800">New Broker Submission</span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Status</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              Draft
            </span>
          </div>
        </div>
      </Card>

      {/* REQ-PSS-BRK-NEW-F-010 — loading indicator while saving */}
      {saving && (
        <span aria-label="Saving submission" className="text-sm text-gray-400 animate-pulse">
          Saving…
        </span>
      )}

      {/* Validation / Error */}
      {displayError && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {displayError}
        </div>
      )}

      {/* Risk Details — Submission Type, Insured + Class of Business */}
      <Card title="Risk Details">
        <div className="flex flex-col gap-4">
          {/* Submission Type — REQ-PSS-BRK-NEW-F-002/003 */}
          <div className="flex flex-col gap-1">
            <label htmlFor="submissionType" className="text-sm font-medium text-gray-700">
              Submission type <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              id="submissionType"
              ariaLabel="Submission type"
              placeholder="Select submission type..."
              value={TYPE_OPTIONS.find((o) => o.value === type)?.label ?? ''}
              options={TYPE_LABELS}
              onChange={(label) => {
                const opt = TYPE_OPTIONS.find((o) => o.label === label)
                if (opt) { setType(opt.value); markDirty() }
              }}
            />
            {TYPE_OPTIONS.find((o) => o.value === type)?.description && (
              <p className="text-xs text-gray-500">
                {TYPE_OPTIONS.find((o) => o.value === type)?.description}
              </p>
            )}
          </div>
          {/* Insured Name — REQ-PSS-BRK-NEW-F-007 required */}
          <div className="flex flex-col gap-1">
            <label htmlFor="insuredName" className="text-sm font-medium text-gray-700">
              Insured name <span className="text-red-500">*</span>
            </label>
            <input
              id="insuredName"
              type="text"
              value={insuredName}
              onChange={(e) => { setInsuredName(e.target.value); markDirty() }}
              aria-label="Insured name"
              placeholder="e.g. Acme Corporation"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Class of Business */}
          <div className="flex flex-col gap-1">
            <label htmlFor="classOfBusiness" className="text-sm font-medium text-gray-700">
              Class of business
            </label>
            <input
              id="classOfBusiness"
              type="text"
              value={classOfBusiness}
              onChange={(e) => { setClassOfBusiness(e.target.value); markDirty() }}
              aria-label="Class of business"
              placeholder="e.g. Property"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      </Card>

      {/* Submission Details — Dates, Premium, Reference */}
      <Card title="Submission Details">
        <div className="flex flex-col gap-4">
          {/* Dates row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Inception Date — REQ-PSS-BRK-NEW-F-008 required */}
            <div className="flex flex-col gap-1">
              <label htmlFor="inceptionDate" className="text-sm font-medium text-gray-700">
                Inception date <span className="text-red-500">*</span>
              </label>
              <input
                id="inceptionDate"
                type="date"
                value={inceptionDate}
                onChange={(e) => handleInceptionChange(e.target.value)}
                aria-label="Inception date"
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Expiry Date — REQ-PSS-BRK-NEW-F-006/009 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="expiryDate" className="text-sm font-medium text-gray-700">
                Expiry date
              </label>
              <input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => { setExpiryDate(e.target.value); markDirty() }}
                aria-label="Expiry date"
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Est. Premium — REQ-PSS-BRK-NEW-F-004 optional */}
          <div className="flex flex-col gap-1">
            <label htmlFor="estimatedPremium" className="text-sm font-medium text-gray-700">
              Estimated premium
            </label>
            <input
              id="estimatedPremium"
              type="number"
              min={0}
              value={estimatedPremium}
              onChange={(e) => { setEstimatedPremium(e.target.value); markDirty() }}
              aria-label="Estimated premium"
              placeholder="e.g. 50000"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Broker Reference — REQ-PSS-BRK-NEW-F-005 optional */}
          <div className="flex flex-col gap-1">
            <label htmlFor="reference" className="text-sm font-medium text-gray-700">
              Broker reference
            </label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => { setReference(e.target.value); markDirty() }}
              aria-label="Broker reference"
              placeholder="Optional internal reference number"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
