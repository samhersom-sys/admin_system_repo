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
            { code: 'ACTIVE',    name: 'Active',    description: 'Policy is currently active',    order_index: 1 },
            { code: 'EXPIRED',   name: 'Expired',   description: 'Policy term has expired',       order_index: 2 },
            { code: 'CANCELLED', name: 'Cancelled', description: 'Policy has been cancelled',     order_index: 3 },
            { code: 'LAPSED',    name: 'Lapsed',    description: 'Policy has lapsed',             order_index: 4 },
            { code: 'DISBANDED', name: 'Disbanded', description: 'Policy has been disbanded',     order_index: 5 },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_policy_statuses (code, name, description, order_index, is_active)
                 VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name, r.description, r.order_index]
            )
        }
        console.log('[seed-006] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-006] ERROR:', err.message); process.exit(1) })
