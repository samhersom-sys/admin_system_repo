'use strict'
/**
 * Schema 17: reporting tables
 * Replaces migrations: 024-create-report-templates-table, 097-alter-report-templates-align-schema,
 *                      025-create-dashboard-widgets-table, 026-create-system-error-catalog-table,
 *                      067-create-report-template-audits-table, 068-create-report-template-shares-table,
 *                      098-create-report-execution-history
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[17-reporting] Creating reporting tables...')

        // report_templates (024 + 097 aligned schema: uses correct column names from start)
        await client.query(`
            CREATE TABLE IF NOT EXISTS report_templates (
                id           SERIAL PRIMARY KEY,
                org_code     TEXT,
                name         TEXT NOT NULL,
                description  TEXT,
                type         TEXT NOT NULL DEFAULT 'custom',
                data_source  TEXT,
                date_basis   TEXT,
                date_from    TEXT,
                date_to      TEXT,
                sort_by      TEXT,
                sort_order   TEXT,
                fields       JSONB,
                filters      JSONB NOT NULL DEFAULT '[]',
                created_by   TEXT,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_templates_org_code ON report_templates (org_code)`)

        // Align schema for environments that may have old column names (migration 097 logic)
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_templates' AND column_name = 'columns') THEN
                    ALTER TABLE report_templates RENAME COLUMN "columns" TO "fields";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_templates' AND column_name = 'user_name') THEN
                    ALTER TABLE report_templates RENAME COLUMN "user_name" TO "created_by";
                END IF;
            END $$
        `)
        await client.query(`ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS date_basis TEXT`)
        await client.query(`ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS date_from  TEXT`)
        await client.query(`ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS date_to    TEXT`)
        await client.query(`ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS sort_by    TEXT`)

        // dashboard_widgets (025)
        await client.query(`
            CREATE TABLE IF NOT EXISTS dashboard_widgets (
                id            SERIAL PRIMARY KEY,
                dashboard_id  INTEGER NOT NULL,
                template_id   INTEGER REFERENCES report_templates(id) ON DELETE CASCADE,
                slot_id       VARCHAR(50) NOT NULL,
                section_id    VARCHAR(100),
                widget_label  VARCHAR(255),
                is_active     BOOLEAN NOT NULL DEFAULT TRUE,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_dashboard_widgets              ON dashboard_widgets (dashboard_id, template_id, slot_id, section_id)`)
        await client.query(`CREATE INDEX        IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets (dashboard_id)`)
        await client.query(`CREATE INDEX        IF NOT EXISTS idx_dashboard_widgets_template_id  ON dashboard_widgets (template_id)`)

        // system_error_catalog (026)
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_error_catalog (
                error_code       VARCHAR(50) PRIMARY KEY,
                category         VARCHAR(50),
                severity         VARCHAR(20) NOT NULL DEFAULT 'error',
                message_template TEXT NOT NULL,
                resolution_hint  TEXT,
                first_identified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_occurred    TIMESTAMPTZ,
                occurrence_count INTEGER NOT NULL DEFAULT 0
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_system_error_catalog_severity ON system_error_catalog (severity)`)

        // report_template_audits (067)
        await client.query(`
            CREATE TABLE IF NOT EXISTS report_template_audits (
                id                  SERIAL PRIMARY KEY,
                report_template_id  INTEGER REFERENCES report_templates(id) ON DELETE CASCADE,
                action              VARCHAR(20) NOT NULL,
                user_name           VARCHAR(255),
                changes             TEXT,
                created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_audits_template ON report_template_audits (report_template_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_audits_created  ON report_template_audits (created_at)`)

        // report_template_shares (068)
        await client.query(`
            CREATE TABLE IF NOT EXISTS report_template_shares (
                id                      SERIAL PRIMARY KEY,
                report_template_id      INTEGER NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
                shared_by_user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                shared_with_user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                permission_level        VARCHAR(20) NOT NULL DEFAULT 'view',
                created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT uq_report_template_shares_template_user UNIQUE (report_template_id, shared_with_user_id)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_shares_template    ON report_template_shares (report_template_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_shares_shared_with ON report_template_shares (shared_with_user_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_shares_shared_by   ON report_template_shares (shared_by_user_id)`)

        // report_execution_history (098)
        await client.query(`
            CREATE TABLE IF NOT EXISTS report_execution_history (
                id          SERIAL PRIMARY KEY,
                template_id INT NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
                run_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                run_by      TEXT,
                row_count   INT,
                status      TEXT NOT NULL DEFAULT 'success'
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_exec_history_template ON report_execution_history (template_id)`)

        console.log('[17-reporting] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[17-reporting] ERROR:', err.message); process.exit(1) })
