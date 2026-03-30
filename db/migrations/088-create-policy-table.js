'use strict'

/**
 * Migration 088 — Create policy stub table
 *
 * Required by: GET /api/policies, GET /api/recent-records-data
 * Schema-validation test: policy.id, policy.status, policy.createdByOrgCode, policy.last_opened_date
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS policy (
                id                 SERIAL PRIMARY KEY,
                reference          VARCHAR(50),
                insured            VARCHAR(255),
                status             VARCHAR(50)       NOT NULL DEFAULT 'Draft',
                "createdByOrgCode" VARCHAR(20),
                "inceptionDate"    DATE,
                "expiryDate"       DATE,
                "createdDate"      TIMESTAMP         NOT NULL DEFAULT NOW(),
                last_opened_date   TIMESTAMP
            )
        `)
        console.log('088: Created policy table')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })
