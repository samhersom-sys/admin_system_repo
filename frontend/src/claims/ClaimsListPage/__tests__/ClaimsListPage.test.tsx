/**
 * TESTS — claims/ClaimsListPage
 *
 * REQ-CLM-FE-F-001 — GET /api/claims on mount; ResizableGrid
 * REQ-CLM-FE-F-002 — Reference cell links to /claims/:id
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetClaims = jest.fn()
jest.mock('@/claims/claims.service', () => ({
    getClaims: (...args: unknown[]) => mockGetClaims(...args),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({
        addNotification: mockAddNotification,
        notifications: [],
        addedSignal: 0,
        removeNotification: jest.fn(),
        markAsRead: jest.fn(),
        clearAll: jest.fn(),
    }),
}))

import ClaimsListPage from '../ClaimsListPage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClaim(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        claimNumber: 'CLM-0001',
        reference: 'CLM-DEMO-20260101-001',
        policyId: 10,
        policyReference: 'POL-DEMO-001',
        insured: 'Acme Corp',
        status: 'Open',
        lossDate: '2026-01-05',
        reportedDate: '2026-01-08',
        description: 'Fire damage',
        createdAt: '2026-01-08T10:00:00Z',
        ...overrides,
    }
}

function renderPage() {
    return render(
        <MemoryRouter>
            <ClaimsListPage />
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks()
    mockGetClaims.mockReturnValue(new Promise(() => { }))
})

// ---------------------------------------------------------------------------
// REQ-CLM-FE-F-001 — mount + grid
// ---------------------------------------------------------------------------

describe('REQ-CLM-FE-F-001 — mount and grid', () => {
    it('T-CLM-LIST-R01a: shows loading spinner while fetch is in flight', () => {
        renderPage()
        expect(document.querySelector('[class*="animate-spin"], [aria-label*="Loading"], [data-testid*="loading"]') ?? screen.queryByRole('status')).toBeTruthy()
    })

    it('T-CLM-LIST-R01b: calls getClaims on mount', () => {
        renderPage()
        expect(mockGetClaims).toHaveBeenCalledTimes(1)
    })

    it('T-CLM-LIST-R01c: renders claim rows after successful fetch', async () => {
        mockGetClaims.mockResolvedValue([
            makeClaim({ reference: 'CLM-DEMO-001', insured: 'Acme Corp', status: 'Open' }),
            makeClaim({ id: 2, reference: 'CLM-DEMO-002', insured: 'Beta Ltd', status: 'Closed' }),
        ])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('CLM-DEMO-001')).toBeInTheDocument()
            expect(screen.getByText('CLM-DEMO-002')).toBeInTheDocument()
            expect(screen.getByText('Acme Corp')).toBeInTheDocument()
            expect(screen.getByText('Beta Ltd')).toBeInTheDocument()
        })
    })

    it('T-CLM-LIST-R01d: renders Claims grid after load (at least column headers)', async () => {
        mockGetClaims.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Reference')).toBeInTheDocument()
        })
    })

    it('T-CLM-LIST-R01e: shows error message when fetch fails', async () => {
        mockGetClaims.mockRejectedValue(new Error('Network error'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument()
        })
    })

    it('T-CLM-LIST-R01f: notifies on fetch failure', async () => {
        mockGetClaims.mockRejectedValue(new Error('Server down'))
        renderPage()
        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith('Server down', 'error')
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-CLM-FE-F-002 — reference link
// ---------------------------------------------------------------------------

describe('REQ-CLM-FE-F-002 — reference links to claim', () => {
    it('T-CLM-LIST-R02a: reference cell is a link to /claims/:id', async () => {
        mockGetClaims.mockResolvedValue([
            makeClaim({ id: 42, reference: 'CLM-LINK-042' }),
        ])
        renderPage()
        await waitFor(() => {
            const link = screen.getByRole('link', { name: 'CLM-LINK-042' })
            expect(link).toHaveAttribute('href', '/claims/42')
        })
    })

    it('T-CLM-LIST-R02b: status badge rendered for Open claim', async () => {
        mockGetClaims.mockResolvedValue([makeClaim({ status: 'Open' })])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Open')).toBeInTheDocument()
        })
    })

    it('T-CLM-LIST-R02c: status badge rendered for Closed claim', async () => {
        mockGetClaims.mockResolvedValue([makeClaim({ status: 'Closed' })])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Closed')).toBeInTheDocument()
        })
    })
})
