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
            { code: 'OPEN',      name: 'Open',      description: 'Submission is open and being processed', order_index: 1 },
            { code: 'QUOTED',    name: 'Quoted',    description: 'A quote has been provided',               order_index: 2 },
            { code: 'DECLINED',  name: 'Declined',  description: 'Submission has been declined',            order_index: 3 },
            { code: 'CLOSED',    name: 'Closed',    description: 'Submission has been closed',              order_index: 4 },
            { code: 'DISBANDED', name: 'Disbanded', description: 'Submission has been disbanded',           order_index: 5 },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_submission_statuses (code, name, description, order_index, is_active)
                 VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name, r.description, r.order_index]
            )
        }
        console.log('[seed-004] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-004] ERROR:', err.message); process.exit(1) })
