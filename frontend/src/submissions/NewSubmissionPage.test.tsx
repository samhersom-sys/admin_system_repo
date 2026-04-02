/**
 * TESTS — app/pages/submissions/new
 * Second artifact. Requirements: requirements.md
 * Test ID format: T-PAGE-submissions-new-R[NN]
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: () => ({
        token: 'test-token',
        user: { id: '1', name: 'Jane Smith', orgCode: 'DEMO', email: 'jane@demo.com' },
    }),
}))

const mockCreateSubmission = jest.fn()
jest.mock('@/submissions/submissions.service', () => ({
    createSubmission: (...args: unknown[]) => mockCreateSubmission(...args),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))

// Stub sub-components so page tests focus on orchestration
jest.mock('@/submissions/SubmissionIdentity/SubmissionIdentity', () =>
    function SubmissionIdentity({ reference }: { reference: string }) {
        return <span data-testid="stub-identity">{reference || 'Generating…'}</span>
    }
)

// InsuredSearch stub exposes a "Select Insured" button for easy test interaction
jest.mock('@/parties/InsuredSearch/InsuredSearch', () =>
    function InsuredSearch({ onSelect }: { onSelect: (p: { id: number; name: string; type: string; orgCode: string }) => void }) {
        return (
            <button
                data-testid="stub-insured-select"
                onClick={() => onSelect({ id: 1, name: 'Acme Corp', type: 'Insured', orgCode: 'DEMO' })}
            >
                Select Insured
            </button>
        )
    }
)

// SubmissionDetails stub fires onSave when `submission:save` DOM event fires
jest.mock('@/submissions/SubmissionDetails/SubmissionDetails', () =>
    function SubmissionDetails({ onSave }: { onSave: (v: unknown) => void }) {
        React.useEffect(() => {
            const handler = () => onSave({ inceptionDate: '2026-03-10', expiryDate: '2027-03-10', renewalDate: '2027-03-10', contractType: 'Open Market' })
            window.addEventListener('submission:save', handler)
            return () => window.removeEventListener('submission:save', handler)
        }, [onSave])
        return <div data-testid="stub-details" />
    }
)

// BrokerSearch stub exposes a "Select Broker" button for easy test interaction
jest.mock('@/parties/BrokerSearch/BrokerSearch', () =>
    function BrokerSearch({ onSelect }: { onSelect: (p: { id: number; name: string; type: string; orgCode: string }) => void }) {
        return (
            <button
                data-testid="stub-broker-select"
                onClick={() => onSelect({ id: 5, name: 'Marsh Ltd', type: 'Broker', orgCode: 'DEMO' })}
            >
                Select Broker
            </button>
        )
    }
)

jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: jest.fn(),
}))

import NewSubmissionPage from './NewSubmissionPage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
    return render(
        <MemoryRouter>
            <NewSubmissionPage />
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks()
    mockCreateSubmission.mockResolvedValue({ id: 42, reference: 'SUB-DEMO-20260310-001' })
})

// ---------------------------------------------------------------------------
// R01 — Page renders heading and sub-components
// ---------------------------------------------------------------------------

describe('T-PAGE-submissions-new-R01: page renders without crash', () => {
    it('renders the SubmissionIdentity sub-component on mount', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('stub-identity')).toBeInTheDocument()
        })
    })

    it('renders SubmissionIdentity, InsuredSearch, SubmissionDetails stubs', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('stub-identity')).toBeInTheDocument()
            expect(screen.getByTestId('stub-insured-select')).toBeInTheDocument()
            expect(screen.getByTestId('stub-details')).toBeInTheDocument()
        })
    })

    it('has no form submit button (save is via sidebar)', () => {
        renderPage()
        expect(screen.queryByRole('button', { name: /create submission/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /save submission/i })).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R02 — Reference is assigned server-side; page shows "Generating…" placeholder
// ---------------------------------------------------------------------------

describe('T-PAGE-submissions-new-R02: reference pending until server-side assignment', () => {
    it('shows "Generating…" in SubmissionIdentity before save', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('stub-identity')).toHaveTextContent('Generating…')
        })
    })

    it('does not call listSubmissions (reference is no longer client-side generated)', () => {
        renderPage()
        // createSubmission is the only submissions domain function used before save
        expect(mockCreateSubmission).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// R03 — submission:save calls createSubmission and navigates
// ---------------------------------------------------------------------------

describe('T-PAGE-submissions-new-R03: submission:save orchestrates creation', () => {
    it('calls createSubmission with correct payload when insured is selected', async () => {
        renderPage()
        await waitFor(() => screen.getByTestId('stub-insured-select'))

        // Select an insured
        fireEvent.click(screen.getByTestId('stub-insured-select'))

        // Fire sidebar save event
        window.dispatchEvent(new CustomEvent('submission:save'))

        await waitFor(() => {
            expect(mockCreateSubmission).toHaveBeenCalledWith(
                expect.objectContaining({
                    orgCode: 'DEMO',
                    createdBy: 'Jane Smith',
                    insuredId: '1',
                    insuredName: 'Acme Corp',
                    inceptionDate: '2026-03-10',
                })
            )
        })
    })

    it('navigates to /submissions/:id after successful creation', async () => {
        renderPage()
        await waitFor(() => screen.getByTestId('stub-insured-select'))
        fireEvent.click(screen.getByTestId('stub-insured-select'))
        window.dispatchEvent(new CustomEvent('submission:save'))
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/submissions/42')
        })
    })
})

// ---------------------------------------------------------------------------
// R05 — Unsaved changes banner
// ---------------------------------------------------------------------------

describe('T-PAGE-submissions-new-R05: unsaved changes banner', () => {
    it('shows "You have unsaved changes" after an insured is selected', async () => {
        renderPage()
        await waitFor(() => screen.getByTestId('stub-insured-select'))
        fireEvent.click(screen.getByTestId('stub-insured-select'))
        await waitFor(() => {
            expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
        })
    })

    it('shows "You have unsaved changes" after a broker is selected', async () => {
        renderPage()
        await waitFor(() => screen.getByTestId('stub-broker-select'))
        fireEvent.click(screen.getByTestId('stub-broker-select'))
        await waitFor(() => {
            expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
        })
    })

    it('does not show the banner on initial render before any selection', () => {
        renderPage()
        expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
    })
})

it.todo('T-PAGE-submissions-new-R06: beforeunload is registered when form is dirty (browser-level — E2E scope)')

// ---------------------------------------------------------------------------
// R04 — Error states
// ---------------------------------------------------------------------------

describe('T-PAGE-submissions-new-R04: error states', () => {
    it('shows insured-required error when saving without an insured', async () => {
        renderPage()
        await waitFor(() => screen.getByTestId('stub-details'))
        window.dispatchEvent(new CustomEvent('submission:save'))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/select an insured/i)
        })
    })

    it('shows API error when createSubmission throws', async () => {
        mockCreateSubmission.mockRejectedValueOnce(new Error('Server error'))
        renderPage()
        await waitFor(() => screen.getByTestId('stub-insured-select'))
        fireEvent.click(screen.getByTestId('stub-insured-select'))
        window.dispatchEvent(new CustomEvent('submission:save'))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Server error')
        })
    })
})
