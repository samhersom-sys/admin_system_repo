'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authority_section_participations (
                id                          SERIAL PRIMARY KEY,
                binding_authority_section_id INTEGER NOT NULL REFERENCES binding_authority_sections(id) ON DELETE CASCADE,
                market_party_id             INTEGER REFERENCES party(id) ON DELETE SET NULL,
                market_name                 TEXT,
                role                        VARCHAR(100),
                share_pct                   NUMERIC(10,6) DEFAULT 0,
                agreement_party             TEXT,
                reference                   VARCHAR(200),
                notes                       TEXT,
                entity_id                   INTEGER REFERENCES party_entities(id) ON DELETE SET NULL,
                entity_name                 TEXT,
                written_line_pct            NUMERIC(10,6) DEFAULT 0,
                signed_line_pct             NUMERIC(10,6) DEFAULT 0,
                created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_section_participations_section ON binding_authority_section_participations (binding_authority_section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_section_participations_market ON binding_authority_section_participations (market_party_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_section_participations_entity ON binding_authority_section_participations (entity_id)`)
        console.log('[064] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[064] ERROR:', err.message); process.exit(1) })
