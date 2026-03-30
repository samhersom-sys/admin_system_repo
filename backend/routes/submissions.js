/**
 * Submissions Route — /api/submissions
 *
 * Requirements: submissions.requirements.md
 *
 * All routes require a valid JWT.  Data is scoped by createdByOrgCode
 * from the JWT payload (multi-tenant isolation — §05-Multi-Tenant-Rules.md).
 */

'use strict'

const express = require('express')
const router = express.Router()
const { runQuery, runCommand } = require('../db')
const { authenticateToken } = require('../middleware/auth')

// Every route in this file requires authentication
router.use(authenticateToken)

// ---------------------------------------------------------------------------
// Error logger — writes to error_log table (§16-Error-Handling-Standards.md)
// ---------------------------------------------------------------------------

async function logError(req, source, errorCode, description, context = {}) {
    try {
        await runCommand(
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

// ---------------------------------------------------------------------------
// R01 — GET /api/submissions
// Returns submissions scoped to the caller's org.
// ---------------------------------------------------------------------------

router.get('/', async (req, res) => {
    const orgCode = req.user.orgCode
    const { status } = req.query

    try {
        // Join party to derive createdByOrgType from the creating org's party record
        let sql = `
            SELECT s.*, p.role AS "createdByOrgType"
            FROM submission s
            LEFT JOIN party p ON p.id = s."party_created_id"
            WHERE s."createdByOrgCode" = $1
        `
        const params = [orgCode]

        if (status) {
            sql += ` AND s.status = $2`
            params.push(status)
        }

        sql += ` ORDER BY s."createdDate" DESC`

        const rows = await runQuery(sql, params)
        // Wire hasQuote from real quotes table
        const withLockState = rows.map(r => ({
            ...r,
            hasQuote: false, // populated below
            hasPolicy: false,
        }))
        // Batch-check for quotes in a single query
        if (withLockState.length > 0) {
            const ids = withLockState.map(r => r.id)
            const quotedIds = await runQuery(
                `SELECT DISTINCT submission_id FROM quotes WHERE submission_id = ANY($1::int[])`,
                [ids]
            )
            const quotedSet = new Set(quotedIds.map(r => r.submission_id))
            withLockState.forEach(r => { r.hasQuote = quotedSet.has(r.id) })
        }
        res.json(withLockState)
    } catch (err) {
        console.error('[GET /api/submissions] Error:', err.message)
        await logError(req, 'GET /api/submissions', 'ERR_SUB_FETCH_500', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// R02 — POST /api/submissions
// Creates a new submission. Forces status and createdByOrgCode from JWT.
// Generates the reference server-side (SUB-{ORG}-{YYYYMMDD}-{NNN}).
// Applies default expiry of inception + 1 year when not supplied.
// ---------------------------------------------------------------------------

router.post('/', async (req, res) => {
    const orgCode = req.user.orgCode
    const {
        submissionType,
        insured,
        insuredId,
        placingBroker,
        placingBrokerName,
        placingBrokerId,
        contractType,
        inceptionDate,
        expiryDate,
        renewalDate,
        createdDate,
        createdBy,
    } = req.body

    // R02: insured name is required
    if (!insured) {
        await logError(req, 'POST /api/submissions', 'ERR_SUB_CREATE_MISSING_INSURED', 'insured is required')
        return res.status(400).json({ error: 'insured (insured name) is required' })
    }

    try {
        // R02a: Generate reference server-side — SUB-{ORG}-{YYYYMMDD}-{NNN}
        // Note: COUNT + INSERT is not atomic; a sequence column per org+date
        // (OQ-044) would fully eliminate collisions under high concurrency.
        const today = new Date()
        const isoDate = today.toISOString().slice(0, 10)
        const datePart = isoDate.replace(/-/g, '')
        const orgUpper = orgCode.toUpperCase()
        const refPrefix = `SUB-${orgUpper}-${datePart}-`
        const countResult = await runQuery(
            `SELECT COUNT(*) AS cnt FROM submission WHERE reference LIKE $1`,
            [`${refPrefix}%`]
        )
        const seq = Number(countResult[0].cnt) + 1
        const generatedReference = `${refPrefix}${String(seq).padStart(3, '0')}`

        // R02b: Default expiry to inception + 1 year when not supplied
        let resolvedExpiry = expiryDate ?? null
        if (!resolvedExpiry && inceptionDate) {
            const d = new Date(inceptionDate)
            d.setFullYear(d.getFullYear() + 1)
            resolvedExpiry = d.toISOString().slice(0, 10)
        }

        const rows = await runCommand(
            `INSERT INTO submission (
        reference,
        "submissionType",
        insured,
        "insuredId",
        "placingBroker",
        "placingBrokerName",
        "brokerId",
        "contractType",
        "inceptionDate",
        "expiryDate",
        "renewalDate",
        status,
        "createdDate",
        "createdBy",
        "createdByOrgCode"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
            [
                generatedReference,
                submissionType ?? 'Submission',
                insured,
                insuredId ?? null,
                placingBroker ?? null,
                placingBrokerName ?? null,
                placingBrokerId ?? null,
                contractType ?? null,
                inceptionDate ?? null,
                resolvedExpiry,
                renewalDate ?? null,
                'Created',          // R02: always 'Created'
                createdDate ?? new Date().toISOString(),
                createdBy ?? null,
                orgCode,            // R02: always from JWT — ignores caller value
            ]
        )

        if (!rows || rows.length === 0) {
            await logError(req, 'POST /api/submissions', 'ERR_SUB_CREATE_500', 'Insert returned no rows')
            return res.status(500).json({ error: 'Insert returned no rows' })
        }

        res.status(201).json(rows[0])
    } catch (err) {
        console.error('[POST /api/submissions] Error:', err.message)
        await logError(req, 'POST /api/submissions', 'ERR_SUB_CREATE_500', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// R03 — GET /api/submissions/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req, res) => {
    const orgCode = req.user.orgCode
    const id = Number(req.params.id)

    try {
        // Join party to derive createdByOrgType from the creating org's party record (OQ-046)
        const rows = await runQuery(
            `SELECT s.*, p.role AS "createdByOrgType"
             FROM submission s
             LEFT JOIN party p ON p.id = s."party_created_id"
             WHERE s.id = $1`,
            [id]
        )

        if (!rows || rows.length === 0) {
            await logError(req, 'GET /api/submissions/:id', 'ERR_SUB_NOT_FOUND', 'Submission not found', { id })
            return res.status(404).json({ error: 'Submission not found' })
        }

        const submission = rows[0]

        // R03: 403 if belongs to different org
        if (submission.createdByOrgCode !== orgCode) {
            await logError(req, 'GET /api/submissions/:id', 'ERR_SUB_FORBIDDEN', 'Access denied', { id })
            return res.status(403).json({ error: 'Access denied' })
        }

        // TODO: replace with real subqueries when quote and policy tables exist
        submission.hasQuote = false
        submission.hasPolicy = false

        res.json(submission)
    } catch (err) {
        console.error('[GET /api/submissions/:id] Error:', err.message)
        await logError(req, 'GET /api/submissions/:id', 'ERR_SUB_FETCH_500', err.message, { id })
        res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// R04 — PUT /api/submissions/:id
// Updates editable fields only. Strips protected fields.
// ---------------------------------------------------------------------------

router.put('/:id', async (req, res) => {
    const orgCode = req.user.orgCode
    const id = Number(req.params.id)

    // R04: fetch and validate ownership first
    let existing
    try {
        const rows = await runQuery(`SELECT * FROM submission WHERE id = $1`, [id])
        if (!rows || rows.length === 0) {
            await logError(req, 'PUT /api/submissions/:id', 'ERR_SUB_NOT_FOUND', 'Submission not found', { id })
            return res.status(404).json({ error: 'Submission not found' })
        }
        existing = rows[0]
    } catch (err) {
        await logError(req, 'PUT /api/submissions/:id', 'ERR_SUB_FETCH_500', err.message, { id })
        return res.status(500).json({ error: err.message })
    }

    if (existing.createdByOrgCode !== orgCode) {
        await logError(req, 'PUT /api/submissions/:id', 'ERR_SUB_FORBIDDEN', 'Access denied', { id })
        return res.status(403).json({ error: 'Access denied' })
    }

    // TODO: enforce cascade lock when quote/policy tables exist:
    //   if (existing.hasQuote || existing.hasPolicy) return res.status(409).json({ error: 'Locked' })

    // R04: only allow editable fields
    // contractType is IMMUTABLE — it is intentionally excluded (REQ-SUB-VIEW-S-002)
    const {
        insured,
        insuredId,
        inceptionDate,
        expiryDate,
        renewalDate,
        placingBroker,
        placingBrokerId,
        placingBrokerName,
    } = req.body

    try {
        const rows = await runCommand(
            `UPDATE submission SET
        insured            = COALESCE($1, insured),
        "insuredId"        = COALESCE($2, "insuredId"),
        "inceptionDate"    = COALESCE($3, "inceptionDate"),
        "expiryDate"       = COALESCE($4, "expiryDate"),
        "renewalDate"      = COALESCE($5, "renewalDate"),
        "placingBroker"    = COALESCE($6, "placingBroker"),
        "brokerId"         = COALESCE($7, "brokerId"),
        "placingBrokerName" = COALESCE($8, "placingBrokerName")
      WHERE id = $9
      RETURNING *`,
            [
                insured ?? null,
                insuredId ?? null,
                inceptionDate ?? null,
                expiryDate ?? null,
                renewalDate ?? null,
                placingBroker ?? null,
                placingBrokerId ?? null,
                placingBrokerName ?? null,
                id,
            ]
        )
        res.json(rows[0])
    } catch (err) {
        console.error('[PUT /api/submissions/:id] Error:', err.message)
        await logError(req, 'PUT /api/submissions/:id', 'ERR_SUB_UPDATE_500', err.message, { id })
        res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// R05 — POST /api/submissions/:id/submit
// Transitions status from any state to 'In Review'.
// ---------------------------------------------------------------------------

router.post('/:id/submit', async (req, res) => {
    const orgCode = req.user.orgCode
    const id = Number(req.params.id)

    try {
        const rows = await runQuery(`SELECT * FROM submission WHERE id = $1`, [id])
        if (!rows || rows.length === 0) {
            await logError(req, 'POST /api/submissions/:id/submit', 'ERR_SUB_NOT_FOUND', 'Submission not found', { id })
            return res.status(404).json({ error: 'Submission not found' })
        }
        if (rows[0].createdByOrgCode !== orgCode) {
            await logError(req, 'POST /api/submissions/:id/submit', 'ERR_SUB_FORBIDDEN', 'Access denied', { id })
            return res.status(403).json({ error: 'Access denied' })
        }

        const updated = await runCommand(
            `UPDATE submission SET status = 'In Review' WHERE id = $1 RETURNING *`,
            [id]
        )
        res.json(updated[0])
    } catch (err) {
        console.error('[POST /api/submissions/:id/submit] Error:', err.message)
        await logError(req, 'POST /api/submissions/:id/submit', 'ERR_SUB_SUBMIT_500', err.message, { id })
        res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// R06 — POST /api/submissions/:id/decline
// Transitions status to 'Declined'. Accepts { reasonCode, reasonText }.
// Reason is stored as an audit event. Dedicated decline_reason column
// is deferred until the schema extension milestone.
// ---------------------------------------------------------------------------

router.post('/:id/decline', async (req, res) => {
    const orgCode = req.user.orgCode
    const id = Number(req.params.id)
    const { reasonCode, reasonText } = req.body

    if (!reasonCode) {
        await logError(req, 'POST /api/submissions/:id/decline', 'ERR_SUB_DECLINE_MISSING_REASON', 'reasonCode is required', { id })
        return res.status(400).json({ error: 'reasonCode is required' })
    }

    try {
        const rows = await runQuery(`SELECT * FROM submission WHERE id = $1`, [id])
        if (!rows || rows.length === 0) {
            await logError(req, 'POST /api/submissions/:id/decline', 'ERR_SUB_NOT_FOUND', 'Submission not found', { id })
            return res.status(404).json({ error: 'Submission not found' })
        }
        if (rows[0].createdByOrgCode !== orgCode) {
            await logError(req, 'POST /api/submissions/:id/decline', 'ERR_SUB_FORBIDDEN', 'Access denied', { id })
            return res.status(403).json({ error: 'Access denied' })
        }

        const updated = await runCommand(
            `UPDATE submission SET status = 'Declined' WHERE id = $1 RETURNING *`,
            [id]
        )

        // Best-effort audit entry — failure does not affect the decline outcome
        try {
            await runCommand(
                `INSERT INTO public.audit_event (entity_type, entity_id, action, details, created_by, user_id, user_name)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['Submission', id, 'Submission Declined', JSON.stringify({ reasonCode, reasonText: reasonText ?? '' }),
                    req.user.email ?? '', req.user.id ?? null, req.user.username ?? req.user.email ?? '']
            )
        } catch (_auditErr) { /* silently ignore audit failures */ }

        res.json(updated[0])
    } catch (err) {
        console.error('[POST /api/submissions/:id/decline] Error:', err.message)
        await logError(req, 'POST /api/submissions/:id/decline', 'ERR_SUB_DECLINE_500', err.message, { id })
        res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// R09 — GET /api/submissions/:id/related
// Returns all submissions linked to the parent submission.
// ---------------------------------------------------------------------------

router.get('/:id/related', async (req, res) => {
    const orgCode = req.user.orgCode
    const id = Number(req.params.id)

    try {
        const parentRows = await runQuery(`SELECT * FROM submission WHERE id = $1`, [id])
        if (!parentRows || parentRows.length === 0) {
            await logError(req, 'GET /api/submissions/:id/related', 'ERR_SUB_NOT_FOUND', 'Submission not found', { id })
            return res.status(404).json({ error: 'Submission not found' })
        }
        if (parentRows[0].createdByOrgCode !== orgCode) {
            await logError(req, 'GET /api/submissions/:id/related', 'ERR_SUB_FORBIDDEN', 'Access denied', { id })
            return res.status(403).json({ error: 'Access denied' })
        }

        const rows = await runQuery(
            `SELECT s.*
             FROM submission_related sr
             JOIN submission s
               ON s.id = CASE
                    WHEN sr.submission_id = $1 THEN sr.related_submission_id
                    ELSE sr.submission_id
                  END
             WHERE sr.submission_id = $1 OR sr.related_submission_id = $1
             ORDER BY s."createdDate" DESC`,
            [id]
        )

        res.json(rows)
    } catch (err) {
        console.error('[GET /api/submissions/:id/related] Error:', err.message)
        await logError(req, 'GET /api/submissions/:id/related', 'ERR_SUB_RELATED_FETCH_500', err.message, { id })
        res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// R09 — POST /api/submissions/:id/related
// Creates a related-submission link.
// ---------------------------------------------------------------------------

router.post('/:id/related', async (req, res) => {
    const orgCode = req.user.orgCode
    const id = Number(req.params.id)
    const relatedSubmissionId = Number(req.body.relatedSubmissionId)

    if (!req.body.relatedSubmissionId) {
        await logError(req, 'POST /api/submissions/:id/related', 'ERR_SUB_RELATED_MISSING_ID', 'relatedSubmissionId is required', { id })
        return res.status(400).json({ error: 'relatedSubmissionId is required' })
    }

    if (id === relatedSubmissionId) {
        await logError(req, 'POST /api/submissions/:id/related', 'ERR_SUB_RELATED_SELF_LINK', 'A submission cannot be linked to itself', { id, relatedSubmissionId })
        return res.status(400).json({ error: 'A submission cannot be linked to itself' })
    }

    try {
        const parentRows = await runQuery(`SELECT * FROM submission WHERE id = $1`, [id])
        if (!parentRows || parentRows.length === 0) {
            await logError(req, 'POST /api/submissions/:id/related', 'ERR_SUB_NOT_FOUND', 'Submission not found', { id })
            return res.status(404).json({ error: 'Submission not found' })
        }
        if (parentRows[0].createdByOrgCode !== orgCode) {
            await logError(req, 'POST /api/submissions/:id/related', 'ERR_SUB_FORBIDDEN', 'Access denied', { id })
            return res.status(403).json({ error: 'Access denied' })
        }

        const relatedRows = await runQuery(`SELECT * FROM submission WHERE id = $1`, [relatedSubmissionId])
        if (!relatedRows || relatedRows.length === 0) {
            await logError(req, 'POST /api/submissions/:id/related', 'ERR_SUB_RELATED_NOT_FOUND', 'Related submission not found', { id, relatedSubmissionId })
            return res.status(404).json({ error: 'Related submission not found' })
        }
        if (relatedRows[0].createdByOrgCode !== orgCode) {
            await logError(req, 'POST /api/submissions/:id/related', 'ERR_SUB_FORBIDDEN', 'Access denied', { id, relatedSubmissionId })
            return res.status(403).json({ error: 'Access denied' })
        }

        const leftId = Math.min(id, relatedSubmissionId)
        const rightId = Math.max(id, relatedSubmissionId)

        await runCommand(
            `INSERT INTO submission_related (submission_id, related_submission_id, created_by)
             VALUES ($1, $2, $3)
             ON CONFLICT ((LEAST(submission_id, related_submission_id)), (GREATEST(submission_id, related_submission_id))) DO NOTHING`,
            [leftId, rightId, req.user?.name ?? null]
        )

        res.status(201).json(relatedRows[0])
    } catch (err) {
        console.error('[POST /api/submissions/:id/related] Error:', err.message)
        await logError(req, 'POST /api/submissions/:id/related', 'ERR_SUB_RELATED_CREATE_500', err.message, { id, relatedSubmissionId })
        res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// R09 — DELETE /api/submissions/:id/related/:relatedId
// Removes a related-submission link.
// ---------------------------------------------------------------------------

router.delete('/:id/related/:relatedId', async (req, res) => {
    const orgCode = req.user.orgCode
    const id = Number(req.params.id)
    const relatedId = Number(req.params.relatedId)

    try {
        const parentRows = await runQuery(`SELECT * FROM submission WHERE id = $1`, [id])
        if (!parentRows || parentRows.length === 0) {
            await logError(req, 'DELETE /api/submissions/:id/related/:relatedId', 'ERR_SUB_NOT_FOUND', 'Submission not found', { id, relatedId })
            return res.status(404).json({ error: 'Submission not found' })
        }
        if (parentRows[0].createdByOrgCode !== orgCode) {
            await logError(req, 'DELETE /api/submissions/:id/related/:relatedId', 'ERR_SUB_FORBIDDEN', 'Access denied', { id, relatedId })
            return res.status(403).json({ error: 'Access denied' })
        }

        const deletedRows = await runCommand(
            `DELETE FROM submission_related
             WHERE (submission_id = $1 AND related_submission_id = $2)
                OR (submission_id = $2 AND related_submission_id = $1)
             RETURNING id`,
            [id, relatedId]
        )

        if (!deletedRows || deletedRows.length === 0) {
            await logError(req, 'DELETE /api/submissions/:id/related/:relatedId', 'ERR_SUB_RELATED_NOT_FOUND', 'Related submission link not found', { id, relatedId })
            return res.status(404).json({ error: 'Related submission link not found' })
        }

        res.status(204).send()
    } catch (err) {
        console.error('[DELETE /api/submissions/:id/related/:relatedId] Error:', err.message)
        await logError(req, 'DELETE /api/submissions/:id/related/:relatedId', 'ERR_SUB_RELATED_DELETE_500', err.message, { id, relatedId })
        res.status(500).json({ error: err.message })
    }
})

module.exports = router
