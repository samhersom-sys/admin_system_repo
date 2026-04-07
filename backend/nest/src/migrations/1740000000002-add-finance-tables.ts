import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFinanceTables1740000000002 implements MigrationInterface {
  name = 'AddFinanceTables1740000000002'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finance_cash_batches (
        id           SERIAL PRIMARY KEY,
        org_code     VARCHAR(50)  NOT NULL,
        reference    VARCHAR(200),
        amount       NUMERIC(15,2),
        currency     VARCHAR(10)  NOT NULL DEFAULT 'USD',
        allocated    NUMERIC(15,2) NOT NULL DEFAULT 0,
        remaining    NUMERIC(15,2),
        status       VARCHAR(50)  NOT NULL DEFAULT 'open',
        assigned_to  VARCHAR(255),
        created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_finance_cash_batches_org ON finance_cash_batches (org_code)`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finance_invoices (
        id               SERIAL PRIMARY KEY,
        org_code         VARCHAR(50)  NOT NULL,
        reference        VARCHAR(200),
        type             VARCHAR(50),
        policy_reference VARCHAR(200),
        policy_id        INTEGER,
        insured_name     VARCHAR(500),
        amount           NUMERIC(15,2),
        outstanding      NUMERIC(15,2),
        status           VARCHAR(50),
        due_date         DATE,
        issue_date       DATE,
        currency         VARCHAR(10) NOT NULL DEFAULT 'USD',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_finance_invoices_org ON finance_invoices (org_code)`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finance_payments (
        id         SERIAL PRIMARY KEY,
        org_code   VARCHAR(50)  NOT NULL,
        reference  VARCHAR(200),
        type       VARCHAR(50),
        source     VARCHAR(255),
        amount     NUMERIC(15,2),
        currency   VARCHAR(10) NOT NULL DEFAULT 'USD',
        method     VARCHAR(50),
        status     VARCHAR(50),
        date       DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_finance_payments_org ON finance_payments (org_code)`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS finance_payments`)
    await queryRunner.query(`DROP TABLE IF EXISTS finance_invoices`)
    await queryRunner.query(`DROP TABLE IF EXISTS finance_cash_batches`)
  }
}
