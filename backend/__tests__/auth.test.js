/**
 * TESTS — Backend Auth Routes
 * Second artifact. Requirements: backend/routes/auth.requirements.md
 * Test ID format: T-BE-AUTH-R[NN]
 *
 * Run: npm run test:backend
 *
 * Requires:
 *   - The Cleaned backend running on port 5000 (npm run backend)
 *   - The policyforge_cleaned database with the users table seeded
 *     (via npm run backend:seed or the bootstrap in server.js)
 */

'use strict'

const { agent, runQuery, closePool } = require('./helpers')

afterAll(() => closePool())

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_USER = {
    email: 'testauth@example.com',
    password: 'TestPass123!',
    username: 'testauth',
    fullName: 'Test Auth User',
    orgCode: 'TESTORG',
    role: 'user',
}

// ---------------------------------------------------------------------------
// Setup / teardown — ensure test user exists, remove after suite
// ---------------------------------------------------------------------------

beforeAll(async () => {
    // Remove any leftover test user from a previous failed run
    await runQuery(`DELETE FROM users WHERE email = $1`, [TEST_USER.email])

    // Hash password with bcryptjs (10 rounds, same as production)
    const bcryptjs = require('bcryptjs')
    const hash = await bcryptjs.hash(TEST_USER.password, 10)

    await runQuery(
        `INSERT INTO users (username, email, password_hash, full_name, org_code, role, is_active, failed_login_attempts)
         VALUES ($1, $2, $3, $4, $5, $6, true, 0)`,
        [TEST_USER.username, TEST_USER.email, hash, TEST_USER.fullName, TEST_USER.orgCode, TEST_USER.role]
    )
})

afterAll(async () => {
    await runQuery(`DELETE FROM users WHERE email = $1`, [TEST_USER.email])
})

// ---------------------------------------------------------------------------
// R01 — Happy path login
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R01: POST /api/auth/login — happy path', () => {
    it('T-BE-AUTH-R01a: returns 200 with token and user on valid credentials', async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        expect(res.status).toBe(200)
        expect(res.body.token).toBeTruthy()
        expect(res.body.user).toBeDefined()
        expect(res.body.message).toMatch(/login successful/i)
    })

    it('T-BE-AUTH-R01b: user object contains id, username, email, fullName, orgCode, role', async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        const { user } = res.body
        expect(user.id).toBeDefined()
        expect(user.username).toBe(TEST_USER.username)
        expect(user.email).toBe(TEST_USER.email)
        expect(user.fullName).toBe(TEST_USER.fullName)
        expect(user.orgCode).toBe(TEST_USER.orgCode)
        expect(user.role).toBe(TEST_USER.role)
        // password hash must NOT be in the response
        expect(user.password_hash).toBeUndefined()
        expect(user.passwordHash).toBeUndefined()
    })

    it('T-BE-AUTH-R01c: JWT token payload contains orgCode', async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        // Decode JWT payload without verifying signature (just check shape)
        const payload = JSON.parse(Buffer.from(res.body.token.split('.')[1], 'base64').toString())
        expect(payload.orgCode).toBe(TEST_USER.orgCode)
        expect(payload.email).toBe(TEST_USER.email)
    })

    it('T-BE-AUTH-R01d: login resets failed_login_attempts to 0', async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        expect(res.status).toBe(200)
        const rows = await runQuery(`SELECT failed_login_attempts FROM users WHERE email = $1`, [TEST_USER.email])
        expect(rows[0].failed_login_attempts).toBe(0)
    })
})

// ---------------------------------------------------------------------------
// R02 — Missing fields
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R02: POST /api/auth/login — missing credentials', () => {
    it('T-BE-AUTH-R02a: returns 400 when email is missing', async () => {
        const res = await agent.post('/api/auth/login').send({ password: 'pass' })
        expect(res.status).toBe(400)
        expect(res.body.error).toBeTruthy()
    })

    it('T-BE-AUTH-R02b: returns 400 when password is missing', async () => {
        const res = await agent.post('/api/auth/login').send({ email: TEST_USER.email })
        expect(res.status).toBe(400)
        expect(res.body.error).toBeTruthy()
    })

    it('T-BE-AUTH-R02c: returns 400 when body is empty', async () => {
        const res = await agent.post('/api/auth/login').send({})
        expect(res.status).toBe(400)
    })
})

// ---------------------------------------------------------------------------
// R03 — Unknown user
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R03: POST /api/auth/login — unknown user', () => {
    it('T-BE-AUTH-R03a: returns 401 for an email that does not exist', async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: 'nobody@nowhere.com', password: 'whatever' })
        expect(res.status).toBe(401)
        expect(res.body.error).toMatch(/invalid email or password/i)
    })
})

