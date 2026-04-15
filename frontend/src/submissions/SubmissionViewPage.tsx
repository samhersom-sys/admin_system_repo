/**
 * Submission View Page — /submissions/:id
 *
 * Displays a single submission record with editable-tier fields, immutable
 * header panel, cascade-lock logic (hasQuote / hasPolicy), and contextual
 * sidebar section.
 *
 * Requirements: SubmissionViewPage.requirements.md
 * Tests: SubmissionViewPage.test.tsx
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
    getSubmission,
    updateSubmission,
    acquireSubmissionEditLock,
    releaseSubmissionEditLock,
} from '@/submissions/submissions.service'
import type { Submission, SubmissionStatus, SubmissionEditLock } from '@/submissions/submissions.service'
import { post } from '@/shared/lib/api-client/api-client'
import SubmissionTabs from '@/submissions/SubmissionTabs/SubmissionTabs'
import { useSidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'
import {
    FiArrowLeft,
    FiSave,
    FiCheckCircle,
    FiXCircle,
    FiPlusCircle,
    FiFile,
    FiUsers,
    FiAlertCircle,
} from 'react-icons/fi'

// Broker-origin locked fields — list confirmed once OQ-044 is resolved
const BROKER_ORIGIN_LOCKED_FIELDS: string[] = []

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FormValues {
    insured: string
    inceptionDate: string
    expiryDate: string
    renewalDate: string
}

type EditLockState = 'checking' | 'editable' | 'locked'

function getLockConflict(err: unknown, submissionId: number): SubmissionEditLock | null {
    const apiErr = err as { status?: number; body?: Record<string, unknown> }
    if (apiErr?.status !== 409 || !apiErr.body) return null

    const lockedByUserName = String(apiErr.body.lockedByUserName ?? '')
    if (!lockedByUserName) return null

    return {
        submissionId: Number(apiErr.body.submissionId ?? submissionId),
        lockedByUserId: Number(apiErr.body.lockedByUserId ?? 0),
        lockedByUserName,
        lockedByUserEmail: apiErr.body.lockedByUserEmail ? String(apiErr.body.lockedByUserEmail) : null,
        expiresAt: String(apiErr.body.expiresAt ?? ''),
        isHeldByCurrentUser: false,
    }
}

function submissionToForm(s: Submission): FormValues {
    return {
        insured: s.insured ?? '',
        inceptionDate: s.inceptionDate ?? '',
        expiryDate: s.expiryDate ?? '',
        renewalDate: s.renewalDate ?? '',
    }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SubmissionViewPage() {
    const { id } = useParams<{ id: string }>()
    const submissionId = Number(id)

    const [submission, setSubmission] = useState<Submission | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [showDeclineModal, setShowDeclineModal] = useState(false)
    const [declineReasonCode, setDeclineReasonCode] = useState('')
    const [declineReasonText, setDeclineReasonText] = useState('')
    const [declineError, setDeclineError] = useState<string | null>(null)
    const [formValues, setFormValues] = useState<FormValues>({
        insured: '',
        inceptionDate: '',
        expiryDate: '',
        renewalDate: '',
    })
    // Tracks last server-confirmed values — used to detect unsaved changes
    const [savedValues, setSavedValues] = useState<FormValues>({
        insured: '',
        inceptionDate: '',
        expiryDate: '',
        renewalDate: '',
    })
    const [editLock, setEditLock] = useState<SubmissionEditLock | null>(null)
    const [editLockState, setEditLockState] = useState<EditLockState>('checking')

    // Cascade lock: a linked quote or policy prevents edits
    const isCascadeLocked = !!(submission?.hasQuote || submission?.hasPolicy)
    const isConcurrentLocked = !!(editLock && !editLock.isHeldByCurrentUser)

    const { addNotification } = useNotifications()
    const submissionRef = useRef<Submission | null>(submission)
    const formValuesRef = useRef<FormValues>(formValues)
    const isCascadeLockedRef = useRef(isCascadeLocked)
    const isConcurrentLockedRef = useRef(isConcurrentLocked)
    submissionRef.current = submission
    formValuesRef.current = formValues
    isCascadeLockedRef.current = isCascadeLocked
    isConcurrentLockedRef.current = isConcurrentLocked

    // Dirty: any editable field differs from what the server last confirmed
    const isDirty = !isCascadeLocked && !isConcurrentLocked &&
        JSON.stringify(formValues) !== JSON.stringify(savedValues)

    // Dynamic sidebar section — Save excluded when cascade-locked
    // MUST be memoized — SidebarContext requires a stable reference to prevent infinite re-renders
    const sidebarSection = useMemo(() => ({
        title: 'Submission',
        items: [
            ...(isCascadeLocked || isConcurrentLocked
                ? []
                : [{ label: 'Save', icon: FiSave, event: 'submission:save' }]),
            ...(isCascadeLocked || isConcurrentLocked
                ? []
                : [{ label: 'Submit', icon: FiCheckCircle, event: 'submission:submit' }]),
            ...(isCascadeLocked || isConcurrentLocked
                ? []
                : [{ label: 'Decline', icon: FiXCircle, event: 'submission:decline' }]),
            ...(submission?.status === 'Clearance'
                ? [{ label: 'Clearance', icon: FiAlertCircle, to: `/workflow/clearance/${submissionId}` }]
                : []),
            {
                label: 'Create',
                icon: FiPlusCircle,
                children: [
                    { label: 'Quote', icon: FiFile, to: `/quotes/new?submissionId=${submissionId}` },
                    { label: 'Create Party', icon: FiUsers, to: '/parties/new' },
                ],
            },
        ],
    }), [isCascadeLocked, isConcurrentLocked, submission?.status, submissionId])

    useSidebarSection(sidebarSection)

    // ── Fetch submission on mount ─────────────────────────────────────────
    useEffect(() => {
        if (!submissionId) return
        setEditLockState('checking')
        setLoading(true)
        getSubmission(submissionId)
            .then((result) => {
                setSubmission(result)
                if (result) {
                    const loaded = submissionToForm(result)
                    setFormValues(loaded)
                    setSavedValues(loaded)
                }
            })
            .catch((err: Error) => {
                setLoadError(err.message ?? 'Failed to load submission')
                addNotification(`Could not load submission: ${err.message ?? 'unknown error'}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [submissionId])

    useEffect(() => {
        if (!submission?.id || isCascadeLocked) {
            if (isCascadeLocked) setEditLockState('editable')
            return
        }

        let cancelled = false
        const notificationId = `submission-edit-lock-${submission.id}`

        async function syncEditLock(shouldNotify: boolean) {
            try {
                const result = await acquireSubmissionEditLock(submission.id)
                if (cancelled) return
                setEditLock(result)
                setEditLockState('editable')
            } catch (err) {
                if (cancelled) return
                const lockConflict = getLockConflict(err, submission.id)
                if (lockConflict) {
                    setEditLock(lockConflict)
                    setEditLockState('locked')
                    if (shouldNotify) {
                        addNotification(
                            `This page has been locked for editing by ${lockConflict.lockedByUserName}.`,
                            'warning',
                            { id: notificationId },
                        )
                    }
                }
            }
        }

        void syncEditLock(true)
        const intervalId = window.setInterval(() => {
            void syncEditLock(false)
        }, 30000)

        return () => {
            cancelled = true
            window.clearInterval(intervalId)
            void releaseSubmissionEditLock(submission.id).catch(() => { })
        }
    }, [submission?.id, isCascadeLocked, addNotification])

    useEffect(() => {
        if (!submission?.id) return

        post('/api/audit/event', {
            entityType: 'Submission',
            entityId: submission.id,
            action: 'Submission Opened',
            details: {},
        }).catch(() => { })

        return () => {
            void post('/api/audit/event', {
                entityType: 'Submission',
                entityId: submission.id,
                action: 'Submission Closed',
                details: {},
            }).catch(() => { })
        }
    }, [submission?.id])

    // ── submission:save event ─────────────────────────────────────────────
    useEffect(() => {
        const handleSave = async () => {
            const currentSubmission = submissionRef.current
            if (isCascadeLockedRef.current || isConcurrentLockedRef.current || !currentSubmission) return
            try {
                const result = await updateSubmission(currentSubmission.id, formValuesRef.current)
                setSubmission(result)
                const fresh = submissionToForm(result)
                setFormValues(fresh)
                setSavedValues(fresh)
                setActionError(null)
                // Best-effort audit event — failure does not affect the save outcome
                post('/api/audit/event', {
                    entityType: 'Submission',
                    entityId: currentSubmission.id,
                    action: 'Submission Updated',
                    details: {},
                }).catch(() => { /* silently ignore audit failures */ })
            } catch (err: unknown) {
                const lockConflict = getLockConflict(err, currentSubmission.id)
                if (lockConflict) {
                    setEditLock(lockConflict)
                    setEditLockState('locked')
                    setActionError(null)
                    addNotification(
                        `This page has been locked for editing by ${lockConflict.lockedByUserName}.`,
                        'warning',
                        { id: `submission-edit-lock-${currentSubmission.id}` },
                    )
                    return
                }
                const msg = (err as Error).message ?? 'Save failed'
                setActionError(msg)
                addNotification(`Submission save failed: ${msg}`, 'error')
            }
        }
        window.addEventListener('submission:save', handleSave)
        return () => window.removeEventListener('submission:save', handleSave)
    }, [addNotification])

    // ── submission:submit event ───────────────────────────────────────────
    useEffect(() => {
        const handleSubmit = async () => {
            const currentSubmission = submissionRef.current
            if (!currentSubmission || isConcurrentLockedRef.current) return
            try {
                const result = await post<{ status: SubmissionStatus }>(`/api/submissions/${currentSubmission.id}/submit`, {})
                setSubmission((prev) => (prev ? { ...prev, status: result.status } : prev))
                setActionError(null)
            } catch (err: unknown) {
                const msg = (err as Error).message ?? 'Submit failed'
                setActionError(msg)
                addNotification(`Submit failed: ${msg}`, 'error')
            }
        }
        window.addEventListener('submission:submit', handleSubmit)
        return () => window.removeEventListener('submission:submit', handleSubmit)
    }, [addNotification])

    // ── submission:decline event ──────────────────────────────────────────
    useEffect(() => {
        const handleDecline = () => {
            if (isConcurrentLockedRef.current) return
            setShowDeclineModal(true)
        }
        window.addEventListener('submission:decline', handleDecline)
        return () => window.removeEventListener('submission:decline', handleDecline)
    }, [])

    // ── Prevent accidental browser close when there are unsaved changes ───────
    useEffect(() => {
        if (!isDirty) return
        function handler(e: BeforeUnloadEvent) {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirty])

    // ── Loading state ─────────────────────────────────────────────────────
    if (loading) {
        return <div className="p-6 text-gray-500 text-sm">Loading submission…</div>
    }

    // ── Error / not-found state ───────────────────────────────────────────
    if (loadError || !submission) {
        return (
            <div className="p-6">
                <p className="text-red-600 text-sm">{loadError ?? 'Submission not found.'}</p>
                <Link
                    to="/submissions"
                    className="text-brand-600 hover:underline text-sm mt-4 inline-block"
                >
                    ← Back to submissions
                </Link>
            </div>
        )
    }

    // ── Cascade lock message ──────────────────────────────────────────────
    const lockMessage = submission.hasPolicy
        ? 'This submission is linked to a policy. Apply an endorsement to change these fields.'
        : submission.hasQuote
            ? 'This submission is linked to a quote. Update via the quote to change these fields.'
            : null

    const editabilityPill = editLockState === 'locked'
        ? {
            className: 'bg-red-50 border-red-200 text-red-700',
            dotClassName: 'bg-red-500',
            label: `Locked by ${editLock?.lockedByUserName ?? 'another user'}`,
        }
        : editLockState === 'editable'
            ? {
                className: 'bg-green-50 border-green-200 text-green-700',
                dotClassName: 'bg-green-500',
                label: isCascadeLocked ? 'Read-only downstream state' : 'Editable',
            }
            : {
                className: 'bg-amber-50 border-amber-200 text-amber-700',
                dotClassName: 'bg-amber-400',
                label: 'Securing edit access',
            }

    return (
        <>
            <div className="p-6 flex flex-col gap-6">

                {/* Back link */}
                <div>
                    <Link
                        to="/submissions"
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                        <FiArrowLeft size={14} /> Back to submissions
                    </Link>
                </div>

                {/* ── Header panel — immutable / system-managed fields ────────── */}
                <Card title="Submission Details">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Reference</p>
                            <p className="text-sm font-medium text-gray-900">{submission.reference}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Status</p>
                            <p className="text-sm font-medium text-gray-900">{submission.status}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Contract Type</p>
                            <p className="text-sm font-medium text-gray-900">{submission.contractType}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Insured</p>
                            <p className="text-sm text-gray-900">{submission.insured}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Placing Broker</p>
                            <p className="text-sm text-gray-700">{submission.placingBroker}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Created By</p>
                            <p className="text-sm text-gray-700">{submission.createdBy}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Created Date</p>
                            <p className="text-sm text-gray-700">{submission.createdDate}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Organisation</p>
                            <p className="text-sm text-gray-700">{submission.createdByOrgCode}</p>
                        </div>
                    </div>
                </Card>

                {/* ── Error banner (save/submit errors) ───────────────────────── */}
                {actionError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                        {actionError}
                    </p>
                )}
                {/* ── Unsaved changes banner ─────────────────────────────────────────── */}
                {isDirty && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        You have unsaved changes.
                    </p>
                )}
                {/* ── Lock message ─────────────────────────────────────────────── */}
                {lockMessage && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        {lockMessage}
                    </p>
                )}

                {/* ── Editable fields — only rendered when not cascade-locked ── */}
                {/* (when locked, header panel already shows the saved values)     */}
                {!isCascadeLocked && !isConcurrentLocked && (
                    <section className="grid grid-cols-2 gap-4">
                        {/* Insured */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1" htmlFor="insured">
                                Insured
                            </label>
                            <input
                                id="insured"
                                name="insured"
                                type="text"
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={formValues.insured}
                                onChange={(e) =>
                                    setFormValues((f) => ({ ...f, insured: e.target.value }))
                                }
                            />
                        </div>

                        {/* Inception Date */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1" htmlFor="inceptionDate">
                                Inception Date
                            </label>
                            <input
                                id="inceptionDate"
                                name="inceptionDate"
                                type="date"
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={formValues.inceptionDate}
                                onChange={(e) =>
                                    setFormValues((f) => ({ ...f, inceptionDate: e.target.value }))
                                }
                            />
                        </div>

                        {/* Expiry Date */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1" htmlFor="expiryDate">
                                Expiry Date
                            </label>
                            <input
                                id="expiryDate"
                                name="expiryDate"
                                type="date"
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={formValues.expiryDate}
                                onChange={(e) =>
                                    setFormValues((f) => ({ ...f, expiryDate: e.target.value }))
                                }
                            />
                        </div>

                        {/* Renewal Date */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1" htmlFor="renewalDate">
                                Renewal Date
                            </label>
                            <input
                                id="renewalDate"
                                name="renewalDate"
                                type="date"
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={formValues.renewalDate}
                                onChange={(e) =>
                                    setFormValues((f) => ({ ...f, renewalDate: e.target.value }))
                                }
                            />
                        </div>
                    </section>
                )}

                {/* ── Secondary data tabs ──────────────────────────────────────── */}
                <SubmissionTabs
                    submissionId={submission.id}
                    contractType={submission.contractType}
                    placingBroker={submission.placingBroker}
                    placingBrokerId={String(submission.brokerId ?? submission.placingBrokerId ?? '') || null}
                    placingBrokerName={submission.placingBrokerName ?? null}
                    insured={submission.insured ?? null}
                    insuredId={submission.insuredId ?? null}
                    isEditLocked={isCascadeLocked || isConcurrentLocked}
                />
            </div>

            <div className="fixed bottom-20 right-4 z-40">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm ${editabilityPill.className}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${editabilityPill.dotClassName}`} aria-hidden="true" />
                    <span>{editabilityPill.label}</span>
                </div>
            </div>

            {/* ── Decline modal ────────────────────────────────────────────────── */}
            {showDeclineModal && (
                <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => { setShowDeclineModal(false); setDeclineError(null) }}
                    />
                    <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-8 p-6 flex flex-col gap-4">
                        <h2 className="text-base font-semibold text-gray-900">Decline Submission</h2>
                        <p className="text-sm text-gray-500">
                            Declining this submission will mark it as <span className="font-medium">Declined</span> and notify relevant parties. This action cannot be undone.
                        </p>

                        {/* Reason code */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1" htmlFor="declineReasonCode">
                                Reason <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="declineReasonCode"
                                value={declineReasonCode}
                                onChange={(e) => setDeclineReasonCode(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                            >
                                <option value="">— Select a reason —</option>
                                <option value="capacity">Capacity</option>
                                <option value="pricing">Pricing</option>
                                <option value="risk_quality">Risk Quality</option>
                                <option value="duplicate">Duplicate Submission</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Free text */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1" htmlFor="declineReasonText">
                                Additional Notes (optional)
                            </label>
                            <textarea
                                id="declineReasonText"
                                rows={3}
                                value={declineReasonText}
                                onChange={(e) => setDeclineReasonText(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full resize-none"
                                placeholder="Provide any additional context…"
                            />
                        </div>

                        {declineError && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                                {declineError}
                            </p>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowDeclineModal(false); setDeclineError(null) }}
                                className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!declineReasonCode}
                                onClick={async () => {
                                    if (!submission || !declineReasonCode) return
                                    try {
                                        const result = await post<{ status: SubmissionStatus }>(`/api/submissions/${submission.id}/decline`, {
                                            reasonCode: declineReasonCode,
                                            reasonText: declineReasonText,
                                        })
                                        setSubmission((prev) => (prev ? { ...prev, status: result.status ?? 'Declined' } : prev))
                                        setShowDeclineModal(false)
                                        setDeclineReasonCode('')
                                        setDeclineReasonText('')
                                        setDeclineError(null)
                                    } catch (err: unknown) {
                                        const msg = (err as Error).message ?? 'Decline failed'
                                        setDeclineError(msg)
                                        addNotification(`Decline failed: ${msg}`, 'error')
                                    }
                                }}
                                className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

