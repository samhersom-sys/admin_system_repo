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

const crypto = require('crypto')
const express = require('express')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const router = express.Router()
const { runQuery, runCommand } = require('../db')
const { authenticateToken } = require('../middleware/auth')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

function hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
}

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
                    is_active, failed_login_attempts, locked_until, token_version
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
        const nextTokenVersion = (user.token_version || 1) + 1

        await runQuery(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP, token_version = $1 WHERE id = $2',
            [nextTokenVersion, user.id]
        )

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                orgCode: user.org_code,
                role: user.role,
                tokenVersion: nextTokenVersion,
            },
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
            {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                orgCode: req.user.orgCode,
                role: req.user.role,
                tokenVersion: req.user.tokenVersion,
            },
            JWT_SECRET,
            { expiresIn: '30m' }
        )

        return res.json({ token })
    } catch (err) {
        console.error('[POST /api/auth/refresh] Error:', err.message)
        return res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// POST /api/auth/logout — invalidate all issued tokens for the user
// ---------------------------------------------------------------------------

router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await runCommand(
            'UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = $1',
            [req.user.id]
        )

        return res.json({ message: 'Logged out successfully' })
    } catch (err) {
        console.error('[POST /api/auth/logout] Error:', err.message)
        return res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// POST /api/auth/generate-reset-token — admin-only reset link generation
// ---------------------------------------------------------------------------

router.post('/generate-reset-token', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' })
        }

        const { userId } = req.body
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' })
        }

        const users = await runQuery(
            'SELECT id FROM users WHERE id = $1',
            [userId]
        )

        if (!users.length) {
            return res.status(404).json({ error: 'User not found' })
        }

        const rawToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = hashResetToken(rawToken)
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

        await runCommand(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_by_user_id)
             VALUES ($1, $2, $3, $4)`,
            [userId, hashedToken, expiresAt, req.user.id]
        )

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
        return res.json({ resetUrl: `${baseUrl}/reset-password?token=${rawToken}` })
    } catch (err) {
        console.error('[POST /api/auth/generate-reset-token] Error:', err.message)
        return res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password — public one-time password reset
// ---------------------------------------------------------------------------

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body

        if (!token) {
            return res.status(400).json({ error: 'token is required' })
        }
        if (!newPassword) {
            return res.status(400).json({ error: 'newPassword is required' })
        }

        const tokenRows = await runQuery(
            `SELECT id, user_id, used, expires_at, created_by_user_id
             FROM password_reset_tokens
             WHERE token = $1`,
            [hashResetToken(token)]
        )

        if (!tokenRows.length) {
            return res.status(400).json({ error: 'Invalid or expired token' })
        }

        const tokenRow = tokenRows[0]
        if (tokenRow.used) {
            return res.status(400).json({ error: 'Token has already been used' })
        }
        if (new Date(tokenRow.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Token has expired' })
        }

        const hash = await bcryptjs.hash(newPassword, 10)

        await runCommand(
            `UPDATE users
             SET password_hash = $1,
                 token_version = COALESCE(token_version, 1) + 1
             WHERE id = $2`,
            [hash, tokenRow.user_id]
        )

        await runCommand(
            'UPDATE password_reset_tokens SET used = true WHERE id = $1',
            [tokenRow.id]
        )

        await runCommand(
            `INSERT INTO password_audit_log (user_id, method, changed_by_user_id)
             VALUES ($1, $2, $3)`,
            [tokenRow.user_id, 'admin_reset', tokenRow.created_by_user_id]
        )

        return res.json({ message: 'Password reset successfully' })
    } catch (err) {
        console.error('[POST /api/auth/reset-password] Error:', err.message)
        return res.status(500).json({ error: err.message })
    }
})

module.exports = router
