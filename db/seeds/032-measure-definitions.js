'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })

/**
 * Seed 032 — measure_definitions
 *
 * Populates the measure_definitions table from the measures that were previously
 * hard-coded in field-mappings.ts. All rows are created_by_type = 'internal'.
 *
 * ON CONFLICT DO NOTHING — safe to re-run; existing rows are not overwritten.
 * To update a measure definition after initial seeding, update the row directly
 * and let the service layer write a history entry.
 */

const INTERNAL_MEASURES = [
    // -------------------------------------------------------------------------
    // submissions
    // -------------------------------------------------------------------------
    { key: 'countAll', label: 'Count of Submissions', source_key: 'submissions', measure_type: 'count', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },

    // -------------------------------------------------------------------------
    // policies
    // -------------------------------------------------------------------------
    { key: 'countAll', label: 'Count of Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },
    { key: 'countActive', label: 'Count of Active Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "status = 'Active'", ratio_numerator: null, ratio_denominator: null },
    { key: 'countExpiring', label: 'Count of Expiring Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "CAST(expiry_date AS date) >= CURRENT_DATE", ratio_numerator: null, ratio_denominator: null },
    { key: 'countLapsed', label: 'Count of Lapsed Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "status = 'Expired'", ratio_numerator: null, ratio_denominator: null },
    { key: 'countCancelled', label: 'Count of Cancelled Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "status = 'Cancelled'", ratio_numerator: null, ratio_denominator: null },
    { key: 'countRenewed', label: 'Count of Renewed Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "status = 'Renewed'", ratio_numerator: null, ratio_denominator: null },
    { key: 'countRenewable', label: 'Count of Renewable Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "renewable = 'Renewable'", ratio_numerator: null, ratio_denominator: null },
    { key: 'retentionRatio', label: 'Retention Ratio', source_key: 'policies', measure_type: 'ratio', scope: 'org', filter_expr: null, ratio_numerator: "status = 'Renewed'", ratio_denominator: "renewable = 'Renewable'" },
    { key: 'grossWrittenPremium', label: 'Gross Net Written Premium', source_key: 'policies', measure_type: 'sum', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },

    // -------------------------------------------------------------------------
    // policy_earning_periods — REQ-EARN-F-012
    // -------------------------------------------------------------------------
    { key: 'grossWrittenPremiumEarned', label: 'Gross Written Premium Earned', source_key: 'policy_earning_periods', measure_type: 'sum', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },
    { key: 'grossWrittenPremiumUnearned', label: 'Gross Written Premium Unearned', source_key: 'policy_earning_periods', measure_type: 'sum', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },

    // -------------------------------------------------------------------------
    // quotes
    // -------------------------------------------------------------------------
    { key: 'countAll', label: 'Count of Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },
    { key: 'countDeclined', label: 'Count of Declined Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "status = 'declined'", ratio_numerator: null, ratio_denominator: null },
    { key: 'countRenewable', label: 'Count of Renewable Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "renewable_indicator = 'Yes'", ratio_numerator: null, ratio_denominator: null },
    { key: 'countRenewed', label: 'Count of Renewed Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "renewal_status = 'renewed'", ratio_numerator: null, ratio_denominator: null },
    { key: 'countNewBusiness', label: 'Count of New Business Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "new_or_renewal = 'New'", ratio_numerator: null, ratio_denominator: null },
    { key: 'countRenewalBusiness', label: 'Count of Renewal Business Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "new_or_renewal = 'Renewal'", ratio_numerator: null, ratio_denominator: null },

    // -------------------------------------------------------------------------
    // bindingAuthorities
    // -------------------------------------------------------------------------
    { key: 'countAll', label: 'Count of Binding Authorities', source_key: 'bindingAuthorities', measure_type: 'count', scope: 'org', filter_expr: null, ratio_numerator: null, ratio_denominator: null },
]

async function run() {
    const client = await pool.connect()
    try {
        console.log('[032] Seeding measure_definitions...')
        for (const m of INTERNAL_MEASURES) {
            await client.query(
                `INSERT INTO measure_definitions
                    (key, label, source_key, measure_type, scope, created_by_type, org_code,
                     filter_expr, filter_condition, ratio_numerator, ratio_denominator, is_active)
                 VALUES ($1, $2, $3, $4, $5, 'internal', NULL, $6, NULL, $7, $8, TRUE)
                 ON CONFLICT (key, org_code) DO NOTHING`,
                [m.key, m.label, m.source_key, m.measure_type, m.scope,
                m.filter_expr, m.ratio_numerator, m.ratio_denominator],
            )
        }
        console.log(`[032] Seeded ${INTERNAL_MEASURES.length} internal measures.`)

        // REQ-EARN-F-012: flag grossWrittenPremium as having earning variants
        await client.query(
            `UPDATE measure_definitions SET has_earning_variants = TRUE WHERE key = 'grossWrittenPremium' AND source_key = 'policies'`,
        )
        console.log('[032] Set has_earning_variants = true on grossWrittenPremium.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[032] ERROR:', err.message); process.exit(1) })
