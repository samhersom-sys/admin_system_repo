import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration 002 — create measure_definitions table
 *
 * The measure_definitions table was introduced as a TypeORM entity in commit 73f2e27
 * (TypeORM entity-first schema management) but no migration was created at the time.
 * Fresh installs use db:sync (TypeORM synchronize) to create it; persistent environments
 * such as UAT and production must have it created via this migration.
 *
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 *
 * Also seeds all internal (developer-defined) measures so the KPI widget can resolve
 * the countActive predicate for policies from the database rather than a hardcoded string.
 */
export class CreateMeasureDefinitionsTable1746800000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS measure_definitions (
                id                SERIAL       PRIMARY KEY,
                key               VARCHAR(100) NOT NULL,
                label             VARCHAR(255) NOT NULL,
                source_key        VARCHAR(100) NOT NULL,
                measure_type      VARCHAR(20)  NOT NULL,
                scope             VARCHAR(20)  NOT NULL DEFAULT 'org',
                created_by_type   VARCHAR(20)  NOT NULL,
                org_code          VARCHAR(100),
                filter_expr       TEXT,
                filter_condition  JSONB,
                ratio_numerator   TEXT,
                ratio_denominator TEXT,
                is_active         BOOLEAN      NOT NULL DEFAULT true,
                created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
                updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
                CONSTRAINT uq_measure_definitions_key_org UNIQUE (key, org_code)
            )
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_measure_definitions_source_key
                ON measure_definitions (source_key)
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_measure_definitions_org_code
                ON measure_definitions (org_code)
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_measure_definitions_active
                ON measure_definitions (is_active)
        `)

        // Seed all internal measures (developer-defined, shared across tenants).
        // ON CONFLICT DO NOTHING — safe to re-run; existing rows are not overwritten.
        // These mirror the data in db/seeds/032-measure-definitions.js.
        const measures = [
            // submissions
            { key: 'countAll', label: 'Count of Submissions', source_key: 'submissions', measure_type: 'count', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },

            // policies
            { key: 'countAll', label: 'Count of Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },
            { key: 'countActive', label: 'Count of Active Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "status = 'Active'", ratio_numerator: null, ratio_denominator: null },
            { key: 'countLapsed', label: 'Count of Lapsed Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "status = 'Expired'", ratio_numerator: null, ratio_denominator: null },
            { key: 'countRenewed', label: 'Count of Renewed Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "status = 'Renewed'", ratio_numerator: null, ratio_denominator: null },
            { key: 'countRenewable', label: 'Count of Renewable Policies', source_key: 'policies', measure_type: 'count', scope: 'both', filter_expr: "renewable = 'Renewable'", ratio_numerator: null, ratio_denominator: null },
            { key: 'retentionRatio', label: 'Retention Ratio', source_key: 'policies', measure_type: 'ratio', scope: 'org', filter_expr: null, ratio_numerator: "status = 'Renewed'", ratio_denominator: "renewable = 'Renewable'" },
            { key: 'grossWrittenPremium', label: 'Gross Net Written Premium', source_key: 'policies', measure_type: 'sum', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },

            // quotes
            { key: 'countAll', label: 'Count of Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: null, ratio_numerator: null, ratio_denominator: null },
            { key: 'countDeclined', label: 'Count of Declined Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "status = 'declined'", ratio_numerator: null, ratio_denominator: null },
            { key: 'countRenewable', label: 'Count of Renewable Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "renewable_indicator = 'Yes'", ratio_numerator: null, ratio_denominator: null },
            { key: 'countRenewed', label: 'Count of Renewed Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "renewal_status = 'renewed'", ratio_numerator: null, ratio_denominator: null },
            { key: 'countNewBusiness', label: 'Count of New Business Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "new_or_renewal = 'New'", ratio_numerator: null, ratio_denominator: null },
            { key: 'countRenewalBusiness', label: 'Count of Renewal Business Quotes', source_key: 'quotes', measure_type: 'count', scope: 'both', filter_expr: "new_or_renewal = 'Renewal'", ratio_numerator: null, ratio_denominator: null },

            // bindingAuthorities
            { key: 'countAll', label: 'Count of Binding Authorities', source_key: 'bindingAuthorities', measure_type: 'count', scope: 'org', filter_expr: null, ratio_numerator: null, ratio_denominator: null },
        ]

        for (const m of measures) {
            await queryRunner.query(
                `INSERT INTO measure_definitions
                    (key, label, source_key, measure_type, scope, created_by_type, org_code,
                     filter_expr, filter_condition, ratio_numerator, ratio_denominator, is_active)
                 VALUES ($1, $2, $3, $4, $5, 'internal', NULL, $6, NULL, $7, $8, TRUE)
                 ON CONFLICT (key, org_code) DO NOTHING`,
                [m.key, m.label, m.source_key, m.measure_type, m.scope,
                 m.filter_expr, m.ratio_numerator, m.ratio_denominator],
            )
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS measure_definitions`)
    }
}
