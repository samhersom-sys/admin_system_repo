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

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Express middleware — rejects requests without a valid Bearer token.
 * On success sets req.user = decoded token payload.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Access token required' })
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' })
        }
        req.user = user
        next()
    })
}

module.exports = { authenticateToken }
