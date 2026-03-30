/**
 * TESTS — components/LoadingSpinner
 * Second artifact. Requirements: components/LoadingSpinner/requirements.md
 * Test ID format: T-LoadingSpinner-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=components/LoadingSpinner
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../LoadingSpinner'

// ---------------------------------------------------------------------------
// R01 — role="status"
// ---------------------------------------------------------------------------

describe('T-LoadingSpinner-R01: has role="status"', () => {
    it('renders an element with role status', () => {
        render(<LoadingSpinner />)
        expect(screen.getByRole('status')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R02 — aria-label
// ---------------------------------------------------------------------------

describe('T-LoadingSpinner-R02: aria-label', () => {
    it('defaults aria-label to "Loading"', () => {
        render(<LoadingSpinner />)
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading')
    })

    it('uses custom label prop for aria-label', () => {
        render(<LoadingSpinner label="Fetching data" />)
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching data')
    })
})

// ---------------------------------------------------------------------------
// R03 — sr-only text
// ---------------------------------------------------------------------------

describe('T-LoadingSpinner-R03: sr-only text', () => {
    it('includes sr-only span with default label text', () => {
        const { container } = render(<LoadingSpinner />)
        const srSpan = container.querySelector('.sr-only')
        expect(srSpan).toBeInTheDocument()
        expect(srSpan).toHaveTextContent('Loading')
    })

    it('sr-only span reflects custom label', () => {
        const { container } = render(<LoadingSpinner label="Please wait" />)
        const srSpan = container.querySelector('.sr-only')
        expect(srSpan).toHaveTextContent('Please wait')
    })
})

// ---------------------------------------------------------------------------
// R04 — data-testid
// ---------------------------------------------------------------------------

describe('T-LoadingSpinner-R04: data-testid', () => {
    it('always has data-testid="loading-spinner"', () => {
        render(<LoadingSpinner />)
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('testid present even with custom label', () => {
        render(<LoadingSpinner label="Custom" />)
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
})
