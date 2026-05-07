'use strict'
/**
 * Schema 29: financial view columns (ALTER TABLE only)
 * Replaces migration: 123-add-financial-view-columns
 *
 * Adds premium breakdown columns to policy_sections, quote_sections,
 * and binding_authority_sections using ADD COLUMN IF NOT EXISTS.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[29-financial-view-columns] Adding financial view columns...')

        // policy_sections additions
        const policySectionsCols = [
            'annual_gross_premium',
            'annual_net_premium',
            'written_premium',
            'signed_premium',
            'gross_premium_whole',
            'gross_premium_market',
            'gross_premium_line',
            'net_premium_whole',
            'net_premium_market',
            'net_premium_line',
            'annual_gross_premium_whole',
            'annual_gross_premium_market',
            'annual_gross_premium_line',
            'annual_net_premium_whole',
            'annual_net_premium_market',
            'annual_net_premium_line',
            'written_premium_whole',
            'written_premium_market',
            'written_premium_line',
            'signed_premium_whole',
            'signed_premium_market',
            'signed_premium_line',
        ]
        for (const col of policySectionsCols) {
            await client.query(`ALTER TABLE policy_sections ADD COLUMN IF NOT EXISTS ${col} NUMERIC(18,2)`)
        }

        // quote_sections additions
        const quoteSectionsCols = [
            'gross_premium_whole',
            'gross_premium_market',
            'gross_premium_line',
            'net_premium_whole',
            'net_premium_market',
            'net_premium_line',
            'annual_gross_premium_whole',
            'annual_gross_premium_market',
            'annual_gross_premium_line',
            'annual_net_premium_whole',
            'annual_net_premium_market',
            'annual_net_premium_line',
        ]
        for (const col of quoteSectionsCols) {
            await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS ${col} NUMERIC(18,2)`)
        }
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS tax_overrides JSONB`)

        // binding_authority_sections additions
        const baSectionsCols = [
            'annual_gross_premium',
            'annual_net_premium',
            'gross_premium',
            'net_premium',
            'gross_premium_whole',
            'gross_premium_market',
            'gross_premium_line',
            'net_premium_whole',
            'net_premium_market',
            'net_premium_line',
            'limit_amount_whole',
            'limit_amount_market',
            'limit_amount_line',
            'sum_insured_whole',
            'sum_insured_market',
            'sum_insured_line',
        ]
        for (const col of baSectionsCols) {
            await client.query(`ALTER TABLE binding_authority_sections ADD COLUMN IF NOT EXISTS ${col} NUMERIC(18,2)`)
        }

        console.log('[29-financial-view-columns] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[29-financial-view-columns] ERROR:', err.message); process.exit(1) })
