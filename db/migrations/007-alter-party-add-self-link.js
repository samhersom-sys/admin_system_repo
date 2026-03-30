/**
 * Migration 007: Alter party table — add self-referential party_created_id
 *
 * Adds `party_created_id` as a nullable self-FK on the `party` table.
 * This records which party (i.e. which organisation) created each party record.
 * Used by the party mastering workflow (OQ-045) to determine whether an
 * incoming party was created by a Broker, Insurer, or MGA.
 *
 * Design note (OQ-046, answered 2026-03-21):
 *   Storing a FK to party rather than a denormalised org-type string means the
 *   creating org's type is always derived at query time via JOIN party.role.
 *   NULL is acceptable for existing/legacy rows — the frontend treats NULL as
 *   "no origin lock" (all fields editable).
 *
 * Relationship to migration 005:
 *   Migration 005 added `party_created_id` to the `submission` table.
 *   This migration adds the same column to the `party` table itself (self-ref).
 *   They are separate migrations because they serve different workflows.
 *
 * Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS).
 * Run: node db/migrations/007-alter-party-add-self-link.js
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
        console.log('[007-alter-party-add-self-link] Altering party table...')

        // Add self-referential FK: which party record represents the creating org?
        await client.query(`
            ALTER TABLE party
                ADD COLUMN IF NOT EXISTS "party_created_id" INTEGER
                    REFERENCES party(id)
        `)
        console.log('[007-alter-party-add-self-link] party.party_created_id column OK.')

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_party_party_created_id
                ON party ("party_created_id")
        `)
        console.log('[007-alter-party-add-self-link] Index idx_party_party_created_id OK.')

        console.log('[007-alter-party-add-self-link] Migration complete.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[007-alter-party-add-self-link] ERROR:', err.message)
    process.exit(1)
})
