'use strict'
/**
 * Reporting Routes — Express implementation
 *
 * REQ: backend/routes/reporting.requirements.md
 *
 * Mirrors the NestJS ReportingController / ReportingService
 * using raw SQL queries against the same Postgres tables.
 */

const express = require('express')
const { authenticateToken } = require('../middleware/auth')
const { runQuery } = require('../db')

const router = express.Router()
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

// ---------------------------------------------------------------------------
// Field-mapping semantic layer (matches NestJS field-mappings.ts)
// ---------------------------------------------------------------------------

const DATA_SOURCES = {
    submissions: {
        table: 'submission',
        orgCol: '"createdByOrgCode"',
        fields: [
            { key: 'countAll', label: 'Count of Submissions', col: '*', type: 'count' },
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['open', 'bound', 'declined', 'closed', 'referred', 'quoted'] },
            { key: 'placingBroker', label: 'Placing Broker', col: '"placingBrokerName"' },
            { key: 'inceptionDate', label: 'Inception Date', col: '"inceptionDate"', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: '"expiryDate"', type: 'date' },
            { key: 'workflowStatus', label: 'Workflow Status', col: '"workflowStatus"', type: 'lookup', lookupValues: ['Created', 'In Review', 'Referred', 'Declined', 'Bound'] },
            { key: 'contractType', label: 'Contract Type', col: '"contractType"' },
            { key: 'submissionType', label: 'Submission Type', col: '"submissionType"' },
            { key: 'clearanceStatus', label: 'Clearance Status', col: '"clearanceStatus"', type: 'lookup', lookupValues: ['pending', 'cleared', 'referred', 'declined'] },
        ],
    },
    policies: {
        table: 'policies',
        orgCol: 'created_by_org_code',
        fields: [
            { key: 'countAll', label: 'Count of Policies', col: '*', type: 'count' },
            { key: 'countActive', label: 'Count of Active Policies', col: '*', type: 'count', filterExpr: "status = 'active'" },
            { key: 'grossWrittenPremium', label: 'Gross Net Written Premium', col: 'gross_written_premium', type: 'number' },
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['active', 'expired', 'cancelled', 'pending'] },
            { key: 'placingBroker', label: 'Placing Broker', col: 'placing_broker' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
            { key: 'businessType', label: 'Business Type', col: 'business_type' },
            { key: 'contractType', label: 'Contract Type', col: 'contract_type' },
            { key: 'newOrRenewal', label: 'New or Renewal', col: 'new_or_renewal', type: 'lookup', lookupValues: ['New', 'Renewal'] },
        ],
    },
    quotes: {
        table: 'quotes',
        orgCol: 'created_by_org_code',
        fields: [
            { key: 'countAll', label: 'Count of Quotes', col: '*', type: 'count' },
            { key: 'countDeclined', label: 'Count of Declined Quotes', col: '*', type: 'count', filterExpr: "status = 'declined'" },
            { key: 'countRenewable', label: 'Count of Renewable Quotes', col: '*', type: 'count', filterExpr: "renewable_indicator = 'Yes'" },
            { key: 'countRenewed', label: 'Count of Renewed Quotes', col: '*', type: 'count', filterExpr: "renewal_status = 'renewed'" },
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['draft', 'submitted', 'accepted', 'declined', 'expired'] },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
            { key: 'currency', label: 'Currency', col: 'quote_currency', type: 'lookup', lookupValues: ['GBP', 'USD', 'EUR', 'CAD', 'AUD'] },
            { key: 'newOrRenewal', label: 'New or Renewal', col: 'new_or_renewal', type: 'lookup', lookupValues: ['New', 'Renewal'] },
        ],
    },
    quoteSections: {
        table: 'quote_sections',
        orgCol: '(SELECT created_by_org_code FROM quotes WHERE id = quote_sections.quote_id)',
        fields: [
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'classOfBusiness', label: 'Class of Business', col: 'class_of_business' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
            { key: 'grossPremium', label: 'Gross Premium', col: 'gross_premium', type: 'number' },
            { key: 'netPremium', label: 'Net Premium', col: 'net_premium', type: 'number' },
            { key: 'annualGrossPremium', label: 'Annual Gross Premium', col: 'annual_gross_premium', type: 'number' },
            { key: 'annualNetPremium', label: 'Annual Net Premium', col: 'annual_net_premium', type: 'number' },
            { key: 'writtenOrder', label: 'Written Order %', col: 'written_order', type: 'number' },
            { key: 'signedOrder', label: 'Signed Order %', col: 'signed_order', type: 'number' },
            { key: 'writtenLineTotal', label: 'Written Line Total', col: 'written_line_total', type: 'number' },
            { key: 'signedLineTotal', label: 'Signed Line Total', col: 'signed_line_total', type: 'number' },
            { key: 'sumInsuredAmount', label: 'Sum Insured Amount', col: 'sum_insured_amount', type: 'number' },
            { key: 'limitAmount', label: 'Limit Amount', col: 'limit_amount', type: 'number' },
            { key: 'daysOnCover', label: 'Days on Cover', col: 'days_on_cover', type: 'number' },
        ],
    },
    policyTransactions: {
        table: 'policy_transactions',
        orgCol: '(SELECT created_by_org_code FROM policies WHERE id = policy_transactions.policy_id)',
        fields: [
            { key: 'transactionType', label: 'Transaction Type', col: 'transaction_type', type: 'lookup', lookupValues: ['new_business', 'renewal', 'endorsement', 'cancellation', 'reinstatement'] },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['pending', 'processed', 'reversed'] },
            { key: 'effectiveDate', label: 'Effective Date', col: 'effective_date', type: 'date' },
        ],
    },
    bindingAuthorities: {
        table: 'binding_authorities',
        orgCol: 'created_by_org_code',
        fields: [
            { key: 'countAll', label: 'Count of Binding Authorities', col: '*', type: 'count' },
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'status', label: 'Status', col: 'status' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
        ],
    },
    parties: {
        table: 'party',
        orgCol: '"orgCode"',
        fields: [
            { key: 'name', label: 'Name', col: 'name' },
            { key: 'role', label: 'Role', col: 'role', type: 'lookup', lookupValues: ['broker', 'insured', 'underwriter', 'coverholder', 'third_party'] },
            { key: 'email', label: 'Email', col: 'email' },
            { key: 'phone', label: 'Phone', col: 'phone' },
            { key: 'city', label: 'City', col: 'city' },
            { key: 'country', label: 'Country', col: 'country', type: 'lookup', lookupValues: ['United Kingdom', 'United States', 'Germany', 'France', 'Australia', 'Canada'] },
            { key: 'reference', label: 'Reference', col: 'reference' },
        ],
    },
}

