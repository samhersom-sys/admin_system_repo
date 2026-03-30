/**
 * TESTS — lib/permissions
 * Second artifact. Requirements: lib/permissions/permissions.requirements.md
 * Test ID format: T-lib-permissions-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=permissions.test
 */

import { isActionEnabled } from './permissions'
import type { SessionUser } from '@/shared/lib/auth-session/auth-session'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const adminUser: SessionUser = { id: '1', email: 'a@b.com', name: 'Admin', orgCode: 'T', roles: ['client_admin'] }
const internalAdmin: SessionUser = { id: '5', email: 'pf@b.com', name: 'PF Admin', orgCode: 'PF', roles: ['internal_admin'] }
const underwriter: SessionUser = { id: '2', email: 'b@b.com', name: 'UW', orgCode: 'T', roles: ['underwriter'] }
const brokerUser: SessionUser = { id: '3', email: 'c@b.com', name: 'Broker', orgCode: 'T', roles: ['broker'] }
const noRoleUser: SessionUser = { id: '4', email: 'd@b.com', name: 'None', orgCode: 'T', roles: [] }

// ---------------------------------------------------------------------------
// R01 — Deny when no user
// ---------------------------------------------------------------------------

describe('T-lib-permissions-R01: deny when user is null or undefined', () => {
    it('returns false for any action when user is null', () => {
        expect(isActionEnabled('submission.create', null)).toBe(false)
        expect(isActionEnabled('admin.manageUsers', null)).toBe(false)
    })

    it('returns false for any action when user is undefined', () => {
        expect(isActionEnabled('submission.create', undefined)).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// R02 — Allow open actions (empty roles array = everyone)
// ---------------------------------------------------------------------------

describe('T-lib-permissions-R02: open actions allowed for any authenticated user', () => {
    it('submission.create is allowed for a user with no roles', () => {
        expect(isActionEnabled('submission.create', noRoleUser)).toBe(true)
    })

    it('submission.create is allowed for a broker', () => {
        expect(isActionEnabled('submission.create', brokerUser)).toBe(true)
    })

    it('claim.create is allowed for any user', () => {
        expect(isActionEnabled('claim.create', noRoleUser)).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// R03 — Allow permitted role
// ---------------------------------------------------------------------------

describe('T-lib-permissions-R03: permitted role returns true', () => {
    it('underwriter can bind quotes', () => {
        expect(isActionEnabled('quote.bind', underwriter)).toBe(true)
    })

    it('client_admin can manage users', () => {
        expect(isActionEnabled('admin.manageUsers', adminUser)).toBe(true)
    })

    it('internal_admin can manage users', () => {
        expect(isActionEnabled('admin.manageUsers', internalAdmin)).toBe(true)
    })

    it('client_admin can do all restricted actions', () => {
        expect(isActionEnabled('submission.delete', adminUser)).toBe(true)
        expect(isActionEnabled('quote.bind', adminUser)).toBe(true)
        expect(isActionEnabled('policy.endorse', adminUser)).toBe(true)
        expect(isActionEnabled('invoice.create', adminUser)).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// R04 — Deny unpermitted role
// ---------------------------------------------------------------------------

describe('T-lib-permissions-R04: unpermitted role returns false', () => {
    it('broker cannot bind quotes', () => {
        expect(isActionEnabled('quote.bind', brokerUser)).toBe(false)
    })

    it('underwriter cannot manage users', () => {
        expect(isActionEnabled('admin.manageUsers', underwriter)).toBe(false)
    })

    it('user with no roles cannot delete submissions', () => {
        expect(isActionEnabled('submission.delete', noRoleUser)).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// R05 — Deny unknown action
// ---------------------------------------------------------------------------

describe('T-lib-permissions-R05: unknown action key returns false', () => {
    it('returns false for an unregistered action key', () => {
        expect(isActionEnabled('unknown.action' as any, adminUser)).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// R06 — Single role string (user.role) is supported
// ---------------------------------------------------------------------------

describe('T-lib-permissions-R06: single role string (user.role) is supported', () => {
    it('allows action when user.role matches (no roles array)', () => {
        const singleRoleUser: SessionUser = {
            id: '6', email: 'e@b.com', name: 'Single', orgCode: 'T',
            role: 'client_admin',
            // roles deliberately absent — simulates a session from the current backend
        }
        expect(isActionEnabled('admin.manageUsers', singleRoleUser)).toBe(true)
    })

    it('denies action when user.role does not match (no roles array)', () => {
        const singleRoleUser: SessionUser = {
            id: '7', email: 'f@b.com', name: 'Broker Only', orgCode: 'T',
            role: 'broker',
        }
        expect(isActionEnabled('admin.manageUsers', singleRoleUser)).toBe(false)
    })
})
