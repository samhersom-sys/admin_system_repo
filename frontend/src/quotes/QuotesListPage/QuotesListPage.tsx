/**
 * QuotesListPage — /quotes
 *
 * Requirements: frontend/src/quotes/quotes.requirements.md
 * Tests: frontend/src/quotes/quotes.test.tsx
 *
 * Features:
 *  - Lists all quotes for the authenticated org (REQ-QUO-FE-F-003)
 *  - Reference as brand-coloured link (REQ-QUO-FE-F-005)
 *  - Empty-state and error handling (REQ-QUO-FE-F-006, F-007)
 *  - "New Quote" navigation link (REQ-QUO-FE-F-002)
 *  - Optional ?submission_id= pre-filter (REQ-QUO-FE-F-008)
 */

import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listQuotes } from '@/quotes/quotes.service'
import type { Quote } from '@/quotes/quotes.service'
import { useNotifications } from '@/shell/NotificationDock'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column, SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'

// Status badge colour map
const STATUS_CLASSES: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700',
    Quoted: 'bg-blue-100 text-blue-800',
    Bound: 'bg-green-100 text-green-800',
    Declined: 'bg-red-100 text-red-700',
}

// REQ-SHARED-GRID-C-001 — ResizableGrid column definitions
const GRID_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 220 },
    { key: 'insured', label: 'Insured', sortable: true, defaultWidth: 180 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 100 },
    { key: 'business_type', label: 'Business Type', sortable: true, defaultWidth: 140 },
    { key: 'inception_date', label: 'Inception Date', sortable: true, defaultWidth: 130 },
    { key: 'expiry_date', label: 'Expiry Date', sortable: true, defaultWidth: 120 },
]

export default function QuotesListPage() {
    const [searchParams] = useSearchParams()
    const submissionIdFilter = searchParams.get('submission_id')
        ? Number(searchParams.get('submission_id'))
        : undefined

    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const { addNotification } = useNotifications()

    useEffect(() => {
        setLoading(true)
        setError(null)
        listQuotes(submissionIdFilter ? { submission_id: submissionIdFilter } : undefined)
            .then(setQuotes)
            .catch((err: Error) => {
                setError(err.message ?? 'Failed to load quotes.')
                addNotification(`Could not load quotes: ${err.message ?? 'unknown error'}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [submissionIdFilter])

    function handleSort(key: string) {
        setSortConfig((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        )
    }

    const sorted = [...quotes].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortConfig.key] ?? ''
        const bv = (b as Record<string, unknown>)[sortConfig.key] ?? ''
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    function renderCell(key: string, row: unknown): React.ReactNode {
        const q = row as Quote
        if (key === 'reference') {
            return (
                <Link
                    to={`/quotes/${q.id}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline font-medium"
                >
                    {q.reference}
                </Link>
            )
        }
        if (key === 'status') {
            return (
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[q.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                    {q.status}
                </span>
            )
        }
        if (key === 'insured') return q.insured
        if (key === 'business_type') return q.business_type ?? '—'
        if (key === 'inception_date') return q.inception_date ?? '—'
        if (key === 'expiry_date') return q.expiry_date ?? '—'
        return '—'
    }

    const heading = submissionIdFilter ? 'Quotes for Submission' : 'Quotes'

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">{heading}</h1>
                <Link
                    to="/quotes/new"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                    + New Quote
                </Link>
            </div>

            {/* Body */}
            {loading ? (
                <p className="text-sm text-gray-400 py-8 text-center" aria-label="Loading quotes">
                    Loading quotes…
                </p>
            ) : error ? (
                <p className="text-sm text-red-600 py-4">{error}</p>
            ) : (
                <ResizableGrid
                    columns={GRID_COLUMNS}
                    rows={sorted}
                    storageKey="table-widths-quotes"
                    sortConfig={sortConfig}
                    onRequestSort={handleSort}
                    renderCell={renderCell}
                    rowKey={(row) => (row as Quote).id}
                    emptyMessage="No quotes found."
                />
            )}
        </div>
    )
}
