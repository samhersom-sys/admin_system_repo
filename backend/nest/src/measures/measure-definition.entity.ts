import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm'

/**
 * MeasureDefinition entity — maps to the `measure_definitions` table.
 * Schema source: db/migrations/116-create-measure-definitions-table.js
 *
 * Two classes of measure:
 *   created_by_type = 'internal' — developer-defined; shared across all tenants;
 *                                   filter_expr is a raw SQL predicate string.
 *   created_by_type = 'tenant'  — org admin-defined; scoped to one org;
 *                                   filter_condition is JSONB (compiled by platform — no raw SQL).
 *
 * SECURITY: filter_expr is NEVER populated from tenant user input.
 * See §5.10.5 of AI Guidelines for the enforcement contract.
 */
@Entity('measure_definitions')
@Index('idx_measure_definitions_source_key', ['sourceKey'])
@Index('idx_measure_definitions_org_code', ['orgCode'])
@Index('idx_measure_definitions_active', ['isActive'])
export class MeasureDefinition {
    @PrimaryGeneratedColumn()
    id: number

    /** Unique key within the source+org scope, e.g. 'countActive' */
    @Column({ type: 'varchar', length: 100 })
    key: string

    @Column({ type: 'varchar', length: 255 })
    label: string

    /** Maps to a key in DATA_SOURCES, e.g. 'policies', 'quotes' */
    @Column({ name: 'source_key', type: 'varchar', length: 100 })
    sourceKey: string

    /** 'count' | 'sum' | 'ratio' */
    @Column({ name: 'measure_type', type: 'varchar', length: 20 })
    measureType: 'count' | 'sum' | 'ratio'

    /** 'org' | 'user' | 'both' — advisory; service layer still adds org_code filter always */
    @Column({ type: 'varchar', length: 20, default: 'org' })
    scope: 'org' | 'user' | 'both'

    /** 'internal' | 'tenant' */
    @Column({ name: 'created_by_type', type: 'varchar', length: 20 })
    createdByType: 'internal' | 'tenant'

    /** NULL for internal measures; orgCode for tenant-created measures */
    @Column({ name: 'org_code', type: 'varchar', length: 100, nullable: true })
    orgCode: string | null

    /** Internal only — raw SQL predicate, e.g. "status = 'Active'" */
    @Column({ name: 'filter_expr', type: 'text', nullable: true })
    filterExpr: string | null

    /** Tenant only — structured JSONB condition compiled to SQL by the platform */
    @Column({ name: 'filter_condition', type: 'jsonb', nullable: true })
    filterCondition: FilterCondition | null

    /** Ratio numerator predicate — internal only, e.g. "status = 'Renewed'" */
    @Column({ name: 'ratio_numerator', type: 'text', nullable: true })
    ratioNumerator: string | null

    /** Ratio denominator predicate — internal only, e.g. "renewable = 'Renewable'" */
    @Column({ name: 'ratio_denominator', type: 'text', nullable: true })
    ratioDenominator: string | null

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date
}

// ---------------------------------------------------------------------------
// filter_condition JSONB types
// ---------------------------------------------------------------------------

export type LeafCondition = {
    /** Field key from DATA_SOURCES[sourceKey].fields (dimension fields only) */
    field: string
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IS NULL' | 'IS NOT NULL'
    /** Not required for IS NULL / IS NOT NULL */
    value?: string
}

export type CompoundCondition = {
    logic: 'AND' | 'OR'
    conditions: FilterCondition[]
}

export type FilterCondition = LeafCondition | CompoundCondition