// ---------------------------------------------------------------------------
// R04 — Wrong password with attempts remaining
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R04: POST /api/auth/login — wrong password', () => {
    beforeEach(async () => {
        // Reset attempts before each test in this block
        await runQuery(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = $1`, [TEST_USER.email])
    })

    it('T-BE-AUTH-R04a: returns 401 with attemptsRemaining on wrong password', async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrongpassword' })
        expect(res.status).toBe(401)
        expect(res.body.attemptsRemaining).toBeDefined()
        expect(typeof res.body.attemptsRemaining).toBe('number')
    })

    it('T-BE-AUTH-R04b: increments failed_login_attempts in the database', async () => {
        await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrongpassword' })
        const rows = await runQuery(`SELECT failed_login_attempts FROM users WHERE email = $1`, [TEST_USER.email])
        expect(rows[0].failed_login_attempts).toBe(1)
    })
})

// ---------------------------------------------------------------------------
// R05 — Account lockout at MAX_ATTEMPTS
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R05: POST /api/auth/login — account lockout', () => {
    beforeAll(async () => {
        // Set failed_login_attempts to 4 (one more wrong attempt should lock)
        await runQuery(`UPDATE users SET failed_login_attempts = 4, locked_until = NULL WHERE email = $1`, [TEST_USER.email])
    })

    it('T-BE-AUTH-R05a: returns 423 when the 5th wrong attempt hits max', async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrongpassword_final' })
        expect(res.status).toBe(423)
        expect(res.body.error).toBeTruthy()
    })

    it('T-BE-AUTH-R05b: subsequent attempt while locked returns 423 with minutes remaining', async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'anything' })
        expect(res.status).toBe(423)
        expect(res.body.error).toMatch(/locked|minute/i)
    })

    afterAll(async () => {
        // Unlock the test user so later tests can still log in
        await runQuery(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = $1`, [TEST_USER.email])
    })
})

