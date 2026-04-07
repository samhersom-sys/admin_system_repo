import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration: add-reporting-tables
 *
 * Creates:
 *   report_templates          — stores report template configurations
 *   report_execution_history  — records each execution of a template
 *
 * Run via: npm run typeorm:migration:run (from backend/nest/)
 */
export class AddReportingTables1740000000001 implements MigrationInterface {
    name = 'AddReportingTables1740000000001'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS report_templates (
                id            SERIAL PRIMARY KEY,
                org_code      TEXT,
                name          TEXT NOT NULL,
                description   TEXT,
                type          TEXT NOT NULL DEFAULT 'custom',
                data_source   TEXT,
                date_basis    TEXT,
                date_from     TEXT,
                date_to       TEXT,
                sort_by       TEXT,
                sort_order    TEXT,
                fields        JSONB,
                filters       JSONB,
                created_by    TEXT,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_report_templates_org_code
            ON report_templates (org_code)
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS report_execution_history (
                id          SERIAL PRIMARY KEY,
                template_id INT NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
                run_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                run_by      TEXT,
                row_count   INT,
                status      TEXT NOT NULL DEFAULT 'success'
            )
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_report_exec_history_template
            ON report_execution_history (template_id)
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS report_execution_history`)
        await queryRunner.query(`DROP TABLE IF EXISTS report_templates`)
    }
}
