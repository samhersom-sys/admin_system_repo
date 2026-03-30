/**
 * TESTS — app/AppLayout/useInactivityLogout
 * Second artifact. Requirements: useInactivityLogout.requirements.md
 * Test ID format: T-INACTIVITY-R[NN]
 *
 * Run: npx jest useInactivityLogout.test
 */

import { renderHook, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockClearSession = jest.fn()
const mockUpdateToken = jest.fn()
const mockGetSession = jest.fn()
jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    clearSession: (...args: unknown[]) => mockClearSession(...args),
    updateToken: (...args: unknown[]) => mockUpdateToken(...args),
    getSession: (...args: unknown[]) => mockGetSession(...args),
}))

const mockPost = jest.fn()
jest.mock('@/shared/lib/api-client/api-client', () => ({
    post: (...args: unknown[]) => mockPost(...args),
}))

/*
 * API CONTRACT — POST /api/auth/refresh
 * Status: Verified — endpoint implemented in backend/routes/auth.js
 * Auth: Bearer token (via Authorization header, attached by api-client)
 * Request body: (none)
 * Success (200): { token: string } — fresh 30-minute JWT
 * 401: { error: "Access token required" } — no Authorization header
 * 403: { error: "Invalid or expired token" } — bad/expired token
 */

import { useInactivityLogout } from './useInactivityLogout'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    window.history.replaceState(null, '', '/')
    // Default: a session always exists unless overridden
    mockGetSession.mockReturnValue({ token: 'existing-token', user: { id: '1' } })
    mockPost.mockResolvedValue({ token: 'refreshed-token' })
})

afterEach(() => {
    jest.useRealTimers()
})

// ---------------------------------------------------------------------------
// REQ-INACTIVITY-F-001: Logout fires after full timeout
// ---------------------------------------------------------------------------

describe('T-INACTIVITY-R01: logout fires after the full inactivity timeout', () => {
    it('calls clearSession and navigates to /login when the timer expires', () => {
        renderHook(() => useInactivityLogout(TIMEOUT))
        act(() => { jest.advanceTimersByTime(TIMEOUT) })
        expect(mockClearSession).toHaveBeenCalledTimes(1)
        expect(window.location.pathname).toBe('/login')
    })

    it('does not log out before the timeout has fully elapsed', () => {
        renderHook(() => useInactivityLogout(TIMEOUT))
        act(() => { jest.advanceTimersByTime(TIMEOUT - 1) })
        expect(mockClearSession).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// REQ-INACTIVITY-F-002: User activity resets the timer
// ---------------------------------------------------------------------------

describe('T-INACTIVITY-R02: user interaction resets the inactivity timer', () => {
    it('does not log out when a mousemove occurs before the timeout', () => {
        renderHook(() => useInactivityLogout(TIMEOUT))
        act(() => { jest.advanceTimersByTime(TIMEOUT - 1000) }) // 1 second before timeout
        act(() => { window.dispatchEvent(new MouseEvent('mousemove')) })
        act(() => { jest.advanceTimersByTime(TIMEOUT - 1) }) // almost another full period
        expect(mockClearSession).not.toHaveBeenCalled()
    })

    it('logs out after the full timeout following the last interaction', () => {
        renderHook(() => useInactivityLogout(TIMEOUT))
        act(() => { jest.advanceTimersByTime(TIMEOUT - 1000) })
        act(() => { window.dispatchEvent(new MouseEvent('click')) }) // reset
        act(() => { jest.advanceTimersByTime(TIMEOUT) })             // full period after click
        expect(mockClearSession).toHaveBeenCalledTimes(1)
        expect(window.location.pathname).toBe('/login')
    })

    it('keydown event also resets the timer', () => {
        renderHook(() => useInactivityLogout(TIMEOUT))
        act(() => { jest.advanceTimersByTime(TIMEOUT - 1000) })
        act(() => { window.dispatchEvent(new KeyboardEvent('keydown')) })
        act(() => { jest.advanceTimersByTime(TIMEOUT - 1) })
        expect(mockClearSession).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// REQ-INACTIVITY-F-003: Cleanup on unmount
// ---------------------------------------------------------------------------

describe('T-INACTIVITY-R03: timer is cancelled on unmount', () => {
    it('does not log out after the hook is unmounted', () => {
        const { unmount } = renderHook(() => useInactivityLogout(TIMEOUT))
        unmount()
        act(() => { jest.advanceTimersByTime(TIMEOUT * 2) })
        expect(mockClearSession).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// REQ-INACTIVITY-F-005: Throttled token refresh on activity
// ---------------------------------------------------------------------------

const REFRESH_THROTTLE_MS = 5 * 60 * 1000

describe('T-INACTIVITY-R04: activity triggers a throttled token refresh', () => {
    it('T-INACTIVITY-R04a: calls POST /api/auth/refresh after the throttle period elapses', async () => {
        renderHook(() => useInactivityLogout(TIMEOUT))
        act(() => { jest.advanceTimersByTime(REFRESH_THROTTLE_MS) })
        act(() => { window.dispatchEvent(new MouseEvent('click')) })
        await act(async () => { await Promise.resolve() })
        expect(mockPost).toHaveBeenCalledWith('/api/auth/refresh')
        expect(mockUpdateToken).toHaveBeenCalledWith('refreshed-token')
    })

    it('T-INACTIVITY-R04b: does not call refresh before the throttle period expires', () => {
        renderHook(() => useInactivityLogout(TIMEOUT))
        act(() => { jest.advanceTimersByTime(REFRESH_THROTTLE_MS - 1000) })
        act(() => { window.dispatchEvent(new MouseEvent('click')) })
        expect(mockPost).not.toHaveBeenCalled()
    })

    it('T-INACTIVITY-R04c: calls refresh again once a second throttle period has elapsed', async () => {
        renderHook(() => useInactivityLogout(TIMEOUT))
        // First refresh window
        act(() => { jest.advanceTimersByTime(REFRESH_THROTTLE_MS) })
        act(() => { window.dispatchEvent(new MouseEvent('click')) })
        await act(async () => { await Promise.resolve() })
        expect(mockPost).toHaveBeenCalledTimes(1)
        // Second refresh window
        act(() => { jest.advanceTimersByTime(REFRESH_THROTTLE_MS) })
        act(() => { window.dispatchEvent(new MouseEvent('click')) })
        await act(async () => { await Promise.resolve() })
        expect(mockPost).toHaveBeenCalledTimes(2)
    })

    it('T-INACTIVITY-R04d: skips refresh when no session exists', () => {
        mockGetSession.mockReturnValue(null)
        renderHook(() => useInactivityLogout(TIMEOUT))
        act(() => { jest.advanceTimersByTime(REFRESH_THROTTLE_MS) })
        act(() => { window.dispatchEvent(new MouseEvent('click')) })
        expect(mockPost).not.toHaveBeenCalled()
    })

    it('T-INACTIVITY-R04e: clears session and navigates to /login when refresh fails', async () => {
        mockPost.mockRejectedValue(new Error('Token expired'))
        renderHook(() => useInactivityLogout(TIMEOUT))
        act(() => { jest.advanceTimersByTime(REFRESH_THROTTLE_MS) })
        act(() => { window.dispatchEvent(new MouseEvent('click')) })
        await act(async () => { await Promise.resolve() })
        expect(mockClearSession).toHaveBeenCalled()
        expect(window.location.pathname).toBe('/login')
    })
})
