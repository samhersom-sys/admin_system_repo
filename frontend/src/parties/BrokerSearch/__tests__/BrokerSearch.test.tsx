/**
 * BrokerSearch component … tests
 *
 * Requirements: requirements.md
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { listParties } from '@/parties/parties.service'
import BrokerSearch from '../BrokerSearch'

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
// T-BROKER-SEARCH-R01: Trigger field
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R01: Trigger field', () => {
    it('renders readonly input with placeholder', () => {
        render(<BrokerSearch {...defaultProps} />)
        expect(screen.getByLabelText('Search broker')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Search broker…')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// T-BROKER-SEARCH-R02: Search icon button
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R02: Search icon button', () => {
    it('renders search icon button', () => {
        render(<BrokerSearch {...defaultProps} />)
        expect(screen.getByRole('button', { name: 'Search parties' })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// T-BROKER-SEARCH-R03: Selected value display
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R03: Selected value display', () => {
    it('shows selected party name in the trigger input', () => {
        const party = { id: 5, name: 'Marsh Ltd', type: 'Broker', orgCode: 'DEMO' }
        render(<BrokerSearch {...defaultProps} selectedParty={party} />)
        expect(screen.getByDisplayValue('Marsh Ltd')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// T-BROKER-SEARCH-R04: Modal opens on trigger click
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R04: Modal opens on trigger click', () => {
    it('does not show modal on initial render', () => {
        render(<BrokerSearch {...defaultProps} />)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens modal when trigger input is clicked', () => {
        render(<BrokerSearch {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Search broker'))
        expect(screen.getByRole('dialog', { name: 'Select broker' })).toBeInTheDocument()
    })

    it('opens modal when search icon is clicked', () => {
        render(<BrokerSearch {...defaultProps} />)
        fireEvent.click(screen.getByRole('button', { name: 'Search parties' }))
        expect(screen.getByRole('dialog', { name: 'Select broker' })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// T-BROKER-SEARCH-R05: Load all brokers on open
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R05: Load all brokers on open', () => {
    it('loads all brokers when modal opens', async () => {
        const party = { id: 5, name: 'Marsh Ltd', type: 'Broker', orgCode: 'DEMO' }
        mockListParties.mockResolvedValue([party])
        render(<BrokerSearch {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Search broker'))
        await waitFor(() => {
            expect(screen.getByText('Marsh Ltd')).toBeInTheDocument()
        })
        expect(mockListParties).toHaveBeenCalledWith({ type: 'Broker' })
    })
})

// ---------------------------------------------------------------------------
// T-BROKER-SEARCH-R06: Live search filter
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R06: Live search filter', () => {
    it('calls listParties with search query as user types', async () => {
        const party = { id: 5, name: 'Marsh Ltd', type: 'Broker', orgCode: 'DEMO' }
        mockListParties.mockResolvedValue([party])
        render(<BrokerSearch {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Search broker'))
        await waitFor(() => screen.getByText('Marsh Ltd'))
        // Type a query
        const searchInput = screen.getByPlaceholderText('Search by name...')
        fireEvent.change(searchInput, { target: { value: 'marsh' } })
        await waitFor(() => {
            expect(mockListParties).toHaveBeenCalledWith({ type: 'Broker', search: 'marsh' })
        })
    })
})

// ---------------------------------------------------------------------------
// T-BROKER-SEARCH-R07: Empty state
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R07: Empty state', () => {
    it('shows "No broker parties found." when results are empty', async () => {
        mockListParties.mockResolvedValue([])
        render(<BrokerSearch {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Search broker'))
        await waitFor(() => {
            expect(screen.getByText('No broker parties found.')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// T-BROKER-SEARCH-R08: Select and close
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R08: Select and close', () => {
    it('calls onSelect and closes modal when a row is clicked', async () => {
        const party = { id: 5, name: 'Marsh Ltd', type: 'Broker', orgCode: 'DEMO' }
        mockListParties.mockResolvedValue([party])
        const onSelect = jest.fn()
        render(<BrokerSearch {...defaultProps} onSelect={onSelect} />)
        fireEvent.click(screen.getByLabelText('Search broker'))
        await waitFor(() => screen.getByText('Marsh Ltd'))
        fireEvent.click(screen.getByText('Marsh Ltd'))
        expect(onSelect).toHaveBeenCalledWith(party)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// T-BROKER-SEARCH-R09: ESC closes modal
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R09: ESC closes modal', () => {
    it('closes modal on Escape key without calling onSelect', () => {
        const onSelect = jest.fn()
        render(<BrokerSearch onSelect={onSelect} />)
        fireEvent.click(screen.getByLabelText('Search broker'))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        fireEvent.keyDown(window, { key: 'Escape' })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(onSelect).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// T-BROKER-SEARCH-R10: Close button
// ---------------------------------------------------------------------------
describe('T-BROKER-SEARCH-R10: Close button', () => {
    it('closes modal when Close button is clicked without calling onSelect', () => {
        const onSelect = jest.fn()
        render(<BrokerSearch onSelect={onSelect} />)
        fireEvent.click(screen.getByLabelText('Search broker'))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Close' }))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(onSelect).not.toHaveBeenCalled()
    })
})
