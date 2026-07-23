import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration EARN-001 — Earning Engine Phase 2 schema changes
 *
 * Changes applied:
 *   1. Drop `product_id` column from `earning_pattern_rules` (REQ-EARN-S-001)
 *   2. Add `resolved_earning_pattern_id` INT FK (nullable) to `policy_sections` (REQ-EARN-S-002)
 *   3. Add `has_earning_variants` BOOLEAN DEFAULT false to `measure_definitions` (REQ-EARN-S-004)
 *   4. Create `policy_earning_periods` table with all columns, constraints, and indexes (REQ-EARN-S-003)
 *
 * Multi-tenancy: policy_earning_periods is scoped via org_code VARCHAR(100).
 *
 * Safe to run multiple times — uses IF EXISTS / IF NOT EXISTS guards where
 * the underlying DDL supports it (ALTER TABLE ADD COLUMN is not idempotent
 * in all PostgreSQL versions; this migration is designed for a single run).
 */
export class EarningEnginePhaseTwoSchema1747300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // -------------------------------------------------------------------
        // 0. Create the entity-first earning-pattern tables for persistent
        //    environments.  Fresh installs receive these from db:sync, but
        //    UAT and production use migrations only.
        // -------------------------------------------------------------------
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS earning_patterns (
                id          SERIAL       PRIMARY KEY,
                org_code    VARCHAR(100) NOT NULL,
                name        VARCHAR(255) NOT NULL,
                pattern_type VARCHAR(50) NOT NULL,
                earn_by     VARCHAR(20) NOT NULL DEFAULT 'day',
                description TEXT,
                is_active   BOOLEAN NOT NULL DEFAULT true,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by  VARCHAR(255)
            )
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_earning_patterns_org_code
                ON earning_patterns (org_code)
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_earning_patterns_active
                ON earning_patterns (is_active)
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS earning_pattern_points (
                id                     SERIAL PRIMARY KEY,
                pattern_id             INT NOT NULL,
                pct_through_policy     NUMERIC(8,4) NOT NULL,
                pct_earned_increment   NUMERIC(8,4) NOT NULL,
                sort_order             INT NOT NULL DEFAULT 0,
                created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT chk_earning_pattern_points_pct_through
                    CHECK (pct_through_policy > 0 AND pct_through_policy <= 100),
                CONSTRAINT chk_earning_pattern_points_pct_earned
                    CHECK (pct_earned_increment > 0)
            )
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_earning_pattern_points_pattern_id
                ON earning_pattern_points (pattern_id)
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS earning_pattern_rules (
                id                SERIAL PRIMARY KEY,
                org_code          VARCHAR(100) NOT NULL,
                pattern_id        INT NOT NULL,
                priority          INT NOT NULL DEFAULT 0,
                class_of_business VARCHAR(100),
                contract_type     VARCHAR(100),
                include_incepted  BOOLEAN NOT NULL DEFAULT true,
                is_active         BOOLEAN NOT NULL DEFAULT true,
                created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by        VARCHAR(255)
            )
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_earning_pattern_rules_org_code
                ON earning_pattern_rules (org_code)
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_earning_pattern_rules_pattern_id
                ON earning_pattern_rules (pattern_id)
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_earning_pattern_rules_priority
                ON earning_pattern_rules (priority)
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_earning_pattern_rules_active
                ON earning_pattern_rules (is_active)
        `)

        // -------------------------------------------------------------------
        // 1. Drop product_id from earning_pattern_rules
        // -------------------------------------------------------------------
        await queryRunner.query(`
            ALTER TABLE earning_pattern_rules
            DROP COLUMN IF EXISTS product_id
        `)

        // -------------------------------------------------------------------
        // 2. Add resolved_earning_pattern_id to policy_sections
        // -------------------------------------------------------------------
        await queryRunner.query(`
            ALTER TABLE policy_sections
            ADD COLUMN IF NOT EXISTS resolved_earning_pattern_id INT NULL
        `)

        await queryRunner.query(`
            ALTER TABLE policy_sections
            ADD CONSTRAINT fk_policy_sections_resolved_earning_pattern
                FOREIGN KEY (resolved_earning_pattern_id)
                REFERENCES earning_patterns (id)
                ON DELETE RESTRICT
                DEFERRABLE INITIALLY DEFERRED
        `)

        // -------------------------------------------------------------------
        // 3. Add has_earning_variants to measure_definitions
        // -------------------------------------------------------------------
        await queryRunner.query(`
            ALTER TABLE measure_definitions
            ADD COLUMN IF NOT EXISTS has_earning_variants BOOLEAN NOT NULL DEFAULT false
        `)

        // -------------------------------------------------------------------
        // 4. Create policy_earning_periods table
        // -------------------------------------------------------------------
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS policy_earning_periods (
                id                  SERIAL          PRIMARY KEY,
                policy_section_id   INT             NOT NULL,
                org_code            VARCHAR(100)    NOT NULL,
                period_year         INT             NOT NULL,
                period_month        INT             NOT NULL,
                total_premium       NUMERIC(18,4)   NOT NULL,
                earned_amount       NUMERIC(18,4)   NOT NULL,
                unearned_amount     NUMERIC(18,4)   NOT NULL,
                earn_by_basis       VARCHAR(20)     NOT NULL,
                days_in_period      INT             NOT NULL,
                days_earned         INT             NOT NULL,
                pattern_id          INT             NULL,
                calculated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMPTZ     NULL,
                CONSTRAINT chk_policy_earning_periods_month
                    CHECK (period_month >= 1 AND period_month <= 12),
                CONSTRAINT uq_policy_earning_periods_section_year_month
                    UNIQUE (policy_section_id, period_year, period_month)
            )
        `)

        await queryRunner.query(`
            ALTER TABLE policy_earning_periods
            ADD CONSTRAINT fk_policy_earning_periods_section
                FOREIGN KEY (policy_section_id)
                REFERENCES policy_sections (id)
                ON DELETE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE policy_earning_periods
            ADD CONSTRAINT fk_policy_earning_periods_pattern
                FOREIGN KEY (pattern_id)
                REFERENCES earning_patterns (id)
                ON DELETE RESTRICT
                DEFERRABLE INITIALLY DEFERRED
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_policy_earning_periods_org_code
                ON policy_earning_periods (org_code)
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_policy_earning_periods_section_id
                ON policy_earning_periods (policy_section_id)
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop policy_earning_periods table
        await queryRunner.query(`DROP TABLE IF EXISTS policy_earning_periods`)

        // Remove has_earning_variants from measure_definitions
        await queryRunner.query(`
            ALTER TABLE measure_definitions
            DROP COLUMN IF EXISTS has_earning_variants
        `)

        // Remove resolved_earning_pattern_id FK and column from policy_sections
        await queryRunner.query(`
            ALTER TABLE policy_sections
            DROP CONSTRAINT IF EXISTS fk_policy_sections_resolved_earning_pattern
        `)
        await queryRunner.query(`
            ALTER TABLE policy_sections
            DROP COLUMN IF EXISTS resolved_earning_pattern_id
        `)

        // Re-add product_id to earning_pattern_rules (restore to nullable INT)
        await queryRunner.query(`
            ALTER TABLE earning_pattern_rules
            ADD COLUMN IF NOT EXISTS product_id INT NULL
        `)
    }
}