// ---------------------------------------------------------------------------
// Helper — map a DB row to the frontend DTO shape
// ---------------------------------------------------------------------------

function toTemplateDto(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description ?? null,
        type: row.type,
        data_source: row.data_source ?? null,
        date_basis: row.date_basis ?? null,
        date_from: row.date_from ?? null,
        date_to: row.date_to ?? null,
        sort_by: row.sort_by ?? null,
        sort_order: row.sort_order ?? 'asc',
        fields: row.fields ?? null,
        filters: row.filters ?? [],
        created_by: row.created_by ?? null,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    }
}

// ---------------------------------------------------------------------------
// REQ-RPT-BE-F-001 — GET /api/report-templates
// ---------------------------------------------------------------------------

router.get('/', async (req, res) => {
    try {
        const orgCode = req.user?.orgCode
        const rows = await runQuery(
            `SELECT * FROM report_templates
             WHERE type = 'core'
                OR (type IN ('custom', 'dashboard') AND org_code = $1)
             ORDER BY name ASC`,
            [orgCode]
        )
        res.json(rows.map(toTemplateDto))
    } catch (err) {
        await logError(req, 'GET /api/report-templates', 'ERR_RPT_LIST', err.message)
        res.status(500).json({ message: 'Failed to load report templates.' })
    }
})

// ---------------------------------------------------------------------------
// REQ-RPT-BE-F-002 — GET /api/report-templates/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid template ID.' })

        const rows = await runQuery('SELECT * FROM report_templates WHERE id = $1', [id])
        if (!rows.length) return res.status(404).json({ message: 'Report template not found.' })

        const t = rows[0]
        // Org-scope check for non-core templates
        if (t.type !== 'core' && t.org_code !== req.user?.orgCode) {
            return res.status(404).json({ message: 'Report template not found.' })
        }
        res.json(toTemplateDto(t))
    } catch (err) {
        await logError(req, `GET /api/report-templates/${req.params.id}`, 'ERR_RPT_GET', err.message)
        res.status(500).json({ message: 'Failed to load report template.' })
    }
})

// ---------------------------------------------------------------------------
// REQ-RPT-BE-F-003 — POST /api/report-templates
// ---------------------------------------------------------------------------

router.post('/', async (req, res) => {
    try {
        const { name, description, data_source, date_basis, date_from, date_to, sort_by, sort_order, fields, filters } = req.body
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ message: 'Name is required.' })
        }
        const type = req.body.type === 'dashboard' ? 'dashboard' : 'custom'
        const orgCode = req.user?.orgCode
        const userName = req.user?.name ?? req.user?.username ?? null

        const rows = await runQuery(
            `INSERT INTO report_templates
                 (org_code, name, description, type, data_source, date_basis, date_from, date_to, sort_by, sort_order, fields, filters, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                orgCode,
                name.trim(),
                description ?? null,
                type,
                data_source ?? null,
                date_basis ?? null,
                date_from ?? null,
                date_to ?? null,
                sort_by ?? null,
                sort_order ?? 'asc',
                fields != null ? JSON.stringify(fields) : null,
                JSON.stringify(Array.isArray(filters) ? filters : []),
                userName,
            ]
        )
        res.status(201).json(toTemplateDto(rows[0]))
    } catch (err) {
        await logError(req, 'POST /api/report-templates', 'ERR_RPT_CREATE', err.message)
        res.status(500).json({ message: 'Failed to create report template.' })
    }
})

// ---------------------------------------------------------------------------
// REQ-RPT-BE-F-004 — PUT /api/report-templates/:id
// ---------------------------------------------------------------------------

router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid template ID.' })
        const orgCode = req.user?.orgCode

        // Only allow editing custom/dashboard templates owned by the caller's org
        const existing = await runQuery(
            `SELECT * FROM report_templates
             WHERE id = $1 AND type IN ('custom', 'dashboard') AND org_code = $2`,
            [id, orgCode]
        )
        if (!existing.length) return res.status(404).json({ message: 'Report template not found.' })

        const b = req.body
        const sets = []
        const params = []
        let idx = 1

        const updatable = ['name', 'description', 'data_source', 'date_basis', 'date_from', 'date_to', 'sort_by', 'sort_order']
        for (const col of updatable) {
            if (b[col] !== undefined) {
                sets.push(`${col} = $${idx++}`)
                params.push(b[col])
            }
        }
        if (b.fields !== undefined) {
            sets.push(`fields = $${idx++}`)
            params.push(b.fields != null ? JSON.stringify(b.fields) : null)
        }
        if (b.filters !== undefined) {
            sets.push(`filters = $${idx++}`)
            params.push(JSON.stringify(Array.isArray(b.filters) ? b.filters : []))
        }

        if (sets.length === 0) {
            return res.json(toTemplateDto(existing[0]))
        }

        sets.push(`updated_at = NOW()`)
        params.push(id)
        const rows = await runQuery(
            `UPDATE report_templates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            params
        )
        res.json(toTemplateDto(rows[0]))
    } catch (err) {
        await logError(req, `PUT /api/report-templates/${req.params.id}`, 'ERR_RPT_UPDATE', err.message)
        res.status(500).json({ message: 'Failed to update report template.' })
    }
})

