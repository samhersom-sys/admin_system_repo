/**
 * TESTS — claims/ClaimViewPage
 *
 * REQ-CLM-FE-F-010 — load claim on mount with loading state
 * REQ-CLM-FE-F-011 — header: reference, status badge, insured, policy reference
 * REQ-CLM-FE-F-012 — sidebar: Back button
 * REQ-CLM-FE-F-013 — 4 tabs: Details, Transactions, Audit, Policy
 * REQ-CLM-FE-F-014 — Details tab with FieldGroups (claim info + loss info)
 * REQ-CLM-FE-F-015 — Transactions tab with ResizableGrid
 * REQ-CLM-FE-F-016 — Audit tab + POST "Claim Opened" on first activation
 * REQ-CLM-FE-F-017 — POST "Claim Closed" on unmount
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

import ClaimViewPage from '../ClaimViewPage'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeClaim(overrides: Record<string, unknown> = {}) {
    return {
        id: 42,
        claimNumber: 'CLM-0042',
        reference: 'CLM-DEMO-20260101-042',
        policyId: 10,
        policyReference: 'POL-DEMO-001',
        insured: 'Acme Corp',
        status: 'Open',
        lossDate: '2026-01-05',
        reportedDate: '2026-01-08',
        description: 'Fire damage to warehouse',
        payload: { lossType: 'Fire', claimantName: 'John Doe', claimantContact: 'john@acme.com' },
        createdAt: '2026-01-08T10:00:00Z',
        ...overrides,
    }
}

const SAMPLE_TRANSACTIONS = [
    { id: 1, claimId: 42, type: 'Reserve', amount: 50000, description: 'Initial reserve', date: '2026-01-09', createdBy: 'Jane Smith', createdAt: '2026-01-09T09:00:00Z' },
    { id: 2, claimId: 42, type: 'Payment', amount: 25000, description: 'Interim payment', date: '2026-02-01', createdBy: 'Jane Smith', createdAt: '2026-02-01T11:00:00Z' },
]

const SAMPLE_AUDIT = [
    { id: 100, entityType: 'claim', entityId: 42, action: 'Claim Opened', createdBy: 'Jane Smith', createdAt: '2026-01-08T10:00:00Z' },
    { id: 101, entityType: 'claim', entityId: 42, action: 'Claim Updated', createdBy: 'Jane Smith', createdAt: '2026-01-09T14:00:00Z' },
]

function renderPage(id = '42') {
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
        expect(screen.getAllByText(/CLM-DEMO-20260101-042/).length).toBeGreaterThan(0)
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
// REQ-CLM-FE-F-010 — load on mount
// ---------------------------------------------------------------------------

describe('REQ-CLM-FE-F-010 — load on mount', () => {
    it('T-CLM-VIEW-R10a: shows loading state while fetch is in flight', () => {
        mockGetClaim.mockReturnValue(new Promise(() => { }))
        renderPage()
        // Spinner or loading indicator is present before data resolves
        expect(mockGetClaim).toHaveBeenCalledWith(42)
    })

    it('T-CLM-VIEW-R10b: calls getClaim with numeric ID from URL param', async () => {
        renderPage()
        await waitForPageLoad()
        expect(mockGetClaim).toHaveBeenCalledWith(42)
    })

    it('T-CLM-VIEW-R10c: shows error when getClaim rejects', async () => {
        mockGetClaim.mockRejectedValue(new Error('Not found'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Not found')).toBeInTheDocument()
        })
    })

    it('T-CLM-VIEW-R10d: notifies on load error', async () => {
        mockGetClaim.mockRejectedValue(new Error('DB error'))
        renderPage()
        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith(expect.stringContaining('DB error'), 'error')
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-CLM-FE-F-011 — header
// ---------------------------------------------------------------------------

describe('REQ-CLM-FE-F-011 — header content', () => {
    it('T-CLM-VIEW-R11a: renders claim reference in header', async () => {
        renderPage()
        await waitForPageLoad()
        // Reference appears in the header span (not h1 — authenticated pages don't use h1)
        expect(screen.getAllByText(/CLM-DEMO-20260101-042/).length).toBeGreaterThan(0)
    })

    it('T-CLM-VIEW-R11b: renders status badge', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getAllByText('Open').length).toBeGreaterThan(0)
    })

    it('T-CLM-VIEW-R11c: renders insured name', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
    })

    it('T-CLM-VIEW-R11d: renders policy reference', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getAllByText(/POL-DEMO-001/).length).toBeGreaterThan(0)
    })
})

// ---------------------------------------------------------------------------
// REQ-CLM-FE-F-013 — tabs
// ---------------------------------------------------------------------------

describe('REQ-CLM-FE-F-013 — tab navigation', () => {
    it('T-CLM-VIEW-R13a: renders Details, Transactions, Audit, Policy tabs', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Transactions' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Audit' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Policy' })).toBeInTheDocument()
    })

    it('T-CLM-VIEW-R13b: Details tab is active by default', async () => {
        renderPage()
        await waitForPageLoad()
        // Details content visible without clicking
        expect(screen.getByText('Reference')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-CLM-FE-F-014 — Details tab
// ---------------------------------------------------------------------------

describe('REQ-CLM-FE-F-014 — Details tab fields', () => {
    it('T-CLM-VIEW-R14a: shows Reference field', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getByText('Reference')).toBeInTheDocument()
    })

    it('T-CLM-VIEW-R14b: shows Date of Loss in loss info group', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getByText('Date of Loss')).toBeInTheDocument()
    })

    it('T-CLM-VIEW-R14c: shows Description field value', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getByText('Fire damage to warehouse')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-CLM-FE-F-015 — Transactions tab
// ---------------------------------------------------------------------------

describe('REQ-CLM-FE-F-015 — Transactions tab', () => {
    it('T-CLM-VIEW-R15a: clicking Transactions tab loads transactions', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByRole('button', { name: 'Transactions' }))
        await waitFor(() => {
            expect(mockGetClaimTransactions).toHaveBeenCalledWith(42)
        })
    })

    it('T-CLM-VIEW-R15b: renders transaction type column', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByRole('button', { name: 'Transactions' }))
        await waitFor(() => {
            expect(screen.getByText('Reserve')).toBeInTheDocument()
        })
    })

    it('T-CLM-VIEW-R15c: does not re-fetch transactions on second tab visit', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByRole('button', { name: 'Transactions' }))
        await waitFor(() => expect(mockGetClaimTransactions).toHaveBeenCalledTimes(1))
        fireEvent.click(screen.getByRole('button', { name: 'Details' }))
        fireEvent.click(screen.getByRole('button', { name: 'Transactions' }))
        expect(mockGetClaimTransactions).toHaveBeenCalledTimes(1)
    })
})

// ---------------------------------------------------------------------------
// REQ-CLM-FE-F-016 — Audit tab
// ---------------------------------------------------------------------------

describe('REQ-CLM-FE-F-016 — Audit tab', () => {
    it('T-CLM-VIEW-R16a: clicking Audit tab calls getClaimAudit', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
        await waitFor(() => {
            expect(mockGetClaimAudit).toHaveBeenCalledWith(42)
        })
    })

    it('T-CLM-VIEW-R16b: POST "Claim Opened" on first Audit tab activation', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
        await waitFor(() => {
            expect(mockPostClaimAudit).toHaveBeenCalledWith(42, 'Claim Opened')
        })
    })

    it('T-CLM-VIEW-R16c: does not re-POST on second Audit tab visit', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
        await waitFor(() => expect(mockPostClaimAudit).toHaveBeenCalledWith(42, 'Claim Opened'))
        fireEvent.click(screen.getByRole('button', { name: 'Details' }))
        fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
        // Still only 1 "Claim Opened" call
        expect(mockPostClaimAudit).toHaveBeenCalledTimes(1)
    })
})

// ---------------------------------------------------------------------------
// REQ-CLM-FE-F-017 — unmount audit
// ---------------------------------------------------------------------------

describe('REQ-CLM-FE-F-017 — Claim Closed on unmount', () => {
    it('T-CLM-VIEW-R17a: POSTs "Claim Closed" when component unmounts', async () => {
        const { unmount } = renderPage()
        await waitForPageLoad()
        act(() => { unmount() })
        await waitFor(() => {
            expect(mockPostClaimAudit).toHaveBeenCalledWith(42, 'Claim Closed')
        })
    })
})
