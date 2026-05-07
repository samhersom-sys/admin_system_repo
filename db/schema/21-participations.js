'use strict'
/**
 * Schema 21: participation tables
 * Replaces migrations: 063-create-party-entities-table,
 *                      064-create-binding-authority-section-participations-table,
 *                      065-create-quote-section-participations-table,
 *                      066-create-policy-section-participations-table
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[21-participations] Creating participation tables...')

        // party_entities (063)
        await client.query(`
            CREATE TABLE IF NOT EXISTS party_entities (
                id          SERIAL PRIMARY KEY,
                party_id    INTEGER NOT NULL REFERENCES party(id) ON DELETE CASCADE,
                name        TEXT NOT NULL,
                reference   VARCHAR(100),
                entity_code VARCHAR(50),
                entity_type VARCHAR(50) DEFAULT 'Syndicate',
                notes       TEXT,
                active      BOOLEAN DEFAULT TRUE,
                created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_party_entities_party_id ON party_entities (party_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_party_entities_active   ON party_entities (party_id) WHERE active = TRUE`)

        // binding_authority_section_participations (064)
        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authority_section_participations (
                id                           SERIAL PRIMARY KEY,
                binding_authority_section_id INTEGER NOT NULL REFERENCES binding_authority_sections(id) ON DELETE CASCADE,
                market_party_id              INTEGER REFERENCES party(id) ON DELETE SET NULL,
                market_name                  TEXT,
                role                         VARCHAR(100),
                share_pct                    NUMERIC(10,6) DEFAULT 0,
                agreement_party              TEXT,
                reference                    VARCHAR(200),
                notes                        TEXT,
                entity_id                    INTEGER REFERENCES party_entities(id) ON DELETE SET NULL,
                entity_name                  TEXT,
                written_line_pct             NUMERIC(10,6) DEFAULT 0,
                signed_line_pct              NUMERIC(10,6) DEFAULT 0,
                created_at                   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at                   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_section_participations_section ON binding_authority_section_participations (binding_authority_section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_section_participations_market  ON binding_authority_section_participations (market_party_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_section_participations_entity  ON binding_authority_section_participations (entity_id)`)

        // quote_section_participations (065)
        await client.query(`
            CREATE TABLE IF NOT EXISTS quote_section_participations (
                id               SERIAL PRIMARY KEY,
                quote_section_id INTEGER NOT NULL REFERENCES quote_sections(id) ON DELETE CASCADE,
                market_party_id  INTEGER REFERENCES party(id) ON DELETE SET NULL,
                market_name      TEXT,
                role             VARCHAR(100),
                share_pct        NUMERIC(10,6) DEFAULT 0,
                agreement_party  TEXT,
                reference        VARCHAR(200),
                notes            TEXT,
                entity_id        INTEGER REFERENCES party_entities(id) ON DELETE SET NULL,
                entity_name      TEXT,
                written_line_pct NUMERIC(10,6) DEFAULT 0,
                signed_line_pct  NUMERIC(10,6) DEFAULT 0,
                created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_section_participations_section ON quote_section_participations (quote_section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_section_participations_market  ON quote_section_participations (market_party_id)`)

        // policy_section_participations (066)
        await client.query(`
            CREATE TABLE IF NOT EXISTS policy_section_participations (
                id                SERIAL PRIMARY KEY,
                policy_section_id INTEGER NOT NULL REFERENCES policy_sections(id) ON DELETE CASCADE,
                market_party_id   INTEGER REFERENCES party(id) ON DELETE SET NULL,
                market_name       TEXT,
                role              VARCHAR(100),
                share_pct         NUMERIC(10,6) DEFAULT 0,
                agreement_party   TEXT,
                reference         VARCHAR(200),
                notes             TEXT,
                entity_id         INTEGER REFERENCES party_entities(id) ON DELETE SET NULL,
                entity_name       TEXT,
                written_line_pct  NUMERIC(10,6) DEFAULT 0,
                signed_line_pct   NUMERIC(10,6) DEFAULT 0,
                created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_section_participations_section ON policy_section_participations (policy_section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_section_participations_market  ON policy_section_participations (market_party_id)`)

        console.log('[21-participations] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[21-participations] ERROR:', err.message); process.exit(1) })