// ---------------------------------------------------------------------------
// REQ-RPT-BE-F-005 — DELETE /api/report-templates/:id
// ---------------------------------------------------------------------------

router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid template ID.' })
        const orgCode = req.user?.orgCode

        const existing = await runQuery(
            `SELECT id FROM report_templates
             WHERE id = $1 AND type IN ('custom', 'dashboard') AND org_code = $2`,
            [id, orgCode]
        )
        if (!existing.length) return res.status(404).json({ message: 'Report template not found.' })

        await runQuery('DELETE FROM report_templates WHERE id = $1', [id])
        res.status(204).end()
    } catch (err) {
        await logError(req, `DELETE /api/report-templates/${req.params.id}`, 'ERR_RPT_DELETE', err.message)
        res.status(500).json({ message: 'Failed to delete report template.' })
    }
})

// ---------------------------------------------------------------------------
// REQ-RPT-BE-F-006 — POST /api/report-templates/:id/run
// ---------------------------------------------------------------------------

router.post('/:id/run', async (req, res) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid template ID.' })
    const orgCode = req.user?.orgCode
    const userName = req.user?.name ?? req.user?.username ?? null

    try {
        // 1. Fetch template
        const tRows = await runQuery('SELECT * FROM report_templates WHERE id = $1', [id])
        if (!tRows.length) return res.status(404).json({ message: 'Report template not found.' })
        const t = tRows[0]
        if (t.type !== 'core' && t.org_code !== orgCode) {
            return res.status(404).json({ message: 'Report template not found.' })
        }

        // 2. Resolve data source config
        const sourceConfig = DATA_SOURCES[t.data_source]
        if (!sourceConfig) {
            // Record error in history
            await runQuery(
                `INSERT INTO report_execution_history (template_id, run_by, row_count, status)
                 VALUES ($1, $2, 0, 'error')`,
                [id, userName]
            )
            return res.json({ data: [] })
        }

        // 3. Build allow-list of field keys → SQL columns
        const allowedCols = new Map(sourceConfig.fields.map((f) => [f.key, f]))

        // 4. Build SELECT clause
        const requestedFields = Array.isArray(t.fields)
            ? t.fields.filter((k) => allowedCols.has(k))
            : []
        const fieldsToUse = requestedFields.length > 0
            ? requestedFields.map((k) => allowedCols.get(k))
            : sourceConfig.fields

        const selectExprs = fieldsToUse.map((f) => {
            if (f.type === 'count') {
                const countExpr = f.filterExpr ? `COUNT(*) FILTER (WHERE ${f.filterExpr})` : 'COUNT(*)'
                return `${countExpr} AS "${f.key}"`
            }
            return `${f.col} AS "${f.key}"`
        }).join(', ')

        const hasAggregates = fieldsToUse.some((f) => f.type === 'count')

        // 5. Build parameterised WHERE clause
        const params = [orgCode]
        const wheres = [`${sourceConfig.orgCol} = $1`]
        let pIdx = 2

        // Date range
        if (t.date_basis && allowedCols.has(t.date_basis)) {
            const dateCol = allowedCols.get(t.date_basis).col
            if (t.date_from) {
                wheres.push(`${dateCol} >= $${pIdx}`)
                params.push(t.date_from)
                pIdx++
            }
            if (t.date_to) {
                wheres.push(`${dateCol} <= $${pIdx}`)
                params.push(t.date_to)
                pIdx++
            }
        }

        // Row filters
        const filters = Array.isArray(t.filters) ? t.filters : []
        for (const filter of filters) {
            if (!allowedCols.has(filter.field)) continue
            const colExpr = allowedCols.get(filter.field).col
            if (filter.operator === 'eq' || filter.operator === '=') {
                wheres.push(`${colExpr} = $${pIdx}`)
                params.push(filter.value)
                pIdx++
            } else if (filter.operator === 'contains') {
                wheres.push(`${colExpr} ILIKE $${pIdx}`)
                params.push(`%${filter.value}%`)
                pIdx++
            }
        }

        // 6. Sort clause
        let orderClause = ''
        if (!hasAggregates && t.sort_by && allowedCols.has(t.sort_by)) {
            const dir = String(t.sort_order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
            orderClause = ` ORDER BY ${allowedCols.get(t.sort_by).col} ${dir}`
        }

        // 7. GROUP BY for aggregate queries
        let groupByClause = ''
        if (hasAggregates) {
            const nonAggCols = fieldsToUse.filter((f) => f.type !== 'count').map((f) => f.col)
            if (nonAggCols.length > 0) {
                groupByClause = ` GROUP BY ${nonAggCols.join(', ')}`
            }
        }

        // 8. Execute
        const sql = `SELECT ${selectExprs} FROM ${sourceConfig.table} WHERE ${wheres.join(' AND ')}${groupByClause}${orderClause}`
        const rows = await runQuery(sql, params)

        // 9. Record success in history
        await runQuery(
            `INSERT INTO report_execution_history (template_id, run_by, row_count, status)
             VALUES ($1, $2, $3, 'success')`,
            [id, userName, rows.length]
        )

        res.json({ data: rows })
    } catch (err) {
        // Record error in history
        try {
            await runQuery(
                `INSERT INTO report_execution_history (template_id, run_by, row_count, status)
                 VALUES ($1, $2, 0, 'error')`,
                [id, userName]
            )
        } catch (_) { /* non-fatal */ }

        await logError(req, `POST /api/report-templates/${id}/run`, 'ERR_RPT_RUN', err.message)
        res.status(400).json({ message: 'Report execution failed.' })
    }
})

