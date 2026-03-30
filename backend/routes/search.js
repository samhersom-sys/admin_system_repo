/**
 * Search Route — /api/search
 *
 * Requirements: search.requirements.md
 *
 * GET /api/search — cross-domain global search.
 *
 * Default mode (no filters): returns the current user's most-recently-opened
 * records from audit_event, up to 15 per type. Falls back to createdDate order
 * when the user has no audit events (REQ-SEARCH-BE-F-004).
 *
 * Filter mode (any param supplied): runs ILIKE queries against all relevant
 * entity tables, scoped by orgCode.
 *
 * All routes require a valid JWT.
 * orgCode always from req.user — never trusted from client.
 */

'use strict'

const express = require('express')
const router = express.Router()
const { runQuery } = require('../db')
const { authenticateToken } = require('../middleware/auth')

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

const VALID_TYPES = new Set(['Submission', 'Quote', 'Policy', 'BindingAuthority', 'Party', 'Claim'])
const DATE_PARAMS = ['inceptionFrom', 'inceptionTo', 'expiryFrom', 'expiryTo', 'lastOpenedFrom', 'lastOpenedTo', 'createdFrom', 'createdTo']

const QUOTE_SEARCH_SELECT = `
    SELECT
        id,
        reference,
        insured,
        status,
    NULL::text AS "yearOfAccount",
        inception_date AS "inceptionDate",
        expiry_date AS "expiryDate",
        created_date AS "createdDate",
        created_by AS "createdBy"
`

const POLICY_SEARCH_SELECT = `
    SELECT
        id,
        reference,
        insured,
        status,
        NULL::text AS "yearOfAccount",
        inception_date AS "inceptionDate",
        expiry_date AS "expiryDate",
        created_date AS "createdDate",
        created_by AS "createdBy"
`

const BINDING_AUTHORITY_SEARCH_SELECT = `
    SELECT
        ba.id,
        ba.reference,
        ba.status,
        s.insured,
        ba.year_of_account AS "yearOfAccount",
        ba.inception_date AS "inceptionDate",
        ba.expiry_date AS "expiryDate",
        ba.created_at AS "createdDate",
        ba.created_by AS "createdBy"
`

const CLAIM_SEARCH_SELECT = `
    SELECT
        c.id,
        c.reference,
        c.status,
        c.created_at AS "createdDate",
        NULL::text AS "createdBy"
`

function isValidDate(str) {
    if (!str) return true // absent = valid (not required)
    return !isNaN(Date.parse(str))
}

// ---------------------------------------------------------------------------
// GET /api/search
// ---------------------------------------------------------------------------

router.get('/', async (req, res) => {
    const orgCode = req.user.orgCode
    const userId = req.user.id ?? null
    const userName = req.user.username || req.user.email || null

    const q = req.query

    // REQ-SEARCH-BE-F-007 — validate type(s) if supplied
    // Accept comma-separated 'types' param (new) or single 'type' param (legacy)
    const requestedTypes = q.types
        ? q.types.split(',').filter(t => VALID_TYPES.has(t))
        : (q.type && VALID_TYPES.has(q.type) ? [q.type] : [])

    if (q.types && requestedTypes.length === 0) {
        await logError(req, 'GET /api/search', 'ERR_SEARCH_INVALID_TYPES', `Invalid types: ${q.types}`)
        return res.status(400).json({ error: `Invalid types. Each must be one of: ${[...VALID_TYPES].join(', ')}` })
    }
    if (q.type && !q.types && !VALID_TYPES.has(q.type)) {
        await logError(req, 'GET /api/search', 'ERR_SEARCH_INVALID_TYPE', `Invalid type: ${q.type}`)
        return res.status(400).json({ error: `Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}` })
    }

    // REQ-SEARCH-BE-F-009 — validate date params
    for (const dp of DATE_PARAMS) {
        if (q[dp] && !isValidDate(q[dp])) {
            await logError(req, 'GET /api/search', 'ERR_SEARCH_INVALID_DATE', `Invalid date for ${dp}: ${q[dp]}`, { param: dp })
            return res.status(400).json({ error: `Invalid date value for ${dp}: "${q[dp]}"` })
        }
    }

    const hasFilters = Boolean(
        requestedTypes.length > 0 || q.reference || q.status || q.insured || q.broker ||
        q.yearOfAccount || q.inceptionFrom || q.inceptionTo || q.expiryFrom || q.expiryTo ||
        q.lastOpenedFrom || q.lastOpenedTo || q.createdFrom || q.createdTo || q.createdBy
    )

    try {
        if (!hasFilters) {
            return res.json(await defaultMode(orgCode, userId, userName))
        } else {
            return res.json(await filterMode(q, orgCode, requestedTypes))
        }
    } catch (err) {
        console.error('[GET /api/search] Error:', err.message)
        await logError(req, 'GET /api/search', 'ERR_SEARCH_500', err.message)
        return res.status(500).json({ error: err.message })
    }
})