// ---------------------------------------------------------------------------
// R06 — GET /api/auth/me
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R06: GET /api/auth/me', () => {
    let token

    beforeAll(async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        token = res.body.token
    })

    it('T-BE-AUTH-R06a: returns 200 with user object when token is valid', async () => {
        const res = await agent
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body.email).toBe(TEST_USER.email)
    })

    it('T-BE-AUTH-R06b: returns 401 when no token is provided', async () => {
        const res = await agent.get('/api/auth/me')
        expect(res.status).toBe(401)
    })

    it('T-BE-AUTH-R06c: returns 403 when token is invalid', async () => {
        const res = await agent
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalidtoken')
        expect(res.status).toBe(403)
    })

    it('T-BE-AUTH-R06d: password_hash is NOT included in the response', async () => {
        const res = await agent
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
        expect(res.body.password_hash).toBeUndefined()
        expect(res.body.passwordHash).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// R07 — POST /api/auth/logout (server-side token invalidation)
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R07: POST /api/auth/logout', () => {
    let token

    beforeEach(async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        token = res.body.token
    })

    it('T-BE-AUTH-R07a: returns 200 with success message on valid token', async () => {
        const res = await agent
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/logged out/i)
    })

    it('T-BE-AUTH-R07b: token is rejected after logout (GET /me returns 403)', async () => {
        await agent
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${token}`)

        const res = await agent
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(403)
    })

    it('T-BE-AUTH-R07c: returns 401 when no token is provided', async () => {
        const res = await agent.post('/api/auth/logout')
        expect(res.status).toBe(401)
    })
})

// ---------------------------------------------------------------------------
// R08 — Token versioning: new login invalidates old tokens
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R08: token versioning — new login invalidates previous token', () => {
    it('T-BE-AUTH-R08a: token from previous login is rejected after new login', async () => {
        // First login
        const first = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        const oldToken = first.body.token

        // Second login — increments token_version
        await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })

        // Old token should now be rejected
        const res = await agent
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${oldToken}`)
        expect(res.status).toBe(403)
    })

    it('T-BE-AUTH-R08b: new token from second login is accepted', async () => {
        const second = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        const newToken = second.body.token

        const res = await agent
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${newToken}`)
        expect(res.status).toBe(200)
    })
})

// ---------------------------------------------------------------------------
// R09 — POST /api/auth/generate-reset-token (admin only)
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R09: POST /api/auth/generate-reset-token', () => {
    let adminToken
    const ADMIN_USER = {
        email: 'testadmin@example.com',
        password: 'AdminPass123!',
        username: 'testadmin',
        fullName: 'Test Admin User',
        orgCode: 'TESTORG',
        role: 'admin',
    }

    beforeAll(async () => {
        await runQuery(`DELETE FROM users WHERE email = $1`, [ADMIN_USER.email])
        const bcryptjs = require('bcryptjs')
        const hash = await bcryptjs.hash(ADMIN_USER.password, 10)
        await runQuery(
            `INSERT INTO users (username, email, password_hash, full_name, org_code, role, is_active, failed_login_attempts)
             VALUES ($1, $2, $3, $4, $5, $6, true, 0)`,
            [ADMIN_USER.username, ADMIN_USER.email, hash, ADMIN_USER.fullName, ADMIN_USER.orgCode, ADMIN_USER.role]
        )
        const res = await agent
            .post('/api/auth/login')
            .send({ email: ADMIN_USER.email, password: ADMIN_USER.password })
        adminToken = res.body.token
    })

    afterAll(async () => {
        await runQuery(`DELETE FROM users WHERE email = $1`, [ADMIN_USER.email])
    })

    it('T-BE-AUTH-R09a: admin can generate a reset token for a target user', async () => {
        // Find the test user's id
        const rows = await runQuery(`SELECT id FROM users WHERE email = $1`, [TEST_USER.email])
        const targetUserId = rows[0].id

        const res = await agent
            .post('/api/auth/generate-reset-token')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ userId: targetUserId })
        expect(res.status).toBe(200)
        expect(res.body.resetUrl).toBeTruthy()
        expect(res.body.resetUrl).toMatch(/reset-password\?token=/)
    })

    it('T-BE-AUTH-R09b: non-admin cannot generate a reset token (403)', async () => {
        const rows = await runQuery(`SELECT id FROM users WHERE email = $1`, [TEST_USER.email])
        const targetUserId = rows[0].id

        // Log in as non-admin test user
        const loginRes = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        const userToken = loginRes.body.token

        const res = await agent
            .post('/api/auth/generate-reset-token')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ userId: targetUserId })
        expect(res.status).toBe(403)
    })

    it('T-BE-AUTH-R09c: returns 400 when userId is missing', async () => {
        const res = await agent
            .post('/api/auth/generate-reset-token')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({})
        expect(res.status).toBe(400)
    })

    it('T-BE-AUTH-R09d: returns 404 when userId does not exist', async () => {
        const res = await agent
            .post('/api/auth/generate-reset-token')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ userId: 999999999 })
        expect(res.status).toBe(404)
    })
})

// ---------------------------------------------------------------------------
// R10 — POST /api/auth/reset-password (public endpoint)
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R10: POST /api/auth/reset-password', () => {
    let validToken
    let adminToken
    const ADMIN_USER2 = {
        email: 'testadmin2@example.com',
        password: 'AdminPass456!',
        username: 'testadmin2',
        fullName: 'Test Admin User 2',
        orgCode: 'TESTORG',
        role: 'admin',
    }

    beforeAll(async () => {
        // Set up admin
        await runQuery(`DELETE FROM users WHERE email = $1`, [ADMIN_USER2.email])
        const bcryptjs = require('bcryptjs')
        const hash = await bcryptjs.hash(ADMIN_USER2.password, 10)
        await runQuery(
            `INSERT INTO users (username, email, password_hash, full_name, org_code, role, is_active, failed_login_attempts)
             VALUES ($1, $2, $3, $4, $5, $6, true, 0)`,
            [ADMIN_USER2.username, ADMIN_USER2.email, hash, ADMIN_USER2.fullName, ADMIN_USER2.orgCode, ADMIN_USER2.role]
        )
        const loginRes = await agent
            .post('/api/auth/login')
            .send({ email: ADMIN_USER2.email, password: ADMIN_USER2.password })
        adminToken = loginRes.body.token

        // Generate a valid reset token for the test user
        const rows = await runQuery(`SELECT id FROM users WHERE email = $1`, [TEST_USER.email])
        const targetUserId = rows[0].id
        const genRes = await agent
            .post('/api/auth/generate-reset-token')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ userId: targetUserId })
        // Extract raw token from URL
        const url = new URL(genRes.body.resetUrl, 'http://localhost')
        validToken = url.searchParams.get('token')
    })

    afterAll(async () => {
        await runQuery(`DELETE FROM users WHERE email = $1`, [ADMIN_USER2.email])
        // Restore the test user's password so R01 tests remain valid if run again
        const bcryptjs = require('bcryptjs')
        const hash = await bcryptjs.hash(TEST_USER.password, 10)
        await runQuery(`UPDATE users SET password_hash = $1 WHERE email = $2`, [hash, TEST_USER.email])
    })

    it('T-BE-AUTH-R10a: valid token resets password and returns 200', async () => {
        const res = await agent
            .post('/api/auth/reset-password')
            .send({ token: validToken, newPassword: 'NewPass789!' })
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/password reset/i)
    })

    it('T-BE-AUTH-R10b: used token is rejected (cannot reuse)', async () => {
        const res = await agent
            .post('/api/auth/reset-password')
            .send({ token: validToken, newPassword: 'AnotherPass321!' })
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/expired|invalid|used/i)
    })

    it('T-BE-AUTH-R10c: invalid token returns 400', async () => {
        const res = await agent
            .post('/api/auth/reset-password')
            .send({ token: 'notarealtoken', newPassword: 'SomePass123!' })
        expect(res.status).toBe(400)
    })

    it('T-BE-AUTH-R10d: missing token returns 400', async () => {
        const res = await agent
            .post('/api/auth/reset-password')
            .send({ newPassword: 'SomePass123!' })
        expect(res.status).toBe(400)
    })

    it('T-BE-AUTH-R10e: missing newPassword returns 400', async () => {
        const res = await agent
            .post('/api/auth/reset-password')
            .send({ token: validToken })
        expect(res.status).toBe(400)
    })

    it('T-BE-AUTH-R10f: password reset writes an audit record', async () => {
        // Generate a fresh token for a second reset
        const rows = await runQuery(`SELECT id FROM users WHERE email = $1`, [TEST_USER.email])
        const targetUserId = rows[0].id
        const genRes = await agent
            .post('/api/auth/generate-reset-token')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ userId: targetUserId })
        const url = new URL(genRes.body.resetUrl, 'http://localhost')
        const freshToken = url.searchParams.get('token')

        await agent
            .post('/api/auth/reset-password')
            .send({ token: freshToken, newPassword: 'AuditPass999!' })

        const audit = await runQuery(
            `SELECT * FROM password_audit_log WHERE user_id = $1 ORDER BY changed_at DESC LIMIT 1`,
            [targetUserId]
        )
        expect(audit.length).toBeGreaterThan(0)
        expect(audit[0].method).toBe('admin_reset')
        expect(audit[0].changed_by_user_id).toBeDefined()
    })
})

// ---------------------------------------------------------------------------
// R11 — POST /api/auth/refresh (sliding session token renewal)
// ---------------------------------------------------------------------------

describe('T-BE-AUTH-R11: POST /api/auth/refresh', () => {
    let validToken

    beforeAll(async () => {
        const res = await agent
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
        validToken = res.body.token
    })

    it('T-BE-AUTH-R11a: returns 401 when no Authorization header is provided', async () => {
        const res = await agent.post('/api/auth/refresh')
        expect(res.status).toBe(401)
        expect(res.body.error).toBeTruthy()
    })

    it('T-BE-AUTH-R11b: returns 403 when the token is invalid', async () => {
        const res = await agent
            .post('/api/auth/refresh')
            .set('Authorization', 'Bearer invalid.token.here')
        expect(res.status).toBe(403)
        expect(res.body.error).toBeTruthy()
    })

    it('T-BE-AUTH-R11c: returns 403 when the user is inactive', async () => {
        // Deactivate the test user temporarily
        await runQuery(`UPDATE users SET is_active = false WHERE email = $1`, [TEST_USER.email])
        const res = await agent
            .post('/api/auth/refresh')
            .set('Authorization', `Bearer ${validToken}`)
        await runQuery(`UPDATE users SET is_active = true WHERE email = $1`, [TEST_USER.email])
        expect(res.status).toBe(403)
        expect(res.body.error).toMatch(/deactivated/i)
    })

    it('T-BE-AUTH-R11d: returns 200 with a new token when a valid token is presented', async () => {
        const res = await agent
            .post('/api/auth/refresh')
            .set('Authorization', `Bearer ${validToken}`)
        expect(res.status).toBe(200)
        expect(res.body.token).toBeTruthy()
        expect(typeof res.body.token).toBe('string')
    })

    it('T-BE-AUTH-R11e: new token carries same payload as the original (id, email, orgCode, role)', async () => {
        const res = await agent
            .post('/api/auth/refresh')
            .set('Authorization', `Bearer ${validToken}`)
        expect(res.status).toBe(200)
        const payload = JSON.parse(Buffer.from(res.body.token.split('.')[1], 'base64').toString())
        const origPayload = JSON.parse(Buffer.from(validToken.split('.')[1], 'base64').toString())
        expect(payload.id).toBe(origPayload.id)
        expect(payload.email).toBe(origPayload.email)
        expect(payload.orgCode).toBe(origPayload.orgCode)
        expect(payload.role).toBe(origPayload.role)
    })
})

