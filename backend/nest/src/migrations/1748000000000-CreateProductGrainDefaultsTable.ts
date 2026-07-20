import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateProductGrainDefaultsTable1748000000000 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS product_grain_defaults (
                id              SERIAL PRIMARY KEY,
                product_id      INTEGER NOT NULL,
                org_code        VARCHAR(100) NOT NULL,
                grain           VARCHAR(50) NOT NULL
                                    CHECK (grain IN ('section', 'coverage', 'coverage_element')),
                row_id          VARCHAR(100) NOT NULL,
                applicable_field TEXT NOT NULL,
                rule            VARCHAR(100) NOT NULL,
                value           TEXT,
                sort_order      INTEGER NOT NULL DEFAULT 0,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_pgd_product_grain
                ON product_grain_defaults (product_id, grain, row_id)
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_pgd_org_code
                ON product_grain_defaults (org_code)
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS product_grain_defaults CASCADE`)
    }
}
