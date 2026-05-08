/**
 * TESTS — app/pages/workflow (smoke)
 * Second artifact. Requirements: workflow.requirements.md
 * Test ID format: T-workflow-SMOKE-R[NN]
 *
 * Verifies that the barrel export (index.tsx) re-exports WorkflowDirectoryPage.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WorkflowPage from './index'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

describe('T-workflow-SMOKE-R01: barrel export renders WorkflowDirectoryPage', () => {
    it('renders the Workflow Directory heading', () => {
        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <WorkflowPage />
            </MemoryRouter>
        )
        expect(screen.getByText('Workflow')).toBeInTheDocument()
    })
})
