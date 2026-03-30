'use strict'

/**
 * Migration 089 — Create binding_authority stub table
 *
 * Required by: GET /api/binding-authorities, GET /api/recent-records-data
 * Schema-validation test: binding_authority.id, binding_authority.status,
 *   binding_authority.createdByOrgCode, binding_authority.lastOpened
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS binding_authority (
                id                 SERIAL PRIMARY KEY,
                reference          VARCHAR(50),
                status             VARCHAR(50)       NOT NULL DEFAULT 'Draft',
                "createdByOrgCode" VARCHAR(20),
                "inceptionDate"    DATE,
                "expiryDate"       DATE,
                "createdDate"      TIMESTAMP         NOT NULL DEFAULT NOW(),
                "lastOpened"       TIMESTAMP
            )
        `)
        console.log('089: Created binding_authority table')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })
