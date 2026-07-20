import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm'

@Entity('quote_section_coverage_details')
@Index('idx_quote_section_coverage_details_quote_id', ['quoteId'])
@Index('idx_quote_section_coverage_details_section_id', ['sectionId'])
@Index('idx_quote_section_coverage_details_coverage_id', ['coverageId'])
export class QuoteSectionCoverageDetail {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'quote_id', type: 'int' })
    quoteId: number

    @Column({ name: 'section_id', type: 'int' })
    sectionId: number

    @Column({ name: 'coverage_id', type: 'int' })
    coverageId: number

    @Column({ type: 'text', nullable: true })
    reference: string | null

    @Column({ name: 'coverage_detail_type_id', type: 'int', nullable: true })
    coverageDetailTypeId: number | null

    @Column({ name: 'coverage_detail_sub_type_id', type: 'int', nullable: true })
    coverageDetailSubTypeId: number | null

    @Column({ name: 'effective_date', type: 'date', nullable: true })
    effectiveDate: string | null

    @Column({ name: 'effective_time', type: 'time', precision: 3, nullable: true })
    effectiveTime: string | null

    @Column({ name: 'expiry_date', type: 'date', nullable: true })
    expiryDate: string | null

    @Column({ name: 'expiry_time', type: 'time', precision: 3, nullable: true })
    expiryTime: string | null

    @Column({ name: 'sum_insured_currency', type: 'text', nullable: true })
    sumInsuredCurrency: string | null

    @Column({ name: 'sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
    sumInsured: string | null

    @Column({ type: 'jsonb', default: '{}' })
    payload: Record<string, unknown>

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date

    @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt: Date | null
}

@Entity('policy_section_coverage_details')
@Index('idx_policy_section_coverage_details_policy_id', ['policyId'])
@Index('idx_policy_section_coverage_details_section_id', ['sectionId'])
@Index('idx_policy_section_coverage_details_coverage_id', ['coverageId'])
export class PolicySectionCoverageDetail {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'policy_id', type: 'int', nullable: true })
    policyId: number | null

    @Column({ name: 'section_id', type: 'int' })
    sectionId: number

    @Column({ name: 'coverage_id', type: 'int' })
    coverageId: number

    @Column({ type: 'text', nullable: true })
    reference: string | null

    @Column({ name: 'coverage_detail_type_id', type: 'int', nullable: true })
    coverageDetailTypeId: number | null

    @Column({ name: 'coverage_detail_sub_type_id', type: 'int', nullable: true })
    coverageDetailSubTypeId: number | null

    @Column({ name: 'effective_date', type: 'date', nullable: true })
    effectiveDate: string | null

    @Column({ name: 'effective_time', type: 'time', precision: 3, nullable: true })
    effectiveTime: string | null

    @Column({ name: 'expiry_date', type: 'date', nullable: true })
    expiryDate: string | null

    @Column({ name: 'expiry_time', type: 'time', precision: 3, nullable: true })
    expiryTime: string | null

    @Column({ name: 'sum_insured_currency', type: 'text', nullable: true })
    sumInsuredCurrency: string | null

    @Column({ name: 'sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
    sumInsured: string | null

    @Column({ type: 'jsonb', default: '{}' })
    payload: Record<string, unknown>

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date

    @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt: Date | null
}
