'use strict'
/**
 * Schema 02: party table
 * Replaces migrations: 002-create-parties-table, 004-alter-parties-add-extended-fields,
 *                      007-alter-party-add-self-link, 061-alter-party-add-role-code-fk
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[02-core-parties] Creating party table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS party (
                id                  SERIAL PRIMARY KEY,
                name                VARCHAR(255) NOT NULL,
                role                VARCHAR(100) NOT NULL,
                "orgCode"           VARCHAR(100) NOT NULL,
                "createdBy"         VARCHAR(255),
                "createdDate"       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                reference           TEXT,
                email               TEXT,
                phone               TEXT,
                "addressLine1"      TEXT,
                "addressLine2"      TEXT,
                "addressLine3"      TEXT,
                city                TEXT,
                state               TEXT,
                postcode            TEXT,
                country             TEXT,
                region              TEXT,
                "wageRoll"          NUMERIC(18,2),
                "numberEmployees"   INTEGER,
                "annualRevenue"     NUMERIC(18,2),
                "sicStandard"       TEXT,
                "sicCode"           TEXT,
                "sicDescription"    TEXT,
                party_created_id    INTEGER REFERENCES party(id),
                role_code           VARCHAR(50) REFERENCES lookup_party_roles(code) ON DELETE SET NULL
            )
        `)

        // Rename legacy "type" column to "role" if the table was created with the old schema
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'party' AND column_name = 'type'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'party' AND column_name = 'role'
                ) THEN
                    ALTER TABLE party RENAME COLUMN "type" TO role;
                END IF;
            END $$;
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_party_org_role             ON party ("orgCode", role)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_party_name                 ON party (name)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_party_party_created_id     ON party (party_created_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_party_role_code            ON party (role_code)`)

        // Idempotent column additions for environments using partial schemas
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS reference          TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS email              TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS phone              TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS "addressLine1"     TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS "addressLine2"     TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS "addressLine3"     TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS city               TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS state              TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS postcode           TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS country            TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS region             TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS "wageRoll"         NUMERIC(18,2)`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS "numberEmployees"  INTEGER`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS "annualRevenue"    NUMERIC(18,2)`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS "sicStandard"      TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS "sicCode"          TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS "sicDescription"   TEXT`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS party_created_id   INTEGER REFERENCES party(id)`)
        await client.query(`ALTER TABLE party ADD COLUMN IF NOT EXISTS role_code          VARCHAR(50) REFERENCES lookup_party_roles(code) ON DELETE SET NULL`)

        console.log('[02-core-parties] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[02-core-parties] ERROR:', err.message); process.exit(1) })
