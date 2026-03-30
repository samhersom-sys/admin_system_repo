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
            { field_id: 'inception',    label: 'Inception Date',     description: 'Policy inception date',      domain: 'policy' },
            { field_id: 'renewal',      label: 'Renewal Date',       description: 'Policy renewal date',        domain: 'policy' },
            { field_id: 'expiry',       label: 'Expiry Date',        description: 'Policy expiry date',         domain: 'policy' },
            { field_id: 'accounting',   label: 'Accounting Date',    description: 'Transaction accounting date', domain: 'transaction' },
            { field_id: 'transaction',  label: 'Transaction Date',   description: 'Date transaction occurred',  domain: 'transaction' },
            { field_id: 'effective',    label: 'Effective Date',     description: 'Date change takes effect',   domain: 'general' },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_date_basis (field_id, label, description, domain)
                 VALUES ($1, $2, $3, $4) ON CONFLICT (field_id) DO NOTHING`,
                [r.field_id, r.label, r.description, r.domain]
            )
        }
        console.log('[seed-016] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-016] ERROR:', err.message); process.exit(1) })
