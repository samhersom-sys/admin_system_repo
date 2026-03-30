/**
 * TESTS — app/pages/finance (smoke)
 * Second artifact. Requirements: finance.requirements.md
 * Test ID format: T-finance-SMOKE-R[NN]
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import FinancePage from './index'

describe('T-finance-SMOKE-R01: renders without crash', () => {
    it('renders the Finance placeholder content', () => {
        render(<FinancePage />)
        expect(screen.getByText('Finance — coming soon.')).toBeInTheDocument()
    })
})
