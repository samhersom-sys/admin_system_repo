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
            { code: 'CREATED',   name: 'Created',   description: 'Quote has been created',           order_index: 1 },
            { code: 'QUOTED',    name: 'Quoted',    description: 'Quote has been issued',             order_index: 2 },
            { code: 'BOUND',     name: 'Bound',     description: 'Quote has been bound to a policy', order_index: 3 },
            { code: 'DECLINED',  name: 'Declined',  description: 'Quote has been declined',          order_index: 4 },
            { code: 'DISBANDED', name: 'Disbanded', description: 'Quote has been disbanded',         order_index: 5 },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_quote_statuses (code, name, description, order_index, is_active)
                 VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name, r.description, r.order_index]
            )
        }
        console.log('[seed-005] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-005] ERROR:', err.message); process.exit(1) })
