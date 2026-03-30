/**
 * TESTS — lib/auth-session
 * Second artifact. Requirements: lib/auth-session/auth-session.requirements.md
 * Test ID format: T-lib-auth-session-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=auth-session.test
 */

import {
    storeSession,
    getSession,
    isAuthenticated,
    getOrgCode,
    getUserId,
    clearSession,
    updateToken,
} from './auth-session'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_SESSION = {
    token: 'mock-jwt-token',
    user: {
        id: 'user-1',
        email: 'jane@example.com',
        name: 'Jane Smith',
        orgCode: 'ORG-001',
        roles: ['underwriter'],
    },
}

// ---------------------------------------------------------------------------
// Setup — clear storage between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
})

// ---------------------------------------------------------------------------
// R01 — storeSession + getSession round-trip
// ---------------------------------------------------------------------------

describe('T-lib-auth-session-R01: storeSession persists a session', () => {
    it('getSession returns the stored session after storeSession', () => {
        storeSession(MOCK_SESSION)
        const result = getSession()
        expect(result).not.toBeNull()
        expect(result!.token).toBe('mock-jwt-token')
        expect(result!.user.id).toBe('user-1')
        expect(result!.user.orgCode).toBe('ORG-001')
    })
})

// ---------------------------------------------------------------------------
// R02 — getSession edge cases
// ---------------------------------------------------------------------------

describe('T-lib-auth-session-R02: getSession handles missing / corrupt data', () => {
    it('returns null when localStorage has no session', () => {
        expect(getSession()).toBeNull()
    })

    it('returns null (does not throw) when stored value is corrupt JSON', () => {
        localStorage.setItem('pf_session', 'not-valid-json{{{')
        expect(() => getSession()).not.toThrow()
        expect(getSession()).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// R03 — isAuthenticated
// ---------------------------------------------------------------------------

describe('T-lib-auth-session-R03: isAuthenticated', () => {
    it('returns false when no session is stored', () => {
        expect(isAuthenticated()).toBe(false)
    })

    it('returns true when a valid session with a token is stored', () => {
        storeSession(MOCK_SESSION)
        expect(isAuthenticated()).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// R04 — getOrgCode
// ---------------------------------------------------------------------------

describe('T-lib-auth-session-R04: getOrgCode', () => {
    it('returns empty string when there is no session', () => {
        expect(getOrgCode()).toBe('')
    })

    it('returns orgCode from the session', () => {
        storeSession(MOCK_SESSION)
        expect(getOrgCode()).toBe('ORG-001')
    })
})

// ---------------------------------------------------------------------------
// R05 — getUserId
// ---------------------------------------------------------------------------

describe('T-lib-auth-session-R05: getUserId', () => {
    it('returns empty string when there is no session', () => {
        expect(getUserId()).toBe('')
    })

    it('returns user id from the session', () => {
        storeSession(MOCK_SESSION)
        expect(getUserId()).toBe('user-1')
    })
})

// ---------------------------------------------------------------------------
// R06 — clearSession
// ---------------------------------------------------------------------------

describe('T-lib-auth-session-R06: clearSession removes the session', () => {
    it('getSession returns null after clearSession', () => {
        storeSession(MOCK_SESSION)
        expect(getSession()).not.toBeNull()
        clearSession()
        expect(getSession()).toBeNull()
    })

    it('isAuthenticated returns false after clearSession', () => {
        storeSession(MOCK_SESSION)
        clearSession()
        expect(isAuthenticated()).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// R07 — storeSession uses sessionStorage, not localStorage (REQ-AUTH-SES-F-012)
// ---------------------------------------------------------------------------

describe('T-lib-auth-session-R07: storeSession uses sessionStorage not localStorage', () => {
    it('stores the session in sessionStorage', () => {
        storeSession(MOCK_SESSION)
        const raw = sessionStorage.getItem('pf_session')
        expect(raw).not.toBeNull()
        const parsed = JSON.parse(raw!)
        expect(parsed.token).toBe('mock-jwt-token')
    })

    it('does NOT store anything in localStorage', () => {
        storeSession(MOCK_SESSION)
        expect(localStorage.getItem('pf_session')).toBeNull()
    })

    it('clearSession removes from sessionStorage', () => {
        storeSession(MOCK_SESSION)
        clearSession()
        expect(sessionStorage.getItem('pf_session')).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// R08 — updateToken (REQ-AUTH-SES-F-013)
// ---------------------------------------------------------------------------

describe('T-lib-auth-session-R08: updateToken replaces only the token', () => {
    it('updates the token without modifying the user object', () => {
        storeSession(MOCK_SESSION)
        updateToken('refreshed-jwt-token')
        const session = getSession()
        expect(session?.token).toBe('refreshed-jwt-token')
        expect(session?.user.id).toBe('user-1')
        expect(session?.user.orgCode).toBe('ORG-001')
    })

    it('does nothing if no session exists', () => {
        expect(() => updateToken('any-token')).not.toThrow()
        expect(getSession()).toBeNull()
    })

    it('updated token is reflected by isAuthenticated', () => {
        storeSession(MOCK_SESSION)
        updateToken('new-token')
        expect(isAuthenticated()).toBe(true)
    })
})
