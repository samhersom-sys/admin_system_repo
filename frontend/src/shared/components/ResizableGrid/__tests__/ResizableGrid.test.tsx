/**
 * TESTS — shared/components/ResizableGrid + shared/lib/hooks/useResizableColumns
 *
 * Requirements: ../requirements.md
 * Test ID format: T-SHARED-GRID-R[NN]
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ResizableGrid from '../ResizableGrid'
import type { Column } from '../ResizableGrid'

const COLUMNS: Column[] = [
    { key: 'name', label: 'Name', sortable: true, defaultWidth: 200 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 120 },
    { key: 'date', label: 'Date', sortable: false, defaultWidth: 100 },
]

const ROWS = [
    { name: 'ACME Corp', status: 'Active', date: '2026-01-01' },
    { name: 'Widget Ltd', status: 'Inactive', date: '2026-02-01' },
]

function renderCell(key: string, row: unknown): React.ReactNode {
    const r = row as Record<string, string>
    return r[key] ?? '—'
}

describe('ResizableGrid', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    // REQ-SHARED-GRID-F-001 — reads from localStorage
    test('T-SHARED-GRID-R01 — reads initial widths from localStorage', () => {
        localStorage.setItem('table-widths-test', JSON.stringify({ name: 350 }))
        const { container } = render(
            <ResizableGrid
                columns={COLUMNS}
                rows={[]}
                storageKey="table-widths-test"
                renderCell={renderCell}
            />
        )
        const cols = container.querySelectorAll('colgroup col')
        expect((cols[0] as HTMLElement).style.width).toBe('350px')
    })

    // REQ-SHARED-GRID-F-002 — persists to localStorage
    test('T-SHARED-GRID-R02 — persists widths to localStorage on resize', () => {
        render(
            <ResizableGrid
                columns={COLUMNS}
                rows={[]}
                storageKey="table-widths-test"
                renderCell={renderCell}
            />
        )
        const resizer = screen.getByTestId('col-resizer-name')
        fireEvent.mouseDown(resizer, { clientX: 0 })
        fireEvent.mouseMove(window, { clientX: 50 })
        fireEvent.mouseUp(window)
        const stored = JSON.parse(localStorage.getItem('table-widths-test') ?? '{}')
        expect(stored.name).toBeGreaterThan(200)
    })

    // REQ-SHARED-GRID-F-003 — min width enforced
    test('T-SHARED-GRID-R03 — minimum column width is enforced (default 60px)', () => {
        const { container } = render(
            <ResizableGrid
                columns={COLUMNS}
                rows={[]}
                storageKey="table-widths-test"
                renderCell={renderCell}
            />
        )
        const resizer = screen.getByTestId('col-resizer-name')
        fireEvent.mouseDown(resizer, { clientX: 200 })
        // Drag way to the left — would make width negative without the clamp
        fireEvent.mouseMove(window, { clientX: -500 })
        fireEvent.mouseUp(window)

        const cols = container.querySelectorAll('colgroup col')
        const width = parseInt((cols[0] as HTMLElement).style.width, 10)
        expect(width).toBeGreaterThanOrEqual(60)
    })

    // REQ-SHARED-GRID-F-004 — colgroup with one col per column
    test('T-SHARED-GRID-R04 — colgroup renders one <col> per column', () => {
        const { container } = render(
            <ResizableGrid columns={COLUMNS} rows={[]} storageKey="table-widths-test" renderCell={renderCell} />
        )
        expect(container.querySelectorAll('colgroup col')).toHaveLength(3)
    })

    // REQ-SHARED-GRID-F-005 — col-resizer span in each header
    test('T-SHARED-GRID-R05 — each column header has a col-resizer handle', () => {
        render(
            <ResizableGrid columns={COLUMNS} rows={[]} storageKey="table-widths-test" renderCell={renderCell} />
        )
        expect(screen.getAllByTestId(/^col-resizer-/)).toHaveLength(3)
    })

    // REQ-SHARED-GRID-F-006 — sort icon on sortable columns
    test('T-SHARED-GRID-R06 — sort icons rendered for sortable columns when sortConfig provided', () => {
        const { container } = render(
            <ResizableGrid
                columns={COLUMNS}
                rows={[]}
                storageKey="table-widths-test"
                sortConfig={{ key: 'name', direction: 'asc' }}
                onRequestSort={() => { }}
                renderCell={renderCell}
            />
        )
        const svgs = container.querySelectorAll('svg[aria-hidden="true"]')
        // sortable columns: name, status (2 sort icons)
        expect(svgs.length).toBeGreaterThanOrEqual(2)
    })

    // REQ-SHARED-GRID-F-007 — empty state message
    test('T-SHARED-GRID-R07 — shows emptyMessage when rows array is empty', () => {
        render(
            <ResizableGrid
                columns={COLUMNS}
                rows={[]}
                storageKey="table-widths-test"
                renderCell={renderCell}
                emptyMessage="No quotes found."
            />
        )
        expect(screen.getByText('No quotes found.')).toBeInTheDocument()
    })

    // Smoke test — renders all rows
    test('T-SHARED-GRID-R08 — renders all data rows', () => {
        render(
            <ResizableGrid
                columns={COLUMNS}
                rows={ROWS}
                storageKey="table-widths-test"
                renderCell={renderCell}
            />
        )
        expect(screen.getByText('ACME Corp')).toBeInTheDocument()
        expect(screen.getByText('Widget Ltd')).toBeInTheDocument()
    })

    // Accessible column headers
    test('T-SHARED-GRID-R09 — column headers have correct accessible names', () => {
        render(
            <ResizableGrid
                columns={COLUMNS}
                rows={ROWS}
                storageKey="table-widths-test"
                renderCell={renderCell}
            />
        )
        expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /date/i })).toBeInTheDocument()
    })
})
