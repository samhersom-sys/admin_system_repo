'use strict'
/**
 * 000-truncate — Clears all public schema tables before re-seeding.
 *
 * Uses TRUNCATE ... RESTART IDENTITY CASCADE so foreign-key order
 * does not matter and all sequences reset to 1.
 *
 * WARNING: DESTROYS ALL DATA. Only run against dev/uat — never production.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })

async function run() {
    const client = await pool.connect()
    try {
        // Collect all tables in the public schema
        const { rows } = await client.query(
            `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
        )
        if (rows.length === 0) {
            console.log('[000-truncate] No tables found — skipping.')
            return
        }
        const tableList = rows.map(r => `"${r.tablename}"`).join(', ')
        await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`)
        console.log(`[000-truncate] Truncated ${rows.length} tables. All sequences reset.`)
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[000-truncate] ERROR:', err.message); process.exit(1) })
