/**
 * PolicyForge — Cleaned Backend Server
 *
 * Entry point for the Node.js / Express API.
 * Port: 5000 (matches the Vite proxy config in vite.config.js)
 *
 * Run: node backend/server.js
 * (Env vars loaded from .env.local if present)
 */

'use strict'

// Load .env.local before anything else so DATABASE_URL, JWT_SECRET etc. are set
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

const express = require('express')
const cors = require('cors')
const { runQuery } = require('./db')

const app = express()

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS — permissive in dev, restrict via CORS_ORIGINS in production
const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

if (process.env.NODE_ENV === 'production' && corsOrigins.length > 0) {
    app.use(cors({ origin: corsOrigins, credentials: true }))
    console.log(`[CORS] Production allowlist: ${corsOrigins.join(', ')}`)
} else {
    app.use(cors())
}

app.use(express.json())

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', server: 'cleaned', timestamp: new Date().toISOString() })
})

// ---------------------------------------------------------------------------
// Domain routes
// ---------------------------------------------------------------------------

app.use('/api/auth', require('./routes/auth'))
app.use('/api/submissions', require('./routes/submissions'))
app.use('/api/parties', require('./routes/parties'))
app.use('/api/audit', require('./routes/audit'))
app.use('/api/search', require('./routes/search'))
app.use('/api/quotes', require('./routes/quotes'))
app.use('/api/lookups', require('./routes/lookups'))

// ── Dashboard stub routes (safe empty responses until domain tables are built) ──
// REQ: backend/routes/dashboard-stubs.requirements.md
const {
    policiesRouter,
    baRouter,
    notificationsRouter,
    recentRecordsRouter,
    tasksRouter,
    dashboardWidgetsRouter,
} = require('./routes/dashboard-stubs')
app.use('/api/policies', policiesRouter)
app.use('/api/binding-authorities', baRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/recent-records-data', recentRecordsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/dashboards', dashboardWidgetsRouter)

// ── Reporting domain routes ──
const { reportTemplatesRouter, fieldMappingsRouter } = require('./routes/reporting')
app.use('/api/report-templates', reportTemplatesRouter)
app.use('/api/report-field-mappings', fieldMappingsRouter)

// ── Static lookups served directly from Express ──
const { authenticateToken } = require('./middleware/auth')
app.get('/api/date-basis', authenticateToken, (_req, res) => {
    res.json(['Created Date', 'Inception Date', 'Expiry Date'])
})

// ---------------------------------------------------------------------------
// 404 catch-all for unknown API routes
// ---------------------------------------------------------------------------

app.use('/api/*path', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
})

// ---------------------------------------------------------------------------
// Global Express error handler — catches any unhandled route error
// Any error that reaches here was not caught by a route's own try/catch.
// Logged with ERR_UNKNOWN so PolicyForge admins can identify gaps.
// (§16-Error-Handling-Standards.md)
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use(async (err, req, res, _next) => {
    const message = err?.message ?? 'An unknown error occurred'
    console.error('[UNHANDLED ROUTE ERROR]', message, err?.stack ?? '')
    try {
        await runQuery(
            `INSERT INTO error_log (org_code, user_name, source, error_code, description, context)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                req.user?.orgCode ?? null,
                req.user?.name ?? null,
                `${req.method} ${req.path}`,
                'ERR_UNKNOWN',
                message,
                JSON.stringify({ stack: err?.stack?.split('\n').slice(0, 4) ?? [] }),
            ]
        )
    } catch (_) { /* non-fatal — never let logging break the response */ }
    if (!res.headersSent) {
        res.status(500).json({ error: 'An unexpected error occurred' })
    }
})

// ---------------------------------------------------------------------------
// Process-level safety net — catches anything that escapes Express entirely
// (unhandled promise rejections, thrown errors outside request context)
// ---------------------------------------------------------------------------

process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason)
    console.error('[UNHANDLED REJECTION]', message)
    runQuery(
        `INSERT INTO error_log (org_code, user_name, source, error_code, description, context)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [null, null, 'process:unhandledRejection', 'ERR_UNKNOWN', message, JSON.stringify({})]
    ).catch(() => { /* ignore logging failure */ })
})

process.on('uncaughtException', (err) => {
    const message = err?.message ?? 'Unknown uncaught exception'
    console.error('[UNCAUGHT EXCEPTION]', message, err?.stack ?? '')
    runQuery(
        `INSERT INTO error_log (org_code, user_name, source, error_code, description, context)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            null, null,
            'process:uncaughtException',
            'ERR_UNKNOWN',
            message,
            JSON.stringify({ stack: err?.stack?.split('\n').slice(0, 4) ?? [] }),
        ]
    ).catch(() => { /* ignore logging failure */ })
    // Allow time for the DB write before the process manager restarts the server
    setTimeout(() => process.exit(1), 500)
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT ?? 5000)
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`[server] PolicyForge Cleaned backend running on http://127.0.0.1:${PORT}`)
})

server.on('error', (err) => {
    console.error(`[server] Failed to start on port ${PORT}: ${err.message}`)
    process.exit(1)
})

module.exports = app
