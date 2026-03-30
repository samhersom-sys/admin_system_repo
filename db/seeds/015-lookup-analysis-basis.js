'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        const rows = [
            { field_id: 'all_time',        label: 'All Time',           description: 'Entire history',                   display_order: 1  },
            { field_id: 'cumulative',      label: 'Cumulative',         description: 'Running cumulative total',         display_order: 2  },
            { field_id: 'ytd',             label: 'Year to Date',       description: 'From start of year to today',      display_order: 3  },
            { field_id: 'qtd',             label: 'Quarter to Date',    description: 'From start of quarter to today',   display_order: 4  },
            { field_id: 'mtd',             label: 'Month to Date',      description: 'From start of month to today',     display_order: 5  },
            { field_id: 'htd',             label: 'Half Year to Date',  description: 'From start of half year to today', display_order: 6  },
            { field_id: 'month',           label: 'Month',              description: 'Full calendar month',              display_order: 7  },
            { field_id: 'week',            label: 'Week',               description: 'Full calendar week',               display_order: 8  },
            { field_id: 'day',             label: 'Day',                description: 'Single day',                       display_order: 9  },
            { field_id: 'rolling_30',      label: 'Rolling 30 Days',    description: 'Last 30 days',                     display_order: 10 },
            { field_id: 'rolling_90',      label: 'Rolling 90 Days',    description: 'Last 90 days',                     display_order: 11 },
            { field_id: 'rolling_365',     label: 'Rolling 365 Days',   description: 'Last 365 days',                    display_order: 12 },
            { field_id: 'prior_month',     label: 'Prior Month',        description: 'Previous calendar month',         display_order: 13 },
            { field_id: 'prior_quarter',   label: 'Prior Quarter',      description: 'Previous calendar quarter',       display_order: 14 },
            { field_id: 'prior_year',      label: 'Prior Year',         description: 'Previous calendar year',          display_order: 15 },
            { field_id: 'same_period_ly',  label: 'Same Period Last Year', description: 'Equivalent period in prior year', display_order: 16 },
            { field_id: 'custom',          label: 'Custom Range',       description: 'User-defined date range',         display_order: 17 },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_analysis_basis (field_id, label, description, display_order)
                 VALUES ($1, $2, $3, $4) ON CONFLICT (field_id) DO NOTHING`,
                [r.field_id, r.label, r.description, r.display_order]
            )
        }
        console.log('[seed-015] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-015] ERROR:', err.message); process.exit(1) })
