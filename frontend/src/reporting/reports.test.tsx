/**
 * TESTS — app/pages/reports (smoke)
 * Second artifact. Requirements: reports.requirements.md
 * Test ID format: T-reports-SMOKE-R[NN]
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import ReportsPage from './index'

describe('T-reports-SMOKE-R01: renders without crash', () => {
    it('renders the Reporting placeholder content', () => {
        render(<ReportsPage />)
        expect(screen.getByText('Reports and dashboards — coming soon.')).toBeInTheDocument()
    })
})
