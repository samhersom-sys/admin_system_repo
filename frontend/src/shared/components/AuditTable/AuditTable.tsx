/**
 * AuditTable — 4-column read-only audit history table.
 *
 * Requirements: requirements.md
 * Tests: __tests__/AuditTable.test.tsx
 *
 * REQ-SHARED-AUDIT-F-001 — 4 column headers: Action, User, Date & Time, Details
 * REQ-SHARED-AUDIT-F-002 — empty state message includes entityType
 * REQ-SHARED-AUDIT-F-003 — date formatted in en-GB locale (DD/MM/YYYY, HH:MM:SS)
 * REQ-SHARED-AUDIT-F-004 — change diff rendered as old (strikethrough) → new
 * REQ-SHARED-AUDIT-F-005 — plain-text details rendered as-is
 * REQ-SHARED-AUDIT-F-006 — null details renders em-dash
 */

import React, { useMemo, useState } from 'react'
import type { AuditEvent } from '@/shared/lib/hooks/useAudit'

interface AuditTableProps {
    audit: AuditEvent[]
    loading?: boolean
    error?: string | null
    entityType?: string
    emptyMessage?: string
}

type SortKey = 'action' | 'user' | 'date'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    if (!active) return <span className="ml-1 text-gray-300 text-xs">⇅</span>
    return <span className="ml-1 text-xs">{dir === 'asc' ? '↑' : '↓'}</span>
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })
}

function renderDetails(
    details: string | null | undefined,
    changes: Record<string, { old: string; new: string }> | null | undefined
): React.ReactNode {
    // Structured changes take priority
    if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
        return (
            <ul className="space-y-0.5">
                {Object.entries(changes).map(([field, change]) => (
                    <li key={field} className="text-xs">
                        <span className="font-medium text-gray-700">{field}:</span>{' '}
                        <span className="text-red-600 line-through">{change.old}</span>
                        {' \u2192 '}
                        <span className="text-green-700">{change.new}</span>
                    </li>
                ))}
            </ul>
        )
    }
    if (!details) return '\u2014'
    return details
}

export default function AuditTable({
    audit,
    loading,
    error,
    entityType = 'record',
    emptyMessage,
}: AuditTableProps) {
    // REQ-SHARED-AUDIT-F-007 — default sort: date descending (newest first)
    const [sortKey, setSortKey] = useState<SortKey>('date')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    function handleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir(key === 'date' ? 'desc' : 'asc')
        }
    }

    const sortedAudit = useMemo(() => {
        return [...audit].sort((a, b) => {
            let va: string, vb: string
            if (sortKey === 'date') {
                va = a.date ?? ''
                vb = b.date ?? ''
            } else if (sortKey === 'action') {
                va = (a.action ?? '').toLowerCase()
                vb = (b.action ?? '').toLowerCase()
            } else {
                va = (a.user ?? '').toLowerCase()
                vb = (b.user ?? '').toLowerCase()
            }
            const cmp = va < vb ? -1 : va > vb ? 1 : 0
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [audit, sortKey, sortDir])

    if (loading) {
        return (
            <p className="text-sm text-gray-400 py-4 text-center">
                Loading audit history\u2026
            </p>
        )
    }

    if (error) {
        return <p className="text-sm text-red-600 py-4">{error}</p>
    }

    return (
        <div className="overflow-x-auto">
            <table className="app-table w-full">
                <thead>
                    <tr>
                        <th scope="col" onClick={() => handleSort('action')} className="cursor-pointer select-none whitespace-nowrap">
                            Action <SortIcon active={sortKey === 'action'} dir={sortDir} />
                        </th>
                        <th scope="col" onClick={() => handleSort('user')} className="cursor-pointer select-none whitespace-nowrap">
                            User <SortIcon active={sortKey === 'user'} dir={sortDir} />
                        </th>
                        <th scope="col" onClick={() => handleSort('date')} className="cursor-pointer select-none whitespace-nowrap">
                            Date &amp; Time <SortIcon active={sortKey === 'date'} dir={sortDir} />
                        </th>
                        <th scope="col">Details</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedAudit.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="text-center text-gray-400 py-10 text-sm italic">
                                {emptyMessage ?? `No audit history available for this ${entityType}.`}
                            </td>
                        </tr>
                    ) : (
                        sortedAudit.map((event, i) => (
                            <tr key={i}>
                                <td className="font-medium">{event.action}</td>
                                <td>{event.user ?? '\u2014'}</td>
                                <td>{formatDate(event.date)}</td>
                                <td>{renderDetails(event.details, event.changes)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
