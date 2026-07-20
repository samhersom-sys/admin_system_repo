import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration HOME-CFG-001 — Add master_homepage_template_id to users
 *
 * Changes applied:
 *   1. Add `master_homepage_template_id` INT NULL FK → `report_templates.id`
 *      ON DELETE SET NULL (REQ-HOME-CFG-DB-F-001)
 *
 * Multi-tenancy: Column is user-scoped; users are already tenant-scoped via org_code.
 *
 * Safe to run multiple times — uses IF EXISTS / IF NOT EXISTS guards where
 * the underlying DDL supports it.
 */
export class AddMasterHomepageToUsers1747400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // -------------------------------------------------------------------
        // 1. Add master_homepage_template_id column to users
        // -------------------------------------------------------------------
        await queryRunner.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS master_homepage_template_id INT NULL
        `)

        await queryRunner.query(`
            ALTER TABLE users
            ADD CONSTRAINT fk_users_master_homepage_template
                FOREIGN KEY (master_homepage_template_id)
                REFERENCES report_templates (id)
                ON DELETE SET NULL
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop FK constraint then column
        await queryRunner.query(`
            ALTER TABLE users
            DROP CONSTRAINT IF EXISTS fk_users_master_homepage_template
        `)

        await queryRunner.query(`
            ALTER TABLE users
            DROP COLUMN IF EXISTS master_homepage_template_id
        `)
    }
}
