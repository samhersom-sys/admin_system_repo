'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS party_entities (
                id            SERIAL PRIMARY KEY,
                party_id      INTEGER      NOT NULL REFERENCES party(id) ON DELETE CASCADE,
                name          TEXT         NOT NULL,
                reference     VARCHAR(100),
                entity_code   VARCHAR(50),
                entity_type   VARCHAR(50)  DEFAULT 'Syndicate',
                notes         TEXT,
                active        BOOLEAN      DEFAULT TRUE,
                created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_party_entities_party_id ON party_entities (party_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_party_entities_active ON party_entities (active) WHERE active = TRUE`)
        console.log('[063] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[063] ERROR:', err.message); process.exit(1) })
