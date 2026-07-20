import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration PSS-002 — create lookup_broker_submission_sources table
 *
 * Defines the allowed submission type values: manual and platform_shared.
 * The broker_submissions.source column FKs to this table so the allowed
 * values are controlled by data, not hardcoded application logic.
 *
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS + ON CONFLICT.
 */
export class CreateLookupBrokerSubmissionSources1747100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lookup_broker_submission_sources (
        id          SERIAL        PRIMARY KEY,
        code        VARCHAR(50)   NOT NULL UNIQUE,
        name        VARCHAR(100)  NOT NULL,
        description TEXT          NULL,
        order_index INT           NOT NULL DEFAULT 0,
        is_active   BOOLEAN       NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await queryRunner.query(`
      INSERT INTO lookup_broker_submission_sources (code, name, description, order_index)
      VALUES
        ('manual',          'Manual',          'Broker manages placement of this risk outside the platform', 1),
        ('platform_shared', 'Platform Shared', 'Broker shares this submission with insurers through the platform', 2)
      ON CONFLICT (code) DO NOTHING
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lookup_broker_submission_sources`)
  }
}
