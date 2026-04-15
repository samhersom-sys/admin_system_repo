/**
 * Quotes Route â€” /api/quotes
 *
 * Requirements: quotes.requirements.md
 *
 * All routes require a valid JWT.  Data is scoped by created_by_org_code
 * from the JWT payload (multi-tenant isolation â€” Â§05-Multi-Tenant-Rules.md).
 *
 * Status workflow: Draft â†’ Quoted â†’ Bound | Declined
 */

'use strict'

const express = require('express')
const router = express.Router()
const { runQuery, runCommand } = require('../db')
const { authenticateToken } = require('../middleware/auth')

// Every route requires authentication
router.use(authenticateToken)

// ---------------------------------------------------------------------------
// Error logger â€” writes to error_log table (Â§16-Error-Handling-Standards.md)
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
// Reference generator: QUO-{ORG}-{YYYYMMDD}-{NNN}
// ---------------------------------------------------------------------------

async function generateReference(orgCode) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `QUO-${orgCode.toUpperCase()}-${datePart}-`
    const rows = await runQuery(
        `SELECT reference FROM quotes WHERE reference LIKE $1 ORDER BY reference DESC LIMIT 1`,
        [`${prefix}%`]
    )
    let seq = 1
    if (rows.length > 0) {
        const last = rows[0].reference
        const lastSeq = parseInt(last.slice(-3), 10)
        if (!isNaN(lastSeq)) seq = lastSeq + 1
    }
    return `${prefix}${String(seq).padStart(3, '0')}`
}

// ---------------------------------------------------------------------------
// R01 â€” GET /api/quotes
// Returns quotes scoped to the caller's org, with optional filters.
// ---------------------------------------------------------------------------

