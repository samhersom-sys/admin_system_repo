'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        // Add FK constraints to quote_sections.delegated_authority_id and delegated_authority_section_id
        // These columns were created in migration 012 without FKs (BA tables didn't exist yet)
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name='quote_sections' AND constraint_name='fk_quote_sections_ba'
                ) THEN
                    ALTER TABLE quote_sections
                        ADD CONSTRAINT fk_quote_sections_ba
                        FOREIGN KEY (delegated_authority_id) REFERENCES binding_authorities(id) ON DELETE SET NULL;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name='quote_sections' AND constraint_name='fk_quote_sections_ba_section'
                ) THEN
                    ALTER TABLE quote_sections
                        ADD CONSTRAINT fk_quote_sections_ba_section
                        FOREIGN KEY (delegated_authority_section_id) REFERENCES binding_authority_sections(id) ON DELETE SET NULL;
                END IF;
            END $$;
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_sections_ba_id ON quote_sections (delegated_authority_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_sections_ba_section_id ON quote_sections (delegated_authority_section_id)`)
        console.log('[062] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[062] ERROR:', err.message); process.exit(1) })
