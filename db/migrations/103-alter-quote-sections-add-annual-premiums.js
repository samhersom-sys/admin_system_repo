'use strict'

/**
 * Migration 103 — Promote annual_gross_premium and annual_net_premium from
 *                  payload JSONB to dedicated columns on quote_sections.
 *
 * Phase 1: Add columns.
 * Phase 2: Back-fill from payload (handles both snake_case and camelCase keys
 *           so rows written by either BackUp or Cleaned are migrated correctly).
 * Phase 3: toJSON() in QuoteSection entity will now read from the column
 *           instead of the payload blob.
 *
 * The payload keys are intentionally left intact — no data is removed.
 *
 * REQ-QUO-BE-NE-F-020c
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        // Phase 1 — Add dedicated columns
        await pool.query(`
            ALTER TABLE quote_sections
                ADD COLUMN IF NOT EXISTS annual_gross_premium NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS annual_net_premium   NUMERIC(18,2)
        `)

        // Phase 2 — Back-fill from payload (idempotent: only fills NULLs)
        await pool.query(`
            UPDATE quote_sections
            SET annual_gross_premium = COALESCE(
                (payload->>'annual_gross_premium')::NUMERIC(18,2),
                (payload->>'annualGrossPremium')::NUMERIC(18,2)
            )
            WHERE annual_gross_premium IS NULL
              AND (payload->>'annual_gross_premium' IS NOT NULL
                   OR payload->>'annualGrossPremium' IS NOT NULL)
        `)

        await pool.query(`
            UPDATE quote_sections
            SET annual_net_premium = COALESCE(
                (payload->>'annual_net_premium')::NUMERIC(18,2),
                (payload->>'annualNetPremium')::NUMERIC(18,2)
            )
            WHERE annual_net_premium IS NULL
              AND (payload->>'annual_net_premium' IS NOT NULL
                   OR payload->>'annualNetPremium' IS NOT NULL)
        `)

        console.log('103: Added annual_gross_premium, annual_net_premium to quote_sections and back-filled from payload')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })
