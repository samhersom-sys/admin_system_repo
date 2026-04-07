/**
 * ResizableGrid — generic sortable table with mouse-drag column resizing.
 *
 * Requirements: requirements.md
 * Tests: __tests__/ResizableGrid.test.tsx
 *
 * REQ-SHARED-GRID-F-001–F-003 — handled by useResizableColumns hook
 * REQ-SHARED-GRID-F-004 — <colgroup> with one <col> per column
 * REQ-SHARED-GRID-F-005 — col-resizer handle in each <th>
 * REQ-SHARED-GRID-F-006 — sort icon on sortable columns
 * REQ-SHARED-GRID-F-007 — empty-state row spanning all columns
 * REQ-SHARED-GRID-C-001 — used by QuotesListPage, SearchResults, PartyListPage
 * REQ-SHARED-GRID-C-002 — storageKey format: table-widths-{tableName}
 */

import React from 'react'
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'
import { useResizableColumns } from '@/shared/lib/hooks/useResizableColumns'

export interface Column {
    key: string
    label: React.ReactNode
    sortable?: boolean
    defaultWidth?: number
}

export interface SortConfig {
    key: string
    direction: 'asc' | 'desc'
}

interface ResizableGridProps {
    columns: Column[]
    rows: unknown[]
    storageKey: string
    sortConfig?: SortConfig
    onRequestSort?: (key: string) => void
    renderCell: (key: string, row: unknown, rowIndex: number) => React.ReactNode
    rowKey?: (row: unknown, index: number) => string | number
    emptyMessage?: string
    onRowClick?: (row: unknown) => void
}

export default function ResizableGrid({
    columns,
    rows,
    storageKey,
    sortConfig,
    onRequestSort,
    renderCell,
    rowKey,
    emptyMessage = 'No records found.',
    onRowClick,
}: ResizableGridProps) {
    const defaultWidths = Object.fromEntries(
        columns.map((col) => [col.key, col.defaultWidth ?? 150])
    )

    const { startResize, getWidth } = useResizableColumns({ defaultWidths, storageKey })

    function SortIcon({ colKey }: { colKey: string }) {
        if (!sortConfig || sortConfig.key !== colKey) {
            return (
                <FaSort
                    className="flex-shrink-0 text-gray-400"
                    size={12}
                    aria-hidden="true"
                />
            )
        }
        return sortConfig.direction === 'asc' ? (
            <FaSortUp className="flex-shrink-0 text-brand-600" size={12} aria-hidden="true" />
        ) : (
            <FaSortDown className="flex-shrink-0 text-brand-600" size={12} aria-hidden="true" />
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="app-table w-full">
                <colgroup>
                    {columns.map((col) => (
                        <col key={col.key} style={{ width: getWidth(col.key) }} />
                    ))}
                </colgroup>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                style={{ position: 'relative' }}
                                aria-sort={
                                    sortConfig && sortConfig.key === col.key
                                        ? sortConfig.direction === 'asc'
                                            ? 'ascending'
                                            : 'descending'
                                        : 'none'
                                }
                            >
                                <div className="flex items-center gap-1 select-none">
                                    <span
                                        style={{
                                            cursor:
                                                col.sortable && onRequestSort ? 'pointer' : 'default',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                        onClick={
                                            col.sortable && onRequestSort
                                                ? () => onRequestSort(col.key)
                                                : undefined
                                        }
                                    >
                                        {col.label}
                                    </span>
                                    {col.sortable && sortConfig !== undefined && (
                                        <SortIcon colKey={col.key} />
                                    )}
                                </div>
                                {/* Column resizer handle */}
                                <span
                                    data-testid={`col-resizer-${col.key}`}
                                    className="col-resizer"
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: 6,
                                        cursor: 'col-resize',
                                        zIndex: 1,
                                    }}
                                    onMouseDown={(e) => startResize(col.key, e)}
                                />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="text-center text-gray-400 py-10 text-sm"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, i) => (
                            <tr
                                key={rowKey ? rowKey(row, i) : i}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={onRowClick ? 'cursor-pointer hover:bg-brand-50' : undefined}
                            >
                                {columns.map((col) => (
                                    <td key={col.key}>{renderCell(col.key, row, i)}</td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
