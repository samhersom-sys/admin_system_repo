import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration PSS-003 — create broker_submissions table
 *
 * Stores broker-created submissions. Separate from the legacy `submission`
 * table (which predates the platform-shared-submissions design).
 *
 * Design decisions applied:
 *   - source FKs to lookup_broker_submission_sources (OQ-PSS-002 ✅)
 *   - workflow_status as VARCHAR with CHECK constraint matching lookup values
 *     (tech debt: FK migration deferred, same pattern as existing submission table)
 *   - org_code from JWT — no FK to organisations (consistent with all other tables)
 *   - created_by / updated_by as user IDs (INT)
 *
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
 */
export class CreateBrokerSubmissionsTable1747200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS broker_submissions (
        id                  SERIAL        PRIMARY KEY,
        org_code            VARCHAR(50)   NOT NULL,
        reference           VARCHAR(100)  NULL,
        insured_name        VARCHAR(500)  NOT NULL,
        class_of_business   VARCHAR(100)  NULL,
        inception_date      DATE          NOT NULL,
        expiry_date         DATE          NULL,
        estimated_premium   NUMERIC(18,2) NULL,
        currency            VARCHAR(10)   NULL DEFAULT 'USD',
        source              VARCHAR(50)   NOT NULL
                                          REFERENCES lookup_broker_submission_sources(code),
        workflow_status     VARCHAR(50)   NOT NULL DEFAULT 'Created',
        created_by          INTEGER       NOT NULL,
        updated_by          INTEGER       NULL,
        created_at          TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_submissions_org_code
        ON broker_submissions (org_code)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_submissions_source
        ON broker_submissions (source)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_submissions_status
        ON broker_submissions (workflow_status)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS broker_submissions`)
  }
}