router.get('/', async (req, res) => {
    const orgCode = req.user.orgCode
    const { submission_id, status, date_basis, date_from, date_to } = req.query

    try {
        let sql = `SELECT * FROM quotes WHERE created_by_org_code = $1 AND deleted_at IS NULL`
        const params = [orgCode]

        if (submission_id) {
            params.push(parseInt(submission_id, 10))
            sql += ` AND submission_id = $${params.length}`
        }
        if (status) {
            params.push(status)
            sql += ` AND status = $${params.length}`
        }

        // Date range filtering â€” maps date_basis label to a column name
        if (date_basis && date_from && date_to) {
            const DATE_COLUMN_MAP = {
                'Created Date': 'created_date',
                'Inception Date': 'inception_date',
                'Expiry Date': 'expiry_date',
            }
            const col = DATE_COLUMN_MAP[date_basis]
            if (col) {
                params.push(date_from, date_to)
                sql += ` AND ${col}::date >= $${params.length - 1}::date AND ${col}::date <= $${params.length}::date`
            }
        }

        sql += ` ORDER BY created_date DESC`

        const rows = await runQuery(sql, params)
        res.json(rows)
    } catch (err) {
        console.error('[GET /api/quotes] Error:', err.message)
        await logError(req, 'GET /api/quotes', 'ERR_QUOTES_FETCH_500', err.message, {})
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R02 â€” POST /api/quotes
// Creates a new quote. Forces status to Draft and created_by_org_code from JWT.
// Generates reference server-side. Defaults expiry to inception + 365 days.
// ---------------------------------------------------------------------------

router.post('/', async (req, res) => {
    const orgCode = req.user.orgCode
    const {
        insured,
        insured_id,
        submission_id,
        business_type,
        inception_date,
        expiry_date,
        inception_time,
        expiry_time,
        quote_currency,
        created_by,
        year_of_account,
        lta_applicable,
        lta_start_date,
        lta_start_time,
        lta_expiry_date,
        lta_expiry_time,
        contract_type,
        method_of_placement,
        unique_market_reference,
        renewable_indicator,
        renewal_date,
        renewal_status,
    } = req.body

    if (!insured || !insured.trim()) {
        await logError(req, 'POST /api/quotes', 'ERR_QUOTE_CREATE_MISSING_INSURED', 'insured is required', {})
        return res.status(400).json({ message: 'insured is required' })
    }

    // Default expiry to inception + 365 days
    let resolvedExpiry = expiry_date
    if (!resolvedExpiry && inception_date) {
        try {
            const d = new Date(inception_date)
            d.setDate(d.getDate() + 365)
            resolvedExpiry = d.toISOString().slice(0, 10)
        } catch (_) {
            // non-fatal â€” leave null
        }
    }

    try {
        const reference = await generateReference(orgCode)

        const rows = await runQuery(
            `INSERT INTO quotes (
                reference, submission_id, insured, insured_id, status,
                business_type, inception_date, expiry_date, inception_time, expiry_time,
                quote_currency, created_date, created_by, created_by_org_code,
                year_of_account, lta_applicable, lta_start_date, lta_start_time,
                lta_expiry_date, lta_expiry_time, contract_type, method_of_placement,
                unique_market_reference, renewable_indicator, renewal_date, renewal_status
            ) VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,$8,$9,$10,NOW(),$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
            RETURNING *`,
            [
                reference,
                submission_id ? parseInt(submission_id, 10) : null,
                insured.trim(),
                insured_id || null,
                business_type || null,
                inception_date || null,
                resolvedExpiry || null,
                inception_time || '00:00:00',
                expiry_time || '23:59:59',
                quote_currency || 'USD',
                created_by || req.user.name || null,
                orgCode,
                year_of_account || null,
                lta_applicable === true || lta_applicable === 'true' ? true : false,
                lta_start_date || null,
                lta_start_time || '00:00:00',
                lta_expiry_date || null,
                lta_expiry_time || '23:59:59',
                contract_type || null,
                method_of_placement || null,
                unique_market_reference || null,
                renewable_indicator || 'No',
                renewal_date || null,
                renewal_status || null,
            ]
        )
        res.status(201).json(rows[0])
    } catch (err) {
        console.error('[POST /api/quotes] Error:', err.message)
        await logError(req, 'POST /api/quotes', 'ERR_QUOTE_CREATE_500', err.message, {})
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R03 â€” GET /api/quotes/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id } = req.params

    try {
        const rows = await runQuery('SELECT * FROM quotes WHERE id = $1', [parseInt(id, 10)])
        if (rows.length === 0) {
            await logError(req, 'GET /api/quotes/:id', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            return res.status(404).json({ message: 'Quote not found' })
        }
        if (rows[0].created_by_org_code !== orgCode) {
            await logError(req, 'GET /api/quotes/:id', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            return res.status(403).json({ message: 'Forbidden' })
        }
        res.json(rows[0])
    } catch (err) {
        console.error('[GET /api/quotes/:id] Error:', err.message)
        await logError(req, 'GET /api/quotes/:id', 'ERR_QUOTE_FETCH_500', err.message, { id })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R04 â€” PUT /api/quotes/:id
// Updates mutable fields. Strips immutable fields. Blocks edits on Bound/Declined.
// ---------------------------------------------------------------------------

router.put('/:id', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id } = req.params

    try {
        const rows = await runQuery('SELECT * FROM quotes WHERE id = $1', [parseInt(id, 10)])
        if (rows.length === 0) {
            await logError(req, 'PUT /api/quotes/:id', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            return res.status(404).json({ message: 'Quote not found' })
        }
        const quote = rows[0]
        if (quote.created_by_org_code !== orgCode) {
            await logError(req, 'PUT /api/quotes/:id', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            return res.status(403).json({ message: 'Forbidden' })
        }
        if (['Bound', 'Declined'].includes(quote.status)) {
            await logError(req, 'PUT /api/quotes/:id', 'ERR_QUOTE_EDIT_LOCKED', 'Cannot edit a Bound or Declined quote', { id, status: quote.status })
            return res.status(400).json({ message: 'Cannot edit a Bound or Declined quote' })
        }

        // Strip immutable fields
        const {
            status: _s,
            reference: _r,
            created_by_org_code: _org,
            created_by: _cb,
            created_date: _cd,
            id: _id,
            _forceStatus, // test helper â€” ignored
            ...mutable
        } = req.body

        // Build SET clause dynamically from mutable keys
        const keys = Object.keys(mutable).filter((k) => mutable[k] !== undefined)
        if (keys.length === 0) {
            return res.json(quote)
        }

        // Coerce empty strings to null for date/time columns (PostgreSQL rejects '')
        const DATE_TIME_COLS = new Set([
            'inception_date', 'expiry_date', 'inception_time', 'expiry_time',
            'lta_start_date', 'lta_expiry_date', 'lta_start_time', 'lta_expiry_time',
            'renewal_date', 'renewal_time',
        ])
        for (const k of keys) {
            if (DATE_TIME_COLS.has(k) && mutable[k] === '') {
                mutable[k] = null
            }
        }

        const updates = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ')
        const values = keys.map((k) => mutable[k])

        const updated = await runQuery(
            `UPDATE quotes SET ${updates} WHERE id = $1 RETURNING *`,
            [parseInt(id, 10), ...values]
        )
        res.json(updated[0])
    } catch (err) {
        console.error('[PUT /api/quotes/:id] Error:', err.message)
        await logError(req, 'PUT /api/quotes/:id', 'ERR_QUOTE_UPDATE_500', err.message, { id })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R05 â€” POST /api/quotes/:id/quote
// Transitions status from Draft â†’ Quoted.
// ---------------------------------------------------------------------------

router.post('/:id/quote', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id } = req.params

    try {
        const rows = await runQuery('SELECT * FROM quotes WHERE id = $1', [parseInt(id, 10)])
        if (rows.length === 0) {
            await logError(req, 'POST /api/quotes/:id/quote', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            return res.status(404).json({ message: 'Quote not found' })
        }
        const quote = rows[0]
        if (quote.created_by_org_code !== orgCode) {
            await logError(req, 'POST /api/quotes/:id/quote', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            return res.status(403).json({ message: 'Forbidden' })
        }
        if (quote.status !== 'Draft') {
            await logError(req, 'POST /api/quotes/:id/quote', 'ERR_QUOTE_INVALID_TRANSITION', 'Only a Draft quote may be marked as Quoted', { id, status: quote.status })
            return res.status(400).json({ message: 'Only a Draft quote may be marked as Quoted' })
        }

        const updated = await runQuery(
            `UPDATE quotes SET status = 'Quoted' WHERE id = $1 RETURNING *`,
            [parseInt(id, 10)]
        )
        res.json(updated[0])
    } catch (err) {
        console.error('[POST /api/quotes/:id/quote] Error:', err.message)
        await logError(req, 'POST /api/quotes/:id/quote', 'ERR_QUOTE_MARK_500', err.message, { id })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R06 â€” POST /api/quotes/:id/bind
// Transitions status from Quoted â†’ Bound.
// ---------------------------------------------------------------------------

router.post('/:id/bind', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id } = req.params

    try {
        const rows = await runQuery('SELECT * FROM quotes WHERE id = $1', [parseInt(id, 10)])
        if (rows.length === 0) {
            await logError(req, 'POST /api/quotes/:id/bind', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            return res.status(404).json({ message: 'Quote not found' })
        }
        const quote = rows[0]
        if (quote.created_by_org_code !== orgCode) {
            await logError(req, 'POST /api/quotes/:id/bind', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            return res.status(403).json({ message: 'Forbidden' })
        }
        if (quote.status !== 'Quoted') {
            await logError(req, 'POST /api/quotes/:id/bind', 'ERR_QUOTE_INVALID_TRANSITION', 'Only a Quoted quote may be bound', { id, status: quote.status })
            return res.status(400).json({ message: 'Only a Quoted quote may be bound' })
        }

        const updated = await runQuery(
            `UPDATE quotes SET status = 'Bound' WHERE id = $1 RETURNING *`,
            [parseInt(id, 10)]
        )

        // Auto-decline all other non-terminal quotes for the same submission
        if (quote.submission_id) {
            await runQuery(
                `UPDATE quotes
                 SET status = 'Declined',
                     payload = payload || $3::jsonb
                 WHERE submission_id = $1
                   AND id != $2
                   AND status NOT IN ('Bound', 'Declined')
                   AND deleted_at IS NULL`,
                [
                    quote.submission_id,
                    parseInt(id, 10),
                    JSON.stringify({
                        declineReasonCode: 'auto',
                        declineReasonText: 'Automatically declined when another quote was bound',
                    }),
                ]
            )
        }

        res.json(updated[0])
    } catch (err) {
        console.error('[POST /api/quotes/:id/bind] Error:', err.message)
        await logError(req, 'POST /api/quotes/:id/bind', 'ERR_QUOTE_BIND_500', err.message, { id })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R07 â€” POST /api/quotes/:id/decline
// Transitions status to Declined (from Draft or Quoted). Requires reasonCode.
// ---------------------------------------------------------------------------

router.post('/:id/decline', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id } = req.params
    const { reasonCode, reasonText } = req.body

    if (!reasonCode) {
        await logError(req, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_DECLINE_MISSING_REASON', 'reasonCode is required', { id })
        return res.status(400).json({ message: 'reasonCode is required' })
    }

    try {
        const rows = await runQuery('SELECT * FROM quotes WHERE id = $1', [parseInt(id, 10)])
        if (rows.length === 0) {
            await logError(req, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            return res.status(404).json({ message: 'Quote not found' })
        }
        const quote = rows[0]
        if (quote.created_by_org_code !== orgCode) {
            await logError(req, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            return res.status(403).json({ message: 'Forbidden' })
        }
        if (quote.status === 'Bound') {
            await logError(req, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_INVALID_TRANSITION', 'Cannot decline a Bound quote', { id, status: quote.status })
            return res.status(400).json({ message: 'Cannot decline a Bound quote' })
        }

        const updated = await runQuery(
            `UPDATE quotes
             SET status = 'Declined',
                 payload = payload || $2::jsonb
             WHERE id = $1
             RETURNING *`,
            [
                parseInt(id, 10),
                JSON.stringify({ declineReasonCode: reasonCode, declineReasonText: reasonText || '' }),
            ]
        )
        res.json(updated[0])
    } catch (err) {
        console.error('[POST /api/quotes/:id/decline] Error:', err.message)
        await logError(req, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_DECLINE_500', err.message, { id })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R08 â€” DELETE /api/quotes/:id
// Soft-deletes a quote by setting deleted_at. Only Draft quotes may be deleted.
// ---------------------------------------------------------------------------

router.delete('/:id', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id } = req.params

    try {
        const rows = await runQuery('SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL', [parseInt(id, 10)])
        if (rows.length === 0) {
            await logError(req, 'DELETE /api/quotes/:id', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            return res.status(404).json({ message: 'Quote not found' })
        }
        const quote = rows[0]
        if (quote.created_by_org_code !== orgCode) {
            await logError(req, 'DELETE /api/quotes/:id', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            return res.status(403).json({ message: 'Forbidden' })
        }
        if (quote.status !== 'Draft') {
            await logError(req, 'DELETE /api/quotes/:id', 'ERR_QUOTE_DELETE_LOCKED', 'Only Draft quotes may be deleted', { id, status: quote.status })
            return res.status(400).json({ message: 'Only Draft quotes may be deleted' })
        }

        await runQuery(
            `UPDATE quotes SET deleted_at = NOW() WHERE id = $1`,
            [parseInt(id, 10)]
        )
        res.status(204).send()
    } catch (err) {
        console.error('[DELETE /api/quotes/:id] Error:', err.message)
        await logError(req, 'DELETE /api/quotes/:id', 'ERR_QUOTE_DELETE_500', err.message, { id })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R09 â€” GET /api/quotes/:id/audit
// Returns all audit events for the specified quote, ordered by time ascending.
// Only accessible to users whose org created the quote.
// ---------------------------------------------------------------------------

router.get('/:id/audit', async (req, res) => {
    const { id } = req.params
    const orgCode = req.user.orgCode
    try {
        const rows = await runQuery(
            'SELECT id FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (rows.length === 0) return res.status(404).json({ message: 'Quote not found' })
        const quoteRow = await runQuery('SELECT created_by_org_code FROM quotes WHERE id = $1', [parseInt(id, 10)])
        if (quoteRow[0].created_by_org_code !== orgCode) return res.status(403).json({ message: 'Forbidden' })
        const events = await runQuery(
            `SELECT action, user_name, user_id, created_at, details
             FROM public.audit_event
             WHERE entity_type = 'Quote' AND entity_id = $1
             ORDER BY created_at ASC, id ASC`,
            [parseInt(id, 10)]
        )
        return res.status(200).json(events.map((e) => ({
            action: e.action,
            user: e.user_name,
            userId: e.user_id,
            date: e.created_at,
            details: e.details?.details ?? undefined,
            changes: e.details?.changes ?? undefined,
        })))
    } catch (err) {
        console.error('[GET /api/quotes/:id/audit] Error:', err.message)
        await logError(req, 'GET /api/quotes/:id/audit', 'ERR_QUOTE_AUDIT_GET_500', err.message, { id })
        return res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R10 â€” POST /api/quotes/:id/audit
// Records a new audit event for the specified quote.
// User identity is read exclusively from the JWT (req.user); body user fields
// are ignored to prevent spoofing.
// ---------------------------------------------------------------------------

router.post('/:id/audit', async (req, res) => {
    const { id } = req.params
    const orgCode = req.user.orgCode
    const { action, details } = req.body
    if (!action || typeof action !== 'string') {
        return res.status(400).json({ message: 'action is required' })
    }
    try {
        const rows = await runQuery(
            'SELECT id FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (rows.length === 0) return res.status(404).json({ message: 'Quote not found' })
        const quoteRow = await runQuery('SELECT created_by_org_code FROM quotes WHERE id = $1', [parseInt(id, 10)])
        if (quoteRow[0].created_by_org_code !== orgCode) return res.status(403).json({ message: 'Forbidden' })
        const userName = req.user.username || req.user.email || 'System'
        const userId = req.user.id ?? null
        const storedDetails = (details && typeof details === 'object') ? details : {}
        const inserted = await runQuery(
            `INSERT INTO public.audit_event
                (entity_type, entity_id, action, details, created_by, user_id, user_name)
             VALUES ('Quote', $1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [parseInt(id, 10), action, JSON.stringify(storedDetails), userName, userId, userName]
        )
        return res.status(201).json(inserted[0])
    } catch (err) {
        console.error('[POST /api/quotes/:id/audit] Error:', err.message)
        await logError(req, 'POST /api/quotes/:id/audit', 'ERR_QUOTE_AUDIT_POST_500', err.message, { id })
        return res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R11 â€” POST /api/quotes/:id/copy
// Creates a Draft copy of the quote with a new reference. All editable fields
// are duplicated; status is forced to Draft; created_date is set to NOW().
// ---------------------------------------------------------------------------

router.post('/:id/copy', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id } = req.params

    try {
        const rows = await runQuery(
            'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (rows.length === 0) {
            await logError(req, 'POST /api/quotes/:id/copy', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            return res.status(404).json({ message: 'Quote not found' })
        }
        const original = rows[0]
        if (original.created_by_org_code !== orgCode) {
            await logError(req, 'POST /api/quotes/:id/copy', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            return res.status(403).json({ message: 'Forbidden' })
        }

        const reference = await generateReference(orgCode)
        const result = await runQuery(
            `INSERT INTO quotes (
                reference, submission_id, insured, insured_id, status,
                business_type, inception_date, expiry_date, inception_time, expiry_time,
                quote_currency, created_date, created_by, created_by_org_code,
                year_of_account, lta_applicable, lta_start_date, lta_start_time,
                lta_expiry_date, lta_expiry_time, contract_type, method_of_placement,
                unique_market_reference, renewable_indicator, renewal_date, renewal_status
            ) VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,$8,$9,$10,NOW(),$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
            RETURNING *`,
            [
                reference,
                original.submission_id,
                original.insured,
                original.insured_id,
                original.business_type,
                original.inception_date,
                original.expiry_date,
                original.inception_time,
                original.expiry_time,
                original.quote_currency,
                req.user.name || original.created_by,
                orgCode,
                original.year_of_account,
                original.lta_applicable,
                original.lta_start_date,
                original.lta_start_time,
                original.lta_expiry_date,
                original.lta_expiry_time,
                original.contract_type,
                original.method_of_placement,
                original.unique_market_reference,
                original.renewable_indicator,
                original.renewal_date,
                original.renewal_status,
            ]
        )
        res.status(201).json(result[0])
    } catch (err) {
        console.error('[POST /api/quotes/:id/copy] Error:', err.message)
        await logError(req, 'POST /api/quotes/:id/copy', 'ERR_QUOTE_COPY_500', err.message, { id })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R12 â€” GET /api/quotes/:id/sections
// Returns all non-deleted sections for the quote, ordered by id ascending.
// ---------------------------------------------------------------------------

router.get('/:id/sections', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id } = req.params
    try {
        const quoteRows = await runQuery(
            'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (quoteRows.length === 0) return res.status(404).json({ message: 'Quote not found' })
        if (quoteRows[0].created_by_org_code !== orgCode) return res.status(403).json({ message: 'Forbidden' })
        const sections = await runQuery(
            'SELECT * FROM quote_sections WHERE quote_id = $1 AND deleted_at IS NULL ORDER BY id ASC',
            [parseInt(id, 10)]
        )
        res.json(sections)
    } catch (err) {
        await logError(req, 'GET /api/quotes/:id/sections', 'ERR_SECTIONS_FETCH_500', err.message, { id })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R13 â€” POST /api/quotes/:id/sections
// Creates a new section for the quote. Section reference is auto-generated.
// ---------------------------------------------------------------------------

router.post('/:id/sections', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id } = req.params
    const {
        class_of_business,
        inception_date,
        expiry_date,
        limit_currency,
        limit_amount,
        premium_currency,
        gross_premium,
    } = req.body

    try {
        const quoteRows = await runQuery(
            'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (quoteRows.length === 0) return res.status(404).json({ message: 'Quote not found' })
        const q = quoteRows[0]
        if (q.created_by_org_code !== orgCode) return res.status(403).json({ message: 'Forbidden' })

        // Auto-generate section reference based on current section count
        const countRows = await runQuery(
            'SELECT COUNT(*) FROM quote_sections WHERE quote_id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        const seq = parseInt(countRows[0].count, 10) + 1
        const reference = `${q.reference}-S${String(seq).padStart(2, '0')}`

        const result = await runQuery(
            `INSERT INTO quote_sections
                (quote_id, reference, class_of_business, inception_date, expiry_date,
                 limit_currency, limit_amount, premium_currency, gross_premium)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                parseInt(id, 10),
                reference,
                class_of_business || null,
                inception_date || null,
                expiry_date || null,
                limit_currency || null,
                limit_amount ? parseFloat(limit_amount) : null,
                premium_currency || null,
                gross_premium ? parseFloat(gross_premium) : null,
            ]
        )
        res.status(201).json(result[0])
    } catch (err) {
        await logError(req, 'POST /api/quotes/:id/sections', 'ERR_SECTION_CREATE_500', err.message, { id })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R14 â€” DELETE /api/quotes/:id/sections/:sectionId
// Soft-deletes a section (sets deleted_at). Only accessible to quote owner.
// ---------------------------------------------------------------------------

router.delete('/:id/sections/:sectionId', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id, sectionId } = req.params
    try {
        const quoteRows = await runQuery(
            'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (quoteRows.length === 0) return res.status(404).json({ message: 'Quote not found' })
        if (quoteRows[0].created_by_org_code !== orgCode) return res.status(403).json({ message: 'Forbidden' })

        const sectionRows = await runQuery(
            'SELECT * FROM quote_sections WHERE id = $1 AND quote_id = $2 AND deleted_at IS NULL',
            [parseInt(sectionId, 10), parseInt(id, 10)]
        )
        if (sectionRows.length === 0) return res.status(404).json({ message: 'Section not found' })

        await runQuery(
            'UPDATE quote_sections SET deleted_at = NOW() WHERE id = $1',
            [parseInt(sectionId, 10)]
        )
        res.status(204).send()
    } catch (err) {
        await logError(req, 'DELETE /api/quotes/:id/sections/:sectionId', 'ERR_SECTION_DELETE_500', err.message, { id, sectionId })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R41 â€” GET /api/quotes/:id/sections/:sectionId/coverages
// Returns all non-soft-deleted coverages for a section, ordered by id ASC.
// REQ-QUO-BE-F-041
// ---------------------------------------------------------------------------

router.get('/:id/sections/:sectionId/coverages', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id, sectionId } = req.params
    try {
        const quoteRows = await runQuery(
            'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (quoteRows.length === 0) return res.status(404).json({ message: 'Quote not found' })
        if (quoteRows[0].created_by_org_code !== orgCode) return res.status(403).json({ message: 'Forbidden' })

        const sectionRows = await runQuery(
            'SELECT * FROM quote_sections WHERE id = $1 AND quote_id = $2 AND deleted_at IS NULL',
            [parseInt(sectionId, 10), parseInt(id, 10)]
        )
        if (sectionRows.length === 0) return res.status(404).json({ message: 'Section not found' })

        const coverages = await runQuery(
            'SELECT * FROM quote_section_coverages WHERE section_id = $1 AND deleted_at IS NULL ORDER BY id ASC',
            [parseInt(sectionId, 10)]
        )
        res.json(coverages)
    } catch (err) {
        await logError(req, 'GET /api/quotes/:id/sections/:sectionId/coverages', 'ERR_COVERAGES_FETCH_500', err.message, { id, sectionId })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R42 â€” POST /api/quotes/:id/sections/:sectionId/coverages
// Creates a coverage with auto-generated reference {sectionRef}-COV-NNN.
// REQ-QUO-BE-F-042
// ---------------------------------------------------------------------------

router.post('/:id/sections/:sectionId/coverages', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id, sectionId } = req.params
    try {
        const quoteRows = await runQuery(
            'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (quoteRows.length === 0) return res.status(404).json({ message: 'Quote not found' })
        if (quoteRows[0].created_by_org_code !== orgCode) return res.status(403).json({ message: 'Forbidden' })

        const sectionRows = await runQuery(
            'SELECT * FROM quote_sections WHERE id = $1 AND quote_id = $2 AND deleted_at IS NULL',
            [parseInt(sectionId, 10), parseInt(id, 10)]
        )
        if (sectionRows.length === 0) return res.status(404).json({ message: 'Section not found' })

        const sectionRef = sectionRows[0].reference

        const countRows = await runQuery(
            'SELECT COUNT(*) FROM quote_section_coverages WHERE section_id = $1 AND deleted_at IS NULL',
            [parseInt(sectionId, 10)]
        )
        const nextSeq = parseInt(countRows[0].count, 10) + 1
        const reference = `${sectionRef}-COV-${String(nextSeq).padStart(3, '0')}`

        const {
            coverage, class_of_business, effective_date, expiry_date,
            limit_currency, limit_amount, limit_loss_qualifier,
            excess_currency, excess_amount,
            sum_insured_currency, sum_insured,
            premium_currency, gross_premium, net_premium, tax_receivable,
            payload,
        } = req.body

        let days_on_cover = null
        if (effective_date && expiry_date) {
            days_on_cover = Math.max(0, Math.ceil((new Date(expiry_date) - new Date(effective_date)) / 86400000))
        }

        const inserted = await runQuery(
            `INSERT INTO quote_section_coverages
                (quote_id, section_id, reference, coverage, class_of_business,
                 effective_date, expiry_date, days_on_cover,
                 limit_currency, limit_amount, limit_loss_qualifier,
                 excess_currency, excess_amount,
                 sum_insured_currency, sum_insured,
                 premium_currency, gross_premium, net_premium, tax_receivable,
                 payload, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
             RETURNING *`,
            [
                parseInt(id, 10), parseInt(sectionId, 10), reference, coverage ?? null, class_of_business ?? null,
                effective_date ?? null, expiry_date ?? null, days_on_cover,
                limit_currency ?? null, limit_amount ?? null, limit_loss_qualifier ?? null,
                excess_currency ?? null, excess_amount ?? null,
                sum_insured_currency ?? null, sum_insured ?? null,
                premium_currency ?? null, gross_premium ?? null, net_premium ?? null, tax_receivable ?? null,
                payload ?? {},
            ]
        )
        res.status(201).json(inserted[0])
    } catch (err) {
        await logError(req, 'POST /api/quotes/:id/sections/:sectionId/coverages', 'ERR_COVERAGE_CREATE_500', err.message, { id, sectionId })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R43 â€” PUT /api/quotes/:id/sections/:sectionId/coverages/:coverageId
// Updates mutable fields; auto-computes days_on_cover when both dates present.
// REQ-QUO-BE-F-043
// ---------------------------------------------------------------------------

router.put('/:id/sections/:sectionId/coverages/:coverageId', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id, sectionId, coverageId } = req.params
    try {
        const quoteRows = await runQuery(
            'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (quoteRows.length === 0) return res.status(404).json({ message: 'Quote not found' })
        if (quoteRows[0].created_by_org_code !== orgCode) return res.status(403).json({ message: 'Forbidden' })

        const covRows = await runQuery(
            'SELECT * FROM quote_section_coverages WHERE id = $1 AND section_id = $2 AND deleted_at IS NULL',
            [parseInt(coverageId, 10), parseInt(sectionId, 10)]
        )
        if (covRows.length === 0) return res.status(404).json({ message: 'Coverage not found' })

        const MUTABLE = [
            'coverage', 'class_of_business', 'effective_date', 'expiry_date',
            'limit_currency', 'limit_amount', 'limit_loss_qualifier',
            'excess_currency', 'excess_amount',
            'sum_insured_currency', 'sum_insured',
            'premium_currency', 'gross_premium', 'net_premium', 'tax_receivable',
            'payload',
        ]

        const setClauses = []
        const values = []
        let paramIdx = 1

        for (const field of MUTABLE) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                setClauses.push(`${field} = $${paramIdx++}`)
                values.push(req.body[field])
            }
        }

        const effectiveDate = Object.prototype.hasOwnProperty.call(req.body, 'effective_date')
            ? req.body.effective_date
            : covRows[0].effective_date
        const expiryDate = Object.prototype.hasOwnProperty.call(req.body, 'expiry_date')
            ? req.body.expiry_date
            : covRows[0].expiry_date

        if (effectiveDate && expiryDate) {
            const computed = Math.max(0, Math.ceil((new Date(expiryDate) - new Date(effectiveDate)) / 86400000))
            setClauses.push(`days_on_cover = $${paramIdx++}`)
            values.push(computed)
        }

        if (setClauses.length === 0) return res.json(covRows[0])

        values.push(parseInt(coverageId, 10))
        const updated = await runQuery(
            `UPDATE quote_section_coverages SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
            values
        )
        res.json(updated[0])
    } catch (err) {
        await logError(req, 'PUT /api/quotes/:id/sections/:sectionId/coverages/:coverageId', 'ERR_COVERAGE_UPDATE_500', err.message, { id, sectionId, coverageId })
        res.status(500).json({ message: err.message })
    }
})

// ---------------------------------------------------------------------------
// R44 â€” DELETE /api/quotes/:id/sections/:sectionId/coverages/:coverageId
// Soft-deletes a coverage (sets deleted_at). Returns 204.
// REQ-QUO-BE-F-044
// ---------------------------------------------------------------------------

router.delete('/:id/sections/:sectionId/coverages/:coverageId', async (req, res) => {
    const orgCode = req.user.orgCode
    const { id, sectionId, coverageId } = req.params
    try {
        const quoteRows = await runQuery(
            'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (quoteRows.length === 0) return res.status(404).json({ message: 'Quote not found' })
        if (quoteRows[0].created_by_org_code !== orgCode) return res.status(403).json({ message: 'Forbidden' })

        const updated = await runQuery(
            `UPDATE quote_section_coverages
             SET deleted_at = NOW()
             WHERE id = $1 AND section_id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [parseInt(coverageId, 10), parseInt(sectionId, 10)]
        )
        if (updated.length === 0) return res.status(404).json({ message: 'Coverage not found' })

        res.status(204).send()
    } catch (err) {
        await logError(req, 'DELETE /api/quotes/:id/sections/:sectionId/coverages/:coverageId', 'ERR_COVERAGE_DELETE_500', err.message, { id, sectionId, coverageId })
        res.status(500).json({ message: err.message })
    }
})

module.exports = router
