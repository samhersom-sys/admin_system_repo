'use strict'
/**
 * Migration 099 — rename policy_coverages → policy_section_coverages.
 *
 * The NestJS PoliciesService already queries the table as
 * `policy_section_coverages`. This migration aligns the DB to match.
 * The table is empty in all environments so the rename is zero-risk.
 *
 * Also adds days_on_cover INTEGER column (OQ-C-004) and renames all
 * associated indexes for consistency.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

async function run() {
    const client = await pool.connect()
    try {
        await client.query('ALTER TABLE policy_coverages RENAME TO policy_section_coverages')

        await client.query('ALTER INDEX IF EXISTS idx_policy_coverages_section_id RENAME TO idx_policy_section_coverages_section_id')
        await client.query('ALTER INDEX IF EXISTS idx_policy_coverages_policy_id RENAME TO idx_policy_section_coverages_policy_id')
        await client.query('ALTER INDEX IF EXISTS idx_policy_coverages_deleted_at RENAME TO idx_policy_section_coverages_deleted_at')

        await client.query(`
            ALTER TABLE policy_section_coverages
            ADD COLUMN IF NOT EXISTS days_on_cover INTEGER
        `)

        console.log('[099] Done — policy_coverages renamed to policy_section_coverages; days_on_cover added.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[099] ERROR:', err.message)
    process.exit(1)
})
