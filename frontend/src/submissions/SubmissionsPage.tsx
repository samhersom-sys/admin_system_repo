/**
 * SubmissionsPage — /submissions
 *
 * Requirements: submissions.requirements.md (REQ-SUB-FE-F-033 to F-035)
 * Tests: SubmissionsPage.test.tsx
 */

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import { get } from '@/shared/lib/api-client/api-client'
import { brandClasses } from '@/shared/lib/design-tokens/brandClasses'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column, SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'

interface SubmissionRow {
    id: number
    reference?: string | null
    insured?: string | null
    placingBroker?: string | null
    contractType?: string | null
    inceptionDate?: string | null
    status?: string | null
}

const STATUS_OPTIONS = ['All', 'Created', 'In Review', 'Outstanding', 'Declined', 'Quote Created', 'Quoted', 'Bound']

const STATUS_CLASSES: Record<string, string> = {
    Created: 'bg-gray-100 text-gray-700',
    'In Review': 'bg-yellow-100 text-yellow-800',
    Outstanding: 'bg-orange-100 text-orange-800',
    Declined: 'bg-red-100 text-red-700',
    'Quote Created': 'bg-blue-100 text-blue-800',
    Quoted: 'bg-blue-100 text-blue-800',
    Bound: 'bg-green-100 text-green-800',
}

const GRID_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 240 },
    { key: 'insured', label: 'Insured', sortable: true, defaultWidth: 200 },
    { key: 'placingBroker', label: 'Placing Broker', sortable: true, defaultWidth: 180 },
    { key: 'contractType', label: 'Contract Type', sortable: true, defaultWidth: 160 },
    { key: 'inceptionDate', label: 'Inception Date', sortable: true, defaultWidth: 130 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 120 },
    { key: '_action', label: '', sortable: false, defaultWidth: 44 },
]

export default function SubmissionsPage() {
    const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('All')
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'reference', direction: 'asc' })

    useEffect(() => {
        setLoading(true)
        setError(null)
        get<SubmissionRow[]>('/api/submissions')
            .then(setSubmissions)
            .catch((err: Error) => setError(err.message ?? 'Failed to load submissions.'))
            .finally(() => setLoading(false))
    }, [])

    function handleSort(key: string) {
        setSortConfig((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' },
        )
    }

    const filtered = useMemo(() => {
        return statusFilter === 'All'
            ? submissions
            : submissions.filter((s) => s.status === statusFilter)
    }, [submissions, statusFilter])

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const av = (a as Record<string, unknown>)[sortConfig.key] ?? ''
            const bv = (b as Record<string, unknown>)[sortConfig.key] ?? ''
            if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
            if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
    }, [filtered, sortConfig])

    function renderCell(key: string, row: unknown): React.ReactNode {
        const s = row as SubmissionRow
        if (key === 'reference') {
            return <span className="font-medium">{s.reference ?? '—'}</span>
        }
        if (key === '_action') {
            return (
                <Link
                    to={`/submissions/${s.id}`}
                    className={`inline-flex items-center justify-center ${brandClasses.icon.actionOpen}`}
                    aria-label="View record"
                >
                    <FiSearch size={15} aria-hidden="true" />
                </Link>
            )
        }
        if (key === 'status') {
            return (
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[s.status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}
                >
                    {s.status ?? '—'}
                </span>
            )
        }
        if (key === 'insured') return s.insured ?? '—'
        if (key === 'placingBroker') return s.placingBroker ?? '—'
        if (key === 'contractType') return s.contractType ?? '—'
        if (key === 'inceptionDate') return s.inceptionDate ?? '—'
        return '—'
    }

    return (
        <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-gray-900">Submissions</h2>
                <div className="flex items-center gap-3">
                    <label htmlFor="submission-status-filter" className="sr-only">
                        Filter by status
                    </label>
                    <select
                        id="submission-status-filter"
                        aria-label="Filter by status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                    <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold"
                        aria-label="Count of visible submissions"
                    >
                        {sorted.length}
                    </span>
                    <Link
                        to="/submissions/new"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        + New Submission
                    </Link>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 py-8 text-center" aria-label="Loading submissions">
                    Loading submissions…
                </p>
            ) : error ? (
                <p className="text-sm text-red-600 py-4">{error}</p>
            ) : (
                <ResizableGrid
                    columns={GRID_COLUMNS}
                    rows={sorted}
                    storageKey="table-widths-submissions"
                    sortConfig={sortConfig}
                    onRequestSort={handleSort}
                    renderCell={renderCell}
                    rowKey={(row) => (row as SubmissionRow).id}
                    emptyMessage="No submissions found."
                />
            )}
        </div>
    )
}

