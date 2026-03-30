/**
 * TESTS — app/pages/policies (smoke)
 * Second artifact. Requirements: policies.requirements.md
 * Test ID format: T-policies-SMOKE-R[NN]
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import PoliciesPage from './index'

describe('T-policies-SMOKE-R01: renders without crash', () => {
    it('renders the Policies placeholder content', () => {
        render(<PoliciesPage />)
        expect(screen.getByText('Policies list — coming soon.')).toBeInTheDocument()
    })
})
