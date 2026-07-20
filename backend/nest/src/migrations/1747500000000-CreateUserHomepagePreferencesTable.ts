import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration HOME-CFG-002 — Create user_homepage_preferences table
 *
 * Changes applied:
 *   1. Create `user_homepage_preferences` table with all columns, FK constraints,
 *      unique constraint on (user_id, template_id), and index on org_code
 *      (REQ-HOME-CFG-DB-F-002)
 *
 * Multi-tenancy: Scoped via org_code VARCHAR(100) NOT NULL per OQ-CHOME-011.
 *   All queries on this table filter by user_id, which is already tenant-scoped
 *   via the users table org_code.
 *
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
 */
export class CreateUserHomepagePreferencesTable1747500000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // -------------------------------------------------------------------
        // 1. Create user_homepage_preferences table
        // -------------------------------------------------------------------
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS user_homepage_preferences (
                id                   SERIAL          PRIMARY KEY,
                user_id              INT             NOT NULL,
                template_id          INT             NOT NULL,
                show_on_homepage     BOOLEAN         NOT NULL DEFAULT false,
                homepage_page_order  INT             NULL,
                org_code             VARCHAR(100)    NOT NULL
            )
        `)

        // -------------------------------------------------------------------
        // 2. FK: user_id → users.id ON DELETE CASCADE
        // -------------------------------------------------------------------
        await queryRunner.query(`
            ALTER TABLE user_homepage_preferences
            ADD CONSTRAINT fk_user_homepage_preferences_user
                FOREIGN KEY (user_id)
                REFERENCES users (id)
                ON DELETE CASCADE
        `)

        // -------------------------------------------------------------------
        // 3. FK: template_id → report_templates.id ON DELETE CASCADE
        // -------------------------------------------------------------------
        await queryRunner.query(`
            ALTER TABLE user_homepage_preferences
            ADD CONSTRAINT fk_user_homepage_preferences_template
                FOREIGN KEY (template_id)
                REFERENCES report_templates (id)
                ON DELETE CASCADE
        `)

        // -------------------------------------------------------------------
        // 4. Unique constraint on (user_id, template_id)
        // -------------------------------------------------------------------
        await queryRunner.query(`
            ALTER TABLE user_homepage_preferences
            ADD CONSTRAINT uq_user_homepage_preferences_user_template
                UNIQUE (user_id, template_id)
        `)

        // -------------------------------------------------------------------
        // 5. Index on org_code
        // -------------------------------------------------------------------
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_user_homepage_preferences_org_code
                ON user_homepage_preferences (org_code)
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS user_homepage_preferences`)
    }
}
