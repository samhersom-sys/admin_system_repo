/**
 * TESTS — app/pages/policies (smoke)
 * Second artifact. Requirements: policies.requirements.md
 * Test ID format: T-policies-SMOKE-R[NN]
 *
 * § 6.4A — stub promoted: 'coming soon' assertion replaced per AI Guidelines §6.4A
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: jest.fn() }),
}))

jest.mock('@/policies/policies.service', () => ({
    getPolicies: jest.fn().mockResolvedValue([]),
}))

import PoliciesPage from './index'

describe('T-policies-SMOKE-R01: renders without crash', () => {
    it('does not contain coming soon text', () => {
        render(
            <MemoryRouter>
                <PoliciesPage />
            </MemoryRouter>
        )
        expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    })
})
