/**
 * JWT Authentication Middleware
 *
 * Verifies the Bearer token on every protected route.
 * Sets req.user to the decoded token payload on success.
 *
 * Token payload shape: { id, username, email, orgCode, role }
 */

'use strict'

const jwt = require('jsonwebtoken')
const { runQuery } = require('../db')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Express middleware — rejects requests without a valid Bearer token.
 * On success sets req.user = decoded token payload.
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Access token required' })
    }

    try {
        const user = jwt.verify(token, JWT_SECRET)

        if (!user?.id) {
            return res.status(403).json({ error: 'Invalid token payload' })
        }

        if (user.tokenVersion !== undefined) {
            const rows = await runQuery(
                'SELECT token_version FROM users WHERE id = $1',
                [user.id]
            )

            if (!rows.length || rows[0].token_version !== user.tokenVersion) {
                return res.status(403).json({ error: 'Token has been invalidated' })
            }
        }

        req.user = user
        return next()
    } catch (_err) {
        return res.status(403).json({ error: 'Invalid or expired token' })
    }
}

module.exports = { authenticateToken }
