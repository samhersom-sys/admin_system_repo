/**
 * NewQuotePage — /quotes/new
 *
 * Requirements: domains/quotes/components/quotes.requirements.md
 * Tests: domains/quotes/components/quotes.test.tsx
 *
 * Compose:
 *  - InsuredSearch (party link)
 *  - QuoteForm fields (business type, dates, currency)
 *  - Sidebar Save action fires 'submission:save' DOM event
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiSave, FiTrash2 } from 'react-icons/fi'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import { createQuote, defaultQuoteExpiry } from '@/quotes/quotes.service'
import { getSubmission } from '@/submissions/submissions.service'
import type { Submission } from '@/submissions/submissions.service'
import InsuredSearch from '@/parties/InsuredSearch/InsuredSearch'
import type { Party } from '@/parties/parties.service'
import SubmissionSearch from '@/submissions/SubmissionSearch/SubmissionSearch'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'

// ---------------------------------------------------------------------------
// Sidebar section
// ---------------------------------------------------------------------------

const SIDEBAR_SECTION: SidebarSection = {
    title: 'Quote',
    items: [
        { label: 'Save', icon: FiSave, event: 'submission:save' },
    ],
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewQuotePage() {
    const navigate = useNavigate()
    const session = getSession()
    const orgCode = session?.user?.orgCode ?? 'ORG'
    const createdBy = session?.user?.name ?? 'Unknown'
    const { addNotification } = useNotifications()

    const [searchParams] = useSearchParams()
    // Accept only the canonical camelCase param — legacy snake_case is not supported
    const submissionParam = searchParams.get('submissionId')
    const linkedSubmissionId = submissionParam ? Number(submissionParam) : null

    const [insuredParty, setInsuredParty] = useState<Party | null>(null)
    const [insuredError, setInsuredError] = useState<string | null>(null)
    const [linkedSubmission, setLinkedSubmission] = useState<Submission | null>(null)
    const [submissionError, setSubmissionError] = useState<string | null>(null)
    const [businessType, setBusinessType] = useState('Insurance')
    const [inceptionDate, setInceptionDate] = useState('')
    const [expiryDate, setExpiryDate] = useState('')
    const [quoteCurrency, setQuoteCurrency] = useState('USD')
    const [saveError, setSaveError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    useSidebarSection(SIDEBAR_SECTION)

    useEffect(() => {
        if (!linkedSubmissionId || insuredParty) return

        let cancelled = false
        getSubmission(linkedSubmissionId)
            .then((submission) => {
                if (cancelled) return
                setLinkedSubmission(submission)
                if (!submission?.insured) return
                setInsuredParty({
                    id: Number(submission.insuredId),
                    name: submission.insured,
                    type: 'Insured',
                    orgCode: submission.createdByOrgCode,
                })
                setInsuredError(null)
            })
            .catch((err: unknown) => {
                if (cancelled) return
                const msg = err instanceof Error ? err.message : 'Failed to load linked submission.'
                addNotification(`Could not load linked submission: ${msg}`, 'warning')
            })

        return () => {
            cancelled = true
        }
    }, [linkedSubmissionId, insuredParty, addNotification])

    // Default expiry when inception changes
    useEffect(() => {
        if (inceptionDate && !expiryDate) {
            setExpiryDate(defaultQuoteExpiry(inceptionDate))
        }
    }, [inceptionDate]) // eslint-disable-line react-hooks/exhaustive-deps

    // Save handler — triggered by sidebar 'submission:save' event
    const handleSave = useCallback(async () => {
        if (!insuredParty) {
            setInsuredError('Please select an insured before saving.')
            addNotification('Quote not saved: insured is required.', 'error')
            return
        }
        const effectiveSubmissionId = linkedSubmission?.id ?? linkedSubmissionId
        if (!effectiveSubmissionId) {
            setSubmissionError('Please link a submission before saving.')
            addNotification('Quote not saved: a linked submission is required.', 'error')
            return
        }
        if (!inceptionDate) {
            setSaveError('Inception Date is required.')
            addNotification('Quote not saved: inception date is required.', 'error')
            return
        }
        setIsSaving(true)
        setSaveError(null)
        setSubmissionError(null)
        try {
            const created = await createQuote({
                insured: insuredParty.name,
                insured_id: insuredParty.id,
                submission_id: effectiveSubmissionId,
                business_type: businessType,
                inception_date: inceptionDate,
                expiry_date: expiryDate || undefined,
                quote_currency: quoteCurrency,
                created_by: createdBy,
            })
            navigate(`/quotes/${created.id}`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create quote.'
            setSaveError(msg)
            addNotification(`Quote save failed: ${msg}`, 'error')
        } finally {
            setIsSaving(false)
        }
    }, [insuredParty, inceptionDate, expiryDate, businessType, quoteCurrency, linkedSubmission, linkedSubmissionId, createdBy, navigate, addNotification])

    // Attach DOM event listener for sidebar Save
    useEffect(() => {
        const listener = () => { handleSave() }
        window.addEventListener('submission:save', listener)
        return () => window.removeEventListener('submission:save', listener)
    }, [handleSave])

    const isDirty = !!insuredParty

    // C-003 — Back-navigation barrier while dirty (addNotificationRef avoids stale closure)
    const addNotificationRef = useRef(addNotification)
    useEffect(() => { addNotificationRef.current = addNotification }, [addNotification])

    useEffect(() => {
        if (!isDirty) return
        window.history.pushState(null, '', window.location.href)
        let warned = false
        function onPopState() {
            if (!warned) {
                warned = true
                window.history.pushState(null, '', window.location.href)
                addNotificationRef.current('You have unsaved changes — press Back again to discard', 'warning')
            }
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [isDirty])

    return (
        <div className="p-6 flex flex-col gap-4">
            {/* Unsaved changes banner */}
            {isDirty && (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
                    You have unsaved changes.
                </div>
            )}

            {/* Heading */}
            <p role="heading" aria-level={1} className="text-xl font-semibold text-gray-900">New Quote</p>

            {/* Linked Submission — required; use SubmissionSearch when no param provided */}
            <Card>
                <div className="p-4 flex flex-col gap-3">
                    <h2 className="text-sm font-semibold text-gray-700">Linked Submission <span className="text-red-500">*</span></h2>
                    {linkedSubmission ? (
                        <div className="flex items-center w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                            <span className="text-gray-700 font-medium">{linkedSubmission.reference}</span>
                            {linkedSubmission.insured && <span className="text-gray-500 ml-2">{linkedSubmission.insured}</span>}
                            {!linkedSubmissionId && (
                                <button
                                    type="button"
                                    aria-label="Unlink submission"
                                    onClick={() => { setLinkedSubmission(null); setSubmissionError(null) }}
                                    className="ml-auto text-gray-400 hover:text-red-600 flex-shrink-0"
                                >
                                    <FiTrash2 size={14} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <SubmissionSearch
                            hideLabel
                            onSelect={(s) => {
                                setLinkedSubmission(s)
                                setSubmissionError(null)
                                // Also prefill insured if not already selected
                                if (!insuredParty && s.insured) {
                                    setInsuredParty({
                                        id: Number(s.insuredId),
                                        name: s.insured,
                                        type: 'Insured',
                                        orgCode: s.createdByOrgCode,
                                    })
                                }
                            }}
                        />
                    )}
                    {submissionError && (
                        <p className="text-sm text-red-600">{submissionError}</p>
                    )}
                </div>
            </Card>

            {/* Insured */}
            <Card>
                <div className="p-4 flex flex-col gap-3">
                    <h2 className="text-sm font-semibold text-gray-700">Insured</h2>
                    <InsuredSearch
                        onSelect={(party: Party) => {
                            setInsuredParty(party)
                            setInsuredError(null)
                        }}
                    />
                    {insuredParty && (
                        <p className="text-sm text-gray-700">
                            Selected: <span className="font-medium">{insuredParty.name}</span>
                        </p>
                    )}
                    {insuredError && (
                        <p className="text-sm text-red-600">{insuredError}</p>
                    )}
                </div>
            </Card>

            {/* Quote fields */}
            <Card>
                <div className="p-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Business Type */}
                    <div>
                        <label
                            htmlFor="business-type"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Business Type
                        </label>
                        <select
                            id="business-type"
                            aria-label="Business Type"
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                            className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="Insurance">Insurance</option>
                            <option value="Reinsurance">Reinsurance</option>
                        </select>
                    </div>

                    {/* Quote Currency */}
                    <div>
                        <label
                            htmlFor="quote-currency"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Quote Currency
                        </label>
                        <input
                            id="quote-currency"
                            aria-label="Quote Currency"
                            type="text"
                            value={quoteCurrency}
                            onChange={(e) => setQuoteCurrency(e.target.value.toUpperCase())}
                            maxLength={8}
                            className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    {/* Inception Date */}
                    <div>
                        <label
                            htmlFor="inception-date"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Inception Date
                        </label>
                        <input
                            id="inception-date"
                            aria-label="Inception Date"
                            type="date"
                            value={inceptionDate}
                            onChange={(e) => setInceptionDate(e.target.value)}
                            className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    {/* Expiry Date */}
                    <div>
                        <label
                            htmlFor="expiry-date"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Expiry Date
                        </label>
                        <input
                            id="expiry-date"
                            aria-label="Expiry Date"
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                    </div>
                </div>
            </Card>

            {/* Error / Save state */}
            {saveError && (
                <p className="text-sm text-red-600">{saveError}</p>
            )}
            {isSaving && (
                <p className="text-sm text-gray-400">Saving…</p>
            )}
        </div>
    )
}
