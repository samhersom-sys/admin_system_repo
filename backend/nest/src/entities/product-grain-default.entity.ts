import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm'

/**
 * ProductGrainDefault entity — maps to `product_grain_defaults` table.
 * Schema source: migrations/1748000000000-CreateProductGrainDefaultsTable.ts
 *
 * Stores per-row defaults for each policy grain (section / coverage / coverage_element)
 * within a product configuration.
 *
 * Multi-tenancy: scoped via org_code.
 */
@Entity('product_grain_defaults')
@Index('idx_pgd_product_grain', ['productId', 'grain', 'rowId'])
@Index('idx_pgd_org_code', ['orgCode'])
export class ProductGrainDefault {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'product_id', type: 'int' })
    productId: number

    @Column({ name: 'org_code', type: 'varchar', length: 100 })
    orgCode: string

    /** section | coverage | coverage_element */
    @Column({ name: 'grain', type: 'varchar', length: 50 })
    grain: string

    /** The row identifier from the product config table (stringified) */
    @Column({ name: 'row_id', type: 'varchar', length: 100 })
    rowId: string

    @Column({ name: 'applicable_field', type: 'text' })
    applicableField: string

    @Column({ name: 'rule', type: 'varchar', length: 100 })
    rule: string

    @Column({ name: 'value', type: 'text', nullable: true })
    value: string | null

    @Column({ name: 'sort_order', type: 'int', default: 0 })
    sortOrder: number

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date
}
