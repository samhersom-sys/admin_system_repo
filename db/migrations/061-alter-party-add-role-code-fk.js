'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            ALTER TABLE party
                ADD COLUMN IF NOT EXISTS role_code VARCHAR(50) REFERENCES lookup_party_roles(code) ON DELETE SET NULL
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_party_role_code ON party (role_code)`)
        console.log('[061] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[061] ERROR:', err.message); process.exit(1) })
