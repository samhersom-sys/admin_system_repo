'use strict'

/**
 * Migration 102 — Add order/time basis and line total columns to quote_sections
 *
 * Gap-fill: BackUp had timeBasis, writtenOrderBasis, signedOrderBasis,
 *           writtenLineTotal, signedLineTotal on quote_section.
 * Cleaned table uses snake_case column names.
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
                ADD COLUMN IF NOT EXISTS time_basis          VARCHAR(100),
                ADD COLUMN IF NOT EXISTS written_order_basis TEXT,
                ADD COLUMN IF NOT EXISTS signed_order_basis  TEXT,
                ADD COLUMN IF NOT EXISTS written_line_total  NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS signed_line_total   NUMERIC(18,2)
        `)
        console.log('102: Added time_basis, written_order_basis, signed_order_basis, written_line_total, signed_line_total to quote_sections')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })
