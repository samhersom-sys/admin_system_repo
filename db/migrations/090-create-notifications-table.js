'use strict'

/**
 * Migration 090 — Create notifications stub table
 *
 * Required by: GET /api/notifications
 * Schema-validation test: notifications.id, notifications.message,
 *   notifications.read, notifications.createdDate
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id            SERIAL PRIMARY KEY,
                message       TEXT              NOT NULL,
                "read"        BOOLEAN           NOT NULL DEFAULT FALSE,
                "createdDate" TIMESTAMP         NOT NULL DEFAULT NOW()
            )
        `)
        console.log('090: Created notifications table')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })
