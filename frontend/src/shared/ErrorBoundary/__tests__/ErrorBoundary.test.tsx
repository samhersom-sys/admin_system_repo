/**
 * TESTS — components/ErrorBoundary
 * Second artifact. Requirements: components/ErrorBoundary/requirements.md
 * Test ID format: T-ErrorBoundary-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=components/ErrorBoundary
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'

// ---------------------------------------------------------------------------
// Helper — component that throws on demand
// ---------------------------------------------------------------------------

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) throw new Error('test render error')
    return <div>Normal content</div>
}

// Suppress React's console.error noise for expected boundary errors in tests
beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { })
})

afterEach(() => {
    jest.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// R01 — Renders children when no error
// ---------------------------------------------------------------------------

describe('T-ErrorBoundary-R01: renders children when no error occurs', () => {
    it('renders child content when nothing throws', () => {
        render(
            <ErrorBoundary>
                <ThrowingChild shouldThrow={false} />
            </ErrorBoundary>
        )
        expect(screen.getByText('Normal content')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R02 — Default fallback on error
// ---------------------------------------------------------------------------

describe('T-ErrorBoundary-R02: default fallback shown when child throws', () => {
    it('renders role="alert" element', () => {
        render(
            <ErrorBoundary>
                <ThrowingChild shouldThrow={true} />
            </ErrorBoundary>
        )
        expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('shows "Something went wrong" in the fallback', () => {
        render(
            <ErrorBoundary>
                <ThrowingChild shouldThrow={true} />
            </ErrorBoundary>
        )
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R03 — Custom fallback prop
// ---------------------------------------------------------------------------

describe('T-ErrorBoundary-R03: custom fallback rendered when provided', () => {
    it('calls the fallback function with the error and renders its output', () => {
        const fallback = jest.fn((err: Error) => (
            <div data-testid="custom-fallback">Custom: {err.message}</div>
        ))
        render(
            <ErrorBoundary fallback={fallback}>
                <ThrowingChild shouldThrow={true} />
            </ErrorBoundary>
        )
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
        expect(screen.getByText('Custom: test render error')).toBeInTheDocument()
        expect(fallback).toHaveBeenCalledWith(expect.any(Error))
    })
})

// ---------------------------------------------------------------------------
// R04 — Recovery action
// ---------------------------------------------------------------------------

describe('T-ErrorBoundary-R04: recovery action in default fallback', () => {
    const originalReload = window.location.reload

    beforeEach(() => {
        Object.defineProperty(window, 'location', {
            value: { ...window.location, reload: jest.fn() },
            writable: true,
        })
    })

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            value: { ...window.location, reload: originalReload },
            writable: true,
        })
    })

    it('renders a "Reload page" button in the default fallback', () => {
        render(
            <ErrorBoundary>
                <ThrowingChild shouldThrow={true} />
            </ErrorBoundary>
        )
        expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
    })

    it('clicking "Reload page" calls window.location.reload()', () => {
        render(
            <ErrorBoundary>
                <ThrowingChild shouldThrow={true} />
            </ErrorBoundary>
        )
        fireEvent.click(screen.getByRole('button', { name: 'Reload page' }))
        expect(window.location.reload).toHaveBeenCalledTimes(1)
    })

    it('does not show the "Reload page" button when a custom fallback is used', () => {
        render(
            <ErrorBoundary fallback={() => <div>Custom fallback</div>}>
                <ThrowingChild shouldThrow={true} />
            </ErrorBoundary>
        )
        expect(screen.queryByRole('button', { name: 'Reload page' })).not.toBeInTheDocument()
    })
})
