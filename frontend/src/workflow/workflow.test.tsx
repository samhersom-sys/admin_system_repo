/**
 * TESTS — app/pages/workflow (smoke)
 * Second artifact. Requirements: workflow.requirements.md
 * Test ID format: T-workflow-SMOKE-R[NN]
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import WorkflowPage from './index'

describe('T-workflow-SMOKE-R01: renders without crash', () => {
    it('renders the Workflow placeholder content', () => {
        render(<WorkflowPage />)
        expect(screen.getByText('Workflow — coming soon.')).toBeInTheDocument()
    })
})
