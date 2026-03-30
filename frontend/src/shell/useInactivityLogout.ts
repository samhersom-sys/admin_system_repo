/**
 * useInactivityLogout — auto-logout after a period of user inactivity,
 * with sliding-session token refresh on activity.
 *
 * Requirements: useInactivityLogout.requirements.md
 * Tests:        useInactivityLogout.test.ts
 */
import { useEffect, useRef } from 'react'
import { clearSession, getSession, updateToken } from '@/shared/lib/auth-session/auth-session'
import { post } from '@/shared/lib/api-client/api-client'

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

// Refresh the JWT at most once per 5 minutes while the user is active.
// The token itself expires after 30 minutes, so refreshing at 5-minute
// intervals ensures it never expires during an active session.
const REFRESH_THROTTLE_MS = 5 * 60 * 1000

function redirectToLogin() {
    window.history.replaceState(null, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
}

/**
 * Starts an inactivity countdown timer. Logs the user out and navigates to
 * /login when `timeoutMs` milliseconds pass without any user interaction.
 * Activity events reset the timer and trigger a throttled token refresh.
 */
export function useInactivityLogout(timeoutMs: number): void {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    // Treat hook mount as "just refreshed" — the login issued a fresh token
    const lastRefreshRef = useRef<number>(Date.now())

    useEffect(() => {
        function startTimer() {
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => {
                clearSession()
                redirectToLogin()
            }, timeoutMs)
        }

        function onActivity() {
            startTimer()
            // Throttled token refresh — slide the session window forward
            const now = Date.now()
            if (now - lastRefreshRef.current >= REFRESH_THROTTLE_MS) {
                if (getSession()) {
                    lastRefreshRef.current = now
                    post<{ token: string }>('/api/auth/refresh')
                        .then(({ token }) => updateToken(token))
                        .catch(() => {
                            // Token has expired or been revoked on the server
                            clearSession()
                            redirectToLogin()
                        })
                }
            }
        }

        startTimer() // start timer on mount — no refresh (fresh token from login)
        ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))

        return () => {
            if (timer.current) clearTimeout(timer.current)
            ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity))
        }
    }, [timeoutMs])
}
