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
        const names = ['Open Market', 'Binding Authority']
        for (const name of names) {
            await client.query(
                `INSERT INTO lookup_contract_types (name) VALUES ($1) ON CONFLICT DO NOTHING`,
                [name]
            )
        }
        console.log('[seed-008] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-008] ERROR:', err.message); process.exit(1) })
