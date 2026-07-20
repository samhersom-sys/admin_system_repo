/**
 * Rating Rules list page — REQ-SETTINGS-RATING-F-001 through F-003, F-009 through F-013
 * Requirements: settings.requirements.md §3b
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCheck, FiChevronDown, FiChevronUp, FiPlus, FiSave, FiSearch, FiSliders, FiX } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import {
    createRatingSchedule,
    getRatingSchedules,
    type RatingSchedule,
} from './settings.service'

function formatDate(value: string | null) {
    if (!value) return '—'
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

export default function RatingRulesPage() {
    const navigate = useNavigate()
    const { addNotification, removeNotification } = useNotifications()
    const [schedules, setSchedules] = useState<RatingSchedule[]>([])
    const [loading, setLoading] = useState(true)
    const [showInlineCreate, setShowInlineCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [newEffectiveDate, setNewEffectiveDate] = useState('')
    const [newExpiryDate, setNewExpiryDate] = useState('')
    const [expiryManuallyEdited, setExpiryManuallyEdited] = useState(false)
    const [creating, setCreating] = useState(false)

    function plusOneYearIso(dateIso: string): string {
        const [y, m, d] = dateIso.split('-').map((n) => Number(n))
        if (!y || !m || !d) return ''
        const dt = new Date(Date.UTC(y + 1, m - 1, d))
        return dt.toISOString().slice(0, 10)
    }

    function handleEffectiveFromChange(value: string) {
        setNewEffectiveDate(value)
        if (!value) {
            if (!expiryManuallyEdited) setNewExpiryDate('')
            return
        }
        if (!expiryManuallyEdited || !newExpiryDate) {
            setNewExpiryDate(plusOneYearIso(value))
        }
    }

    const hasUnsaved = showInlineCreate && newName.trim().length > 0

    // Sort state — REQ-SETTINGS-RATING-F-017 (column ordering)
    const [sortKey, setSortKey] = useState<keyof typeof schedules[0] | null>(null)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    function handleSort(key: keyof typeof schedules[0]) {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key as keyof typeof schedules[0])
            setSortDir('asc')
        }
    }

    const sortedSchedules = useMemo(() => {
        if (!sortKey) return schedules
        return [...schedules].sort((a, b) => {
            const av = a[sortKey]
            const bv = b[sortKey]
            const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : av > bv ? 1 : 0
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [schedules, sortKey, sortDir])

    function SortIcon({ col }: { col: keyof typeof schedules[0] }) {
        if (sortKey !== col) return <FiChevronDown size={10} className="text-gray-300 ml-1" />
        return sortDir === 'asc'
            ? <FiChevronUp size={10} className="text-brand-600 ml-1" />
            : <FiChevronDown size={10} className="text-brand-600 ml-1" />
    }

    useEffect(() => {
        getRatingSchedules()
            .then(data => setSchedules(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false))
    }, [])

    // Guard browser close/refresh when an unsaved row exists
    useEffect(() => {
        if (!hasUnsaved) return
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [hasUnsaved])

    // REQ-SETTINGS-RATING-F-018: unsaved warning in notification panel
    useEffect(() => {
        if (hasUnsaved) {
            void addNotification(
                'You have unsaved changes. Save or cancel before navigating away.',
                'warning',
                { id: 'rating-unsaved' }
            )
        } else {
            void removeNotification('rating-unsaved')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasUnsaved])

    function handleCancelCreate() {
        setShowInlineCreate(false)
        setNewName('')
        setNewEffectiveDate('')
        setNewExpiryDate('')
        setExpiryManuallyEdited(false)
    }

    async function handleCreate() {
        if (!newName.trim()) return
        setCreating(true)
        try {
            const created = await createRatingSchedule({
                name: newName.trim(),
                effective_date: newEffectiveDate || null,
                expiry_date: newExpiryDate || null,
                is_active: true,
            })
            void removeNotification('rating-unsaved')
            navigate(`/settings/rating-rules/${created.id}`)
        } catch (err) {
            void addNotification(
                err instanceof Error ? err.message : 'Failed to create rating profile.',
                'error',
            )
        } finally {
            setCreating(false)
        }
    }

    // Sidebar section — REQ-SETTINGS-RATING-F-011
    const sidebarSection = useMemo(() => ({
        title: 'Rating Profiles',
        items: [
            { label: 'Save', icon: FiSave, event: 'rating-schedule:save', disabled: !hasUnsaved },
        ],
    }), [hasUnsaved])

    useSidebarSection(sidebarSection)

    // Listen for sidebar save event — always use latest handleCreate
    useEffect(() => {
        const handler = () => { void handleCreate() }
        window.addEventListener('rating-schedule:save', handler)
        return () => window.removeEventListener('rating-schedule:save', handler)
    }) // intentionally no deps — always latest handler

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <FiSliders className="text-brand-500 text-2xl" />
                <h2 className="text-2xl font-semibold text-gray-900">Rating Profiles</h2>
            </div>

            <div className="table-wrapper rounded-lg shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center h-48 bg-white border border-gray-200 rounded-lg">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
                    </div>
                ) : (
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th style={{ width: 52 }}>
                                    {!showInlineCreate && (
                                        <button
                                            type="button"
                                            aria-label="Add schedule"
                                            title="Add schedule"
                                            onClick={() => setShowInlineCreate(true)}
                                        >
                                            <FiPlus size={14} />
                                        </button>
                                    )}
                                </th>
                                <th style={{ width: 64 }} className="cursor-pointer select-none" onClick={() => handleSort('id')}>
                                    <span className="inline-flex items-center">ID<SortIcon col="id" /></span>
                                </th>
                                <th className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                                    <span className="inline-flex items-center">Name<SortIcon col="name" /></span>
                                </th>
                                <th className="cursor-pointer select-none" onClick={() => handleSort('effective_date')}>
                                    <span className="inline-flex items-center">Effective From<SortIcon col="effective_date" /></span>
                                </th>
                                <th className="cursor-pointer select-none" onClick={() => handleSort('expiry_date')}>
                                    <span className="inline-flex items-center">Effective To<SortIcon col="expiry_date" /></span>
                                </th>
                                <th className="cursor-pointer select-none" onClick={() => handleSort('is_active')}>
                                    <span className="inline-flex items-center">Status<SortIcon col="is_active" /></span>
                                </th>
                                <th className="cursor-pointer select-none" onClick={() => handleSort('version')}>
                                    <span className="inline-flex items-center">Version<SortIcon col="version" /></span>
                                </th>
                                <th className="cursor-pointer select-none" onClick={() => handleSort('org_name')}>
                                    <span className="inline-flex items-center">Organisation<SortIcon col="org_name" /></span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {showInlineCreate ? (
                                <tr>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                aria-label="Create"
                                                title="Create"
                                                disabled={!newName.trim() || creating}
                                                onClick={handleCreate}
                                                className="text-brand-600 hover:text-brand-800 disabled:opacity-40"
                                            >
                                                <FiCheck size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                aria-label="Cancel"
                                                title="Cancel"
                                                onClick={handleCancelCreate}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        </div>
                                    </td>
                                    <td>{/* ID auto-assigned */}</td>
                                    <td>
                                        <input
                                            type="text"
                                            aria-label="Schedule Name"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            placeholder="Schedule name…"
                                            className="w-full border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                            // eslint-disable-next-line jsx-a11y/no-autofocus
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') void handleCreate()
                                                if (e.key === 'Escape') handleCancelCreate()
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="date"
                                            aria-label="Effective From"
                                            value={newEffectiveDate}
                                            onChange={e => handleEffectiveFromChange(e.target.value)}
                                            className="border border-gray-300 rounded px-2 py-0.5 text-sm"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="date"
                                            aria-label="Effective To"
                                            value={newExpiryDate}
                                            onChange={e => {
                                                setExpiryManuallyEdited(true)
                                                setNewExpiryDate(e.target.value)
                                            }}
                                            className="border border-gray-300 rounded px-2 py-0.5 text-sm"
                                        />
                                    </td>
                                    <td>{/* Status empty for new row */}</td>
                                    <td>{/* Version auto-assigned */}</td>
                                    <td>{/* Organisation set from caller's JWT */}</td>
                                </tr>
                            ) : null}
                            {schedules.length === 0 && !showInlineCreate ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-gray-500 py-8">
                                        No rating schedules found.
                                    </td>
                                </tr>
                            ) : (
                                sortedSchedules.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <button
                                                type="button"
                                                aria-label="Open schedule"
                                                title="Open schedule"
                                                onClick={() => navigate(`/settings/rating-rules/${s.id}`)}
                                                className="text-brand-600 hover:text-brand-800"
                                            >
                                                <FiSearch size={14} />
                                            </button>
                                        </td>
                                        <td className="text-gray-500 text-xs font-mono">{s.id}</td>
                                        <td className="font-medium text-gray-900">{s.name}</td>
                                        <td className="text-gray-600">{formatDate(s.effective_date)}</td>
                                        <td className="text-gray-600">{formatDate(s.expiry_date)}</td>
                                        <td>
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                    }`}
                                            >
                                                {s.is_active ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="text-gray-600 text-sm">{s.version ?? '—'}</td>
                                        <td className="text-gray-600 text-sm">{s.org_name ?? s.org_code ?? '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
