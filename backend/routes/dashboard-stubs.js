'use strict'
/**
 * STUB ROUTES — Quotes, Policies, Binding Authorities, Notifications, Recent Records, Tasks
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

// ─── /api/quotes ─────────────────────────────────────────────────────────────
const quotesRouter = express.Router()
quotesRouter.use(authenticateToken)
// REQ-DASH-STUB-F-001
quotesRouter.get('/', (_req, res) => res.json([]))

// ─── /api/policies ───────────────────────────────────────────────────────────
const policiesRouter = express.Router()
policiesRouter.use(authenticateToken)
// REQ-DASH-STUB-F-002
policiesRouter.get('/', (_req, res) => res.json([]))

// REQ-DASH-STUB-F-003 — Monthly GWP grouped by year-of-account
policiesRouter.get('/gwp-monthly', async (req, res) => {
    try {
        const orgCode = req.user?.orgCode
        if (!orgCode) return res.json({ series: [] })

        // Policies may store inception_date as TEXT (YYYY-MM-DD) — cast to date
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

// REQ-DASH-STUB-F-004 — Cumulative GWP grouped by year-of-account
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

// REQ-DASH-STUB-F-005 — GWP summary totals
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

// ─── /api/binding-authorities ────────────────────────────────────────────────
const baRouter = express.Router()
baRouter.use(authenticateToken)
// REQ-DASH-STUB-F-006
baRouter.get('/', (_req, res) => res.json([]))

// ─── /api/notifications ──────────────────────────────────────────────────────
const notificationsRouter = express.Router()
notificationsRouter.use(authenticateToken)
// REQ-DASH-STUB-F-007
notificationsRouter.get('/', (_req, res) => res.json([]))

// ─── /api/recent-records-data ────────────────────────────────────────────────
// REQ-DASH-STUB-F-008: Returns real submissions, empty stubs for other types.
const recentRecordsRouter = express.Router()
recentRecordsRouter.use(authenticateToken)
recentRecordsRouter.get('/', async (req, res) => {
    try {
        const { orgCode } = req.user

        // Submissions
        const submissionRows = await runQuery(
            `SELECT
                 s.id,
                 s.reference,
                 s."submissionType"     AS "submissionType",
                 s.insured               AS "insuredName",
                 s."placingBroker"      AS "broker",
                 s.status,
                 s."createdDate"        AS "lastOpenedDate"
             FROM submission s
             WHERE s."createdByOrgCode" = $1
             ORDER BY s."createdDate" DESC
             LIMIT 25`,
            [orgCode]
        )

        // Quotes
        const quoteRows = await runQuery(
            `SELECT
                 q.id,
                 q.reference,
                 q.insured               AS "insuredName",
                 q.status,
                 q.created_date          AS "lastOpenedDate"
             FROM quotes q
             WHERE q.created_by_org_code = $1
               AND q.deleted_at IS NULL
             ORDER BY q.created_date DESC
             LIMIT 25`,
            [orgCode]
        )

        // Policies
        const policyRows = await runQuery(
            `SELECT
                 p.id,
                 p.reference,
                 p.insured               AS "insuredName",
                 p.status,
                 p.created_date          AS "lastOpenedDate"
             FROM policies p
             WHERE p.created_by_org_code = $1
               AND p.deleted_at IS NULL
             ORDER BY p.created_date DESC
             LIMIT 25`,
            [orgCode]
        ).catch(() => [])

        // Binding Authorities
        const baRows = await runQuery(
            `SELECT
                 ba.id,
                 ba.reference,
                 ba.status,
                 ba.created_at           AS "lastOpenedDate"
             FROM binding_authorities ba
             WHERE ba.created_by_org_code = $1
               AND ba.deleted_at IS NULL
             ORDER BY ba.created_at DESC
             LIMIT 25`,
            [orgCode]
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
        return res.status(500).json({ error: 'Failed to fetch recent records' })
    }
})

// ─── /api/tasks ──────────────────────────────────────────────────────────────
// REQ-DASH-STUB-F-009: Listed as KNOWN_UNIMPLEMENTED in api-smoke.test.js.
const tasksRouter = express.Router()
tasksRouter.use(authenticateToken)
tasksRouter.get('/', (_req, res) => res.json([]))

module.exports = {
    quotesRouter,
    policiesRouter,
    baRouter,
    notificationsRouter,
    recentRecordsRouter,
    tasksRouter,
}
