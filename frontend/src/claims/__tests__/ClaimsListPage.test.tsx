/**
 * TESTS — Claims Domain: ClaimsListPage
 * Second artifact. Requirements: claims.requirements.md §R01
 * Test naming: T-CLM-LIST-R{NNN}
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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

import ClaimsListPage from '../ClaimsListPage/ClaimsListPage'

const SAMPLE_CLAIMS = [
    {
        id: 1,
        claimNumber: 'CLM-001',
        reference: 'CLM-DEMO-20260101-001',
        policyId: 10,
        policyReference: 'POL-001',
        insured: 'Acme Corp',
        status: 'Open' as const,
        lossDate: '2026-01-15',
        reportedDate: '2026-01-20',
        description: 'Water damage',
    },
    {
        id: 2,
        claimNumber: 'CLM-002',
        reference: 'CLM-DEMO-20260201-002',
        policyId: 11,
        policyReference: 'POL-002',
        insured: 'Widget Inc',
        status: 'Closed' as const,
        lossDate: '2026-02-10',
        reportedDate: '2026-02-12',
        description: 'Fire damage',
    },
]

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
// R01 — Claims list display
// ---------------------------------------------------------------------------
describe('R01 — Claims list display', () => {
    it('T-CLM-LIST-R001a: shows loading state while fetch is in flight', () => {
        renderPage()
        expect(document.querySelector('.animate-spin')).toBeTruthy()
    })

    it('T-CLM-LIST-R001b: renders claim rows after successful fetch', async () => {
        mockGetClaims.mockResolvedValue(SAMPLE_CLAIMS)
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('CLM-DEMO-20260101-001')).toBeInTheDocument()
            expect(screen.getByText('CLM-DEMO-20260201-002')).toBeInTheDocument()
        })
    })

    it('T-CLM-LIST-R001c: shows error state on fetch failure', async () => {
        mockGetClaims.mockRejectedValue(new Error('Network error'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// R02 — Reference links
// ---------------------------------------------------------------------------
describe('R02 — Reference links', () => {
    it('T-CLM-LIST-R002: reference cell links to /claims/:id', async () => {
        mockGetClaims.mockResolvedValue(SAMPLE_CLAIMS)
        renderPage()
        await waitFor(() => {
            const link = screen.getByText('CLM-DEMO-20260101-001')
            expect(link.closest('a')).toHaveAttribute('href', '/claims/1')
        })
    })
})

// ---------------------------------------------------------------------------
// R03 — Status badges
// ---------------------------------------------------------------------------
describe('R03 — Status colour badges', () => {
    it('T-CLM-LIST-R003: Open status has blue badge styling', async () => {
        mockGetClaims.mockResolvedValue(SAMPLE_CLAIMS)
        renderPage()
        await waitFor(() => {
            const badge = screen.getByText('Open')
            expect(badge.className).toContain('bg-blue-100')
        })
    })
})

// ---------------------------------------------------------------------------
// R04 — Sorting
// ---------------------------------------------------------------------------
describe('R04 — Grid sorting', () => {
    it('T-CLM-LIST-R004: default sort is reference ascending', async () => {
        mockGetClaims.mockResolvedValue(SAMPLE_CLAIMS)
        renderPage()
        await waitFor(() => {
            const rows = screen.getAllByText(/CLM-DEMO/)
            expect(rows[0].textContent).toContain('20260101')
            expect(rows[1].textContent).toContain('20260201')
        })
    })
})
