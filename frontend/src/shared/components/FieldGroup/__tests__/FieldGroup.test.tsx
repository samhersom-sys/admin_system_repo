/**
 * TESTS — shared/components/FieldGroup
 *
 * Requirements: ../requirements.md
 * Test ID format: T-SHARED-FG-R[NN]
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import FieldGroup from '../FieldGroup'

describe('FieldGroup', () => {
    // REQ-SHARED-FG-F-001
    test('T-SHARED-FG-R01 — renders legend when title is provided', () => {
        render(<FieldGroup title="Quote Details"><p>content</p></FieldGroup>)
        expect(screen.getByText('Quote Details')).toBeInTheDocument()
    })

    // REQ-SHARED-FG-F-002
    test('T-SHARED-FG-R02 — no legend element when title is absent', () => {
        render(<FieldGroup><p>content</p></FieldGroup>)
        expect(document.querySelector('legend')).toBeNull()
    })

    // REQ-SHARED-FG-F-003
    test('T-SHARED-FG-R03 — children are rendered inside the fieldset', () => {
        render(<FieldGroup><p data-testid="child">hello</p></FieldGroup>)
        expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    // REQ-SHARED-FG-C-001
    test('T-SHARED-FG-R04 — fieldset has border, rounded-md and bg-white classes', () => {
        const { container } = render(<FieldGroup><p>x</p></FieldGroup>)
        const fieldset = container.querySelector('fieldset')!
        expect(fieldset).toHaveClass('border')
        expect(fieldset).toHaveClass('rounded-md')
        expect(fieldset).toHaveClass('bg-white')
    })
})
