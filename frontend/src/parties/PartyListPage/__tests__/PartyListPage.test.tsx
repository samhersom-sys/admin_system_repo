/**
 * PartyListPage — tests
 *
 * Requirements: requirements.md
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PartyListPage from '../PartyListPage'

const mockNavigate = jest.fn()
const mockListParties = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('@/parties/parties.service', () => ({
    listParties: (...args: unknown[]) => mockListParties(...args),
}))

function renderPage() {
    return render(
        <MemoryRouter>
            <PartyListPage />
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks()
    // Never-resolving default: keeps the component in loading state for
    // synchronous tests so no async state update fires after the test body.
    mockListParties.mockReturnValue(new Promise(() => { }))
})

// ---------------------------------------------------------------------------
// R01 — Party list display
// ---------------------------------------------------------------------------
describe('R01 — Party list display', () => {
    it('T-PAR-LIST-R01a: shows loading state while fetch is in flight', () => {
        renderPage()
        expect(screen.getByLabelText('Loading parties')).toBeInTheDocument()
    })

    it('T-PAR-LIST-R01b: renders party rows after successful fetch', async () => {
        mockListParties.mockResolvedValue([
            { id: 1, name: 'Acme Corp', type: 'Insured', orgCode: 'DEMO', city: 'London', country: 'UK' },
            { id: 2, name: 'Marsh Brokers', type: 'Broker', orgCode: 'DEMO', city: 'New York', country: 'US' },
        ])
        renderPage()
        await waitFor(() => {
            // Assert on names (unique) and location fields (unique) to avoid
            // false multi-match errors with 'Insured'/'Broker' which also appear
            // as dropdown options.
            expect(screen.getByText('Acme Corp')).toBeInTheDocument()
            expect(screen.getByText('Marsh Brokers')).toBeInTheDocument()
            expect(screen.getByText('London')).toBeInTheDocument()
            expect(screen.getByText('New York')).toBeInTheDocument()
        })
    })

    it('T-PAR-LIST-R01c: shows empty state when no parties returned', async () => {
        mockListParties.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('No parties found.')).toBeInTheDocument()
        })
    })

    it('T-PAR-LIST-R01d: shows error state when fetch fails', async () => {
        mockListParties.mockRejectedValue(new Error('Network error'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// R02 — Role filter
// ---------------------------------------------------------------------------
describe('R02 — Role filter', () => {
    it('T-PAR-LIST-R02b: selecting a role calls listParties with that type', async () => {
        mockListParties.mockResolvedValue([])
        renderPage()
        fireEvent.change(screen.getByLabelText('Filter by role'), { target: { value: 'Broker' } })
        await waitFor(() => {
            expect(mockListParties).toHaveBeenCalledWith(expect.objectContaining({ type: 'Broker' }))
        })
    })

    it('T-PAR-LIST-R02c: selecting All clears the type filter', async () => {
        mockListParties.mockResolvedValue([])
        renderPage()
        fireEvent.change(screen.getByLabelText('Filter by role'), { target: { value: 'Insured' } })
        fireEvent.change(screen.getByLabelText('Filter by role'), { target: { value: '' } })
        await waitFor(() => {
            const calls = mockListParties.mock.calls
            const lastCallArg = calls[calls.length - 1][0] ?? {}
            expect(lastCallArg.type).toBeUndefined()
        })
    })
})

// ---------------------------------------------------------------------------
// R03 — Name search
// ---------------------------------------------------------------------------
describe('R03 — Name search', () => {
    it('T-PAR-LIST-R03b: typing in search calls listParties with search param', async () => {
        mockListParties.mockResolvedValue([])
        renderPage()
        fireEvent.change(screen.getByLabelText('Search parties'), { target: { value: 'marsh' } })
        await waitFor(() => {
            expect(mockListParties).toHaveBeenCalledWith(expect.objectContaining({ search: 'marsh' }))
        })
    })
})

// ---------------------------------------------------------------------------
// R04 — Create party navigation
// ---------------------------------------------------------------------------
describe('R04 — Create party navigation', () => {
    it('T-PAR-LIST-R04a: clicking New Party button navigates to /parties/new', () => {
        renderPage()
        fireEvent.click(screen.getByLabelText('New Party'))
        expect(mockNavigate).toHaveBeenCalledWith('/parties/new')
    })
})
