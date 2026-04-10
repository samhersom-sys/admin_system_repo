/**
 * TESTS — Claims Domain: ClaimCreatePage
 * Second artifact. Requirements: claims.requirements.md §R03
 * Test naming: T-CLM-CREATE-R{NNN}
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

const mockCreateClaim = jest.fn()
jest.mock('@/claims/claims.service', () => ({
    createClaim: (...args: unknown[]) => mockCreateClaim(...args),
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

import ClaimCreatePage from '../ClaimCreatePage/ClaimCreatePage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
    return render(
        <MemoryRouter
            initialEntries={['/claims/create']}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
            <Routes>
                <Route path="/claims/create" element={<ClaimCreatePage />} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClaim.mockResolvedValue({ id: 99, reference: 'CLM-DEMO-20260409-001' })
})

// ---------------------------------------------------------------------------
// F-020: Page renders
// ---------------------------------------------------------------------------
describe('ClaimCreatePage — Render', () => {
    it('T-CLM-CREATE-R020: renders the create claim form', () => {
        renderPage()
        expect(screen.getByText('New Claim')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// F-021: Form fields
// ---------------------------------------------------------------------------
describe('ClaimCreatePage — Form Fields', () => {
    it('T-CLM-CREATE-R021: renders all required form fields', () => {
        renderPage()
        expect(screen.getByLabelText('Policy Reference')).toBeInTheDocument()
        expect(screen.getByLabelText('Date of Loss')).toBeInTheDocument()
        expect(screen.getByLabelText('Reported Date')).toBeInTheDocument()
        expect(screen.getByLabelText('Description')).toBeInTheDocument()
        expect(screen.getByLabelText('Loss Type')).toBeInTheDocument()
        expect(screen.getByLabelText('Claimant Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Claimant Contact')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// F-022: Validation
// ---------------------------------------------------------------------------
describe('ClaimCreatePage — Validation', () => {
    it('T-CLM-CREATE-R022: prevents submit when Policy Reference is empty', async () => {
        renderPage()
        // Fill only date, leave policy ref empty
        fireEvent.change(screen.getByLabelText('Date of Loss'), { target: { value: '2026-01-15' } })
        fireEvent.click(screen.getByText('Create Claim'))
        await waitFor(() => {
            expect(mockCreateClaim).not.toHaveBeenCalled()
            expect(screen.getByText('Policy Reference is required')).toBeInTheDocument()
        })
    })

    it('T-CLM-CREATE-R022b: prevents submit when Date of Loss is empty', async () => {
        renderPage()
        // Fill only policy ref
        fireEvent.change(screen.getByLabelText('Policy Reference'), { target: { value: '10' } })
        fireEvent.click(screen.getByText('Create Claim'))
        await waitFor(() => {
            expect(mockCreateClaim).not.toHaveBeenCalled()
            expect(screen.getByText('Date of Loss is required')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// F-023: Successful creation
// ---------------------------------------------------------------------------
describe('ClaimCreatePage — Submit', () => {
    it('T-CLM-CREATE-R023: calls createClaim and navigates to new claim on success', async () => {
        renderPage()
        fireEvent.change(screen.getByLabelText('Policy Reference'), { target: { value: '10' } })
        fireEvent.change(screen.getByLabelText('Date of Loss'), { target: { value: '2026-01-15' } })
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Water damage' } })
        fireEvent.click(screen.getByText('Create Claim'))
        await waitFor(() => {
            expect(mockCreateClaim).toHaveBeenCalledWith(expect.objectContaining({
                policyId: 10,
                lossDate: '2026-01-15',
                description: 'Water damage',
            }))
            expect(mockNavigate).toHaveBeenCalledWith('/claims/99')
        })
    })

    it('T-CLM-CREATE-R023b: shows error toast on API failure', async () => {
        mockCreateClaim.mockRejectedValue(new Error('Server error'))
        renderPage()
        fireEvent.change(screen.getByLabelText('Policy Reference'), { target: { value: '10' } })
        fireEvent.change(screen.getByLabelText('Date of Loss'), { target: { value: '2026-01-15' } })
        fireEvent.click(screen.getByText('Create Claim'))
        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith(expect.stringContaining('Server error'), 'error')
        })
    })
})

// ---------------------------------------------------------------------------
// F-024: Cancel navigation
// ---------------------------------------------------------------------------
describe('ClaimCreatePage — Cancel', () => {
    it('T-CLM-CREATE-R024: cancel button navigates to /claims', () => {
        renderPage()
        fireEvent.click(screen.getByText('Cancel'))
        expect(mockNavigate).toHaveBeenCalledWith('/claims')
    })
})
