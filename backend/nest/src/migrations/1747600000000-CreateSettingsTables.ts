import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Creates the core settings tables required for the Settings module:
 *  - products          : product configuration master records
 *  - product_workflow_steps : configurable workflow steps per product
 *  - data_quality_settings  : per-org data quality configuration
 */
export class CreateSettingsTables1747600000000 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        // -----------------------------------------------------------------
        // products
        // -----------------------------------------------------------------
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS products (
                id                SERIAL PRIMARY KEY,
                org_code          VARCHAR(100) NOT NULL,
                name              TEXT NOT NULL,
                code              TEXT NOT NULL,
                product_type      TEXT NOT NULL DEFAULT 'open_market'
                                      CHECK (product_type IN ('open_market', 'delegated')),
                line_of_business  TEXT,
                description       TEXT,
                underwriting_year INTEGER,
                is_active         BOOLEAN NOT NULL DEFAULT TRUE,
                config            JSONB DEFAULT '{}',
                created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_code
                ON products (org_code, code)
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_products_org_code
                ON products (org_code)
        `)

        // -----------------------------------------------------------------
        // product_workflow_steps
        // -----------------------------------------------------------------
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS product_workflow_steps (
                id                   SERIAL PRIMARY KEY,
                product_id           INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                step_name            TEXT NOT NULL,
                step_code            TEXT NOT NULL,
                step_type            TEXT NOT NULL DEFAULT 'manual'
                                         CHECK (step_type IN ('manual', 'system')),
                description          TEXT,
                sort_order           INTEGER NOT NULL DEFAULT 0,
                is_active            BOOLEAN NOT NULL DEFAULT TRUE,
                is_default           BOOLEAN NOT NULL DEFAULT FALSE,
                requires_assignment  BOOLEAN NOT NULL DEFAULT FALSE,
                auto_transition_to   TEXT,
                config               JSONB DEFAULT '{}',
                created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (product_id, step_code)
            )
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_pws_product_id
                ON product_workflow_steps (product_id)
        `)

        // -----------------------------------------------------------------
        // data_quality_settings
        // -----------------------------------------------------------------
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS data_quality_settings (
                id                                 SERIAL PRIMARY KEY,
                org_code                           VARCHAR(100) NOT NULL UNIQUE,
                enable_ba_section_date_validation  BOOLEAN NOT NULL DEFAULT TRUE,
                enable_quote_mandatory_fields      BOOLEAN NOT NULL DEFAULT TRUE,
                enable_policy_mandatory_fields     BOOLEAN NOT NULL DEFAULT TRUE,
                exclude_draft_status               BOOLEAN NOT NULL DEFAULT TRUE,
                severity_threshold                 TEXT NOT NULL DEFAULT 'medium',
                auto_check_on_save                 BOOLEAN NOT NULL DEFAULT TRUE,
                email_notifications                BOOLEAN NOT NULL DEFAULT FALSE,
                notification_email                 TEXT NOT NULL DEFAULT '',
                created_at                         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at                         TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_dqs_org_code
                ON data_quality_settings (org_code)
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS data_quality_settings CASCADE`)
        await queryRunner.query(`DROP TABLE IF EXISTS product_workflow_steps CASCADE`)
        await queryRunner.query(`DROP TABLE IF EXISTS products CASCADE`)
    }
}
