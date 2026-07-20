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
            { code: 'ORIGINAL',  name: 'Original',  description: 'Original policy version',            order_index: 1 },
            { code: 'ENDORSED',  name: 'Endorsed',  description: 'Policy version created by endorsement', order_index: 2 },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_policy_version_statuses (code, name, description, order_index, is_active)
                 VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name, r.description, r.order_index]
            )
        }
        console.log('[seed-033] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-033] ERROR:', err.message); process.exit(1) })
