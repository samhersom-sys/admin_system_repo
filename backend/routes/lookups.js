/**
 * Lookups Route — /api/lookups
 *
 * Serves static reference data from lookup tables.
 * All routes require a valid JWT.
 *
 * Endpoints:
 *   GET /api/lookups/contractTypes       → string[]
 *   GET /api/lookups/methodsOfPlacement  → string[]
 *   GET /api/lookups/renewalStatuses     → string[]
 */

'use strict'

const express = require('express')
const router = express.Router()
const { runQuery } = require('../db')
const { authenticateToken } = require('../middleware/auth')

router.use(authenticateToken)

router.get('/contractTypes', async (_req, res) => {
    try {
        const rows = await runQuery('SELECT name FROM lookup_contract_types ORDER BY id')
        res.json(rows.map((r) => r.name))
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.get('/methodsOfPlacement', async (_req, res) => {
    try {
        const rows = await runQuery('SELECT name FROM lookup_methods_of_placement ORDER BY id')
        res.json(rows.map((r) => r.name))
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.get('/renewalStatuses', async (_req, res) => {
    try {
        const rows = await runQuery('SELECT name FROM lookup_renewal_statuses ORDER BY id')
        res.json(rows.map((r) => r.name))
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router
