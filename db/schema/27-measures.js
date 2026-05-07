'use strict'
/**
 * Schema 27: measure definitions
 * Replaces migrations: 116-create-measure-definitions-table,
 *                      117-create-measure-definition-history-table
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[27-measures] Creating measure tables...')

        // measure_definitions (116)
        await client.query(`
            CREATE TABLE IF NOT EXISTS measure_definitions (
                id                 SERIAL PRIMARY KEY,
                key                VARCHAR(100) NOT NULL,
                label              VARCHAR(255) NOT NULL,
                source_key         VARCHAR(100) NOT NULL,
                measure_type       VARCHAR(20) NOT NULL CHECK (measure_type IN ('count','sum','ratio')),
                scope              VARCHAR(20) NOT NULL DEFAULT 'org' CHECK (scope IN ('org','user','both')),
                created_by_type    VARCHAR(20) NOT NULL CHECK (created_by_type IN ('internal','tenant')),
                org_code           VARCHAR(100),
                filter_expr        TEXT,
                filter_condition   JSONB,
                ratio_numerator    TEXT,
                ratio_denominator  TEXT,
                is_active          BOOLEAN NOT NULL DEFAULT TRUE,
                created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_measure_definitions_key_org UNIQUE (key, org_code),
                CONSTRAINT chk_measure_definitions_expr_split CHECK (
                    (created_by_type = 'internal'
                        AND filter_condition IS NULL
                        AND org_code IS NULL)
                    OR
                    (created_by_type = 'tenant'
                        AND filter_expr IS NULL
                        AND ratio_numerator IS NULL
                        AND ratio_denominator IS NULL
                        AND org_code IS NOT NULL)
                )
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_measure_definitions_source_key ON measure_definitions (source_key)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_measure_definitions_org_code   ON measure_definitions (org_code)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_measure_definitions_active     ON measure_definitions (is_active)`)

        // measure_definition_history (117)
        await client.query(`
            CREATE TABLE IF NOT EXISTS measure_definition_history (
                id                    SERIAL PRIMARY KEY,
                measure_definition_id INTEGER NOT NULL REFERENCES measure_definitions(id) ON DELETE RESTRICT,
                field_changed         VARCHAR(100) NOT NULL,
                old_value             TEXT,
                new_value             TEXT,
                changed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                changed_by            VARCHAR(255) NOT NULL
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_measure_definition_history_measure_id ON measure_definition_history (measure_definition_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_measure_definition_history_changed_at ON measure_definition_history (changed_at)`)

        console.log('[27-measures] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[27-measures] ERROR:', err.message); process.exit(1) })
