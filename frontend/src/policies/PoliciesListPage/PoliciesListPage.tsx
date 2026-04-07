/**
 * PoliciesListPage — /policies
 *
 * Requirements: frontend/src/policies/policies.requirements.md
 * Tests: frontend/src/policies/__tests__/PoliciesPages.test.tsx
 *
 * REQ-POL-FE-F-001 — GET /api/policies on mount; ResizableGrid
 * REQ-POL-FE-F-002 — Reference cell links to /policies/:id
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPolicies } from '@/policies/policies.service'
import type { Policy } from '@/policies/policies.service'
import { useNotifications } from '@/shell/NotificationDock'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column, SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Expired: 'bg-gray-100 text-gray-700',
    Cancelled: 'bg-red-100 text-red-700',
    Draft: 'bg-yellow-100 text-yellow-800',
}

const GRID_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 200 },
    { key: 'insured', label: 'Insured', sortable: true, defaultWidth: 180 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 100 },
    { key: 'class_of_business', label: 'Class of Business', sortable: true, defaultWidth: 150 },
    { key: 'inception_date', label: 'Inception Date', sortable: true, defaultWidth: 130 },
    { key: 'expiry_date', label: 'Expiry Date', sortable: true, defaultWidth: 120 },
    { key: 'placing_broker', label: 'Placing Broker', sortable: true, defaultWidth: 160 },
    { key: 'policy_currency', label: 'Currency', sortable: false, defaultWidth: 90 },
    { key: 'gross_premium', label: 'Gross Premium', sortable: true, defaultWidth: 130 },
    { key: 'net_premium', label: 'Net Premium', sortable: true, defaultWidth: 120 },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PoliciesListPage() {
    const [policies, setPolicies] = useState<Policy[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const { addNotification } = useNotifications()

    useEffect(() => {
        setLoading(true)
        setError(null)
        getPolicies()
            .then(setPolicies)
            .catch((err: Error) => {
                setError(err.message ?? 'Failed to load policies.')
                addNotification(`Could not load policies: ${err.message ?? 'unknown error'}`, 'error')
            })
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    function handleSort(key: string) {
        setSortConfig((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        )
    }

    const sorted = [...policies].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortConfig.key] ?? ''
        const bv = (b as Record<string, unknown>)[sortConfig.key] ?? ''
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    function renderCell(key: string, row: unknown): React.ReactNode {
        const p = row as Policy
        if (key === 'reference') {
            return (
                <Link
                    to={`/policies/${p.id}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline font-medium"
                >
                    {p.reference}
                </Link>
            )
        }
        if (key === 'status') {
            return (
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[p.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                    {p.status}
                </span>
            )
        }
        if (key === 'insured') return p.insured ?? '—'
        if (key === 'class_of_business') return p.class_of_business ?? '—'
        if (key === 'inception_date') return p.inception_date ?? '—'
        if (key === 'expiry_date') return p.expiry_date ?? '—'
        if (key === 'placing_broker') return p.placing_broker ?? '—'
        if (key === 'policy_currency') return p.policy_currency ?? '—'
        if (key === 'gross_premium') return p.gross_premium != null ? p.gross_premium.toLocaleString() : '—'
        if (key === 'net_premium') return p.net_premium != null ? p.net_premium.toLocaleString() : '—'
        return '—'
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <p role="heading" aria-level={1} className="text-xl font-semibold text-gray-900">
                    Policies
                </p>
            </div>

            {loading && (
                <div className="flex justify-center p-6">
                    <LoadingSpinner />
                </div>
            )}

            {error && !loading && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!loading && (
                <ResizableGrid
                    columns={GRID_COLUMNS}
                    rows={sorted}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    renderCell={renderCell}
                    emptyMessage="No policies found."
                    storageKey="table-widths-policies"
                />
            )}
        </div>
    )
}
