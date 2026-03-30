/**
 * SubmissionDetails component — tests
 *
 * Requirements: requirements.md
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SubmissionDetails from '../SubmissionDetails'

const noop = jest.fn()

afterEach(() => {
    jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// R01 — Field rendering
// ---------------------------------------------------------------------------
describe('R01 — Field rendering', () => {
    it('T-DETAILS-R01a: renders all four fields', () => {
        render(<SubmissionDetails onSave={noop} />)
        expect(document.getElementById('sub-inception-date')).toBeInTheDocument()
        expect(document.getElementById('sub-expiry-date')).toBeInTheDocument()
        expect(document.getElementById('sub-renewal-date')).toBeInTheDocument()
        expect(document.getElementById('sub-contract-type')).toBeInTheDocument()
    })

    it('T-DETAILS-R01b: each field has a visible label', () => {
        render(<SubmissionDetails onSave={noop} />)
        expect(screen.getByLabelText('Inception Date')).toBeInTheDocument()
        expect(screen.getByLabelText('Expiry Date')).toBeInTheDocument()
        expect(screen.getByLabelText('Renewal Date')).toBeInTheDocument()
        expect(screen.getByLabelText('Contract Type')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R02 — Controlled initialisation
// ---------------------------------------------------------------------------
describe('R02 — Controlled initialisation', () => {
    it('T-DETAILS-R02a: pre-fills fields from initialValues', () => {
        render(
            <SubmissionDetails
                initialValues={{
                    inceptionDate: '2026-01-01',
                    expiryDate: '2027-01-01',
                    renewalDate: '2027-01-01',
                    contractType: 'Open Market',
                }}
                onSave={noop}
            />
        )
        expect(screen.getByLabelText<HTMLInputElement>('Inception Date').value).toBe('2026-01-01')
        expect(screen.getByLabelText<HTMLInputElement>('Expiry Date').value).toBe('2027-01-01')
        expect(screen.getByLabelText<HTMLInputElement>('Renewal Date').value).toBe('2027-01-01')
        expect(screen.getByLabelText<HTMLSelectElement>('Contract Type').value).toBe('Open Market')
    })
})

// ---------------------------------------------------------------------------
// R03 — Expiry auto-population
// ---------------------------------------------------------------------------
describe('R03 — Expiry auto-population', () => {
    it('T-DETAILS-R03a: auto-sets expiry to +1 year when expiry is empty', () => {
        render(<SubmissionDetails onSave={noop} />)
        fireEvent.change(screen.getByLabelText('Inception Date'), { target: { value: '2026-03-10' } })
        expect(screen.getByLabelText<HTMLInputElement>('Expiry Date').value).toBe('2027-03-10')
    })

    it('T-DETAILS-R03b: does NOT overwrite an existing expiry value', () => {
        render(
            <SubmissionDetails
                initialValues={{ expiryDate: '2028-01-01', inceptionDate: '', renewalDate: '', contractType: '' }}
                onSave={noop}
            />
        )
        fireEvent.change(screen.getByLabelText('Inception Date'), { target: { value: '2026-03-10' } })
        expect(screen.getByLabelText<HTMLInputElement>('Expiry Date').value).toBe('2028-01-01')
    })
})

// ---------------------------------------------------------------------------
// R04 — Renewal auto-population
// ---------------------------------------------------------------------------
describe('R04 — Renewal auto-population', () => {
    it('T-DETAILS-R04a: auto-sets renewal to +1 year when renewal is empty', () => {
        render(<SubmissionDetails onSave={noop} />)
        fireEvent.change(screen.getByLabelText('Inception Date'), { target: { value: '2026-06-15' } })
        expect(screen.getByLabelText<HTMLInputElement>('Renewal Date').value).toBe('2027-06-15')
    })
})

// ---------------------------------------------------------------------------
// R05 — submission:save event listener
// ---------------------------------------------------------------------------
describe('R05 — submission:save event', () => {
    it('T-DETAILS-R05a: calls onSave with current values when event fired and fields valid', () => {
        const onSave = jest.fn()
        render(
            <SubmissionDetails
                initialValues={{ inceptionDate: '2026-03-10', expiryDate: '2027-03-10', renewalDate: '2027-03-10', contractType: 'Open Market' }}
                onSave={onSave}
            />
        )
        window.dispatchEvent(new CustomEvent('submission:save'))
        expect(onSave).toHaveBeenCalledWith({
            inceptionDate: '2026-03-10',
            expiryDate: '2027-03-10',
            renewalDate: '2027-03-10',
            contractType: 'Open Market',
        })
    })

    it('T-DETAILS-R05b: calls onValidationError and NOT onSave when inceptionDate is empty', () => {
        const onSave = jest.fn()
        const onValidationError = jest.fn()
        render(<SubmissionDetails onSave={onSave} onValidationError={onValidationError} />)
        window.dispatchEvent(new CustomEvent('submission:save'))
        expect(onValidationError).toHaveBeenCalledWith('Inception date is required.')
        expect(onSave).not.toHaveBeenCalled()
    })

    it('T-DETAILS-R05c: removes event listener on unmount', () => {
        const onSave = jest.fn()
        const { unmount } = render(
            <SubmissionDetails
                initialValues={{ inceptionDate: '2026-03-10', expiryDate: '2027-03-10', renewalDate: '2027-03-10', contractType: 'Open Market' }}
                onSave={onSave}
            />
        )
        unmount()
        window.dispatchEvent(new CustomEvent('submission:save'))
        expect(onSave).not.toHaveBeenCalled()
    })
})
