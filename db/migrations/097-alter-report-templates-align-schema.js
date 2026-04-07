'use strict'
/**
 * Migration 097 — align report_templates schema to NestJS entity expectations.
 *
 * Problem: migration 024 created report_templates with the old BackUp schema:
 *   - column "columns" (should be "fields")
 *   - column "user_name" (should be "created_by")
 *   - missing: date_basis, date_from, date_to
 *   - CHECK constraint: type IN ('report','dashboard') (must support 'custom')
 *   - data_source was NOT NULL (should be nullable)
 *
 * This migration aligns the table to the schema the NestJS service expects
 * without losing any existing data.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
})

async function run() {
    const client = await pool.connect()
    try {
        // 1. Rename "columns" -> "fields" (if columns column still exists)
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'report_templates' AND column_name = 'columns'
                ) THEN
                    ALTER TABLE report_templates RENAME COLUMN "columns" TO "fields";
                END IF;
            END $$
        `)

        // 2. Rename "user_name" -> "created_by" (if user_name column still exists)
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'report_templates' AND column_name = 'user_name'
                ) THEN
                    ALTER TABLE report_templates RENAME COLUMN "user_name" TO "created_by";
                END IF;
            END $$
        `)

        // 3. Add date_basis column if missing
        await client.query(`
            ALTER TABLE report_templates
            ADD COLUMN IF NOT EXISTS date_basis TEXT
        `)

        // 4. Add date_from column if missing
        await client.query(`
            ALTER TABLE report_templates
            ADD COLUMN IF NOT EXISTS date_from TEXT
        `)

        // 5. Add date_to column if missing
        await client.query(`
            ALTER TABLE report_templates
            ADD COLUMN IF NOT EXISTS date_to TEXT
        `)

        // 6. Add sort_by column if missing (old schema may not have it)
        await client.query(`
            ALTER TABLE report_templates
            ADD COLUMN IF NOT EXISTS sort_by TEXT
        `)

        // 7. Drop the old CHECK constraint on type (locked to 'report'|'dashboard')
        //    and allow the value 'custom' used by the NestJS module.
        await client.query(`
            DO $$
            DECLARE
                cname TEXT;
            BEGIN
                SELECT constraint_name INTO cname
                FROM information_schema.table_constraints
                WHERE table_name = 'report_templates'
                  AND constraint_type = 'CHECK'
                  AND constraint_name LIKE '%type%';

                IF cname IS NOT NULL THEN
                    EXECUTE 'ALTER TABLE report_templates DROP CONSTRAINT ' || quote_ident(cname);
                END IF;
            END $$
        `)

        // 8. Make data_source nullable (was NOT NULL in old schema)
        await client.query(`
            ALTER TABLE report_templates
            ALTER COLUMN data_source DROP NOT NULL
        `)

        // 9. Make fields nullable (was NOT NULL in old schema as "columns")
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'report_templates'
                      AND column_name = 'fields'
                      AND is_nullable = 'NO'
                ) THEN
                    ALTER TABLE report_templates ALTER COLUMN "fields" DROP NOT NULL;
                END IF;
            END $$
        `)

        console.log('[097] Done — report_templates schema aligned.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[097] ERROR:', err.message)
    process.exit(1)
})
