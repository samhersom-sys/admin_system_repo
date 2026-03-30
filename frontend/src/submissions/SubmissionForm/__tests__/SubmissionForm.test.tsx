/**
 * TESTS — domains/submissions/components/SubmissionForm
 * Second artifact. Requirements: requirements.md
 * Test ID format: T-FORM-submissions-R[NN]
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SubmissionForm from '../SubmissionForm'

const defaultProps = {
    reference: 'SUB-DEMO-20260310-001',
    onSubmit: jest.fn(),
    isLoading: false,
    errorMessage: undefined as string | undefined,
}

// ---------------------------------------------------------------------------
// R01 — Renders all creation fields
// ---------------------------------------------------------------------------

describe('T-FORM-submissions-R01: renders all creation fields', () => {
    it('renders the Insured Name input', () => {
        render(<SubmissionForm {...defaultProps} />)
        expect(screen.getByLabelText(/insured name/i)).toBeInTheDocument()
    })

    it('renders a search button on the Insured Name field', () => {
        render(<SubmissionForm {...defaultProps} />)
        expect(screen.getByRole('button', { name: /search insured/i })).toBeInTheDocument()
    })

    it('renders the Inception Date input', () => {
        render(<SubmissionForm {...defaultProps} />)
        expect(screen.getByLabelText(/inception date/i)).toBeInTheDocument()
    })

    it('renders the Expiry Date input', () => {
        render(<SubmissionForm {...defaultProps} />)
        expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument()
    })

    it('renders the Contract Type select with all four options', () => {
        render(<SubmissionForm {...defaultProps} />)
        expect(screen.getByLabelText(/contract type/i)).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Open Market' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Binding Authority Contract' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Lineslip' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Facultative' })).toBeInTheDocument()
    })

    it('renders the reference as a read-only field showing the passed reference', () => {
        render(<SubmissionForm {...defaultProps} />)
        expect(screen.getByDisplayValue('SUB-DEMO-20260310-001')).toBeInTheDocument()
    })

    it('renders the Status field showing "Created"', () => {
        render(<SubmissionForm {...defaultProps} />)
        expect(screen.getByDisplayValue('Created')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R02 — Inception date auto-populates expiry
// ---------------------------------------------------------------------------

describe('T-FORM-submissions-R02: inception date auto-populates expiry', () => {
    it('auto-fills expiry to +1 year when expiry is blank', async () => {
        render(<SubmissionForm {...defaultProps} />)
        const inceptionInput = screen.getByLabelText(/inception date/i) as HTMLInputElement
        fireEvent.change(inceptionInput, { target: { value: '2026-03-10' } })
        await waitFor(() => {
            const expiryInput = screen.getByLabelText(/expiry date/i) as HTMLInputElement
            expect(expiryInput.value).toBe('2027-03-10')
        })
    })

    it('does not overwrite an already-filled expiry date', async () => {
        render(<SubmissionForm {...defaultProps} />)
        const expiryInput = screen.getByLabelText(/expiry date/i) as HTMLInputElement
        fireEvent.change(expiryInput, { target: { value: '2026-12-31' } })
        const inceptionInput = screen.getByLabelText(/inception date/i) as HTMLInputElement
        fireEvent.change(inceptionInput, { target: { value: '2026-03-10' } })
        await waitFor(() => {
            expect(expiryInput.value).toBe('2026-12-31')
        })
    })
})

// ---------------------------------------------------------------------------
// R03 — Validation before submit
// ---------------------------------------------------------------------------

describe('T-FORM-submissions-R03: validation prevents submit on missing required fields', () => {
    beforeEach(() => jest.clearAllMocks())

    it('shows insured name error and does not call onSubmit when insured is empty', async () => {
        render(<SubmissionForm {...defaultProps} />)
        fireEvent.click(screen.getByRole('button', { name: /create submission/i }))
        await waitFor(() => {
            expect(screen.getByText(/insured name is required/i)).toBeInTheDocument()
        })
        expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    it('shows inception date error when inception is empty', async () => {
        render(<SubmissionForm {...defaultProps} />)
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Acme Corp' } })
        fireEvent.click(screen.getByRole('button', { name: /create submission/i }))
        await waitFor(() => {
            expect(screen.getByText(/inception date is required/i)).toBeInTheDocument()
        })
        expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    it('shows expiry date error when expiry is empty', async () => {
        render(<SubmissionForm {...defaultProps} />)
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Acme Corp' } })
        fireEvent.change(screen.getByLabelText(/inception date/i), { target: { value: '2026-03-10' } })
        // Manually clear expiry to simulate user deleting the auto-fill
        fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: /create submission/i }))
        await waitFor(() => {
            expect(screen.getByText(/expiry date is required/i)).toBeInTheDocument()
        })
        expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    it('calls onSubmit when all required fields are filled', async () => {
        render(<SubmissionForm {...defaultProps} />)
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Acme Corp' } })
        fireEvent.change(screen.getByLabelText(/inception date/i), { target: { value: '2026-03-10' } })
        // expiry is auto-populated by R02
        await waitFor(() => {
            const expiry = screen.getByLabelText(/expiry date/i) as HTMLInputElement
            expect(expiry.value).toBe('2027-03-10')
        })
        fireEvent.click(screen.getByRole('button', { name: /create submission/i }))
        await waitFor(() => {
            expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1)
        })
    })
})

// ---------------------------------------------------------------------------
// R05 — Loading state
// ---------------------------------------------------------------------------

describe('T-FORM-submissions-R05: loading state', () => {
    it('disables submit button when isLoading is true', () => {
        render(<SubmissionForm {...defaultProps} isLoading={true} />)
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })

    it('shows "Saving…" label when isLoading is true', () => {
        render(<SubmissionForm {...defaultProps} isLoading={true} />)
        expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    })

    it('shows "Create Submission" label when isLoading is false', () => {
        render(<SubmissionForm {...defaultProps} isLoading={false} />)
        expect(screen.getByRole('button', { name: /create submission/i })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R06 — Error display
// ---------------------------------------------------------------------------

describe('T-FORM-submissions-R06: error message prop', () => {
    it('displays the errorMessage when provided', () => {
        render(<SubmissionForm {...defaultProps} errorMessage="Server error" />)
        expect(screen.getByText('Server error')).toBeInTheDocument()
    })

    it('renders nothing for the error when errorMessage is undefined', () => {
        render(<SubmissionForm {...defaultProps} errorMessage={undefined} />)
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})
