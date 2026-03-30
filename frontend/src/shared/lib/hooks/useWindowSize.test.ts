/**
 * useWindowSize — tests
 *
 * Requirements: useWindowSize.requirements.md
 */

import { renderHook, act } from '@testing-library/react'
import { useWindowSize } from './useWindowSize'

// Helpers to manipulate jsdom window size
function setWindowSize(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height })
}

// ---------------------------------------------------------------------------
// T-WIN-SIZE-001 — Returns { width, height }
// REQ-WIN-SIZE-001
// ---------------------------------------------------------------------------
describe('T-WIN-SIZE-001: returns width and height', () => {
    it('returns an object with numeric width and height properties', () => {
        const { result } = renderHook(() => useWindowSize())
        expect(typeof result.current.width).toBe('number')
        expect(typeof result.current.height).toBe('number')
    })
})

// ---------------------------------------------------------------------------
// T-WIN-SIZE-002 — Initial value matches window dimensions
// REQ-WIN-SIZE-002
// ---------------------------------------------------------------------------
describe('T-WIN-SIZE-002: initial values match window.innerWidth / innerHeight', () => {
    it('initialises width and height from window.innerWidth and window.innerHeight', () => {
        setWindowSize(1280, 800)
        const { result } = renderHook(() => useWindowSize())
        expect(result.current.width).toBe(1280)
        expect(result.current.height).toBe(800)
    })
})

// ---------------------------------------------------------------------------
// T-WIN-SIZE-003 — Updates on resize
// REQ-WIN-SIZE-003
// ---------------------------------------------------------------------------
describe('T-WIN-SIZE-003: updates when window is resized', () => {
    it('updates width and height when a resize event fires', () => {
        setWindowSize(1024, 768)
        const { result } = renderHook(() => useWindowSize())
        expect(result.current.width).toBe(1024)

        act(() => {
            setWindowSize(1920, 1080)
            window.dispatchEvent(new Event('resize'))
        })

        expect(result.current.width).toBe(1920)
        expect(result.current.height).toBe(1080)
    })
})

// ---------------------------------------------------------------------------
// T-WIN-SIZE-004 — Cleans up event listener on unmount
// REQ-WIN-SIZE-004
// ---------------------------------------------------------------------------
describe('T-WIN-SIZE-004: removes resize listener on unmount', () => {
    it('does not update state after the component unmounts', () => {
        setWindowSize(1024, 768)
        const { result, unmount } = renderHook(() => useWindowSize())
        unmount()

        // Dispatching resize after unmount should not throw or update state
        act(() => {
            setWindowSize(500, 400)
            window.dispatchEvent(new Event('resize'))
        })

        // Width should still be the value at unmount time — state is frozen
        expect(result.current.width).toBe(1024)
    })
})
