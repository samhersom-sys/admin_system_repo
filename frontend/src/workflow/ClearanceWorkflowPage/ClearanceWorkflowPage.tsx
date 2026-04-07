/**
 * ClearanceWorkflowPage — REQ-WF-FE-F-031 to F-040
 *
 * Shows pending clearance submissions. Supports "Check Duplicates" and "Clear" actions.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import {
    getClearancePending,
    checkClearanceDuplicates,
    clearSubmission,
    confirmDuplicate,
    type ClearanceSubmission,
    type ClearanceStatus,
    type ClearanceMatch,
} from '../workflow.service'

const STATUS_CLASSES: Record<ClearanceStatus, string> = {
    pending_clearance: 'bg-amber-100 text-amber-800',
    cleared: 'bg-green-100 text-green-800',
    confirmed_duplicate: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<ClearanceStatus, string> = {
    pending_clearance: 'Pending Clearance',
    cleared: 'Cleared',
    confirmed_duplicate: 'Confirmed Duplicate',
}

export default function ClearanceWorkflowPage() {
    const { addNotification } = useNotifications()

    const [submissions, setSubmissions] = useState<ClearanceSubmission[]>([])
    const [loading, setLoading] = useState(true)

    // Clearance review modal
    const [reviewTarget, setReviewTarget] = useState<ClearanceSubmission | null>(null)
    const [matches, setMatches] = useState<ClearanceMatch[]>([])
    const [checking, setChecking] = useState(false)
    const [reviewNotes, setReviewNotes] = useState('')
    const [clearing, setClearing] = useState(false)

    useEffect(() => {
        setLoading(true)
        getClearancePending()
            .then(setSubmissions)
            .catch(() => addNotification('Could not load clearance queue.', 'error'))
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    async function handleCheckDuplicates(sub: ClearanceSubmission) {
        setReviewTarget(sub)
        setMatches([])
        setReviewNotes('')
        setChecking(true)
        try {
            const result = await checkClearanceDuplicates(sub.id)
            setMatches(result.matches)
        } catch {
            addNotification('Could not check duplicates.', 'error')
        } finally {
            setChecking(false)
        }
    }

    async function handleOpenClear(sub: ClearanceSubmission) {
        setReviewTarget(sub)
        setMatches([])
        setReviewNotes('')
    }

    async function handleClear() {
        if (!reviewTarget) return
        setClearing(true)
        try {
            const updated = await clearSubmission(reviewTarget.id, reviewNotes)
            setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
            addNotification('Submission cleared.', 'success')
            setReviewTarget(null)
        } catch {
            addNotification('Could not clear submission.', 'error')
        } finally {
            setClearing(false)
        }
    }

    async function handleConfirmDuplicate() {
        if (!reviewTarget) return
        setClearing(true)
        try {
            const updated = await confirmDuplicate(reviewTarget.id, reviewNotes)
            setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
            addNotification('Submission marked as duplicate.', 'success')
            setReviewTarget(null)
        } catch {
            addNotification('Could not confirm duplicate.', 'error')
        } finally {
            setClearing(false)
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-gray-900">Clearance Workflow</h2>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-600">Reference</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Insured</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Inception Date</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Expiry Date</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Clearance Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Cleared By</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Cleared Date</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Assigned To</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Created Date</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                                        No submissions pending clearance.
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((sub) => (
                                    <tr key={sub.id} className="border-t border-gray-100 hover:bg-gray-100">
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/submissions/${sub.id}`}
                                                className="text-brand-600 hover:underline font-medium"
                                            >
                                                {sub.reference}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{sub.insured ?? '—'}</td>
                                        <td className="px-4 py-3">{sub.inception_date ?? '—'}</td>
                                        <td className="px-4 py-3">{sub.expiry_date ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[sub.clearance_status]}`}>
                                                {STATUS_LABELS[sub.clearance_status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{sub.cleared_by ?? '—'}</td>
                                        <td className="px-4 py-3">{sub.cleared_date ?? '—'}</td>
                                        <td className="px-4 py-3">{sub.assigned_to ?? '—'}</td>
                                        <td className="px-4 py-3">{sub.created_date ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            {sub.clearance_status === 'pending_clearance' && (
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCheckDuplicates(sub)}
                                                        className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                                                    >
                                                        Check Duplicates
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenClear(sub)}
                                                        className="text-xs px-2 py-1 border border-green-200 rounded text-green-700 hover:bg-green-50"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Clearance Review Modal */}
            {reviewTarget !== null && (
                <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Clearance Review — {reviewTarget.reference}
                            </h2>
                            <button type="button" onClick={() => setReviewTarget(null)} className="text-gray-400 hover:text-gray-600">
                                <FiX />
                            </button>
                        </div>

                        {/* Matches table */}
                        {checking && <LoadingSpinner />}
                        {!checking && matches.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-sm font-medium text-gray-700">Potential Matches</p>
                                <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-100 text-left">
                                            <tr>
                                                <th className="px-3 py-2 font-medium text-gray-600">Reference</th>
                                                <th className="px-3 py-2 font-medium text-gray-600">Insured</th>
                                                <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matches.map((m) => (
                                                <tr key={m.id} className="border-t border-gray-100">
                                                    <td className="px-3 py-2">{m.reference}</td>
                                                    <td className="px-3 py-2">{m.insured ?? '—'}</td>
                                                    <td className="px-3 py-2">{m.status ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {!checking && matches.length === 0 && (
                            <p className="text-sm text-gray-400">No duplicate matches found.</p>
                        )}

                        <div className="flex flex-col gap-1">
                            <label htmlFor="cl-notes" className="text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                                id="cl-notes"
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                rows={3}
                                className="border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={clearing}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                                {clearing ? 'Processing…' : 'Clear'}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDuplicate}
                                disabled={clearing}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                                {clearing ? 'Processing…' : 'Confirm Duplicate'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setReviewTarget(null)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
