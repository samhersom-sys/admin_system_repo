/**
 * TESTS — shared/components/AuditTable + shared/lib/hooks/useAudit
 *
 * Requirements: ../requirements.md
 * Test ID format: T-SHARED-AUDIT-R[NN]
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import AuditTable from '../AuditTable'
import type { AuditEvent } from '@/shared/lib/hooks/useAudit'

// ---------------------------------------------------------------------------
// Mocks (used by useAudit tests)
// ---------------------------------------------------------------------------

const mockPost = jest.fn()
const mockGet = jest.fn()

jest.mock('@/shared/lib/api-client/api-client', () => ({
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
    put: jest.fn(),
    del: jest.fn(),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: () => ({
        token: 'test-token',
        user: { id: 'user-1', name: 'Jane Smith', orgCode: 'DEMO', email: 'jane@demo.com' },
    }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
    return {
        action: 'Quote Opened',
        user: 'Jane Smith',
        userId: 'user-1',
        date: '2026-06-01T10:30:00.000Z',
        details: null,
        changes: null,
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// AuditTable component tests — F-001 to F-006
// ---------------------------------------------------------------------------

describe('AuditTable', () => {
    // REQ-SHARED-AUDIT-F-001
    test('T-SHARED-AUDIT-R01 — renders 4 column headers', () => {
        render(<AuditTable audit={[]} />)
        expect(screen.getByRole('columnheader', { name: /action/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /user/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /date.*time/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /details/i })).toBeInTheDocument()
    })

    // REQ-SHARED-AUDIT-F-002
    test('T-SHARED-AUDIT-R02 — empty state message includes entityType', () => {
        render(<AuditTable audit={[]} entityType="Quote" />)
        expect(
            screen.getByText(/no audit history available for this quote/i)
        ).toBeInTheDocument()
    })

    // REQ-SHARED-AUDIT-F-003
    test('T-SHARED-AUDIT-R03 — date is formatted in en-GB locale (DD/MM/YYYY)', () => {
        const event = makeEvent({ date: '2026-06-15T10:30:00.000Z' })
        render(<AuditTable audit={[event]} />)
        // en-GB short date: 15/06/2026
        expect(screen.getByText(/15\/06\/2026/)).toBeInTheDocument()
    })

    // REQ-SHARED-AUDIT-F-004
    test('T-SHARED-AUDIT-R04 — structured changes renders old value (strikethrough) and new value', () => {
        const event = makeEvent({
            action: 'Quote Updated',
            changes: { business_type: { old: 'Insurance', new: 'Reinsurance' } },
        })
        render(<AuditTable audit={[event]} />)
        const stale = screen.getByText('Insurance')
        expect(stale).toHaveClass('line-through')
        expect(screen.getByText('Reinsurance')).toBeInTheDocument()
    })

    // REQ-SHARED-AUDIT-F-005
    test('T-SHARED-AUDIT-R05 — plain-text details rendered as-is', () => {
        const event = makeEvent({ details: 'First visit by user.' })
        render(<AuditTable audit={[event]} />)
        expect(screen.getByText('First visit by user.')).toBeInTheDocument()
    })

    // REQ-SHARED-AUDIT-F-006
    test('T-SHARED-AUDIT-R06 — null details renders em-dash', () => {
        const event = makeEvent({ details: null, changes: null })
        render(<AuditTable audit={[event]} />)
        const rows = screen.getAllByRole('row')
        // Row 0 = header; Row 1 = data row
        expect(rows[1]).toHaveTextContent('—')
    })

    // Loading state
    test('T-SHARED-AUDIT-R07 — loading prop shows loading message instead of table', () => {
        render(<AuditTable audit={[]} loading />)
        expect(screen.getByText(/loading audit history/i)).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    // Error state
    test('T-SHARED-AUDIT-R08 — error prop shows error message instead of table', () => {
        render(<AuditTable audit={[]} error="Network error" />)
        expect(screen.getByText('Network error')).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// useAudit hook tests — F-007 to F-012
// ---------------------------------------------------------------------------

describe('useAudit', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockPost.mockResolvedValue({})
        mockGet.mockResolvedValue([])
    })

    // REQ-SHARED-AUDIT-F-007
    test('T-SHARED-AUDIT-R09 — posts "Entity Opened" on mount when trackVisits=true', async () => {
        const { useAudit } = await import('@/shared/lib/hooks/useAudit')
        await act(async () => {
            renderHook(() =>
                useAudit({
                    entityType: 'Quote',
                    entityId: 42,
                    apiBase: '/api/quotes',
                    trackVisits: true,
                })
            )
        })
        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith(
                '/api/quotes/42/audit',
                expect.objectContaining({ action: 'Quote Opened' })
            )
        })
    })

    // REQ-SHARED-AUDIT-F-008
    test('T-SHARED-AUDIT-R10 — posts "Entity Closed" on unmount when trackVisits=true', async () => {
        const { useAudit } = await import('@/shared/lib/hooks/useAudit')
        let unmount!: () => void
        await act(async () => {
            const r = renderHook(() =>
                useAudit({
                    entityType: 'Quote',
                    entityId: 42,
                    apiBase: '/api/quotes',
                    trackVisits: true,
                })
            )
            unmount = r.unmount
        })

        jest.clearAllMocks()
        mockPost.mockResolvedValue({})

        await act(async () => { unmount() })

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith(
                '/api/quotes/42/audit',
                expect.objectContaining({ action: 'Quote Closed' })
            )
        })
    })

    // REQ-SHARED-AUDIT-F-009
    test('T-SHARED-AUDIT-R11 — does not post when entityId is null', async () => {
        const { useAudit } = await import('@/shared/lib/hooks/useAudit')
        await act(async () => {
            renderHook(() =>
                useAudit({
                    entityType: 'Quote',
                    entityId: null,
                    apiBase: '/api/quotes',
                    trackVisits: true,
                })
            )
        })
        expect(mockPost).not.toHaveBeenCalled()
    })

    // REQ-SHARED-AUDIT-F-010
    test('T-SHARED-AUDIT-R12 — getAudit() calls GET and resolves events', async () => {
        const { useAudit } = await import('@/shared/lib/hooks/useAudit')
        const events = [makeEvent()]
        mockGet.mockResolvedValue(events)

        // Render the hook outside act so result.current is accessible immediately
        const { result } = renderHook(() =>
            useAudit({ entityType: 'Quote', entityId: 42, apiBase: '/api/quotes' })
        )

        await act(async () => {
            await result.current.getAudit()
        })

        expect(mockGet).toHaveBeenCalledWith('/api/quotes/42/audit')
    })

    // REQ-SHARED-AUDIT-F-012
    test('T-SHARED-AUDIT-R13 — uses auth-session for username, not a body prop', async () => {
        const { useAudit } = await import('@/shared/lib/hooks/useAudit')
        await act(async () => {
            renderHook(() =>
                useAudit({
                    entityType: 'Quote',
                    entityId: 1,
                    apiBase: '/api/quotes',
                    trackVisits: true,
                })
            )
        })
        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ user: 'Jane Smith', userId: 'user-1' })
            )
        })
    })
})
