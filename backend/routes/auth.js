/**
 * Auth Routes — /api/auth
 *
 * Requirements: auth.requirements.md
 *
 * Endpoints:
 *   POST /api/auth/login  — verify credentials, issue JWT
 *   GET  /api/auth/me     — return current user (protected)
 */

'use strict'

const express = require('express')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const router = express.Router()
const { runQuery } = require('../db')
const { authenticateToken } = require('../middleware/auth')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }

        const users = await runQuery(
            `SELECT id, username, email, password_hash, full_name, org_code, role,
                    is_active, failed_login_attempts, locked_until
             FROM users
             WHERE email = $1`,
            [email]
        )

        if (!users || users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        const user = users[0]

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000)
            return res.status(423).json({
                error: `Account is locked. Try again in ${minutesLeft} minute(s).`,
            })
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated' })
        }

        const isValidPassword = await bcryptjs.compare(password, user.password_hash)

        if (!isValidPassword) {
            const newAttempts = (user.failed_login_attempts || 0) + 1

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000)
                await runQuery(
                    'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
                    [newAttempts, lockUntil, user.id]
                )
                return res.status(423).json({
                    error: `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${MAX_LOGIN_ATTEMPTS} failed attempts.`,
                })
            }

            await runQuery(
                'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
                [newAttempts, user.id]
            )
            return res.status(401).json({
                error: 'Invalid email or password',
                attemptsRemaining: MAX_LOGIN_ATTEMPTS - newAttempts,
            })
        }

        // Successful login — reset counters, record last_login
        await runQuery(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        )

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, orgCode: user.org_code, role: user.role },
            JWT_SECRET,
            { expiresIn: '30m' }
        )

        return res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                orgCode: user.org_code,
                role: user.role,
            },
        })
    } catch (err) {
        console.error('[POST /api/auth/login] Error:', err.message)
        return res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// GET /api/auth/me — requires valid JWT
// ---------------------------------------------------------------------------

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const users = await runQuery(
            `SELECT id, username, email, full_name AS "fullName", org_code AS "orgCode", role
             FROM users WHERE id = $1`,
            [req.user.id]
        )
        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'User not found' })
        }
        return res.json(users[0])
    } catch (err) {
        console.error('[GET /api/auth/me] Error:', err.message)
        return res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// POST /api/auth/refresh — issue a fresh 30-min token (sliding session)
// ---------------------------------------------------------------------------

router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        // Verify the user is still active before issuing a new token
        const users = await runQuery(
            `SELECT is_active FROM users WHERE id = $1`,
            [req.user.id]
        )
        if (!users || users.length === 0) {
            return res.status(403).json({ error: 'User not found' })
        }
        if (!users[0].is_active) {
            return res.status(403).json({ error: 'Account is deactivated' })
        }

        const token = jwt.sign(
            { id: req.user.id, username: req.user.username, email: req.user.email, orgCode: req.user.orgCode, role: req.user.role },
            JWT_SECRET,
            { expiresIn: '30m' }
        )

        return res.json({ token })
    } catch (err) {
        console.error('[POST /api/auth/refresh] Error:', err.message)
        return res.status(500).json({ error: err.message })
    }
})

module.exports = router
