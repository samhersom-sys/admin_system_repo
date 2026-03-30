'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authorities (
                id                  SERIAL PRIMARY KEY,
                reference           TEXT,
                submission_id       INTEGER REFERENCES submission(id) ON DELETE SET NULL,
                status              TEXT,
                inception_date      DATE NOT NULL DEFAULT CURRENT_DATE,
                expiry_date         DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
                inception_time      TIME(3) DEFAULT '00:00:00.000',
                expiry_time         TIME(3) DEFAULT '23:59:59.000',
                year_of_account     INTEGER,
                is_multi_year       BOOLEAN NOT NULL DEFAULT FALSE,
                renewal_date        DATE,
                renewal_time        TIME(3) DEFAULT '00:00:00.000',
                renewal_status      TEXT,
                last_opened         TIMESTAMPTZ,
                locked              BOOLEAN NOT NULL DEFAULT FALSE,
                payload             JSONB NOT NULL DEFAULT '{}',
                audit               JSONB DEFAULT '[]',
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by          TEXT,
                created_by_org_code TEXT
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authorities_submission_id ON binding_authorities (submission_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authorities_status ON binding_authorities (status)`)
        console.log('[015] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[015] ERROR:', err.message); process.exit(1) })
