import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddProductCategoriesToProducts1748200000000 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS product_categories (
                id                SERIAL PRIMARY KEY,
                org_code          VARCHAR(100) NOT NULL,
                name              TEXT NOT NULL,
                created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uq_product_categories_org_name
                ON product_categories (org_code, LOWER(name))
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_product_categories_org_code
                ON product_categories (org_code)
        `)

        await queryRunner.query(`
            ALTER TABLE products
            ADD COLUMN IF NOT EXISTS product_category_id INTEGER
        `)

        await queryRunner.query(`
            ALTER TABLE products
            DROP CONSTRAINT IF EXISTS products_product_type_check
        `)
        await queryRunner.query(`
            ALTER TABLE products
            ALTER COLUMN product_type DROP DEFAULT
        `)

        await queryRunner.query(`
            INSERT INTO product_categories (org_code, name)
            SELECT DISTINCT
                p.org_code,
                CASE
                    WHEN p.product_type IS NULL OR btrim(p.product_type) = '' THEN 'Uncategorised'
                    WHEN POSITION('_' IN p.product_type) > 0 THEN INITCAP(REPLACE(p.product_type, '_', ' '))
                    ELSE p.product_type
                END
            FROM products p
            WHERE p.product_type IS NOT NULL
              AND btrim(p.product_type) <> ''
              AND NOT EXISTS (
                  SELECT 1
                  FROM product_categories pc
                  WHERE pc.org_code = p.org_code
                    AND LOWER(pc.name) = LOWER(
                        CASE
                            WHEN POSITION('_' IN p.product_type) > 0 THEN INITCAP(REPLACE(p.product_type, '_', ' '))
                            ELSE p.product_type
                        END
                    )
              )
        `)

        await queryRunner.query(`
            UPDATE products p
            SET product_category_id = pc.id
            FROM product_categories pc
            WHERE pc.org_code = p.org_code
              AND LOWER(pc.name) = LOWER(
                CASE
                    WHEN p.product_type IS NULL OR btrim(p.product_type) = '' THEN 'Uncategorised'
                    WHEN POSITION('_' IN p.product_type) > 0 THEN INITCAP(REPLACE(p.product_type, '_', ' '))
                    ELSE p.product_type
                END
              )
        `)

        await queryRunner.query(`
            ALTER TABLE products
            ADD CONSTRAINT fk_products_product_category
            FOREIGN KEY (product_category_id) REFERENCES product_categories(id) ON DELETE SET NULL
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_products_product_category_id
                ON products (product_category_id)
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_products_product_category_id`)
        await queryRunner.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_product_category`)
        await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS product_category_id`)
        await queryRunner.query(`ALTER TABLE products ALTER COLUMN product_type SET DEFAULT 'open_market'`)
        await queryRunner.query(`ALTER TABLE products ADD CONSTRAINT products_product_type_check CHECK (product_type IN ('open_market', 'delegated'))`)
        await queryRunner.query(`DROP INDEX IF EXISTS idx_product_categories_org_code`)
        await queryRunner.query(`DROP INDEX IF EXISTS uq_product_categories_org_name`)
        await queryRunner.query(`DROP TABLE IF EXISTS product_categories CASCADE`)
    }
}