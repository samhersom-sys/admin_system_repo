import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm'

/**
 * ReportTemplate entity — maps to the `report_templates` table.
 * Schema source: migrations/1740000000001-add-reporting-tables.ts
 *
 * Stores user-defined and system core report template configurations.
 * type = 'core'   → created by system/admin; visible to all orgs
 * type = 'custom' → created by a specific org; scoped to orgCode
 */
@Entity('report_templates')
@Index('idx_report_templates_org_code', ['orgCode'])
export class ReportTemplate {
    @PrimaryGeneratedColumn()
    id: number

    /** Org that owns this template. NULL or 'SYSTEM' for core templates. */
    @Column({ name: 'org_code', type: 'text', nullable: true })
    orgCode: string | null

    @Column({ type: 'text' })
    name: string

    @Column({ type: 'text', nullable: true })
    description: string | null

    /** 'core' = system-provided, 'custom' = user-created */
    @Column({ type: 'text', default: 'custom' })
    type: string

    @Column({ name: 'data_source', type: 'text', nullable: true })
    dataSource: string | null

    @Column({ name: 'date_basis', type: 'text', nullable: true })
    dateBasis: string | null

    @Column({ name: 'date_from', type: 'text', nullable: true })
    dateFrom: string | null

    @Column({ name: 'date_to', type: 'text', nullable: true })
    dateTo: string | null

    @Column({ name: 'sort_by', type: 'text', nullable: true })
    sortBy: string | null

    @Column({ name: 'sort_order', type: 'text', nullable: false, default: 'asc' })
    sortOrder: string

    /** Selected fields (array of field keys from FIELD_MAPPINGS). */
    @Column({ type: 'jsonb', nullable: true })
    fields: string[] | null

    /** Row-level filter conditions. */
    @Column({ type: 'jsonb', nullable: true })
    filters: Array<{ field: string; operator: string; value: string }> | null

    @Column({ name: 'created_by', type: 'text', nullable: true })
    createdBy: string | null

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date
}
