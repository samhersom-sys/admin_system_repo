import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWorkflowTables1740000000003 implements MigrationInterface {
  name = 'AddWorkflowTables1740000000003'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS clearance_queue (
        id               SERIAL PRIMARY KEY,
        org_code         VARCHAR(50) NOT NULL,
        submission_id    INTEGER,
        reference        VARCHAR(200),
        insured          VARCHAR(500),
        inception_date   DATE,
        expiry_date      DATE,
        clearance_status VARCHAR(50) NOT NULL DEFAULT 'pending_clearance',
        cleared_by       VARCHAR(255),
        cleared_date     TIMESTAMPTZ,
        assigned_to      VARCHAR(255),
        created_date     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_clearance_queue_org ON clearance_queue (org_code)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_clearance_queue_status ON clearance_queue (clearance_status)`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_quality_issues (
        id                SERIAL PRIMARY KEY,
        org_code          VARCHAR(50) NOT NULL,
        entity_type       VARCHAR(100),
        entity_reference  VARCHAR(200),
        entity_id         INTEGER,
        field             VARCHAR(200),
        issue_description TEXT,
        severity          VARCHAR(50),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dq_issues_org ON data_quality_issues (org_code)`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS data_quality_issues`)
    await queryRunner.query(`DROP TABLE IF EXISTS clearance_queue`)
  }
}
