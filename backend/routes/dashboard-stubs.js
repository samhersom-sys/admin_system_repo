'use strict'
/**
 * STUB ROUTES â€” Quotes, Policies, Binding Authorities, Notifications, Recent Records, Tasks
 *
 * REQ: backend/routes/dashboard-stubs.requirements.md
 * PURPOSE: Return safe empty responses until domain tables are built.
 *          Prevents frontend dashboard widgets from hitting HTTP 500 errors.
 *
 * WHEN TO REMOVE A STUB: Once the real domain table + full route file is built,
 * delete that specific router.use() registration in server.js and add the real route.
 */

const express = require('express')
const { authenticateToken } = require('../middleware/auth')
const { runQuery } = require('../db')

// ---------------------------------------------------------------------------
// Error logger â€” writes to error_log table (Â§16-Error-Handling-Standards.md)
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

// â”€â”€â”€ /api/quotes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const quotesRouter = express.Router()
quotesRouter.use(authenticateToken)
// REQ-DASH-STUB-F-001
quotesRouter.get('/', (_req, res) => res.json([]))

// â”€â”€â”€ /api/policies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const policiesRouter = express.Router()
policiesRouter.use(authenticateToken)
// REQ-DASH-STUB-F-002
policiesRouter.get('/', (_req, res) => res.json([]))

// REQ-DASH-STUB-F-003 â€” Monthly GWP grouped by year-of-account
policiesRouter.get('/gwp-monthly', async (req, res) => {
    try {
        const orgCode = req.user?.orgCode
        if (!orgCode) return res.json({ series: [] })

        // Policies may store inception_date as TEXT (YYYY-MM-DD) â€” cast to date
        const rows = await runQuery(
            `SELECT
                 EXTRACT(YEAR FROM inception_date::date)  AS yr,
                 EXTRACT(MONTH FROM inception_date::date) AS mo,
                 COALESCE(SUM(gross_written_premium), 0)  AS total
             FROM policies
             WHERE created_by_org_code = $1
               AND deleted_at IS NULL
               AND inception_date IS NOT NULL
               AND gross_written_premium IS NOT NULL
             GROUP BY yr, mo
             ORDER BY yr, mo`,
            [orgCode]
        )

        // Group into series per year: { label, months[], values[] }
        const byYear = {}
        for (const r of rows) {
            const yr = String(r.yr)
            if (!byYear[yr]) byYear[yr] = { label: yr, months: [], values: [] }
            const monthStr = `${yr}-${String(r.mo).padStart(2, '0')}`
            byYear[yr].months.push(monthStr)
            byYear[yr].values.push(Number(r.total))
        }

        return res.json({ series: Object.values(byYear) })
    } catch (err) {
        console.error('[gwp-monthly]', err.message)
        await logError(req, 'GET /api/policies/gwp-monthly', 'ERR_GWP_MONTHLY_500', err.message)
        return res.json({ series: [] })
    }
})

// REQ-DASH-STUB-F-004 â€” Cumulative GWP grouped by year-of-account
policiesRouter.get('/gwp-cumulative', async (req, res) => {
    try {
        const orgCode = req.user?.orgCode
        if (!orgCode) return res.json({ series: [] })

        const rows = await runQuery(
            `SELECT
                 EXTRACT(YEAR FROM inception_date::date)  AS yr,
                 EXTRACT(MONTH FROM inception_date::date) AS mo,
                 COALESCE(SUM(gross_written_premium), 0)  AS total
             FROM policies
             WHERE created_by_org_code = $1
               AND deleted_at IS NULL
               AND inception_date IS NOT NULL
               AND gross_written_premium IS NOT NULL
             GROUP BY yr, mo
             ORDER BY yr, mo`,
            [orgCode]
        )

        // Group by year, then produce running cumulative totals
        const byYear = {}
        for (const r of rows) {
            const yr = String(r.yr)
            if (!byYear[yr]) byYear[yr] = { label: yr, months: [], values: [] }
            const monthStr = `${yr}-${String(r.mo).padStart(2, '0')}`
            const prev = byYear[yr].values.length > 0
                ? byYear[yr].values[byYear[yr].values.length - 1]
                : 0
            byYear[yr].months.push(monthStr)
            byYear[yr].values.push(prev + Number(r.total))
        }

        return res.json({ series: Object.values(byYear) })
    } catch (err) {
        console.error('[gwp-cumulative]', err.message)
        await logError(req, 'GET /api/policies/gwp-cumulative', 'ERR_GWP_CUMUL_500', err.message)
        return res.json({ series: [] })
    }
})

// REQ-DASH-STUB-F-005 â€” GWP summary totals
policiesRouter.get('/gwp-summary', async (req, res) => {
    try {
        const orgCode = req.user?.orgCode
        if (!orgCode) return res.json({ orgTotal: 0, userTotal: 0 })

        const userName = req.user?.username || req.user?.email || null

        const orgRows = await runQuery(
            `SELECT COALESCE(SUM(gross_written_premium), 0) AS total
             FROM policies
             WHERE created_by_org_code = $1
               AND deleted_at IS NULL
               AND gross_written_premium IS NOT NULL`,
            [orgCode]
        )

        let userTotal = 0
        if (userName) {
            const userRows = await runQuery(
                `SELECT COALESCE(SUM(gross_written_premium), 0) AS total
                 FROM policies
                 WHERE created_by_org_code = $1
                   AND created_by = $2
                   AND deleted_at IS NULL
                   AND gross_written_premium IS NOT NULL`,
                [orgCode, userName]
            )
            userTotal = Number(userRows[0]?.total ?? 0)
        }

        return res.json({
            orgTotal: Number(orgRows[0]?.total ?? 0),
            userTotal,
        })
    } catch (err) {
        console.error('[gwp-summary]', err.message)
        await logError(req, 'GET /api/policies/gwp-summary', 'ERR_GWP_SUMMARY_500', err.message)
        return res.json({ orgTotal: 0, userTotal: 0 })
    }
})

