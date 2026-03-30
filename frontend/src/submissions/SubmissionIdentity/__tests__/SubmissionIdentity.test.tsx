/**
 * SubmissionIdentity component — tests
 *
 * Requirements: requirements.md
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import SubmissionIdentity from '../SubmissionIdentity'

// ---------------------------------------------------------------------------
// R01 — Reference display
// ---------------------------------------------------------------------------
describe('R01 — Reference display', () => {
    it('T-IDENTITY-R01a: renders the reference string', () => {
        render(<SubmissionIdentity reference="SUB-DEMO-20260310-001" status="Created" />)
        expect(screen.getByTestId('sub-reference')).toHaveTextContent('SUB-DEMO-20260310-001')
    })

    it('T-IDENTITY-R01b: renders "Generating…" when reference is empty', () => {
        render(<SubmissionIdentity reference="" status="Created" />)
        expect(screen.getByTestId('sub-reference')).toHaveTextContent('Generating…')
    })
})

// ---------------------------------------------------------------------------
// R02 — Status badge
// ---------------------------------------------------------------------------
describe('R02 — Status badge', () => {
    it('T-IDENTITY-R02a: renders status text', () => {
        render(<SubmissionIdentity reference="SUB-DEMO-20260310-001" status="In Review" />)
        expect(screen.getByTestId('sub-status')).toHaveTextContent('In Review')
    })

    it('T-IDENTITY-R02b: Created gets blue class', () => {
        render(<SubmissionIdentity reference="SUB-DEMO-20260310-001" status="Created" />)
        expect(screen.getByTestId('sub-status').className).toMatch(/status--blue/)
    })

    it('T-IDENTITY-R02c: Outstanding gets amber class', () => {
        render(<SubmissionIdentity reference="SUB-DEMO-20260310-001" status="Outstanding" />)
        expect(screen.getByTestId('sub-status').className).toMatch(/status--amber/)
    })

    it('T-IDENTITY-R02d: Declined gets red class', () => {
        render(<SubmissionIdentity reference="SUB-DEMO-20260310-001" status="Declined" />)
        expect(screen.getByTestId('sub-status').className).toMatch(/status--red/)
    })

    it('T-IDENTITY-R02e: Quoted gets green class', () => {
        render(<SubmissionIdentity reference="SUB-DEMO-20260310-001" status="Quoted" />)
        expect(screen.getByTestId('sub-status').className).toMatch(/status--green/)
    })

    it('T-IDENTITY-R02f: Bound gets dark-green class', () => {
        render(<SubmissionIdentity reference="SUB-DEMO-20260310-001" status="Bound" />)
        expect(screen.getByTestId('sub-status').className).toMatch(/status--dark-green/)
    })
})
