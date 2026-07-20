/**
 * Seed 035 — add org_code to rating_schedules
 *
 * Purpose:
 * - Add org_code column to rating_schedules so schedules are scoped to the
 *   creating organisation (REQ-SETTINGS-RATING-F-020).
 * - Safe to run multiple times (IF NOT EXISTS / COALESCE).
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL =
  process.env.DATABASE_URL ||
  'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({ connectionString: DB_URL })

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Add org_code column if it does not already exist
    await client.query(`
      ALTER TABLE rating_schedules
        ADD COLUMN IF NOT EXISTS org_code VARCHAR(50)
    `)

    console.log('✓ org_code column ensured on rating_schedules')

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Migration 035 failed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