// ---------------------------------------------------------------------------
// Default mode — most recently opened by this user, or most recently created
// ---------------------------------------------------------------------------

async function defaultMode(orgCode, userId, userName) {
    // Find entity IDs this user has recently opened/updated
    let auditRows = []
    if (userId || userName) {
        const userFilter = userId
            ? `AND (ae.user_id = $2 OR (ae.user_id IS NULL AND ae.user_name = $3))`
            : `AND ae.user_name = $2`
        const params = userId ? [orgCode, userId, userName] : [orgCode, userName]

        // We don't filter by orgCode in audit_event (no org column) — we match after fetching entity data
        const auditSql = `
            SELECT ae.entity_type, ae.entity_id, MAX(ae.created_at) AS last_opened
            FROM public.audit_event ae
            WHERE (ae.action ILIKE '%Opened%' OR ae.action ILIKE '%Updated%')
              ${userId
                ? `AND (ae.user_id = $1 OR (ae.user_id IS NULL AND ae.user_name = $2))`
                : `AND ae.user_name = $1`
            }
            GROUP BY ae.entity_type, ae.entity_id
            ORDER BY last_opened DESC
            LIMIT 90
        `
        const auditParams = userId ? [userId, userName] : [userName]
        auditRows = await runQuery(auditSql, auditParams)
    }

    // Group audit rows by type → { Submission: [{entityId, last_opened}, ...], ... }
    const auditByType = {}
    for (const row of auditRows) {
        if (!auditByType[row.entity_type]) auditByType[row.entity_type] = []
        auditByType[row.entity_type].push({ id: row.entity_id, lastOpenedDate: row.last_opened })
    }

    const result = { submissions: [], quotes: [], policies: [], bindingAuthorities: [], parties: [], claims: [] }

    // Fetch submissions
    const subAudit = (auditByType['Submission'] || []).slice(0, 15)
    if (subAudit.length > 0) {
        const ids = subAudit.map(a => a.id)
        const rows = await runQuery(
            `SELECT id, reference, insured, status, "inceptionDate", "expiryDate", "createdDate", "createdBy"
             FROM submission WHERE id = ANY($1) AND "createdByOrgCode" = $2`,
            [ids, orgCode]
        )
        const lastOpenedMap = Object.fromEntries(subAudit.map(a => [a.id, a.lastOpenedDate]))
        result.submissions = rows.map(r => ({ ...r, lastOpenedDate: lastOpenedMap[r.id] ?? null }))
    } else {
        // REQ-SEARCH-BE-F-004 — fallback to most recently created
        const rows = await runQuery(
            `SELECT id, reference, insured, status, "inceptionDate", "expiryDate", "createdDate", "createdBy"
             FROM submission WHERE "createdByOrgCode" = $1 ORDER BY "createdDate" DESC LIMIT 15`,
            [orgCode]
        )
        result.submissions = rows.map(r => ({ ...r, lastOpenedDate: null }))
    }

    // Fetch parties
    const partyAudit = (auditByType['Party'] || []).slice(0, 15)
    if (partyAudit.length > 0) {
        const ids = partyAudit.map(a => a.id)
        const rows = await runQuery(
            `SELECT id, name, role FROM party WHERE id = ANY($1) AND "orgCode" = $2`,
            [ids, orgCode]
        )
        const lastOpenedMap = Object.fromEntries(partyAudit.map(a => [a.id, a.lastOpenedDate]))
        result.parties = rows.map(r => ({ ...r, lastOpenedDate: lastOpenedMap[r.id] ?? null }))
    } else {
        const rows = await runQuery(
            `SELECT id, name, role FROM party WHERE "orgCode" = $1 ORDER BY "createdDate" DESC LIMIT 15`,
            [orgCode]
        )
        result.parties = rows.map(r => ({ ...r, lastOpenedDate: null }))
    }

    // Quote, Policy, BindingAuthority, Claim — same pattern; return empty arrays if tables not yet populated
    result.quotes = await fetchWithAuditOrFallback(
        auditByType['Quote'], orgCode,
        (ids) => runQuery(
            `${QUOTE_SEARCH_SELECT}
             FROM quotes
             WHERE id = ANY($1) AND created_by_org_code = $2 AND deleted_at IS NULL`,
            [ids, orgCode]
        ),
        () => runQuery(
            `${QUOTE_SEARCH_SELECT}
             FROM quotes
             WHERE created_by_org_code = $1 AND deleted_at IS NULL
             ORDER BY created_date DESC
             LIMIT 15`,
            [orgCode]
        )
    )

    result.policies = await fetchWithAuditOrFallback(
        auditByType['Policy'], orgCode,
        (ids) => runQuery(
            `${POLICY_SEARCH_SELECT}
             FROM policies
             WHERE id = ANY($1) AND created_by_org_code = $2`,
            [ids, orgCode]
        ),
        () => runQuery(
            `${POLICY_SEARCH_SELECT}
             FROM policies
             WHERE created_by_org_code = $1
             ORDER BY created_date DESC
             LIMIT 15`,
            [orgCode]
        )
    )

    result.bindingAuthorities = await fetchWithAuditOrFallback(
        auditByType['BindingAuthority'], orgCode,
        (ids) => runQuery(
            `${BINDING_AUTHORITY_SEARCH_SELECT}
             FROM binding_authorities ba
             LEFT JOIN submission s ON s.id = ba.submission_id
             WHERE ba.id = ANY($1) AND ba.created_by_org_code = $2`,
            [ids, orgCode]
        ),
        () => runQuery(
            `${BINDING_AUTHORITY_SEARCH_SELECT}
             FROM binding_authorities ba
             LEFT JOIN submission s ON s.id = ba.submission_id
             WHERE ba.created_by_org_code = $1
             ORDER BY ba.created_at DESC
             LIMIT 15`,
            [orgCode]
        )
    )

    result.claims = await fetchWithAuditOrFallback(
        auditByType['Claim'], orgCode,
        (ids) => runQuery(
            `${CLAIM_SEARCH_SELECT}
             FROM claims c
             INNER JOIN policies p ON p.id = c.policy_id
             WHERE c.id = ANY($1) AND p.created_by_org_code = $2`,
            [ids, orgCode]
        ),
        () => runQuery(
            `${CLAIM_SEARCH_SELECT}
             FROM claims c
             INNER JOIN policies p ON p.id = c.policy_id
             WHERE p.created_by_org_code = $1
             ORDER BY c.created_at DESC
             LIMIT 15`,
            [orgCode]
        )
    )

    return result
}

