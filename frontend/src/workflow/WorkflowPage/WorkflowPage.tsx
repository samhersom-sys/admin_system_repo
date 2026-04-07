/**
 * WorkflowPage — REQ-WF-FE-F-011 to F-020
 *
 * Submission workflow table with stats, filters, and assignment modal.
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import {
    getWorkflowSubmissions,
    assignSubmission,
    getUnderwriters,
    type WorkflowSubmission,
    type WorkflowSubmissionStatus,
    type User,
} from '../workflow.service'

const STATUS_CLASSES: Record<WorkflowSubmissionStatus, string> = {
    Unassigned: 'bg-gray-100 text-gray-600',
    Assigned: 'bg-blue-100 text-blue-800',
    'In Review': 'bg-amber-100 text-amber-800',
    Quoted: 'bg-green-100 text-green-800',
    Declined: 'bg-red-100 text-red-700',
}

const STATUSES: WorkflowSubmissionStatus[] = ['Unassigned', 'Assigned', 'In Review', 'Quoted', 'Declined']

export default function WorkflowPage() {
    const { addNotification } = useNotifications()

    const [submissions, setSubmissions] = useState<WorkflowSubmission[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<string>('')
    const [filterAssigned, setFilterAssigned] = useState<string>('')

    // Assignment modal
    const [assignTarget, setAssignTarget] = useState<WorkflowSubmission | null>(null)
    const [underwriters, setUnderwriters] = useState<User[]>([])
    const [assignTo, setAssignTo] = useState<number | null>(null)
    const [assignNotes, setAssignNotes] = useState('')
    const [assigning, setAssigning] = useState(false)

    useEffect(() => {
        setLoading(true)
        getWorkflowSubmissions()
            .then(setSubmissions)
            .catch(() => addNotification('Could not load submissions.', 'error'))
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    function openAssignModal(sub: WorkflowSubmission) {
        setAssignTarget(sub)
        setAssignTo(null)
        setAssignNotes('')
        if (underwriters.length === 0) {
            getUnderwriters()
                .then(setUnderwriters)
                .catch(() => addNotification('Could not load users.', 'error'))
        }
    }

    async function handleAssign() {
        if (!assignTarget || !assignTo) {
            addNotification('Please select a user.', 'error')
            return
        }
        setAssigning(true)
        try {
            await assignSubmission(assignTarget.id, { assigned_to: assignTo, notes: assignNotes })
            const user = underwriters.find((u) => u.id === assignTo)
            setSubmissions((prev) =>
                prev.map((s) =>
                    s.id === assignTarget.id
                        ? { ...s, assigned_to: user?.name ?? String(assignTo), status: 'Assigned' }
                        : s
                )
            )
            addNotification('Submission assigned.', 'success')
            setAssignTarget(null)
        } catch {
            addNotification('Could not assign submission.', 'error')
        } finally {
            setAssigning(false)
        }
    }

    const filtered = useMemo(() => {
        let rows = submissions
        if (filterStatus) rows = rows.filter((r) => r.status === filterStatus)
        if (filterAssigned) rows = rows.filter((r) => r.assigned_to === filterAssigned)
        return rows
    }, [submissions, filterStatus, filterAssigned])

    const stats = useMemo(
        () => ({
            Unassigned: submissions.filter((s) => s.status === 'Unassigned').length,
            Assigned: submissions.filter((s) => s.status === 'Assigned').length,
            'In Review': submissions.filter((s) => s.status === 'In Review').length,
            Quoted: submissions.filter((s) => s.status === 'Quoted').length,
            Declined: submissions.filter((s) => s.status === 'Declined').length,
        }),
        [submissions]
    )

    const assignedToOptions = useMemo(
        () => [...new Set(submissions.map((s) => s.assigned_to).filter(Boolean))] as string[],
        [submissions]
    )

    return (
        <div className="p-6 flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-gray-900">Submission Workflow</h2>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {STATUSES.map((s) => (
                    <div key={s} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                        <p className="text-2xl font-bold text-gray-900">{stats[s]}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                    value={filterAssigned}
                    onChange={(e) => setFilterAssigned(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                    <option value="">All Assigned</option>
                    {assignedToOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-600">Reference</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Insured</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Broker</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Email Received</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Assigned To</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Source</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                        No submissions found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((sub) => (
                                    <tr key={sub.id} className="border-t border-gray-100 hover:bg-gray-100">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Link
                                                    to={`/submissions/${sub.id}`}
                                                    className="text-brand-600 hover:underline font-medium"
                                                >
                                                    {sub.reference}
                                                </Link>
                                                {sub.ai_extracted && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700 font-medium">
                                                        AI
                                                    </span>
                                                )}
                                                {sub.review_required && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">
                                                        Review
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{sub.insured ?? '—'}</td>
                                        <td className="px-4 py-3">{sub.broker ?? '—'}</td>
                                        <td className="px-4 py-3">{sub.email_received ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[sub.status]}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{sub.assigned_to ?? '—'}</td>
                                        <td className="px-4 py-3">{sub.source ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => openAssignModal(sub)}
                                                className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                                            >
                                                Assign
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Assignment modal */}
            {assignTarget !== null && (
                <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Assign {assignTarget.reference}
                            </h2>
                            <button type="button" onClick={() => setAssignTarget(null)} className="text-gray-400 hover:text-gray-600">
                                <FiX />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="wf-assign-user" className="text-sm font-medium text-gray-700">
                                    Assign To <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="wf-assign-user"
                                    value={assignTo ?? ''}
                                    onChange={(e) => setAssignTo(parseInt(e.target.value) || null)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="">— Select user —</option>
                                    {underwriters.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="wf-assign-notes" className="text-sm font-medium text-gray-700">Notes</label>
                                <textarea
                                    id="wf-assign-notes"
                                    value={assignNotes}
                                    onChange={(e) => setAssignNotes(e.target.value)}
                                    rows={3}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleAssign}
                                disabled={assigning}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                            >
                                {assigning ? 'Assigning…' : 'Assign'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setAssignTarget(null)}
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
