/**
 * ClaimsListPage — /claims
 *
 * REQ-CLM-FE-F-001 — GET /api/claims on mount; ResizableGrid
 * REQ-CLM-FE-F-002 — Reference cell links to /claims/:id
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getClaims } from '@/claims/claims.service'
import type { Claim } from '@/claims/claims.service'
import { useNotifications } from '@/shell/NotificationDock'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column, SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<string, string> = {
    Open: 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    Closed: 'bg-gray-100 text-gray-700',
    Declined: 'bg-red-100 text-red-700',
}

const GRID_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 200 },
    { key: 'policyReference', label: 'Policy Reference', sortable: true, defaultWidth: 180 },
    { key: 'insured', label: 'Insured', sortable: true, defaultWidth: 180 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 110 },
    { key: 'lossDate', label: 'Date of Loss', sortable: true, defaultWidth: 130 },
    { key: 'reportedDate', label: 'Reported Date', sortable: true, defaultWidth: 130 },
    { key: 'description', label: 'Description', sortable: false, defaultWidth: 250 },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClaimsListPage() {
    const [claims, setClaims] = useState<Claim[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const { addNotification } = useNotifications()

    useEffect(() => {
        setLoading(true)
        setError(null)
        getClaims()
            .then(setClaims)
            .catch((err: Error) => {
                const msg = err?.message ?? 'Failed to load claims'
                setError(msg)
                addNotification(msg, 'error')
            })
            .finally(() => setLoading(false))
    }, [addNotification])

    const sorted = [...claims].sort((a, b) => {
        const { key, direction } = sortConfig
        const av = (a as Record<string, unknown>)[key] ?? ''
        const bv = (b as Record<string, unknown>)[key] ?? ''
        const cmp = String(av).localeCompare(String(bv))
        return direction === 'asc' ? cmp : -cmp
    })

    if (loading) return <LoadingSpinner />
    if (error) return <div className="p-6 text-red-600">{error}</div>

    return (
        <div className="p-6">
            <ResizableGrid
                columns={GRID_COLUMNS}
                rows={sorted}
                storageKey="table-widths-claims"
                sortConfig={sortConfig}
                onRequestSort={(key) =>
                    setSortConfig((prev) => ({
                        key,
                        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                    }))
                }
                renderCell={(key, row) => {
                    const claim = row as Claim
                    if (key === 'reference') {
                        return (
                            <Link
                                to={`/claims/${claim.id}`}
                                className="text-brand-primary hover:underline font-medium"
                            >
                                {claim.reference}
                            </Link>
                        )
                    }
                    if (key === 'status') {
                        const cls = STATUS_CLASSES[claim.status] ?? 'bg-gray-100 text-gray-700'
                        return (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
                                {claim.status}
                            </span>
                        )
                    }
                    return String((row as Record<string, unknown>)[key] ?? '')
                }}
            />
        </div>
    )
}
