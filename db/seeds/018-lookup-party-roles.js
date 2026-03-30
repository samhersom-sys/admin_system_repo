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
            { code: 'ROLE_INSURER',      name: 'Insurer',       description: 'Risk-carrying insurer / syndicate', display_order: 1 },
            { code: 'ROLE_BROKER',       name: 'Broker',        description: 'Placing broker',                    display_order: 2 },
            { code: 'ROLE_COVERHOLDER',  name: 'Coverholder',   description: 'Delegated underwriting authority',  display_order: 3 },
            { code: 'ROLE_INSURED',      name: 'Insured',       description: 'The named insured',                 display_order: 4 },
            { code: 'ROLE_ADJUSTER',     name: 'Loss Adjuster', description: 'Claims loss adjuster',             display_order: 5 },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_party_roles (code, name, description, display_order)
                 VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name, r.description, r.display_order]
            )
        }
        console.log('[seed-018] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-018] ERROR:', err.message); process.exit(1) })
