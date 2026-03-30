/**
 * Auth Session — sessionStorage wrapper for the current user session.
 *
 * Responsibilities:
 *   - Persist and retrieve the auth token + user object.
 *   - Provide typed helpers consumed by api-client and components.
 *
 * Uses sessionStorage (not localStorage) so the session is automatically
 * cleared when the browser tab is closed or the computer restarts, forcing
 * re-authentication.
 *
 * NEVER call sessionStorage directly from components or other services.
 * All session reads/writes MUST go through this module.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string
  email: string
  name: string
  orgCode: string
  role?: string    // single role string returned by backend (e.g. 'underwriter', 'pf_admin')
  roles?: string[] // legacy array — keep until all consumers migrated
  [key: string]: unknown
}

export interface Session {
  token: string
  user: SessionUser
}

// ---------------------------------------------------------------------------
// Storage key — single constant so it never drifts between functions
// ---------------------------------------------------------------------------

const SESSION_KEY = 'pf_session'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Persist a new session after a successful login.
 */
export function storeSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

/**
 * Retrieve the current session.  Returns null when not authenticated.
 */
export function getSession(): Session | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

/**
 * Returns true if there is a valid session in storage.
 */
export function isAuthenticated(): boolean {
  const session = getSession()
  return session !== null && Boolean(session.token)
}

/**
 * Retrieve the authenticated user's org code.
 * Returns an empty string when not authenticated.
 */
export function getOrgCode(): string {
  return getSession()?.user?.orgCode ?? ''
}

/**
 * Retrieve the authenticated user's ID.
 * Returns an empty string when not authenticated.
 */
export function getUserId(): string {
  return getSession()?.user?.id ?? ''
}

/**
 * Remove the session from storage.  Call this on logout.
 */
export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

/**
 * Replace only the token in the stored session without modifying the user.
 * Used by the token-refresh flow to slide the session forward.
 * Does nothing if no session is currently stored.
 */
export function updateToken(newToken: string): void {
  const session = getSession()
  if (!session) return
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, token: newToken }))
}
