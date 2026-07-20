import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration PSS-001 — create organisations table
 *
 * Stores platform-level classification of each organisation.
 * org_type determines access rules: brokers can create/manage broker
 * submissions; insurers can receive placement invitations.
 *
 * Existing orgs (identified by org_code strings already in the JWT)
 * can be seeded separately; this migration creates the table only.
 *
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
 */
export class CreateOrganisationsTable1747000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organisations (
        id          SERIAL        PRIMARY KEY,
        org_code    VARCHAR(50)   NOT NULL UNIQUE,
        org_type    VARCHAR(30)   NOT NULL DEFAULT 'insurer'
                                  CHECK (org_type IN ('broker', 'insurer', 'platform')),
        name        VARCHAR(255)  NULL,
        is_active   BOOLEAN       NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organisations_org_code
        ON organisations (org_code)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organisations_org_type
        ON organisations (org_type)
    `)

    // Seed known orgs from dev/UAT credentials so the feature is immediately
    // usable. In production, manage org classifications via the admin panel.
    await queryRunner.query(`
      INSERT INTO organisations (org_code, org_type, name)
      VALUES
        ('BRK1', 'broker',   'Demo Broker'),
        ('DEMO', 'platform', 'PolicyForge Platform')
      ON CONFLICT (org_code) DO NOTHING
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS organisations`)
  }
}