async function fetchWithAuditOrFallback(auditEntries, orgCode, fetchByIds, fetchFallback) {
    const entries = (auditEntries || []).slice(0, 15)
    try {
        if (entries.length > 0) {
            const ids = entries.map(a => a.id)
            const lastOpenedMap = Object.fromEntries(entries.map(a => [a.id, a.lastOpenedDate]))
            const rows = await fetchByIds(ids)
            return rows.map(r => ({ ...r, lastOpenedDate: lastOpenedMap[r.id] ?? null }))
        } else {
            const rows = await fetchFallback()
            return rows.map(r => ({ ...r, lastOpenedDate: null }))
        }
    } catch {
        // Table may not exist yet — return empty array rather than crashing
        return []
    }
}

// ---------------------------------------------------------------------------
// Filter mode — ILIKE queries on all (or selected) entity tables
// ---------------------------------------------------------------------------

async function filterMode(q, orgCode, requestedTypes) {
    const result = { submissions: [], quotes: [], policies: [], bindingAuthorities: [], parties: [], claims: [] }

    const runForType = async (type, queryFn) => {
        if (requestedTypes.length > 0 && !requestedTypes.includes(type)) return []
        try {
            return await queryFn()
        } catch {
            return []
        }
    }

    // Helper: build ILIKE + date WHERE clauses
    function buildClause(baseParams, fields) {
        const columnName = (fieldKey, fallback) => {
            const configured = fields[fieldKey]
            if (!configured) return null
            return configured === true ? fallback : configured
        }

        const clauses = []
        const params = [...baseParams]

        const referenceColumn = columnName('reference', 'reference')
        const statusColumn = columnName('status', 'status')
        const insuredColumn = columnName('insured', 'insured')
        const brokerColumn = columnName('broker', '"placingBroker"')
        const yearOfAccountColumn = columnName('yearOfAccount', '"yearOfAccount"')
        const inceptionDateColumn = columnName('inceptionDate', '"inceptionDate"')
        const expiryDateColumn = columnName('expiryDate', '"expiryDate"')
        const createdDateColumn = columnName('createdDate', '"createdDate"')
        const createdByColumn = columnName('createdBy', '"createdBy"')

        if (referenceColumn && q.reference) {
            params.push(`%${q.reference}%`)
            clauses.push(`LOWER(${referenceColumn}) LIKE LOWER($${params.length})`)
        }
        if (statusColumn && q.status) {
            params.push(`%${q.status}%`)
            clauses.push(`LOWER(${statusColumn}) LIKE LOWER($${params.length})`)
        }
        if (insuredColumn && q.insured) {
            params.push(`%${q.insured}%`)
            clauses.push(`LOWER(${insuredColumn}) LIKE LOWER($${params.length})`)
        }
        if (brokerColumn && q.broker) {
            params.push(`%${q.broker}%`)
            clauses.push(`LOWER(${brokerColumn}) LIKE LOWER($${params.length})`)
        }
        if (yearOfAccountColumn && q.yearOfAccount) {
            params.push(q.yearOfAccount)
            clauses.push(`${yearOfAccountColumn} = $${params.length}`)
        }
        if (inceptionDateColumn) {
            if (q.inceptionFrom) { params.push(q.inceptionFrom); clauses.push(`${inceptionDateColumn} >= $${params.length}`) }
            if (q.inceptionTo) { params.push(q.inceptionTo); clauses.push(`${inceptionDateColumn} <= $${params.length}`) }
        }
        if (expiryDateColumn) {
            if (q.expiryFrom) { params.push(q.expiryFrom); clauses.push(`${expiryDateColumn} >= $${params.length}`) }
            if (q.expiryTo) { params.push(q.expiryTo); clauses.push(`${expiryDateColumn} <= $${params.length}`) }
        }
        if (createdDateColumn) {
            if (q.createdFrom) { params.push(q.createdFrom); clauses.push(`${createdDateColumn} >= $${params.length}`) }
            if (q.createdTo) { params.push(q.createdTo); clauses.push(`${createdDateColumn} <= $${params.length}`) }
        }
        if (createdByColumn && q.createdBy) {
            params.push(`%${q.createdBy}%`)
            clauses.push(`LOWER(${createdByColumn}) LIKE LOWER($${params.length})`)
        }

        const where = clauses.length ? ` AND ${clauses.join(' AND ')}` : ''
        return { where, params }
    }

    // Filter by lastOpened date range after audit attachment (REQ-SEARCH-BE-F-019)
    function filterByLastOpened(rows) {
        if (!q.lastOpenedFrom && !q.lastOpenedTo) return rows
        return rows.filter(r => {
            if (!r.lastOpenedDate) return false
            const d = new Date(r.lastOpenedDate)
            if (q.lastOpenedFrom && d < new Date(q.lastOpenedFrom)) return false
            if (q.lastOpenedTo && d > new Date(q.lastOpenedTo + 'T23:59:59Z')) return false
            return true
        })
    }

    // Submissions
    result.submissions = await runForType('Submission', async () => {
        const { where, params } = buildClause(
            [orgCode],
            { reference: true, status: true, insured: true, broker: true, yearOfAccount: true, inceptionDate: true, expiryDate: true, createdDate: true, createdBy: true }
        )
        const rows = await runQuery(
            `SELECT id, reference, insured, status, "yearOfAccount", "inceptionDate", "expiryDate", "createdDate", "createdBy"
             FROM submission WHERE "createdByOrgCode" = $1${where} ORDER BY "createdDate" DESC LIMIT 200`,
            params
        )
        return filterByLastOpened(await attachLastOpened(rows, 'Submission'))
    })

    // Parties — REQ-SEARCH-BE-F-016 / F-017: insured → non-broker parties; broker → broker parties
    result.parties = await runForType('Party', async () => {
        const params = [orgCode]
        const clauses = []

        if (q.insured && q.broker) {
            // Both supplied: non-broker parties matching insured term OR broker parties matching broker term
            params.push(`%${q.insured}%`)
            const insIdx = params.length
            params.push(`%${q.broker}%`)
            const brkIdx = params.length
            clauses.push(`((LOWER(name) LIKE LOWER($${insIdx}) AND role != 'Broker') OR (LOWER(name) LIKE LOWER($${brkIdx}) AND role = 'Broker'))`)
        } else if (q.insured) {
            params.push(`%${q.insured}%`)
            clauses.push(`(LOWER(name) LIKE LOWER($${params.length}) AND role != 'Broker')`)
        } else if (q.broker) {
            params.push(`%${q.broker}%`)
            clauses.push(`(LOWER(name) LIKE LOWER($${params.length}) AND role = 'Broker')`)
        }

        if (q.reference) { params.push(`%${q.reference}%`); clauses.push(`LOWER(name) LIKE LOWER($${params.length})`) }
        if (q.createdFrom) { params.push(q.createdFrom); clauses.push(`"createdDate" >= $${params.length}`) }
        if (q.createdTo) { params.push(q.createdTo); clauses.push(`"createdDate" <= $${params.length}`) }
        if (q.createdBy) { params.push(`%${q.createdBy}%`); clauses.push(`LOWER("createdBy") LIKE LOWER($${params.length})`) }

        const where = clauses.length ? ` AND ${clauses.join(' AND ')}` : ''
        const rows = await runQuery(
            `SELECT id, name, role, "createdDate", "createdBy" FROM party WHERE "orgCode" = $1${where} ORDER BY "createdDate" DESC LIMIT 200`,
            params
        )
        return filterByLastOpened(await attachLastOpened(rows, 'Party'))
    })

    result.quotes = await runForType('Quote', async () => {
        const { where, params } = buildClause([orgCode], {
            reference: true,
            status: true,
            insured: true,
            inceptionDate: 'inception_date',
            expiryDate: 'expiry_date',
            createdDate: 'created_date',
            createdBy: 'created_by',
        })
        const rows = await runQuery(
            `${QUOTE_SEARCH_SELECT}
             FROM quotes
             WHERE created_by_org_code = $1 AND deleted_at IS NULL${where}
             ORDER BY created_date DESC
             LIMIT 200`,
            params
        ).catch(() => [])
        return filterByLastOpened(await attachLastOpened(rows, 'Quote'))
    })

    result.policies = await runForType('Policy', async () => {
        const { where, params } = buildClause([orgCode], {
            reference: true,
            status: true,
            insured: true,
            broker: 'placing_broker',
            inceptionDate: 'inception_date',
            expiryDate: 'expiry_date',
            createdDate: 'created_date',
            createdBy: 'created_by',
        })
        const rows = await runQuery(
            `${POLICY_SEARCH_SELECT}
             FROM policies
             WHERE created_by_org_code = $1${where}
             ORDER BY created_date DESC
             LIMIT 200`,
            params
        ).catch(() => [])
        return filterByLastOpened(await attachLastOpened(rows, 'Policy'))
    })

    result.bindingAuthorities = await runForType('BindingAuthority', async () => {
        const { where, params } = buildClause([orgCode], {
            reference: 'ba.reference',
            status: 'ba.status',
            yearOfAccount: 'ba.year_of_account',
            inceptionDate: 'ba.inception_date',
            expiryDate: 'ba.expiry_date',
            createdDate: 'ba.created_at',
            createdBy: 'ba.created_by',
        })
        const rows = await runQuery(
            `${BINDING_AUTHORITY_SEARCH_SELECT}
             FROM binding_authorities ba
             LEFT JOIN submission s ON s.id = ba.submission_id
             WHERE ba.created_by_org_code = $1${where}
             ORDER BY ba.created_at DESC
             LIMIT 200`,
            params
        ).catch(() => [])
        return filterByLastOpened(await attachLastOpened(rows, 'BindingAuthority'))
    })

    result.claims = await runForType('Claim', async () => {
        const { where, params } = buildClause([orgCode], {
            reference: 'c.reference',
            status: 'c.status',
            createdDate: 'c.created_at',
        })
        const rows = await runQuery(
            `${CLAIM_SEARCH_SELECT}
             FROM claims c
             INNER JOIN policies p ON p.id = c.policy_id
             WHERE p.created_by_org_code = $1${where}
             ORDER BY c.created_at DESC
             LIMIT 200`,
            params
        ).catch(() => [])
        return filterByLastOpened(await attachLastOpened(rows, 'Claim'))
    })

    return result
}

// Attach lastOpenedDate from audit_event to a batch of entity rows
// REQ-SEARCH-BE-F-010
async function attachLastOpened(rows, entityType) {
    if (!rows.length) return rows
    const ids = rows.map(r => r.id)
    try {
        const auditRows = await runQuery(
            `SELECT entity_id, MAX(created_at) AS last_opened
             FROM public.audit_event
             WHERE entity_type = $1 AND entity_id = ANY($2)
               AND (action ILIKE '%Opened%' OR action ILIKE '%Updated%')
             GROUP BY entity_id`,
            [entityType, ids]
        )
        const map = Object.fromEntries(auditRows.map(a => [a.entity_id, a.last_opened]))
        return rows.map(r => ({ ...r, lastOpenedDate: map[r.id] ?? null }))
    } catch {
        return rows.map(r => ({ ...r, lastOpenedDate: null }))
    }
}

module.exports = router
