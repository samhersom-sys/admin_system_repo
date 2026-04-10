/**
 * TESTS — Claims Domain: ClaimViewPage
 * Second artifact. Requirements: claims.requirements.md §R02
 * Test naming: T-CLM-VIEW-R{NNN}
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

const mockGetClaim = jest.fn()
const mockGetClaimTransactions = jest.fn()
const mockGetClaimAudit = jest.fn()
const mockPostClaimAudit = jest.fn()
jest.mock('@/claims/claims.service', () => ({
    getClaim: (...args: unknown[]) => mockGetClaim(...args),
    getClaimTransactions: (...args: unknown[]) => mockGetClaimTransactions(...args),
    getClaimAudit: (...args: unknown[]) => mockGetClaimAudit(...args),
    postClaimAudit: (...args: unknown[]) => mockPostClaimAudit(...args),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: () => ({
        token: 'test-token',
        user: { id: '1', name: 'Jane Smith', orgCode: 'DEMO', email: 'jane@demo.com' },
    }),
}))

const mockUseSidebarSection = jest.fn()
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
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

import ClaimViewPage from '../ClaimViewPage/ClaimViewPage'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeClaim(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        claimNumber: 'CLM-001',
        reference: 'CLM-DEMO-20260115-001',
        policyId: 10,
        policyReference: 'POL-001',
        insured: 'Acme Corp',
        status: 'Open',
        lossDate: '2026-01-15',
        reportedDate: '2026-01-20',
        description: 'Water damage at warehouse',
        payload: {
            lossType: 'Property Damage',
            claimantName: 'John Doe',
            claimantContact: 'john@acme.com',
        },
        createdAt: '2026-01-20T10:00:00Z',
        ...overrides,
    }
}

const SAMPLE_TRANSACTIONS = [
    { id: 1, claimId: 1, type: 'Reserve Movement', amount: 50000, description: 'Initial reserve', date: '2026-01-20', createdBy: 'Jane Smith', createdAt: '2026-01-20T10:00:00Z' },
]

const SAMPLE_AUDIT = [
    { id: 100, entityType: 'Claim', entityId: 1, action: 'Claim Created', createdBy: 'Jane Smith', createdAt: '2026-01-20T10:00:00Z' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage(id = '1') {
    return render(
        <MemoryRouter
            initialEntries={[`/claims/${id}`]}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
            <Routes>
                <Route path="/claims/:id" element={<ClaimViewPage />} />
            </Routes>
        </MemoryRouter>
    )
}

async function waitForPageLoad() {
    await waitFor(() => {
        expect(screen.getAllByText('CLM-DEMO-20260115-001').length).toBeGreaterThan(0)
    })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
    jest.clearAllMocks()
    mockGetClaim.mockResolvedValue(makeClaim())
    mockGetClaimTransactions.mockResolvedValue(SAMPLE_TRANSACTIONS)
    mockGetClaimAudit.mockResolvedValue(SAMPLE_AUDIT)
    mockPostClaimAudit.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// F-010: Load claim on mount
// ---------------------------------------------------------------------------
describe('ClaimViewPage — Loading', () => {
    it('T-CLM-VIEW-R010a: calls getClaim with the id from URL params', async () => {
        renderPage('7')
        await waitFor(() => {
            expect(mockGetClaim).toHaveBeenCalledWith(7)
        })
    })

    it('T-CLM-VIEW-R010b: shows error state when fetch fails', async () => {
        mockGetClaim.mockRejectedValue(new Error('Not found'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/Not found/)).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// F-011: Header
// ---------------------------------------------------------------------------
describe('ClaimViewPage — Header', () => {
    it('T-CLM-VIEW-R011: displays reference, status badge, insured, policy reference', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getAllByText('CLM-DEMO-20260115-001')[0]).toBeInTheDocument()
        expect(screen.getAllByText('Open')[0]).toBeInTheDocument()
        expect(screen.getAllByText('Acme Corp')[0]).toBeInTheDocument()
        expect(screen.getAllByText(/POL-001/)[0]).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// F-012: Sidebar back navigation
// ---------------------------------------------------------------------------
describe('ClaimViewPage — Sidebar Navigation', () => {
    it('T-CLM-VIEW-R012: claim:back event navigates to /claims', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('claim:back')) })
        expect(mockNavigate).toHaveBeenCalledWith('/claims')
    })
})

// ---------------------------------------------------------------------------
// F-013: Tabs
// ---------------------------------------------------------------------------
describe('ClaimViewPage — Tabs', () => {
    it('T-CLM-VIEW-R013: renders 4 tabs in order: Details, Transactions, Audit, Policy', async () => {
        renderPage()
        await waitForPageLoad()
        const tabs = ['details', 'transactions', 'audit', 'policy'].map(
            key => screen.getByTestId(`tab-${key}`)
        )
        expect(tabs).toHaveLength(4)
        expect(tabs[0]).toHaveTextContent('Details')
        expect(tabs[1]).toHaveTextContent('Transactions')
        expect(tabs[2]).toHaveTextContent('Audit')
        expect(tabs[3]).toHaveTextContent('Policy')
    })
})

// ---------------------------------------------------------------------------
// F-014: Details tab
// ---------------------------------------------------------------------------
describe('ClaimViewPage — Details Tab', () => {
    it('T-CLM-VIEW-R014: displays Claim Information and Loss Information field groups', async () => {
        renderPage()
        await waitForPageLoad()
        // Claim info fields
        expect(screen.getByText('CLM-001')).toBeInTheDocument()
        expect(screen.getByText('2026-01-20')).toBeInTheDocument()
        // Loss info fields
        expect(screen.getByText('Water damage at warehouse')).toBeInTheDocument()
        expect(screen.getByText('Property Damage')).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// F-015: Transactions tab lazy load
// ---------------------------------------------------------------------------
describe('ClaimViewPage — Transactions Tab', () => {
    it('T-CLM-VIEW-R015: lazy-loads transactions on first tab activation', async () => {
        renderPage()
        await waitForPageLoad()
        expect(mockGetClaimTransactions).not.toHaveBeenCalled()
        // Click Transactions tab
        act(() => { screen.getByText('Transactions').click() })
        await waitFor(() => {
            expect(mockGetClaimTransactions).toHaveBeenCalledWith(1)
        })
    })
})

// ---------------------------------------------------------------------------
// F-016: Audit tab + POST "Claim Opened"
// ---------------------------------------------------------------------------
describe('ClaimViewPage — Audit Tab', () => {
    it('T-CLM-VIEW-R016: posts "Claim Opened" on first Audit tab activation', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { screen.getByText('Audit').click() })
        await waitFor(() => {
            expect(mockPostClaimAudit).toHaveBeenCalledWith(1, 'Claim Opened')
            expect(mockGetClaimAudit).toHaveBeenCalledWith(1)
        })
    })
})

// ---------------------------------------------------------------------------
// F-017: POST "Claim Closed" on unmount
// ---------------------------------------------------------------------------
describe('ClaimViewPage — Unmount Audit', () => {
    it('T-CLM-VIEW-R017: posts "Claim Closed" on unmount', async () => {
        const { unmount } = renderPage()
        await waitForPageLoad()
        unmount()
        await waitFor(() => {
            expect(mockPostClaimAudit).toHaveBeenCalledWith(1, 'Claim Closed')
        })
    })
})
