/**
 * Migration 002: Create party table
 *
 * Creates the `party` table used by the parties route (/api/parties).
 * Run once against the target database:
 *   node db/migrations/002-create-parties-table.js
 *
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
  const client = await pool.connect()
  try {
    console.log('[002-create-parties-table] Creating party table...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS party (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(255) NOT NULL,
        role          VARCHAR(100) NOT NULL,
        "orgCode"     VARCHAR(100) NOT NULL,
        "createdBy"   VARCHAR(255),
        "createdDate" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Rename legacy "type" column to "role" if the table was created with the old schema
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'party' AND column_name = 'type'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'party' AND column_name = 'role'
        ) THEN
          ALTER TABLE party RENAME COLUMN "type" TO role;
        END IF;
      END $$;
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_party_org_role
        ON party ("orgCode", role)
    `)

    console.log('[002-create-parties-table] Done. party table created (or already exists).')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => {
  console.error('[002-create-parties-table] ERROR:', err.message)
  process.exit(1)
})
