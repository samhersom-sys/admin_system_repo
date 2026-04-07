/**
 * TESTS — Movement component
 * Requirements: src/shared/components/Movement/Movement.requirements.md
 * Test ID format: T-MOV-R[NN]
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import Movement from '../Movement'

// ---------------------------------------------------------------------------
// REQ-MOV-F-001 — renders as disabled input by default
// ---------------------------------------------------------------------------

describe('T-MOV-R01: Movement renders as disabled input by default', () => {
    it('renders an input element when as prop is omitted', () => {
        const { container } = render(<Movement delta={500} />)
        const input = container.querySelector('input')
        expect(input).toBeInTheDocument()
        expect(input!.disabled).toBe(true)
        expect(input!.value).toBe('(+500)')
    })

    it('renders a span when as="span"', () => {
        render(<Movement delta={500} as="span" />)
        expect(screen.getByText('(+500)').tagName.toLowerCase()).toBe('span')
    })
})

// ---------------------------------------------------------------------------
// REQ-MOV-F-002 — colour coding
// ---------------------------------------------------------------------------

describe('T-MOV-R02: Movement applies correct colour class', () => {
    it('applies text-gray-700 for positive delta', () => {
        render(<Movement delta={1200} />)
        const input = screen.getByDisplayValue('(+1,200)')
        expect(input.className).toContain('text-gray-700')
    })

    it('applies text-red-700 for negative delta', () => {
        render(<Movement delta={-500} />)
        const input = screen.getByDisplayValue('(-500)')
        expect(input.className).toContain('text-red-700')
    })
})

// ---------------------------------------------------------------------------
// REQ-MOV-F-003 — returns null for zero/null/undefined unless renderEmpty
// ---------------------------------------------------------------------------

describe('T-MOV-R03: Movement returns null for empty delta when renderEmpty=false', () => {
    it('renders nothing for delta=0', () => {
        const { container } = render(<Movement delta={0} />)
        expect(container.firstChild).toBeNull()
    })

    it('renders nothing for delta=null', () => {
        const { container } = render(<Movement delta={null} />)
        expect(container.firstChild).toBeNull()
    })

    it('renders nothing for delta=undefined', () => {
        const { container } = render(<Movement delta={undefined} />)
        expect(container.firstChild).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// REQ-MOV-F-004 — renderEmpty=true renders blank input even for zero
// ---------------------------------------------------------------------------

describe('T-MOV-R04: Movement renders blank input when renderEmpty=true and delta is 0', () => {
    it('renders a blank disabled input for delta=0', () => {
        const { container } = render(<Movement delta={0} renderEmpty />)
        const input = container.querySelector('input[disabled]')
        expect(input).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-MOV-F-005 — locale support
// ---------------------------------------------------------------------------

describe('T-MOV-R05: Movement accepts locale prop', () => {
    it('formats with given locale', () => {
        render(<Movement delta={1000} locale="en-GB" />)
        const input = screen.getByDisplayValue('(+1,000)')
        expect(input).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-MOV-F-006 — className passthrough
// ---------------------------------------------------------------------------

describe('T-MOV-R06: Movement appends custom className', () => {
    it('includes the custom className on the input', () => {
        render(<Movement delta={100} className="custom-class" />)
        const input = screen.getByDisplayValue('(+100)')
        expect(input.className).toContain('custom-class')
    })
})
