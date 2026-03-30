/**
 * Audit Route — /api/audit
 *
 * Requirements: audit.requirements.md
 *
 * POST /api/audit/event  — write one audit event for an entity
 * GET  /api/audit/:type/:id — read the full history for one entity
 *
 * All routes require a valid JWT.
 */

'use strict'

const express = require('express')
const router = express.Router()
const { runQuery } = require('../db')
const { authenticateToken } = require('../middleware/auth')

// Every route requires authentication
router.use(authenticateToken)

// ---------------------------------------------------------------------------
// Error logger — writes to error_log table (§16-Error-Handling-Standards.md)
// ---------------------------------------------------------------------------

async function logError(req, source, errorCode, description, context = {}) {
    try {
        await runQuery(
            `INSERT INTO error_log (org_code, user_name, source, error_code, description, context)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                req.user?.orgCode ?? null,
                req.user?.name ?? null,
                source,
                errorCode,
                description,
                JSON.stringify(context),
            ]
        )
    } catch (logErr) {
        console.error('[logError] Failed to write error_log:', logErr.message)
    }
}

// Valid canonical entity types (REQ-AUDIT-BE-F-002)
const VALID_ENTITY_TYPES = new Set([
    'Submission', 'Quote', 'Policy', 'BindingAuthority', 'Party', 'Claim',
    // Allow test entity type in non-production environments
    ...(process.env.NODE_ENV !== 'production' ? ['TestEntity'] : []),
])

// ---------------------------------------------------------------------------
// POST /api/audit/event
// REQ-AUDIT-BE-F-001 through F-007
// ---------------------------------------------------------------------------

router.post('/event', async (req, res) => {
    const { entityType, entityId, action, details } = req.body

    // REQ-AUDIT-BE-F-002 — validate required fields
    if (!entityType || typeof entityType !== 'string') {
        await logError(req, 'POST /api/audit/event', 'ERR_AUDIT_MISSING_ENTITY_TYPE', 'entityType is required')
        return res.status(400).json({ error: 'entityType is required and must be a string' })
    }
    if (entityId === undefined || entityId === null || !Number.isInteger(Number(entityId)) || isNaN(Number(entityId))) {
        await logError(req, 'POST /api/audit/event', 'ERR_AUDIT_INVALID_ENTITY_ID', 'entityId is required and must be an integer')
        return res.status(400).json({ error: 'entityId is required and must be an integer' })
    }
    if (!action || typeof action !== 'string') {
        await logError(req, 'POST /api/audit/event', 'ERR_AUDIT_MISSING_ACTION', 'action is required')
        return res.status(400).json({ error: 'action is required and must be a string' })
    }

    const entityIdInt = Number(entityId)

    // REQ-AUDIT-BE-F-004 — user identity always from JWT
    const userName = req.user.username || req.user.email || 'System'
    const userId = req.user.id ?? null

    try {
        // REQ-AUDIT-BE-F-005 — duplicate-event guard (same entity+action+user within 10 seconds)
        const dupeCheck = await runQuery(
            `SELECT id FROM public.audit_event
             WHERE entity_type = $1 AND entity_id = $2 AND action = $3 AND user_name = $4
               AND created_at > NOW() - INTERVAL '10 seconds'
             LIMIT 1`,
            [entityType, entityIdInt, action, userName]
        )
        if (dupeCheck.length > 0) {
            return res.status(200).json({ skipped: true })
        }

        // REQ-AUDIT-BE-F-003 — store details, defaulting to {}
        const storedDetails = (details && typeof details === 'object') ? details : {}

        // REQ-AUDIT-BE-F-006 — insert and return new row
        const rows = await runQuery(
            `INSERT INTO public.audit_event
                (entity_type, entity_id, action, details, created_by, user_id, user_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING
                id,
                entity_type  AS "entityType",
                entity_id    AS "entityId",
                action,
                details,
                created_by   AS "createdBy",
                user_id      AS "userId",
                user_name    AS "userName",
                created_at   AS "createdAt"`,
            [entityType, entityIdInt, action, JSON.stringify(storedDetails), userName, userId, userName]
        )

        return res.status(201).json(rows[0])
    } catch (err) {
        console.error('[POST /api/audit/event] Error:', err.message)
        await logError(req, 'POST /api/audit/event', 'ERR_AUDIT_EVENT_500', err.message)
        return res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// GET /api/audit/:type/:id
// REQ-AUDIT-BE-F-008 through F-012
// ---------------------------------------------------------------------------

router.get('/:type/:id', async (req, res) => {
    const { type, id } = req.params

    // REQ-AUDIT-BE-F-012 — validate id is a valid integer
    const entityId = Number(id)
    if (!Number.isInteger(entityId) || isNaN(entityId)) {
        await logError(req, 'GET /api/audit/:type/:id', 'ERR_AUDIT_INVALID_ID', `id must be a valid integer: ${id}`, { type, id })
        return res.status(400).json({ error: 'id must be a valid integer' })
    }

    try {
        // REQ-AUDIT-BE-F-009 — ordered oldest first
        const rows = await runQuery(
            `SELECT action, user_name, user_id, created_at, details
             FROM public.audit_event
             WHERE entity_type = $1 AND entity_id = $2
             ORDER BY created_at ASC, id ASC`,
            [type, entityId]
        )

        // REQ-AUDIT-BE-F-010 — shape each event
        const events = rows.map(r => ({
            action: r.action,
            user: r.user_name,
            userId: r.user_id,
            date: r.created_at,
            changes: r.details?.changes ?? undefined,
            details: r.details?.details ?? undefined,
        }))

        // REQ-AUDIT-BE-F-011 — empty array when none
        return res.status(200).json(events)
    } catch (err) {
        console.error(`[GET /api/audit/${type}/${id}] Error:`, err.message)
        await logError(req, 'GET /api/audit/:type/:id', 'ERR_AUDIT_FETCH_500', err.message, { type, id })
        return res.status(500).json({ error: err.message })
    }
})

module.exports = router
