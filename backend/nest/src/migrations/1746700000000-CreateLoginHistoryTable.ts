import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration 001 — create login_history table
 *
 * Records every successful user login so the User Login Activity report
 * can show a full historic log (previously only the last login was stored
 * on the users.last_login column).
 *
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
 */
export class CreateLoginHistoryTable1746700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS login_history (
        id            BIGSERIAL    PRIMARY KEY,
        user_id       INTEGER      NOT NULL,
        user_name     VARCHAR(255) NOT NULL,
        org_code      VARCHAR(50)  NULL,
        logged_in_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_history_user_id
        ON login_history (user_id)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_history_org_code
        ON login_history (org_code)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_history_logged_in_at
        ON login_history (logged_in_at DESC)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS login_history`)
  }
}
