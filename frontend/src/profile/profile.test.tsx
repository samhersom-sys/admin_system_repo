/**
 * TESTS — app/pages/profile (smoke)
 * Second artifact. Requirements: profile.requirements.md
 * Test ID format: T-profile-SMOKE-R[NN]
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import ProfilePage from './index'

describe('T-profile-SMOKE-R01: renders without crash', () => {
    it('renders the Profile placeholder content', () => {
        render(<ProfilePage />)
        expect(screen.getByText('User profile — coming soon.')).toBeInTheDocument()
    })
})
