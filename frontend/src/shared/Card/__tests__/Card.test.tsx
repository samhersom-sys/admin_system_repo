/**
 * TESTS — components/Card
 * Second artifact. Requirements: components/Card/requirements.md
 * Test ID format: T-Card-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=components/Card
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import Card from '../Card'

// ---------------------------------------------------------------------------
// R01 — Renders children
// ---------------------------------------------------------------------------

describe('T-Card-R01: renders children', () => {
    it('renders child content inside the card', () => {
        render(<Card><p>Hello world</p></Card>)
        expect(screen.getByText('Hello world')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R02 — Optional title
// ---------------------------------------------------------------------------

describe('T-Card-R02: optional title', () => {
    it('renders the title when the title prop is provided', () => {
        render(<Card title="My Card Title"><span>content</span></Card>)
        expect(screen.getByText('My Card Title')).toBeInTheDocument()
    })

    it('does not render a header when title is omitted', () => {
        const { container } = render(<Card><span>content</span></Card>)
        // No h2 element present when no title
        expect(container.querySelector('h2')).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// R03 — className passthrough
// ---------------------------------------------------------------------------

describe('T-Card-R03: className passthrough', () => {
    it('applies a custom className to the outer container', () => {
        const { container } = render(<Card className="custom-test-class"><span /></Card>)
        expect(container.firstChild).toHaveClass('custom-test-class')
    })

    it('renders without error when className is omitted', () => {
        expect(() => render(<Card><span /></Card>)).not.toThrow()
    })
})
