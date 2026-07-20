import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    Check,
} from 'typeorm'

/**
 * EarningPattern — maps to `earning_patterns` table.
 *
 * Defines the mathematical rule that describes how written premium earns
 * over the life of a policy. Three types are supported:
 *   'upfront'       — 100 % earned at inception
 *   'straight_line' — equal daily/period allocation over the full policy term
 *   'interpolated'  — user-defined earning curve via EarningPatternPoint rows
 *
 * earn_by controls precision:
 *   'day'    — exact calendar-day counting (default; no rounding loss)
 *   'period' — accounting-period counting
 *
 * Tenant-scoped via org_code. Soft-deleted via is_active = false.
 */
@Entity('earning_patterns')
@Index('idx_earning_patterns_org_code', ['orgCode'])
@Index('idx_earning_patterns_active', ['isActive'])
export class EarningPattern {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'org_code', type: 'varchar', length: 100 })
    orgCode: string

    @Column({ type: 'varchar', length: 255 })
    name: string

    /** 'upfront' | 'straight_line' | 'interpolated' */
    @Column({ name: 'pattern_type', type: 'varchar', length: 50 })
    patternType: 'upfront' | 'straight_line' | 'interpolated'

    /** 'day' | 'period' */
    @Column({ name: 'earn_by', type: 'varchar', length: 20, default: 'day' })
    earnBy: 'day' | 'period'

    @Column({ type: 'text', nullable: true })
    description: string | null

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date

    @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
    createdBy: string | null
}

/**
 * EarningPatternPoint — maps to `earning_pattern_points` table.
 *
 * One row per user-defined knot on an interpolated earning curve.
 *
 * pct_through_policy: 0 < x ≤ 100 — how far through the policy period (%)
 * pct_earned_increment: > 0 — the incremental % of premium earned at this knot
 *
 * All pct_earned_increment values for a pattern must sum to exactly 100.
 * Rows are ordered by pct_through_policy ascending.
 * The final point's pct_through_policy must equal 100.
 */
@Entity('earning_pattern_points')
@Index('idx_earning_pattern_points_pattern_id', ['patternId'])
@Check('chk_earning_pattern_points_pct_through', '"pct_through_policy" > 0 AND "pct_through_policy" <= 100')
@Check('chk_earning_pattern_points_pct_earned', '"pct_earned_increment" > 0')
export class EarningPatternPoint {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'pattern_id', type: 'int' })
    patternId: number

    /** 0 < x ≤ 100 */
    @Column({ name: 'pct_through_policy', type: 'numeric', precision: 8, scale: 4 })
    pctThroughPolicy: string

    /** Incremental percentage earned at this knot; all increments for a pattern must sum to 100 */
    @Column({ name: 'pct_earned_increment', type: 'numeric', precision: 8, scale: 4 })
    pctEarnedIncrement: string

    @Column({ name: 'sort_order', type: 'int', default: 0 })
    sortOrder: number

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date
}

/**
 * EarningPatternRule — maps to `earning_pattern_rules` table.
 *
 * Links an EarningPattern to a set of policy selection criteria.
 * Rules are evaluated in ascending priority order; the first matching rule wins.
 *
 * All criteria fields are nullable — a null field matches any value.
 * include_incepted controls whether already-incepted policies are included.
 */
@Entity('earning_pattern_rules')
@Index('idx_earning_pattern_rules_org_code', ['orgCode'])
@Index('idx_earning_pattern_rules_pattern_id', ['patternId'])
@Index('idx_earning_pattern_rules_priority', ['priority'])
@Index('idx_earning_pattern_rules_active', ['isActive'])
export class EarningPatternRule {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'org_code', type: 'varchar', length: 100 })
    orgCode: string

    @Column({ name: 'pattern_id', type: 'int' })
    patternId: number

    /** Lower number = evaluated first */
    @Column({ type: 'int', default: 0 })
    priority: number

    /** Nullable — null matches any class */
    @Column({ name: 'class_of_business', type: 'varchar', length: 100, nullable: true })
    classOfBusiness: string | null

    /** Nullable — null matches any contract type */
    @Column({ name: 'contract_type', type: 'varchar', length: 100, nullable: true })
    contractType: string | null

    /** When true, policies that have already incepted are included in earning calculations */
    @Column({ name: 'include_incepted', type: 'boolean', default: true })
    includeIncepted: boolean

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date

    @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
    createdBy: string | null
}