// ---------------------------------------------------------------------------
// REQ-RPT-BE-F-007 — GET /api/report-templates/:id/history
// ---------------------------------------------------------------------------

router.get('/:id/history', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid template ID.' })

        // Verify template exists and caller has access
        const tRows = await runQuery('SELECT * FROM report_templates WHERE id = $1', [id])
        if (!tRows.length) return res.status(404).json({ message: 'Report template not found.' })
        const t = tRows[0]
        if (t.type !== 'core' && t.org_code !== req.user?.orgCode) {
            return res.status(404).json({ message: 'Report template not found.' })
        }

        const rows = await runQuery(
            `SELECT id, run_at, run_by, row_count, status
             FROM report_execution_history
             WHERE template_id = $1
             ORDER BY run_at DESC`,
            [id]
        )
        res.json(rows.map((r) => ({
            id: r.id,
            run_at: r.run_at ? new Date(r.run_at).toISOString() : null,
            run_by: r.run_by ?? null,
            row_count: r.row_count ?? null,
            status: r.status,
        })))
    } catch (err) {
        await logError(req, `GET /api/report-templates/${req.params.id}/history`, 'ERR_RPT_HISTORY', err.message)
        res.status(500).json({ message: 'Failed to load execution history.' })
    }
})

// ---------------------------------------------------------------------------
// REQ-RPT-BE-F-008 — GET /api/report-field-mappings/:domain (public)
// ---------------------------------------------------------------------------

const fieldMappingsRouter = express.Router()

fieldMappingsRouter.get('/:domain', (req, res) => {
    const source = DATA_SOURCES[req.params.domain]
    if (!source) return res.json([])
    res.json(source.fields.map(({ key, label, type, lookupValues }) => ({
        key,
        label,
        ...(type ? { type } : {}),
        ...(lookupValues ? { lookupValues } : {}),
    })))
})

module.exports = { reportTemplatesRouter: router, fieldMappingsRouter }
