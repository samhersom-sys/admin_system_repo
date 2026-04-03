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
// REQ-DASH-STUB-F-003
policiesRouter.get('/gwp-monthly', (_req, res) => res.json({ series: [] }))
// REQ-DASH-STUB-F-004
policiesRouter.get('/gwp-cumulative', (_req, res) => res.json({ series: [] }))
// REQ-DASH-STUB-F-005
policiesRouter.get('/gwp-summary', (_req, res) => res.json({ orgTotal: 0, userTotal: 0 }))

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

        return res.json({
            submissions: submissionRows,
            quotes: quoteRows,
            policies: [],   // stub — policy table not yet wired
            bindingAuthorities: [],  // stub — binding_authority not yet wired
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
