/**
 * Parties Route — /api/parties
 *
 * Requirements: parties.requirements.md
 *
 * All routes require a valid JWT.  Data is scoped by orgCode
 * from the JWT payload (multi-tenant isolation — §05-Multi-Tenant-Rules.md).
 *
 * Table: party (existing BackUp schema — see create-parties-table.js for new schema)
 *   id          SERIAL PRIMARY KEY
 *   name        VARCHAR
 *   role        VARCHAR   — maps to `type` in the frontend API
 *   "orgCode"   VARCHAR
 *   (+ additional address/info fields — not used by InsuredSearch)
 *
 * The API returns `role` aliased as `type` so the frontend Party interface is stable.
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
// R01 — GET /api/parties
// Returns parties scoped to the caller's org.
// Supports ?type=<value> and ?search=<name fragment> query params.
// ---------------------------------------------------------------------------

router.get('/', async (req, res) => {
    const orgCode = req.user.orgCode
    const { type, search } = req.query

    try {
        const params = [orgCode]
        // Return all columns — extended fields added in migration 004
        let sql = `
            SELECT id, name, role AS "type", "orgCode",
                   reference, email, phone,
                   "addressLine1", "addressLine2", "addressLine3",
                   city, state, postcode, country, region,
                   "wageRoll", "numberEmployees", "annualRevenue",
                   "sicStandard", "sicCode", "sicDescription",
                   "createdBy", "createdDate"
            FROM party
            WHERE "orgCode" = $1`

        if (type) {
            params.push(type)
            sql += ` AND role = $${params.length}`
        }

        if (search) {
            params.push(`%${search}%`)
            sql += ` AND name ILIKE $${params.length}`
        }

        sql += ` ORDER BY name ASC`

        const rows = await runQuery(sql, params)
        res.json(rows)
    } catch (err) {
        console.error('[GET /api/parties] Error:', err.message)
        await logError(req, 'GET /api/parties', 'ERR_PARTY_FETCH_500', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// R02 — POST /api/parties
// Creates a new party record and returns the created row.
// ---------------------------------------------------------------------------

router.post('/', async (req, res) => {
    const orgCode = req.user.orgCode
    const {
        name,
        type,
        reference,
        email,
        phone,
        addressLine1,
        addressLine2,
        addressLine3,
        city,
        state,
        postcode,
        country,
        region,
        createdBy,
    } = req.body

    // R02: name is required
    if (!name) {
        await logError(req, 'POST /api/parties', 'ERR_PARTY_CREATE_MISSING_NAME', 'name is required')
        return res.status(400).json({ error: 'name is required' })
    }

    // R02: type is required
    if (!type) {
        await logError(req, 'POST /api/parties', 'ERR_PARTY_CREATE_MISSING_TYPE', 'type is required')
        return res.status(400).json({ error: 'type is required' })
    }

    try {
        const rows = await runCommand(
            `INSERT INTO party (
                name, role, "orgCode",
                reference, email, phone,
                "addressLine1", "addressLine2", "addressLine3",
                city, state, postcode, country, region,
                "createdBy"
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
            RETURNING id, name, role AS "type", "orgCode",
                      reference, email, phone,
                      "addressLine1", "addressLine2", "addressLine3",
                      city, state, postcode, country, region,
                      "createdBy", "createdDate"`,
            [
                name,
                type,
                orgCode,            // R02: always from JWT — ignores caller value
                reference ?? null,
                email ?? null,
                phone ?? null,
                addressLine1 ?? null,
                addressLine2 ?? null,
                addressLine3 ?? null,
                city ?? null,
                state ?? null,
                postcode ?? null,
                country ?? null,
                region ?? null,
                createdBy ?? null,
            ]
        )

        if (!rows || rows.length === 0) {
            await logError(req, 'POST /api/parties', 'ERR_PARTY_CREATE_500', 'Insert returned no rows')
            return res.status(500).json({ error: 'Insert returned no rows' })
        }

        res.status(201).json(rows[0])
    } catch (err) {
        console.error('[POST /api/parties] Error:', err.message)
        await logError(req, 'POST /api/parties', 'ERR_PARTY_CREATE_500', err.message)
        res.status(500).json({ error: err.message })
    }
})

module.exports = router
