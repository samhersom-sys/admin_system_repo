import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    Unique,
    Check,
} from 'typeorm'

/**
 * PolicyEarningPeriod — maps to `policy_earning_periods` table.
 *
 * One row per calendar month per policy section, holding the earned and
 * unearned premium split for that month.  Rows are fully recalculated by
 * the Earning Engine; they are never manually edited.
 *
 * REQ-EARN-S-003
 *
 * Multi-tenancy: scoped via org_code (VARCHAR 100) — consistent with all
 * other tenant-scoped tables.  Every query on this table MUST filter by
 * org_code = :orgCode from the authenticated JWT.
 *
 * FK constraints are enforced by the TypeORM migration only:
 *   policy_section_id → policy_sections(id) ON DELETE CASCADE
 *   pattern_id        → earning_patterns(id) (no cascade; nullable)
 *
 * The UNIQUE constraint (policy_section_id, period_year, period_month)
 * is enforced at both the DB and TypeORM level.
 */
@Entity('policy_earning_periods')
@Index('idx_policy_earning_periods_org_code', ['orgCode'])
@Index('idx_policy_earning_periods_section_id', ['policySectionId'])
@Unique(['policySectionId', 'periodYear', 'periodMonth'])
@Check('chk_policy_earning_periods_month', '"period_month" >= 1 AND "period_month" <= 12')
export class PolicyEarningPeriod {
    @PrimaryGeneratedColumn()
    id: number

    /** FK → policy_sections(id) ON DELETE CASCADE (enforced by migration) */
    @Column({ name: 'policy_section_id', type: 'int' })
    policySectionId: number

    /** Tenant identifier — every query MUST filter by this column */
    @Column({ name: 'org_code', type: 'varchar', length: 100 })
    orgCode: string

    @Column({ name: 'period_year', type: 'int' })
    periodYear: number

    /** 1–12 — enforced by CHECK constraint */
    @Column({ name: 'period_month', type: 'int' })
    periodMonth: number

    @Column({ name: 'total_premium', type: 'numeric', precision: 18, scale: 4 })
    totalPremium: string

    @Column({ name: 'earned_amount', type: 'numeric', precision: 18, scale: 4 })
    earnedAmount: string

    @Column({ name: 'unearned_amount', type: 'numeric', precision: 18, scale: 4 })
    unearnedAmount: string

    /** 'day' | 'period' — mirrors EarningPattern.earnBy */
    @Column({ name: 'earn_by_basis', type: 'varchar', length: 20 })
    earnByBasis: string

    @Column({ name: 'days_in_period', type: 'int' })
    daysInPeriod: number

    @Column({ name: 'days_earned', type: 'int' })
    daysEarned: number

    /** FK → earning_patterns(id) (nullable; no cascade — enforced by migration) */
    @Column({ name: 'pattern_id', type: 'int', nullable: true })
    patternId: number | null

    @Column({ name: 'calculated_at', type: 'timestamptz', default: () => 'NOW()' })
    calculatedAt: Date

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
    updatedAt: Date | null
}
