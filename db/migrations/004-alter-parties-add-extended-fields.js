/**
 * Migration 004: Alter party table — add extended contact & classification fields
 *
 * Adds the full field set from the Backup project's canonical party schema so
 * that BrokerSearch, InsuredSearch, and PartyListPage can display and collect
 * address / classification information.
 *
 * Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS).
 * Run: node db/migrations/004-alter-parties-add-extended-fields.js
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
        console.log('[004-alter-parties-add-extended-fields] Altering party table...')

        // Extended contact fields (from Backup canonical schema)
        await client.query(`
            ALTER TABLE party
                ADD COLUMN IF NOT EXISTS reference          TEXT,
                ADD COLUMN IF NOT EXISTS email              TEXT,
                ADD COLUMN IF NOT EXISTS phone              TEXT,
                ADD COLUMN IF NOT EXISTS "addressLine1"     TEXT,
                ADD COLUMN IF NOT EXISTS "addressLine2"     TEXT,
                ADD COLUMN IF NOT EXISTS "addressLine3"     TEXT,
                ADD COLUMN IF NOT EXISTS city               TEXT,
                ADD COLUMN IF NOT EXISTS state              TEXT,
                ADD COLUMN IF NOT EXISTS postcode           TEXT,
                ADD COLUMN IF NOT EXISTS country            TEXT,
                ADD COLUMN IF NOT EXISTS region             TEXT
        `)

        // Financial / industry classification fields (from Backup canonical schema)
        await client.query(`
            ALTER TABLE party
                ADD COLUMN IF NOT EXISTS "wageRoll"         NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS "numberEmployees"  INTEGER,
                ADD COLUMN IF NOT EXISTS "annualRevenue"    NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS "sicStandard"      TEXT,
                ADD COLUMN IF NOT EXISTS "sicCode"          TEXT,
                ADD COLUMN IF NOT EXISTS "sicDescription"   TEXT
        `)

        // Supporting indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_party_name
                ON party (name)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_party_city
                ON party (city)
        `)

        console.log('[004-alter-parties-add-extended-fields] Done. party table extended with contact & classification fields.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[004-alter-parties-add-extended-fields] ERROR:', err.message)
    process.exit(1)
})
