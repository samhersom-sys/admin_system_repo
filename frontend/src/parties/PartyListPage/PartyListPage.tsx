/**
 * PartyListPage — /parties
 *
 * Requirements: requirements.md
 * Tests: test.tsx
 *
 * Features:
 *  - Lists all parties for the authenticated org (R01)
 *  - Role dropdown filter (R02)
 *  - Live name search (R03)
 *  - "New Party" button navigates to /parties/new (R04)
 */

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listParties } from '@/parties/parties.service'
import type { Party, PartyFilters } from '@/parties/parties.service'
import { useNotifications } from '@/shell/NotificationDock'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column } from '@/shared/components/ResizableGrid/ResizableGrid'

const PARTY_ROLES = ['Insured', 'Broker', 'Insurer', 'Coverholder']

// REQ-SHARED-GRID-C-001 — ResizableGrid column definitions
const GRID_COLUMNS: Column[] = [
    { key: 'name', label: 'Name', sortable: false, defaultWidth: 200 },
    { key: 'type', label: 'Type', sortable: false, defaultWidth: 120 },
    { key: 'city', label: 'City', sortable: false, defaultWidth: 140 },
    { key: 'country', label: 'Country', sortable: false, defaultWidth: 140 },
]

export default function PartyListPage() {
    const navigate = useNavigate()

    const [parties, setParties] = useState<Party[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [roleFilter, setRoleFilter] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const { addNotification } = useNotifications()

    // Load parties whenever filter or search changes
    useEffect(() => {
        setLoading(true)
        setError(null)
        const filters: PartyFilters = {}
        if (roleFilter) filters.type = roleFilter
        if (searchTerm.trim()) filters.search = searchTerm.trim()
        listParties(filters)
            .then(setParties)
            .catch((err: Error) => {
                setError(err.message ?? 'Failed to load parties.')
                addNotification(`Could not load parties: ${err.message ?? 'unknown error'}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [roleFilter, searchTerm])

    return (
        <div className="p-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">Parties</h1>
                <button
                    type="button"
                    aria-label="New Party"
                    onClick={() => navigate('/parties/new')}
                    className="px-4 py-2 text-sm rounded bg-brand-600 text-white hover:bg-brand-700"
                >
                    + New Party
                </button>
            </div>

            {/* Filter row (R02, R03) */}
            <div className="flex gap-3">
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    aria-label="Filter by role"
                    className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                    <option value="">All types</option>
                    {PARTY_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Search by name…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search parties"
                    className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
            </div>

            {/* Body (R01) */}
            {loading ? (
                <p className="text-sm text-gray-400 py-8 text-center" aria-label="Loading parties">
                    Loading parties…
                </p>
            ) : error ? (
                <p className="text-sm text-red-600 py-4">{error}</p>
            ) : (
                <ResizableGrid
                    columns={GRID_COLUMNS}
                    rows={parties}
                    storageKey="table-widths-parties"
                    renderCell={(key, row) => {
                        const p = row as Party
                        if (key === 'name') return <span className="font-medium">{p.name}</span>
                        if (key === 'type') return p.type
                        if (key === 'city') return <span className="text-gray-500">{(p.city as string) || '–'}</span>
                        if (key === 'country') return <span className="text-gray-500">{(p.country as string) || '–'}</span>
                        return '—'
                    }}
                    rowKey={(row) => (row as Party).id}
                    emptyMessage="No parties found."
                />
            )}
        </div>
    )
}

