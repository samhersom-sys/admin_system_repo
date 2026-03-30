'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authority_documents (
                id                      SERIAL PRIMARY KEY,
                binding_authority_id    INTEGER REFERENCES binding_authorities(id) ON DELETE CASCADE,
                reference               TEXT NOT NULL,
                format                  VARCHAR(10) NOT NULL,
                filename                TEXT NOT NULL,
                content                 BYTEA NOT NULL,
                meta                    JSONB,
                created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT chk_binding_authority_documents_format CHECK (format IN ('pdf', 'docx'))
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authority_documents_ba ON binding_authority_documents (binding_authority_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authority_documents_ref ON binding_authority_documents (reference)`)
        console.log('[069] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[069] ERROR:', err.message); process.exit(1) })