// â”€â”€â”€ /api/binding-authorities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const baRouter = express.Router()
baRouter.use(authenticateToken)
// REQ-DASH-STUB-F-006
baRouter.get('/', async (req, res) => {
    try {
        const orgCode = req.user.orgCode
        const rows = await runQuery(
            `SELECT * FROM binding_authorities WHERE created_by_org_code = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
            [orgCode]
        )
        // Map is_multi_year to multi_year for frontend compatibility
        rows.forEach(r => { r.multi_year = r.is_multi_year ?? false })
        res.json(rows)
    } catch (err) {
        console.error('[GET /api/binding-authorities] Error:', err.message)
        await logError(req, 'GET /api/binding-authorities', 'ERR_BA_LIST_500', err.message)
        res.json([])
    }
})

// POST /api/binding-authorities â€” create a new BA
baRouter.post('/', async (req, res) => {
    try {
        const orgCode = req.user.orgCode
        const userName = req.user.username || req.user.email || 'System'
        const { coverholder_id, inception_date, expiry_date, year_of_account, submission_id } = req.body

        // Generate next reference: BA-{timestamp}
        const reference = `BA-${Date.now()}`

        const inserted = await runQuery(
            `INSERT INTO binding_authorities
                (reference, coverholder_id, status, inception_date, expiry_date,
                 year_of_account, submission_id, created_by_org_code, created_by, created_at, updated_at)
             VALUES ($1, $2, 'Draft', COALESCE($3, CURRENT_DATE), COALESCE($4, CURRENT_DATE + INTERVAL '1 year'), $5, $6, $7, $8, NOW(), NOW())
             RETURNING *`,
            [reference, coverholder_id ?? null, inception_date ?? null, expiry_date ?? null,
             year_of_account ?? null, submission_id ?? null, orgCode, userName]
        )

        // Resolve coverholder name if id provided
        if (coverholder_id && inserted[0]) {
            const party = await runQuery('SELECT name FROM party WHERE id = $1', [coverholder_id]).catch(() => [])
            if (party[0]) inserted[0].coverholder = party[0].name
        }

        return res.status(201).json(inserted[0])
    } catch (err) {
        console.error('[POST /api/binding-authorities] Error:', err.message)
        await logError(req, 'POST /api/binding-authorities', 'ERR_BA_CREATE_500', err.message)
        return res.status(500).json({ message: err.message })
    }
})

// GET /api/binding-authorities/:id â€” single BA detail
baRouter.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const orgCode = req.user.orgCode
        const rows = await runQuery(
            `SELECT ba.*,
                    p.name AS coverholder,
                    s.reference AS submission_reference
             FROM binding_authorities ba
             LEFT JOIN party p ON p.id = ba.coverholder_id
             LEFT JOIN submission s ON s.id = ba.submission_id
             WHERE ba.id = $1 AND ba.deleted_at IS NULL`,
            [parseInt(id, 10)]
        )
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Binding authority not found' })
        }
        if (rows[0].created_by_org_code !== orgCode) {
            return res.status(403).json({ message: 'Forbidden' })
        }
        // Map DB column is_multi_year to multi_year for frontend compatibility
        const ba = rows[0]
        ba.multi_year = ba.is_multi_year ?? false
        return res.json(ba)
    } catch (err) {
        console.error('[GET /api/binding-authorities/:id] Error:', err.message)
        await logError(req, 'GET /api/binding-authorities/:id', 'ERR_BA_DETAIL_500', err.message, { id })
        return res.status(500).json({ message: err.message })
    }
})

// PUT /api/binding-authorities/:id â€” update BA
baRouter.put('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const orgCode = req.user.orgCode
        const existing = await runQuery(
            'SELECT * FROM binding_authorities WHERE id = $1 AND deleted_at IS NULL',
            [parseInt(id, 10)]
        )
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Binding authority not found' })
        }
        if (existing[0].created_by_org_code !== orgCode) {
            return res.status(403).json({ message: 'Forbidden' })
        }
        const ba = existing[0]
        const {
            status, coverholder_id, inception_date, expiry_date,
            year_of_account, multi_year, submission_id,
        } = req.body

        const updated = await runQuery(
            `UPDATE binding_authorities SET
                status = $2,
                coverholder_id = $3,
                inception_date = $4,
                expiry_date = $5,
                year_of_account = $6,
                is_multi_year = $7,
                submission_id = $8,
                updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [
                parseInt(id, 10),
                status ?? ba.status,
                coverholder_id ?? ba.coverholder_id,
                inception_date ?? ba.inception_date,
                expiry_date ?? ba.expiry_date,
                year_of_account ?? ba.year_of_account,
                multi_year ?? ba.is_multi_year ?? false,
                submission_id ?? ba.submission_id,
            ]
        )

        // Resolve coverholder name
        const covId = updated[0]?.coverholder_id
        if (covId) {
            const party = await runQuery('SELECT name FROM party WHERE id = $1', [covId]).catch(() => [])
            if (party[0]) updated[0].coverholder = party[0].name
        }
        // Resolve submission reference
        const subId = updated[0]?.submission_id
        if (subId) {
            const sub = await runQuery('SELECT reference FROM submission WHERE id = $1', [subId]).catch(() => [])
            if (sub[0]) updated[0].submission_reference = sub[0].reference
        }

        return res.json(updated[0])
    } catch (err) {
        console.error('[PUT /api/binding-authorities/:id] Error:', err.message)
        await logError(req, 'PUT /api/binding-authorities/:id', 'ERR_BA_UPDATE_500', err.message, { id })
        return res.status(500).json({ message: err.message })
    }
})

// GET /api/binding-authorities/:id/sections â€” sections for BA
baRouter.get('/:id/sections', async (req, res) => {
    const { id } = req.params
    try {
        const rows = await runQuery(
            `SELECT * FROM binding_authority_sections
             WHERE binding_authority_id = $1
             ORDER BY id ASC`,
            [parseInt(id, 10)]
        )
        return res.json(rows)
    } catch (err) {
        console.error('[GET /api/binding-authorities/:id/sections] Error:', err.message)
        await logError(req, 'GET /api/binding-authorities/:id/sections', 'ERR_BA_SECTIONS_500', err.message, { id })
        return res.json([])
    }
})

// POST /api/binding-authorities/:id/sections â€” create section
baRouter.post('/:id/sections', async (req, res) => {
    const { id } = req.params
    try {
        const baId = parseInt(id, 10)
        const { class_of_business, time_basis, inception_date, expiry_date, line_size, written_premium_limit, currency } = req.body

        // Generate section reference: SEC-{BA_ID}-{NNN}
        const countRows = await runQuery(
            'SELECT COUNT(*)::int AS cnt FROM binding_authority_sections WHERE binding_authority_id = $1',
            [baId]
        )
        const seq = (countRows[0]?.cnt ?? 0) + 1
        const reference = `SEC-${baId}-${String(seq).padStart(3, '0')}`

        const inserted = await runQuery(
            `INSERT INTO binding_authority_sections
                (binding_authority_id, reference, class_of_business, time_basis,
                 inception_date, expiry_date, line_size, written_premium_limit, currency)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [baId, reference, class_of_business ?? null, time_basis ?? null,
             inception_date ?? null, expiry_date ?? null, line_size ?? null,
             written_premium_limit ?? null, currency ?? 'GBP']
        )
        return res.status(201).json(inserted[0])
    } catch (err) {
        console.error('[POST /api/binding-authorities/:id/sections] Error:', err.message)
        await logError(req, 'POST /api/binding-authorities/:id/sections', 'ERR_BA_SECTION_CREATE_500', err.message, { id })
        return res.status(500).json({ message: err.message })
    }
})

// GET /api/binding-authorities/:id/transactions â€” transactions for BA
baRouter.get('/:id/transactions', async (req, res) => {
    const { id } = req.params
    try {
        const rows = await runQuery(
            `SELECT * FROM binding_authority_transactions
             WHERE binding_authority_id = $1
             ORDER BY id ASC`,
            [parseInt(id, 10)]
        )
        return res.json(rows)
    } catch (err) {
        console.error('[GET /api/binding-authorities/:id/transactions] Error:', err.message)
        await logError(req, 'GET /api/binding-authorities/:id/transactions', 'ERR_BA_TX_500', err.message, { id })
        return res.json([])
    }
})

// POST /api/binding-authorities/:id/transactions â€” create transaction
baRouter.post('/:id/transactions', async (req, res) => {
    const { id } = req.params
    try {
        const baId = parseInt(id, 10)
        const { type, amount, currency, date, description } = req.body
        const userName = req.user.username || req.user.email || 'System'
        const orgCode = req.user.orgCode
        const inserted = await runQuery(
            `INSERT INTO binding_authority_transactions
                (binding_authority_id, type, status, amount, currency, date, effective_date, description, created_by, created_by_org_code)
             VALUES ($1, $2, 'Active', $3, $4, $5, $5, $6, $7, $8)
             RETURNING *`,
            [baId, type ?? 'Premium', amount ?? null, currency ?? 'GBP', date ?? null, description ?? null, userName, orgCode]
        )
        return res.status(201).json(inserted[0])
    } catch (err) {
        console.error('[POST /api/binding-authorities/:id/transactions] Error:', err.message)
        await logError(req, 'POST /api/binding-authorities/:id/transactions', 'ERR_BA_TX_CREATE_500', err.message, { id })
        return res.status(500).json({ message: err.message })
    }
})

// GET /api/binding-authorities/:id/audit â€” read audit history
baRouter.get('/:id/audit', async (req, res) => {
    const { id } = req.params
    try {
        const events = await runQuery(
            `SELECT action, user_name, user_id, created_at, details
             FROM public.audit_event
             WHERE entity_type = 'Binding Authority' AND entity_id = $1
             ORDER BY created_at ASC, id ASC`,
            [parseInt(id, 10)]
        )
        return res.json(events.map((e) => ({
            action: e.action,
            user: e.user_name,
            userId: e.user_id,
            date: e.created_at,
            details: e.details?.details ?? undefined,
            changes: e.details?.changes ?? undefined,
        })))
    } catch (err) {
        console.error('[GET /api/binding-authorities/:id/audit] Error:', err.message)
        await logError(req, 'GET /api/binding-authorities/:id/audit', 'ERR_BA_AUDIT_GET_500', err.message, { id })
        return res.status(500).json({ message: err.message })
    }
})

// POST /api/binding-authorities/:id/audit â€” write audit event
baRouter.post('/:id/audit', async (req, res) => {
    const { id } = req.params
    const { action, details } = req.body
    if (!action || typeof action !== 'string') {
        return res.status(400).json({ message: 'action is required' })
    }
    try {
        const userName = req.user.username || req.user.email || 'System'
        const userId = req.user.id ?? null
        const storedDetails = (details && typeof details === 'object') ? details : {}
        const inserted = await runQuery(
            `INSERT INTO public.audit_event
                (entity_type, entity_id, action, details, created_by, user_id, user_name)
             VALUES ('Binding Authority', $1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [parseInt(id, 10), action, JSON.stringify(storedDetails), userName, userId, userName]
        )
        return res.status(201).json(inserted[0])
    } catch (err) {
        console.error('[POST /api/binding-authorities/:id/audit] Error:', err.message)
        await logError(req, 'POST /api/binding-authorities/:id/audit', 'ERR_BA_AUDIT_POST_500', err.message, { id })
        return res.status(500).json({ message: err.message })
    }
})

// â”€â”€â”€ /api/notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const notificationsRouter = express.Router()
notificationsRouter.use(authenticateToken)
// REQ-DASH-STUB-F-007
notificationsRouter.get('/', (_req, res) => res.json([]))

// â”€â”€â”€ /api/recent-records-data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// REQ-DASH-STUB-F-008: Returns org-scoped recent records using audit_event for
// lastOpenedDate (mirrors NestJS dashboard.service getRecentRecords).
const recentRecordsRouter = express.Router()
recentRecordsRouter.use(authenticateToken)
recentRecordsRouter.get('/', async (req, res) => {
    try {
        const { orgCode } = req.user

        // 1. Find recently-opened/updated entities via audit_event
        const auditRows = await runQuery(
            `SELECT ae.entity_type, ae.entity_id, MAX(ae.created_at) AS last_opened
             FROM public.audit_event ae
             WHERE ae.entity_type IN ('Submission', 'Quote', 'Policy', 'Binding Authority')
               AND (ae.action ILIKE '%Opened%' OR ae.action ILIKE '%Updated%')
             GROUP BY ae.entity_type, ae.entity_id
             ORDER BY last_opened DESC
             LIMIT 120`
        ).catch(() => [])

        // Group audit IDs + timestamps by entity type
        const auditByType = {}
        for (const row of auditRows) {
            if (!auditByType[row.entity_type]) auditByType[row.entity_type] = []
            auditByType[row.entity_type].push({ id: Number(row.entity_id), lastOpenedDate: row.last_opened })
        }

        // Helper: fetch entities by audit IDs, falling back to created-date order
        async function fetchWithAudit(auditEntries, queryByIds, queryFallback) {
            if (auditEntries && auditEntries.length > 0) {
                const ids = auditEntries.map(e => e.id)
                const rows = await queryByIds(ids)
                const dateMap = Object.fromEntries(auditEntries.map(e => [e.id, e.lastOpenedDate]))
                for (const r of rows) {
                    r.lastOpenedDate = dateMap[r.id] || r.lastOpenedDate
                }
                rows.sort((a, b) => new Date(b.lastOpenedDate) - new Date(a.lastOpenedDate))
                return rows.slice(0, 25)
            }
            return queryFallback()
        }

        // Submissions
        const submissionRows = await fetchWithAudit(
            auditByType['Submission'],
            (ids) => runQuery(
                `SELECT s.id, s.reference, s."submissionType" AS "submissionType",
                        s.insured AS "insuredName", s."placingBroker" AS "broker",
                        s.status, s."createdDate" AS "lastOpenedDate"
                 FROM submission s
                 WHERE s.id = ANY($1) AND s."createdByOrgCode" = $2`,
                [ids, orgCode]
            ),
            () => runQuery(
                `SELECT s.id, s.reference, s."submissionType" AS "submissionType",
                        s.insured AS "insuredName", s."placingBroker" AS "broker",
                        s.status, s."createdDate" AS "lastOpenedDate"
                 FROM submission s
                 WHERE s."createdByOrgCode" = $1
                 ORDER BY s."createdDate" DESC LIMIT 25`,
                [orgCode]
            ),
        ).catch(() => [])

        // Quotes
        const quoteRows = await fetchWithAudit(
            auditByType['Quote'],
            (ids) => runQuery(
                `SELECT q.id, q.reference, q.insured AS "insuredName",
                        q.status, q.created_date AS "lastOpenedDate"
                 FROM quotes q
                 WHERE q.id = ANY($1) AND q.created_by_org_code = $2 AND q.deleted_at IS NULL`,
                [ids, orgCode]
            ),
            () => runQuery(
                `SELECT q.id, q.reference, q.insured AS "insuredName",
                        q.status, q.created_date AS "lastOpenedDate"
                 FROM quotes q
                 WHERE q.created_by_org_code = $1 AND q.deleted_at IS NULL
                 ORDER BY q.created_date DESC LIMIT 25`,
                [orgCode]
            ),
        ).catch(() => [])

        // Policies
        const policyRows = await fetchWithAudit(
            auditByType['Policy'],
            (ids) => runQuery(
                `SELECT p.id, p.reference, p.insured AS "insuredName",
                        p.status, p.created_date AS "lastOpenedDate"
                 FROM policies p
                 WHERE p.id = ANY($1) AND p.created_by_org_code = $2 AND p.deleted_at IS NULL`,
                [ids, orgCode]
            ),
            () => runQuery(
                `SELECT p.id, p.reference, p.insured AS "insuredName",
                        p.status, p.created_date AS "lastOpenedDate"
                 FROM policies p
                 WHERE p.created_by_org_code = $1 AND p.deleted_at IS NULL
                 ORDER BY p.created_date DESC LIMIT 25`,
                [orgCode]
            ),
        ).catch(() => [])

        // Binding Authorities
        const baRows = await fetchWithAudit(
            auditByType['Binding Authority'],
            (ids) => runQuery(
                `SELECT ba.id, ba.reference, ba.status, ba.created_at AS "lastOpenedDate"
                 FROM binding_authorities ba
                 WHERE ba.id = ANY($1) AND ba.created_by_org_code = $2 AND ba.deleted_at IS NULL`,
                [ids, orgCode]
            ),
            () => runQuery(
                `SELECT ba.id, ba.reference, ba.status, ba.created_at AS "lastOpenedDate"
                 FROM binding_authorities ba
                 WHERE ba.created_by_org_code = $1 AND ba.deleted_at IS NULL
                 ORDER BY ba.created_at DESC LIMIT 25`,
                [orgCode]
            ),
        ).catch(() => [])

        return res.json({
            submissions: submissionRows,
            quotes: quoteRows,
            policies: policyRows,
            bindingAuthorities: baRows,
        })
    } catch (err) {
        console.error('[recent-records-data]', err.message)
        await logError(req, 'GET /api/recent-records-data', 'ERR_RECENT_RECORDS_500', err.message)
        return res.status(500).json({ message: 'Failed to fetch recent records' })
    }
})

// â”€â”€â”€ /api/tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// REQ-DASH-STUB-F-009: Listed as KNOWN_UNIMPLEMENTED in api-smoke.test.js.
const tasksRouter = express.Router()
tasksRouter.use(authenticateToken)
tasksRouter.get('/', (_req, res) => res.json([]))

// â”€â”€â”€ /api/dashboards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Dashboard widget data execution â€” mirrors NestJS reporting.controller POST dashboards/widgets/data
const dashboardWidgetsRouter = express.Router()
dashboardWidgetsRouter.use(authenticateToken)

// Source â†’ { table, orgColumn }
const WIDGET_SOURCES = {
    submissions:          { table: 'submission',            orgCol: '"createdByOrgCode"' },
    quotes:               { table: 'quotes',                orgCol: 'created_by_org_code' },
    policies:             { table: 'policies',              orgCol: 'created_by_org_code' },
    binding_authorities:  { table: 'binding_authorities',   orgCol: 'created_by_org_code' },
    bindingAuthorities:   { table: 'binding_authorities',   orgCol: 'created_by_org_code' },
    parties:              { table: 'party',                 orgCol: 'org_code' },
}

dashboardWidgetsRouter.post('/widgets/data', async (req, res) => {
    const { widget } = req.body
    if (!widget || !widget.type) {
        return res.status(400).json({ message: 'widget is required' })
    }

    const orgCode = req.user.orgCode

    // Text widgets need no data
    if (widget.type === 'text') {
        return res.json({ type: 'text' })
    }

    try {
        const srcKey = widget.source ?? 'submissions'
        const src = WIDGET_SOURCES[srcKey]
        if (!src) {
            return res.json({ type: widget.type, value: 0, label: widget.title ?? '', rows: [] })
        }

        if (widget.type === 'metric') {
            const agg = widget.aggregation ?? 'count'
            const metric = widget.metric // e.g. 'gross_written_premium'
            let sqlAgg = 'COUNT(*)'
            if (agg !== 'count' && metric) {
                sqlAgg = `${agg.toUpperCase()}(${metric})`
            }
            const deletedClause = src.table === 'submission' || src.table === 'party' ? '' : ' AND deleted_at IS NULL'
            const rows = await runQuery(
                `SELECT COALESCE(${sqlAgg}, 0) AS val FROM ${src.table} WHERE ${src.orgCol} = $1${deletedClause}`,
                [orgCode]
            )
            return res.json({ type: 'metric', value: Number(rows[0]?.val ?? 0), label: widget.title ?? '' })
        }

        if (widget.type === 'chart') {
            const attr = widget.attribute ?? 'status'
            const deletedClause = src.table === 'submission' || src.table === 'party' ? '' : ' AND deleted_at IS NULL'
            const rows = await runQuery(
                `SELECT ${attr} AS label, COUNT(*)::int AS count FROM ${src.table} WHERE ${src.orgCol} = $1${deletedClause} GROUP BY ${attr} ORDER BY count DESC LIMIT 20`,
                [orgCode]
            )
            return res.json({
                type: 'chart',
                rows: rows.map(r => ({ label: String(r.label ?? 'Unknown'), values: { count: Number(r.count) } })),
            })
        }

        if (widget.type === 'table') {
            const deletedClause = src.table === 'submission' || src.table === 'party' ? '' : ' AND deleted_at IS NULL'
            const rows = await runQuery(
                `SELECT * FROM ${src.table} WHERE ${src.orgCol} = $1${deletedClause} ORDER BY 1 DESC LIMIT 50`,
                [orgCode]
            )
            return res.json({ type: 'table', rows })
        }

        return res.json({ type: widget.type, value: 0, label: widget.title ?? '', rows: [] })
    } catch (err) {
        console.error('[POST /api/dashboards/widgets/data] Error:', err.message)
        await logError(req, 'POST /api/dashboards/widgets/data', 'ERR_WIDGET_DATA_500', err.message)
        // Return safe empty response instead of 500 to keep dashboard functional
        if (widget.type === 'metric') return res.json({ type: 'metric', value: 0, label: widget.title ?? '' })
        if (widget.type === 'chart') return res.json({ type: 'chart', rows: [] })
        if (widget.type === 'table') return res.json({ type: 'table', rows: [] })
        return res.json({ type: widget.type, value: 0, label: '', rows: [] })
    }
})

module.exports = {
    quotesRouter,
    policiesRouter,
    baRouter,
    notificationsRouter,
    recentRecordsRouter,
    tasksRouter,
    dashboardWidgetsRouter,
}
