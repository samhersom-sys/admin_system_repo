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
        const names = ['Open Market', 'Delegated Authority', 'Lineslip', 'Reinsurance', 'Consortium']
        await client.query('DELETE FROM lookup_methods_of_placement')
        for (const name of names) {
            await client.query(
                `INSERT INTO lookup_methods_of_placement (name) VALUES ($1)`,
                [name]
            )
        }
        console.log('[seed-009] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-009] ERROR:', err.message); process.exit(1) })
