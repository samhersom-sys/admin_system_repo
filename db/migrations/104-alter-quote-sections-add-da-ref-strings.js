'use strict'

/**
 * Migration 104 — Add delegated_authority_ref and delegated_authority_section_ref
 *                  convenience text columns to quote_sections.
 *
 * Gap-fill: BackUp stored delegatedAuthorityRef / delegatedAuthoritySectionRef
 *           as denormalised text columns alongside the FK ids.
 * Cleaned stores only the integer FKs; these text columns are a convenience
 * cache so callers can display the ref string without a JOIN.
 *
 * REQ-QUO-BE-NE-F-020c
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            ALTER TABLE quote_sections
                ADD COLUMN IF NOT EXISTS delegated_authority_ref         TEXT,
                ADD COLUMN IF NOT EXISTS delegated_authority_section_ref TEXT
        `)
        console.log('104: Added delegated_authority_ref, delegated_authority_section_ref to quote_sections')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })
