/**
 * InsuredSearch component … tests
 *
 * Requirements: requirements.md
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { listParties } from '@/parties/parties.service'
import InsuredSearch from '../InsuredSearch'

jest.mock('@/parties/parties.service', () => ({
    listParties: jest.fn(),
}))

const mockListParties = listParties as jest.Mock

const defaultProps = {
    onSelect: jest.fn(),
}

beforeEach(() => {
    jest.clearAllMocks()
    mockListParties.mockResolvedValue([])
})

// ---------------------------------------------------------------------------
// Trigger field
// ---------------------------------------------------------------------------
describe('Trigger field', () => {
    it('renders readonly input with placeholder', () => {
        render(<InsuredSearch {...defaultProps} />)
        expect(screen.getByLabelText('Search insured')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Search insured…')).toBeInTheDocument()
    })

    it('shows selected party name in the trigger input', () => {
        const party = { id: 1, name: 'Acme Ltd', type: 'Insured', orgCode: 'DEMO' }
        render(<InsuredSearch {...defaultProps} selectedParty={party} />)
        expect(screen.getByDisplayValue('Acme Ltd')).toBeInTheDocument()
    })

    it('renders search icon button', () => {
        render(<InsuredSearch {...defaultProps} />)
        expect(screen.getByRole('button', { name: 'Search parties' })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
describe('Modal', () => {
    it('does not show modal on initial render', () => {
        render(<InsuredSearch {...defaultProps} />)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens modal when trigger input is clicked', async () => {
        render(<InsuredSearch {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Search insured'))
        expect(screen.getByRole('dialog', { name: 'Select insured' })).toBeInTheDocument()
    })

    it('opens modal when search icon is clicked', async () => {
        render(<InsuredSearch {...defaultProps} />)
        fireEvent.click(screen.getByRole('button', { name: 'Search parties' }))
        expect(screen.getByRole('dialog', { name: 'Select insured' })).toBeInTheDocument()
    })

    it('loads all insureds when modal opens', async () => {
        const party = { id: 1, name: 'Acme Ltd', type: 'Insured', orgCode: 'DEMO' }
        mockListParties.mockResolvedValue([party])
        render(<InsuredSearch {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Search insured'))
        await waitFor(() => {
            expect(screen.getByText('Acme Ltd')).toBeInTheDocument()
        })
        expect(mockListParties).toHaveBeenCalledWith({ type: 'Insured' })
    })

    it('calls onSelect and closes modal when a row is clicked', async () => {
        const party = { id: 1, name: 'Acme Ltd', type: 'Insured', orgCode: 'DEMO' }
        mockListParties.mockResolvedValue([party])
        const onSelect = jest.fn()
        render(<InsuredSearch {...defaultProps} onSelect={onSelect} />)
        fireEvent.click(screen.getByLabelText('Search insured'))
        await waitFor(() => screen.getByText('Acme Ltd'))
        fireEvent.click(screen.getByText('Acme Ltd'))
        expect(onSelect).toHaveBeenCalledWith(party)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes modal when Close button is clicked', () => {
        render(<InsuredSearch {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Search insured'))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Close' }))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows "No insured parties found" when results are empty', async () => {
        mockListParties.mockResolvedValue([])
        render(<InsuredSearch {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Search insured'))
        await waitFor(() => {
            expect(screen.getByText('No insured parties found.')).toBeInTheDocument()
        })
    })
})
