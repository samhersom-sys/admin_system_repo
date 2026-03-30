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
            { code: 'WF_UNASSIGNED',  name: 'Unassigned',        description: 'Not yet assigned to a handler',        category: 'workflow',  display_order: 1 },
            { code: 'WF_ASSIGNED',    name: 'Assigned',          description: 'Assigned to a handler',                category: 'workflow',  display_order: 2 },
            { code: 'WF_IN_REVIEW',   name: 'In Review',         description: 'Under active review',                  category: 'workflow',  display_order: 3 },
            { code: 'WF_QUOTED',      name: 'Quoted',            description: 'Quote issued',                         category: 'workflow',  display_order: 4 },
            { code: 'WF_DECLINED',    name: 'Declined',          description: 'Declined at workflow stage',           category: 'workflow',  display_order: 5 },
            { code: 'CLR_PENDING',    name: 'Clearance Pending', description: 'Awaiting clearance check',             category: 'clearance', display_order: 6 },
            { code: 'CLR_CLEARED',    name: 'Cleared',           description: 'Passed clearance check',              category: 'clearance', display_order: 7 },
            { code: 'CLR_DUPLICATE',  name: 'Duplicate',         description: 'Identified as a duplicate submission', category: 'clearance', display_order: 8 },
            { code: 'CLR_REJECTED',   name: 'Rejected',          description: 'Rejected at clearance stage',         category: 'clearance', display_order: 9 },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_workflow_statuses (code, name, description, category, display_order)
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name, r.description, r.category, r.display_order]
            )
        }
        console.log('[seed-017] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-017] ERROR:', err.message); process.exit(1) })
