import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Add product_id FK to quotes table
 * Allows quotes to be associated with a product configuration.
 */
export class AddProductIdToQuotes1748100000000 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE quotes
                ADD COLUMN IF NOT EXISTS product_id INTEGER
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_quotes_product_id
                ON quotes (product_id)
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS product_id`)
    }
}
