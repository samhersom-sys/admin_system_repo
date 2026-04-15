import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm'

/**
 * QuoteSection entity — maps to the `quote_sections` table.
 * Schema source:
 *   db/migrations/012-create-quote-sections-table.js  (base table)
 *   db/migrations/078-alter-quote_sections-add-deleted-at.js (deleted_at)
 *   db/migrations/102-alter-quote-sections-add-order-time-fields.js (time_basis, order basis, line totals)
 *   db/migrations/103-alter-quote-sections-add-annual-premiums.js   (annual_gross_premium, annual_net_premium)
 *   db/migrations/104-alter-quote-sections-add-da-ref-strings.js    (da ref strings)
 */
@Entity('quote_sections')
@Index('idx_quote_sections_quote_id', ['quoteId'])
export class QuoteSection {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ name: 'quote_id', type: 'int' })
    quoteId: number

    @Column({ type: 'text', nullable: true })
    reference: string | null

    @Column({ name: 'class_of_business', type: 'text', nullable: true })
    classOfBusiness: string | null

    @Column({ name: 'inception_date', type: 'date', nullable: true })
    inceptionDate: string | null

    @Column({ name: 'effective_date', type: 'date', nullable: true })
    effectiveDate: string | null

    @Column({ name: 'expiry_date', type: 'date', nullable: true })
    expiryDate: string | null

    @Column({ name: 'inception_time', type: 'time', precision: 3, nullable: true, default: '00:00:00.000' })
    inceptionTime: string | null

    @Column({ name: 'effective_time', type: 'time', precision: 3, nullable: true, default: '00:00:00.000' })
    effectiveTime: string | null

    @Column({ name: 'expiry_time', type: 'time', precision: 3, nullable: true, default: '23:59:59.000' })
    expiryTime: string | null

    @Column({ name: 'days_on_cover', type: 'int', nullable: true })
    daysOnCover: number | null

    @Column({ name: 'limit_currency', type: 'varchar', length: 8, nullable: true })
    limitCurrency: string | null

    @Column({ name: 'limit_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
    limitAmount: string | null

    @Column({ name: 'limit_loss_qualifier', type: 'text', nullable: true })
    limitLossQualifier: string | null

    @Column({ name: 'excess_currency', type: 'varchar', length: 8, nullable: true })
    excessCurrency: string | null

    @Column({ name: 'excess_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
    excessAmount: string | null

    @Column({ name: 'excess_loss_qualifier', type: 'text', nullable: true })
    excessLossQualifier: string | null

    @Column({ name: 'sum_insured_currency', type: 'varchar', length: 8, nullable: true })
    sumInsuredCurrency: string | null

    @Column({ name: 'sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
    sumInsured: string | null

    @Column({ name: 'premium_currency', type: 'varchar', length: 8, nullable: true })
    premiumCurrency: string | null

    @Column({ name: 'gross_gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
    grossGrossPremium: string | null

    @Column({ name: 'gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
    grossPremium: string | null

    @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
    deductions: string | null

    @Column({ name: 'net_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
    netPremium: string | null

    @Column({ name: 'tax_receivable', type: 'numeric', precision: 18, scale: 2, nullable: true })
    taxReceivable: string | null

    // Added in migration 102 — order/time basis fields
    @Column({ name: 'time_basis', type: 'varchar', length: 100, nullable: true })
    timeBasis: string | null

    @Column({ name: 'written_order_basis', type: 'text', nullable: true })
    writtenOrderBasis: string | null

    @Column({ name: 'signed_order_basis', type: 'text', nullable: true })
    signedOrderBasis: string | null

    @Column({ name: 'written_line_total', type: 'numeric', precision: 18, scale: 2, nullable: true })
    writtenLineTotal: string | null

    @Column({ name: 'signed_line_total', type: 'numeric', precision: 18, scale: 2, nullable: true })
    signedLineTotal: string | null

    // Added in migration 103 — annual premiums promoted from payload
    @Column({ name: 'annual_gross_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
    annualGrossPremium: string | null

    @Column({ name: 'annual_net_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
    annualNetPremium: string | null

    @Column({ name: 'delegated_authority_id', type: 'int', nullable: true })
    delegatedAuthorityId: number | null

    @Column({ name: 'delegated_authority_section_id', type: 'int', nullable: true })
    delegatedAuthoritySectionId: number | null

    // Added in migration 104 — convenience text columns (denormalised refs)
    @Column({ name: 'delegated_authority_ref', type: 'text', nullable: true })
    delegatedAuthorityRef: string | null

    @Column({ name: 'delegated_authority_section_ref', type: 'text', nullable: true })
    delegatedAuthoritySectionRef: string | null

    @Column({ name: 'is_current', type: 'boolean', default: true })
    isCurrent: boolean

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date

    @Column({ type: 'jsonb', default: '{}' })
    payload: Record<string, unknown>

    // Added in migration 078
    @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt: Date | null

    /** Serialize with snake_case keys so the JSON matches DB column names. */
    toJSON() {
        return {
            id: this.id,
            quote_id: this.quoteId,
            reference: this.reference,
            class_of_business: this.classOfBusiness,
            inception_date: this.inceptionDate,
            effective_date: this.effectiveDate,
            expiry_date: this.expiryDate,
            inception_time: this.inceptionTime,
            effective_time: this.effectiveTime,
            expiry_time: this.expiryTime,
            days_on_cover: this.daysOnCover,
            limit_currency: this.limitCurrency,
            limit_amount: this.limitAmount,
            limit_loss_qualifier: this.limitLossQualifier,
            excess_currency: this.excessCurrency,
            excess_amount: this.excessAmount,
            excess_loss_qualifier: this.excessLossQualifier,
            sum_insured_currency: this.sumInsuredCurrency,
            sum_insured_amount: this.sumInsured,
            premium_currency: this.premiumCurrency,
            gross_gross_premium: this.grossGrossPremium,
            gross_premium: this.grossPremium,
            deductions: this.deductions,
            net_premium: this.netPremium,
            tax_receivable: this.taxReceivable,
            time_basis: this.timeBasis,
            written_order_basis: this.writtenOrderBasis,
            signed_order_basis: this.signedOrderBasis,
            written_line_total: this.writtenLineTotal,
            signed_line_total: this.signedLineTotal,
            annual_gross_premium: this.annualGrossPremium,
            annual_net_premium: this.annualNetPremium,
            written_order: (this.payload as Record<string, unknown>)?.written_order ?? null,
            signed_order: (this.payload as Record<string, unknown>)?.signed_order ?? null,
            delegated_authority_id: this.delegatedAuthorityId,
            delegated_authority_section_id: this.delegatedAuthoritySectionId,
            delegated_authority_ref: this.delegatedAuthorityRef,
            delegated_authority_section_ref: this.delegatedAuthoritySectionRef,
            is_current: this.isCurrent,
            created_at: this.createdAt,
            payload: this.payload,
            deleted_at: this.deletedAt,
        }
    }
}
