/**
 * requireRole — Express middleware factory.
 *
 * Enforces role-based access control at the API layer.
 * Must be used AFTER authenticateToken (requires req.user to be set).
 *
 * Usage:
 *   router.delete('/:id', authenticateToken, requireRole('client_admin', 'internal_admin'), handler)
 *
 * Architecture: §4.9 — Backend-First Business Logic
 */

'use strict'

/**
 * Returns an Express middleware that allows only the specified roles.
 * Responds 403 if the caller's role is not in the allowed list.
 *
 * @param {...string} allowedRoles — One or more role strings that may proceed.
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const userRole = req.user?.role
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Insufficient permissions' })
        }
        next()
    }
}

module.exports = { requireRole }
