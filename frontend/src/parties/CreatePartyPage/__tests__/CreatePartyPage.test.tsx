/**
 * CreatePartyPage � tests
 *
 * Requirements: requirements.md
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CreatePartyPage from '../CreatePartyPage'

const mockNavigate = jest.fn()
const mockCreateParty = jest.fn()
const mockUseSidebarSection = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('@/parties/parties.service', () => ({
    createParty: (...args: unknown[]) => mockCreateParty(...args),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: () => ({ user: { name: 'Test User', orgCode: 'DEMO' } }),
}))

jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
}))

function renderPage() {
    return render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <CreatePartyPage />
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// R00 � Sidebar section (RULE 9)
// ---------------------------------------------------------------------------
describe('R00 � Sidebar section', () => {
    it('T-PAR-CREATE-R00a: registers sidebar section with Back and Save items', () => {
        renderPage()
        const section = mockUseSidebarSection.mock.calls[0]?.[0]
        expect(section.title).toBe('Party')
        expect(section.items).toContainEqual(expect.objectContaining({ label: 'Back', to: '/parties' }))
        expect(section.items).toContainEqual(expect.objectContaining({ label: 'Save', event: 'party:save' }))
    })
})

// ---------------------------------------------------------------------------
// R01 � Page structure
// ---------------------------------------------------------------------------
describe('R01 � Page structure', () => {
    it('T-PAR-CREATE-R01a: page renders a "Create Party" heading', () => {
        renderPage()
        expect(screen.getByRole('heading', { name: 'Create Party' })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R04 � Validation
// ---------------------------------------------------------------------------
describe('R04 � Validation', () => {
    it('T-PAR-CREATE-R04a: party:save event with empty Name shows "Name is required." and does not call createParty', () => {
        renderPage()
        act(() => { window.dispatchEvent(new CustomEvent('party:save')) })
        expect(screen.getByRole('alert')).toHaveTextContent('Name is required.')
        expect(mockCreateParty).not.toHaveBeenCalled()
    })

    it('T-PAR-CREATE-R04b: party:save event with Name but no Type shows "Type is required." and does not call createParty', () => {
        renderPage()
        fireEvent.change(screen.getByLabelText('Party name'), { target: { value: 'Acme Corp' } })
        act(() => { window.dispatchEvent(new CustomEvent('party:save')) })
        expect(screen.getByRole('alert')).toHaveTextContent('Type is required.')
        expect(mockCreateParty).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// R05 � Submission
// ---------------------------------------------------------------------------
describe('R05 � Submission', () => {
    it('T-PAR-CREATE-R05a: party:save event with valid Name and Type calls createParty with correct payload', async () => {
        mockCreateParty.mockResolvedValue({ id: 1, name: 'Acme Corp', type: 'Insured' })
        renderPage()
        fireEvent.change(screen.getByLabelText('Party name'), { target: { value: 'Acme Corp' } })
        fireEvent.change(screen.getByLabelText('Party type'), { target: { value: 'Insured' } })
        act(() => { window.dispatchEvent(new CustomEvent('party:save')) })
        await waitFor(() => {
            expect(mockCreateParty).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Acme Corp',
                type: 'Insured',
                orgCode: 'DEMO',
                createdBy: 'Test User',
            }))
        })
    })

    it('T-PAR-CREATE-R05b: successful save navigates to /parties', async () => {
        mockCreateParty.mockResolvedValue({ id: 1, name: 'Acme Corp', type: 'Insured' })
        renderPage()
        fireEvent.change(screen.getByLabelText('Party name'), { target: { value: 'Acme Corp' } })
        fireEvent.change(screen.getByLabelText('Party type'), { target: { value: 'Insured' } })
        act(() => { window.dispatchEvent(new CustomEvent('party:save')) })
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/parties')
        })
    })

    it('T-PAR-CREATE-R05c: createParty failure shows error alert and does not navigate', async () => {
        mockCreateParty.mockRejectedValue(new Error('Server error'))
        renderPage()
        fireEvent.change(screen.getByLabelText('Party name'), { target: { value: 'Acme Corp' } })
        fireEvent.change(screen.getByLabelText('Party type'), { target: { value: 'Insured' } })
        act(() => { window.dispatchEvent(new CustomEvent('party:save')) })
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Server error')
            expect(mockNavigate).not.toHaveBeenCalled()
        })
    })
})

// ---------------------------------------------------------------------------
// R06 � Back navigation (sidebar only � no inline Cancel button)
// ---------------------------------------------------------------------------
describe('R06 � Back navigation', () => {
    it('T-PAR-CREATE-R06a: page body does not contain a Cancel or Back button', () => {
        renderPage()
        expect(screen.queryByLabelText('Cancel')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Back to parties')).not.toBeInTheDocument()
    })
})
// ---------------------------------------------------------------------------
// R03 — Input fields (email and phone)
// ---------------------------------------------------------------------------
describe('R03 — Input fields (email, phone)', () => {
    it('T-PAR-CREATE-R03e: renders an email input with aria-label="Email"', () => {
        renderPage()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('T-PAR-CREATE-R03f: renders a phone input with aria-label="Phone"', () => {
        renderPage()
        expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R05 — Submission (email + phone payload)
// ---------------------------------------------------------------------------
describe('R05 — Submission (email + phone)', () => {
    it('T-PAR-CREATE-R05a-ext: createParty receives email and phone in payload when filled', async () => {
        mockCreateParty.mockResolvedValue({ id: 1 })
        renderPage()
        fireEvent.change(screen.getByLabelText('Party name'), { target: { value: 'Acme Corp' } })
        fireEvent.change(screen.getByLabelText('Party type'), { target: { value: 'Insured' } })
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '01234567890' } })
        act(() => { window.dispatchEvent(new CustomEvent('party:save')) })
        await waitFor(() => {
            expect(mockCreateParty).toHaveBeenCalledWith(expect.objectContaining({
                email: 'test@example.com',
                phone: '01234567890',
            }))
        })
    })
})