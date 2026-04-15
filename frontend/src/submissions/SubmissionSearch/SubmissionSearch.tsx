/**
 * SubmissionSearch — click-to-open modal search for Submission records.
 *
 * Follows the same pattern as InsuredSearch: trigger button + portal modal.
 * Used by QuoteViewPage and NewQuotePage to link a quote to a submission.
 */

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiSearch } from 'react-icons/fi'
import { listSubmissions } from '@/submissions/submissions.service'
import type { Submission } from '@/submissions/submissions.service'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SubmissionSearchProps {
    selectedSubmission?: Submission | null
    onSelect: (submission: Submission) => void
    /** When true, hides the label above the trigger button */
    hideLabel?: boolean
    /** Additional classes applied to the trigger button (e.g. error border overrides) */
    triggerClassName?: string
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (submission: Submission) => void
}

function SubmissionSearchModal({ isOpen, onClose, onSelect }: ModalProps) {
    const [query, setQuery] = useState('')
    const [allResults, setAllResults] = useState<Submission[]>([])
    const [loading, setLoading] = useState(false)

    // Load all submissions when modal opens
    useEffect(() => {
        if (!isOpen) return
        setQuery('')
        setLoading(true)
        listSubmissions()
            .then(setAllResults)
            .catch(() => setAllResults([]))
            .finally(() => setLoading(false))
    }, [isOpen])

    // ESC closes
    useEffect(() => {
        if (!isOpen) return
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    const filtered = query.trim()
        ? allResults.filter((s) =>
            s.reference?.toLowerCase().includes(query.toLowerCase()) ||
            s.insured?.toLowerCase().includes(query.toLowerCase())
        )
        : allResults

    const handleSelect = useCallback((s: Submission) => {
        onSelect(s)
        onClose()
    }, [onSelect, onClose])

    if (!isOpen) return null

    return createPortal(
        <div
            className="fixed inset-y-0 left-14 right-0 flex items-center justify-center z-50 bg-black bg-opacity-40"
            role="dialog"
            aria-modal="true"
            aria-label="Select submission"
            onClick={onClose}
        >
            <div
                className="bg-white rounded shadow-lg p-6 relative min-w-[300px] w-full max-w-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                    ×
                </button>
                <h2 className="text-lg font-semibold mb-4 pr-8">Select Submission</h2>

                <div className="mb-3">
                    {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search by reference or insured…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                </div>

                {loading ? (
                    <p className="py-6 text-sm text-gray-400 text-center">Loading…</p>
                ) : (
                    <div className="max-h-96 overflow-y-auto border rounded">
                        <ResizableGrid
                            storageKey="table-widths-submission-search"
                            columns={[
                                { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 180 },
                                { key: 'insured', label: 'Insured', sortable: true, defaultWidth: 220 },
                                { key: 'status', label: 'Status', sortable: true, defaultWidth: 130 },
                                { key: 'inception', label: 'Inception', sortable: false, defaultWidth: 120 },
                            ]}
                            rows={filtered}
                            rowKey={(row) => (row as Submission).id}
                            emptyMessage="No submissions found."
                            onRowClick={(row) => handleSelect(row as Submission)}
                            renderCell={(key, row) => {
                                const s = row as Submission
                                if (key === 'reference') return <span className="font-medium text-brand-700">{s.reference}</span>
                                if (key === 'insured') return s.insured
                                if (key === 'status') return s.status
                                if (key === 'inception') return s.inceptionDate ?? '—'
                                return null
                            }}
                        />
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

// ---------------------------------------------------------------------------
// SubmissionSearch — trigger field + modal
// ---------------------------------------------------------------------------

export default function SubmissionSearch({ selectedSubmission, onSelect, hideLabel, triggerClassName }: SubmissionSearchProps) {
    const [modalOpen, setModalOpen] = useState(false)

    return (
        <div>
            {!hideLabel && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Linked Submission
                </label>
            )}
            <button
                data-testid="submission-search-trigger"
                type="button"
                onClick={() => setModalOpen(true)}
                className={`flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 border rounded px-3 py-1.5 hover:bg-gray-50 w-full ${triggerClassName ?? 'border-gray-300'}`}
            >
                <FiSearch size={14} />
                {selectedSubmission
                    ? selectedSubmission.reference
                    : 'Search and link a submission…'}
            </button>
            <SubmissionSearchModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSelect={onSelect}
            />
        </div>
    )
}
